import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import { bindingProp, capability, applies } from '../core/block/capability'
import { blockType } from '../core/block/registry'
import { propertyVisible } from '../core/block/property'
import {
  bindableSpotsOf,
  isSelectionGiver,
  carriesChanges,
} from '../core/block/treeQuery'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import { chainsForExport } from '../core/data/steps/chains'
import {
  orderedFields,
  withUniqueNames,
  recordNumberOf,
  type DataSource,
} from '../core/data/dataSources'
import { deliveryAdapter } from '../core/data/deliveries/deliveries'
import type { RelationTemplate } from '../core/data/relations'
import { pagesOfMask } from '../core/block/pages'
import { pageRowsTemplate } from '../core/block/gridArea'
import { gridAreaCss } from '../core/block/grid'
import tokensCssRaw from '../design/mask.css?raw'
import {
  usedFieldsPerSource,
  collectDataSources,
  getKeyPerGiver,
} from './usedSources'
import { collectRelation } from './usedRelations'
import { buildSevariablen } from './sevariablen'
import { namesRaw, nameSpotsOf, previewRaw, previewSpotsOf } from './bindingPreview'
import { styleAttr } from './nodeStyle'
import { runtimeFor } from './runtime'
import {
  escapeHtmlAttr,
  escapeHtmlText,
  escapeNonAsciiJs,
  guardJsonScript,
  guardScriptContent,
  stripCssComments,
} from './serializer'
import { BRIDGE_SCRIPT } from './validator'

interface MaskExport {
  html: string
  sevariablen: string
}

function columnsIndexFor(tree: MaskTree): (blockId: string, key: string) => string {
  return (blockId, key) => {
    const target = tree[blockId]
    const binding = target ? capability(blockType(target.type), 'list')?.binding : undefined
    const keyOf = binding?.keyOf
    if (!target || !binding || keyOf === undefined) return '-1'
    return String(binding.entries(target.values[binding.prop])
      .findIndex((entry) => keyOf(entry) === key))
  }
}

function nodeToHtml(
  tree: MaskTree,
  node: BlockNode,
  depth: number,

  popupName: (id: string) => string,

  columnsIndex: (blockId: string, key: string) => string,

  sources: readonly DataSource[],
): string {
  const def = blockType(node.type)
  if (!def) return ''
  const pad = '  '.repeat(depth)

  const bindableSpots = bindableSpotsOf(node)
  const bindable = new Set(bindableSpots.map((spot) => spot.prop))
  const silentBindings = new Set<string>(
    (capability(def, 'bindable')?.spots ?? [])
      .filter((spot) => !bindable.has(spot.prop))
      .map((spot) => bindingProp(spot.prop)),
  )

  const previewSpots = previewSpotsOf(node)
  const nameSpots = nameSpotsOf(node)

  // One attribute per declared property, written the way the declaration
  // writes it and left out when the value is the declared default or the
  // declaration's condition does not hold.
  const attrs = Object.entries(def.properties)
    .map(([key, declared]) => {
      if (declared.attribute === '') return ''
      if (!propertyVisible(declared.when, node.values)) return ''
      if (silentBindings.has(key)) return ''

      const fallback = declared.default
      const held = node.values[key] ?? fallback

      const named = nameSpots.get(key)
      const raw = previewSpots.has(key)
        ? previewRaw(node, previewSpots.get(key)!, sources, fallback)
        : named && String(held) === ''
          ? namesRaw(node, named, sources)
          : declared.type.toAttribute(held)

      if (raw === declared.type.toAttribute(fallback)) return ''
      return ` ${declared.attribute}="${escapeHtmlAttr(raw)}"`
    })
    .join('')

  const actions = chainsForExport(node.chains, (capability(def, 'events')?.list ?? []).map((e) => e.key), popupName, columnsIndex)
  const actionsAttr = actions ? ` data-ff-actions="${escapeHtmlAttr(actions)}"` : ''

  const addressable = (capability(def, 'actionValue')?.spots.length ?? 0) > 0
    || applies(capability(def, 'capture'), node.values)
    || carriesChanges(node)
    || isSelectionGiver(node)
  const keyAttr = addressable ? ` ${BLOCK_ID_ATTR}="${escapeHtmlAttr(node.id)}"` : ''

  const fillsAttr = def.page !== true ? ' fills' : ''

  const pagesAttr = node.parentId === ROOT_ID && !def.page ? ' data-ff-main' : ''
  const open = `${pad}<${def.tag}${attrs}${actionsAttr}${keyAttr}${pagesAttr}${fillsAttr}${styleAttr(node, def.page === true)}>`
  if (!def.takesChildren || node.childIds.length === 0) {
    return `${open}</${def.tag}>`
  }

  const children = node.childIds
    .map((id) => tree[id])
    .filter((c): c is BlockNode => Boolean(c))

    .map((c) => nodeToHtml(tree, c, depth + 1, popupName, columnsIndex, sources))
    .filter((html) => html !== '')
    .join('\n')
  return children === ''
    ? `${open}</${def.tag}>`
    : `${open}\n${children}\n${pad}</${def.tag}>`
}

