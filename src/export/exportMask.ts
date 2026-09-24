import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import { listRead } from '../core/block/blockType'
import { bindingProp, capability, applies } from '../core/block/capability'
import { blockType } from '../core/block/registry'
import {
  bindableSpotsOf,
  maySelectionFollows,
  firstDescendantOfType,
  isSelectionGiver,
  SOURCE_PROP,
  carriesChanges,
  carriesOwnSource,
  carriesDeletions,
} from '../core/block/treeQuery'
import { BLOCK_ID_ATTR } from '../core/data/actions'
import { chainsForExport } from '../core/data/steps/chains'
import { SELECTION_FOLLOW_PROP } from '../core/data/selectionFollow'
import {
  orderedFields,
  withUniqueNames,
  recordNumberOf,
  type DataSource,
} from '../core/data/dataSources'
import { deliveryAdapter } from '../core/data/deliveries/deliveries'
import type { RelationTemplate } from '../core/data/relations'
import { EXTRA_SOURCES_PROP } from '../core/data/extraSources'
import { pagesOfMask } from '../core/block/pages'
import { isGridArea } from '../core/block/gridArea'
import {
  directionOfChildren,
  ROOT_FLOW,
  type Direction,
} from '../core/block/flow'
import { gridAreaCss } from '../core/block/grid'
import tokensCssRaw from '../design/mask.css?raw'
import {
  usedFieldsPerSource,
  collectDataSources,
  getKeyPerGiver,
} from './usedSources'
import { collectRelation } from './usedRelations'
import { buildSevariablen } from './sevariablen'
import { previewRaw, previewSpotsOf } from './bindingPreview'
import { styleAttr } from './nodeStyle'
import runtimeRaw from './generated/runtime.js?raw'
import {
  escapeHtmlAttr,
  escapeHtmlText,
  escapeNonAsciiJs,
  guardJsonScript,
  guardScriptContent,
  stripCssComments,
} from './serializer'
import { BRIDGE_SCRIPT } from './validator'

const OWN_SOURCE_PROPS = new Set([SOURCE_PROP, EXTRA_SOURCES_PROP])

export interface MaskExport {
  html: string
  sevariablen: string
}

interface TemplateCtx {
  type: string
  id: string | undefined
  direction: Direction
}

function columnsIndexFor(tree: MaskTree): (blockId: string, key: string) => string {
  return (blockId, key) => {
    const target = tree[blockId]
    const binding = target ? capability(blockType(target.type), 'list')?.binding : undefined
    const keyProperty = binding?.keyProperty
    if (!target || !binding || keyProperty === undefined) return '-1'
    return String(listRead(target.values[binding.prop], binding)
      .findIndex((entry) => entry[keyProperty] === key))
  }
}

