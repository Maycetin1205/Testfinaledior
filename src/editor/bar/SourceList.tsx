import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import { valueSpotsInTree } from '../../core/block/treeQuery'
import { sourcesKey } from '../../core/data/dataSources'
import {
  EXTRA_SOURCES_PROP,
  extraSourcesFrom,
  type ExtraSource,
  type KeyPair,
} from '../../core/data/extraSources'
import { blockValueKey } from '../datacenter/parameterText'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { openDataCenter } from '../datacenter/openDataCenter'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../controls/OriginPicker'
import type { OriginOffer } from '../controls/originOffer'
import { PickerControl } from '../controls/PickerControl'
import { KeyPairRows } from './KeyPairRows'

interface SourceListProps {
  block: BlockNode

  // The block's own source, its helper sources, or both.
  part?: 'own' | 'helpers' | 'all'
}

export function SourceList({ block, part = 'all' }: SourceListProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const first = typeof block.values[SOURCE_PROP] === 'string' ? block.values[SOURCE_PROP] : ''
  const extra = extraSourcesFrom(block.values[EXTRA_SOURCES_PROP])

  const fieldsOf = (id: string) => library.find((s) => s.id === id)?.fields ?? []

  function setExtra(next: ExtraSource[]) {
    ed.updateProperty(block.id, EXTRA_SOURCES_PROP, next)
  }

  function change(index: number, part: Partial<ExtraSource>) {
    setExtra(extra.map((q, i) => (i === index ? { ...q, ...part } : q)))
  }

  function options(own: string) {
    const taken = new Set([first, ...extra.map((q) => q.sourceId)])
    taken.delete(own)
    return library.filter((s) => !taken.has(s.id))
  }

  const entriesOf = (id: string) => fieldsOf(id).map((f) => ({ value: f.code, name: f.name, badge: f.code }))

  const openDocument = library.find((s) => s.preset === 'document')
  const formFields = valueSpotsInTree(ed.tree).map(({ node, spot }) => ({
    key: blockValueKey(node.id, spot.prop),
    blockId: node.id,
    prop: spot.prop,
    name: blockName(node, library),
  }))

  // The key of a helper source comes from the row itself, another helper
  // source, the open document or a form field. The pairs that read the row or
  // a helper source all read from the same one.
  function offerFor(index: number): OriginOffer {
    const own = extra[index]
    return {
      row: entriesOf(first),
      helpers: extra
        .filter((q, at) => at !== index && q.sourceId !== '' && q.sourceId !== own?.sourceId)
        .map((q) => ({
          sourceId: q.sourceId,
          name: library.find((s) => s.id === q.sourceId)?.name ?? '',
          fields: entriesOf(q.sourceId),
        })),
      ...(openDocument ? { document: { sourceId: openDocument.id, name: openDocument.name, fields: entriesOf(openDocument.id) } } : {}),
      formFields: formFields.map((f) => ({ value: f.key, name: f.name })),
    }
  }

  function partnerOf(index: number): string {
    const own = extra[index]
    return !own || own.partnerId === own.sourceId ? '' : own.partnerId
  }

  function originOf(index: number, pair: KeyPair): ValueOrigin | null {
    if (pair.fromField === '') return null
    if (pair.from === 'document') return { kind: 'document', sourceId: pair.fromSourceId ?? '', value: pair.fromField }
    if (pair.from === 'formField') {
      return { kind: 'formField', value: blockValueKey(pair.fromField, pair.fromProp ?? 'value') }
    }
    const partner = partnerOf(index)
    return partner === '' ? { kind: 'row', value: pair.fromField } : { kind: 'helper', sourceId: partner, value: pair.fromField }
  }

  const fromPartner = (p: KeyPair, fromField: string): KeyPair => ({ fromField, toField: p.toField })

  function setOrigin(index: number, at: number, origin: ValueOrigin): void {
    const own = extra[index]
    if (!own) return
    const pairs = [...own.pairs]
    const pair = pairs[at]
    if (!pair) return
    if (origin.kind === 'document') {
      pairs[at] = { fromField: origin.value, toField: pair.toField, from: 'document', fromSourceId: origin.sourceId ?? '' }
      change(index, { pairs })
      return
    }
    if (origin.kind === 'formField') {
      const spot = formFields.find((f) => f.key === origin.value)
      if (!spot) return
      pairs[at] = { fromField: spot.blockId, toField: pair.toField, from: 'formField', fromProp: spot.prop }
      change(index, { pairs })
      return
    }
    // A new partner leaves the pairs that read the old one empty.
    const partner = origin.kind === 'helper' ? (origin.sourceId ?? '') : ''
    const same = partner === partnerOf(index)
    change(index, {
      partnerId: partner,
      pairs: pairs.map((p, x) => (x === at
        ? fromPartner(p, origin.value)
        : (same || p.from !== undefined ? p : fromPartner(p, '')))),
    })
  }

  const sourcesSelection = (value: string, title: string, onValue: (v: string) => void) => (
    <PickerControl
      label={title}
      name={title}
      groups={[{
        key: 'sources',
        entries: options(value).map((s) => ({
          value: s.id,
          name: s.name,
          badge: sourcesKey(s),
        })),
      }]}
      value={value}
      emptyText="Keine"
      onChoose={onValue}
    />
  )

  if (library.length === 0) {
    return (
      <Button className="self-start" onClick={openDataCenter}>Daten öffnen</Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {part !== 'helpers' && sourcesSelection(first, 'Datenquelle', (v) => ed.updateProperty(block.id, SOURCE_PROP, v))}

      {part !== 'own' && extra.map((q, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded border border-line p-2">
          <div className="flex items-end gap-1">
            <div className="min-w-0 flex-1">
              {sourcesSelection(q.sourceId, `Hilfsquelle ${i + 1}`, (v) => change(i, { sourceId: v }))}
            </div>
            <Button
              onlyIcon
              aria-label={`Hilfsquelle ${i + 1} entfernen`}
              onClick={() => setExtra(extra.filter((_, at) => at !== i))}
            >
              <X size={13} />
            </Button>
          </div>

          {q.sourceId !== '' && (
            <KeyPairRows
              question="Verbindende Felder (freiwillig)"
              pairs={q.pairs}
              leftFields={[]}
              left={(pair, at) => (
                <OriginPicker
                  name={`Wert ${at + 1}`}
                  origin={originOf(i, pair)}
                  offer={offerFor(i)}
                  onChoose={(origin) => setOrigin(i, at, origin)}
                />
              )}
              rightFields={fieldsOf(q.sourceId)}
              leftName={(at) => `Wert ${at + 1}`}
              rightName={(at) => `Feld ${at + 1} der Hilfsquelle ${i + 1}`}
              removeName={(at) => `Zeile ${at + 1} entfernen`}
              onChange={(keyPairs) => change(i, { pairs: keyPairs })}
            />
          )}
        </div>
      ))}

      {part !== 'own' && first !== '' && (
        <Button
          className="self-start"
          onClick={() => setExtra([...extra, { sourceId: '', partnerId: '', pairs: [] }])}
        >
          <Plus size={13} /> Hilfsquelle
        </Button>
      )}
    </div>
  )
}