// The types of the blocks that leave with the mask: the runtime brings these.
function typesInMask(tree: MaskTree): Set<string> {
  const types = new Set<string>()
  const visit = (id: string) => {
    const node = tree[id]
    const def = node ? blockType(node.type) : undefined
    if (!node || (id !== ROOT_ID && !def)) return
    if (id !== ROOT_ID) types.add(node.type)
    if (id === ROOT_ID || def?.takesChildren) node.childIds.forEach(visit)
  }
  visit(ROOT_ID)
  return types
}

export function exportMask(
  tree: MaskTree,
  title = 'Maske',

  sources: readonly DataSource[] = [],

  relation: readonly RelationTemplate[] = [],
): MaskExport {
  const root = tree[ROOT_ID]

  const pagesNameById = new Map(pagesOfMask(tree).map((s) => [s.id, s.name]))
  const popupName = (id: string): string => pagesNameById.get(id) ?? ''
  const columnsIndex = columnsIndexFor(tree)

  const blocks = (root?.childIds ?? [])
    .map((id) => tree[id])
    .filter((n): n is BlockNode => Boolean(n))
    .map((n) => nodeToHtml(tree, n, 2, popupName, columnsIndex, sources))
    .join('\n')

  const used = withUniqueNames(collectDataSources(tree, sources))

  const usedFields = usedFieldsPerSource(tree, sources)

  const getKey = getKeyPerGiver(tree, used)
  const usedRelation = collectRelation(tree, relation, used)

  const tokensCss = stripCssComments(tokensCssRaw)

  const runtimeJs = guardScriptContent(escapeNonAsciiJs(runtimeFor(typesInMask(tree))))

  const sourcesJs = guardJsonScript(escapeNonAsciiJs(
    'window.FF_DATA_SOURCES = ' + JSON.stringify(used.map((s) => ({
      id: s.id,
      name: s.name,
      tableId: s.tableId,
      recordField: recordNumberOf(s),
      ...deliveryAdapter(s.delivery.kind).export(s.delivery, s, {
        usedFields: usedFields.get(s.id),
        orderedFields: (source) => orderedFields(source, usedFields.get(source.id), getKey.get(source.id) ?? [], false),
        relations: relation,
      }),
    }))) + ';',
  ))

  const relationJs = guardJsonScript(escapeNonAsciiJs(
    'window.FF_RELATIONS = ' + JSON.stringify(usedRelation.map((r) => ({
      id: r.id,
      verb: r.verb,
      nr: r.nr,
      parameter: r.parameter,
      extraParameterAllowed: r.extraParameterAllowed === true,
      ...(r.positions ? { positions: r.positions } : {}),
    }))) + ';',
  ))

  const rows = pageRowsTemplate(tree)

  const html = [
    '<!DOCTYPE html>',
    '<html lang="de">',
    '<head>',
    '<meta charset="UTF-8" />',
    `<title>${escapeHtmlText(title)}</title>`,

    BRIDGE_SCRIPT,
    '<style>',
    tokensCss,
    '',
    '/* The sheet is paper to the window\'s edges; its grid as on the editor canvas. */',
    'html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: var(--se-bg); }',

    `.ff-root { box-sizing: border-box; width: 100%; height: 100%; overflow: auto;`
      + ` background: var(--se-bg);`
      + ` font-family: var(--se-font); font-size: var(--se-fs); line-height: var(--se-lh); color: var(--se-ink);`
      + ` font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; caret-color: var(--se-accent);`
      + ` scrollbar-width: thin; scrollbar-color: var(--se-scrollbar) transparent;`
      + ` ${gridAreaCss()};${rows ? ` grid-template-rows: ${rows};` : ''}`
      + ` padding: var(--se-sheet-top) var(--se-sheet-x) var(--se-sheet-bottom); }`,
    '.ff-root * { font-family: inherit; font-size: inherit; }',
    '.ff-root ::selection { background: var(--se-selection-ground); color: var(--se-ink); }',
    '</style>',
    '</head>',
    '<body>',
    '  <div class="ff-root">',
    blocks,
    '  </div>',
    '<script>',
    sourcesJs,
    relationJs,
    '</script>',
    ...(runtimeJs === '' ? [] : ['<script>', runtimeJs, '</script>']),
    '</body>',
    '</html>',
  ].join('\n')

  const sevariablen = buildSevariablen(used, usedFields, getKey)

  return { html, sevariablen }
}