function nodeToHtml(
  tree: MaskTree,
  node: BlockNode,
  parentDirection: Direction,
  depth: number,

  popupName: (id: string) => string,

  columnsIndex: (blockId: string, key: string) => string,

  sources: readonly DataSource[],
  templateCtx?: TemplateCtx,

  gridLevel = false,
): string {
  const def = blockType(node.type)
  if (!def) return ''
  const pad = '  '.repeat(depth)
  if (templateCtx && node.type === templateCtx.type) {
    if (node.id !== templateCtx.id) return ''

    const inner = nodeToHtml(tree, node, templateCtx.direction, depth + 1, popupName, columnsIndex, sources, undefined, gridLevel)
    return `${pad}<template data-ff-template>\n${inner}\n${pad}</template>`
  }

  const bindableSpots = bindableSpotsOf(node)
  const bindable = new Set(bindableSpots.map((spot) => spot.prop))
  const silentBindings = new Set<string>(
    (capability(def, 'bindable')?.spots ?? [])
      .filter((spot) => !bindable.has(spot.prop))
      .map((spot) => bindingProp(spot.prop)),
  )

  const previewSpots = previewSpotsOf(node)

  // One attribute per declared property, written the way the declaration
  // writes it and left out when the value is the declared default.
  const attrs = Object.entries(def.properties)
    .map(([key, declared]) => {
      if (declared.attribute === '') return ''
      if (key === SELECTION_FOLLOW_PROP && !maySelectionFollows(node)) return ''

      if (OWN_SOURCE_PROPS.has(key) && !carriesOwnSource(node)) return ''
      if (silentBindings.has(key)) return ''

      const fallback = declared.default
      const held = node.values[key] ?? fallback

      const raw = previewSpots.has(key)
        ? previewRaw(node, previewSpots.get(key)!, sources, fallback)
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
    || carriesDeletions(node)
    || isSelectionGiver(node)
  const keyAttr = addressable ? ` ${BLOCK_ID_ATTR}="${escapeHtmlAttr(node.id)}"` : ''

  const fillsAttr = gridLevel && def.page !== true ? ' fills' : ''

  const pagesAttr = node.parentId === ROOT_ID && !def.page ? ' data-ff-main' : ''
  const open = `${pad}<${def.tag}${attrs}${actionsAttr}${keyAttr}${pagesAttr}${fillsAttr}${styleAttr(node, parentDirection, def.fixedWidth, gridLevel, def.page === true)}>`
  if (!def.takesChildren || node.childIds.length === 0) {
    return `${open}</${def.tag}>`
  }

  const childDirection = directionOfChildren(def, node.values)

  const childCtx: TemplateCtx | undefined = def.templateKind
    ? {
        type: def.templateKind.type,
        id: firstDescendantOfType(tree, node.id, def.templateKind.type),
        direction: def.templateKind.direction ?? childDirection,
      }
    : templateCtx
  const children = node.childIds
    .map((id) => tree[id])
    .filter((c): c is BlockNode => Boolean(c))

    .map((c) => nodeToHtml(tree, c, childDirection, depth + 1, popupName, columnsIndex, sources, childCtx, isGridArea(node)))
    .filter((html) => html !== '')
    .join('\n')
  return children === ''
    ? `${open}</${def.tag}>`
    : `${open}\n${children}\n${pad}</${def.tag}>`
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
    .map((n) => nodeToHtml(tree, n, 'column', 2, popupName, columnsIndex, sources, undefined, true))
    .join('\n')

  const used = withUniqueNames(collectDataSources(tree, sources))

  const usedFields = usedFieldsPerSource(tree, sources)

  const getKey = getKeyPerGiver(tree, used)
  const usedRelation = collectRelation(tree, relation, used)

  const tokensCss = stripCssComments(tokensCssRaw)

  const runtimeJs = guardScriptContent(escapeNonAsciiJs(runtimeRaw))

  const sourcesJs = guardJsonScript(escapeNonAsciiJs(
    'window.FF_DATA_SOURCES = ' + JSON.stringify(used.map((s) => ({
      id: s.id,
      name: s.name,
      tableId: s.tableId,
      recordField: recordNumberOf(s),
      ...deliveryAdapter(s.delivery.kind).export(s.delivery, s, {
        used: usedFields.get(s.id),
        fields: (source) => orderedFields(source, usedFields.get(source.id), getKey.get(source.id) ?? [], false),
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

  const rootPadding = `${ROOT_FLOW.padding}px`

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
    '/* Page frame and root grid, the same as the editor canvas */',
    'html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }',

    `.ff-root { box-sizing: border-box; width: 100%; height: 100%; overflow: auto;`
      + ` background: var(--se-bg); font-family: var(--se-font); font-size: var(--se-fs);`
      + ` line-height: var(--se-lh); color: var(--se-ink);`
      + ` ${gridAreaCss()}; padding: ${rootPadding}; }`,
    '.ff-root * { font-family: inherit; font-size: inherit; }',
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
    '<script>',
    runtimeJs,
    '</script>',
    '</body>',
    '</html>',
  ].join('\n')

  const sevariablen = buildSevariablen(used, usedFields, getKey)

  return { html, sevariablen }
}
