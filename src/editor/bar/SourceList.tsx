import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import { sourcesKey } from '../../core/data/dataSources'
import {
  EXTRA_SOURCES_PROP,
  extraSourcesFrom,
  type ExtraSource,
} from '../../core/data/extraSources'
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

  // The key of a helper source comes from the row itself or from another
  // helper source; all its pairs read from the same place.
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
    }
  }

  function partnerOf(index: number): string {
    const own = extra[index]
    return !own || own.partnerId === own.sourceId ? '' : own.partnerId
  }

  function originOf(index: number, fromField: string): ValueOrigin | null {
    if (fromField === '') return null
    const partner = partnerOf(index)
    return partner === '' ? { kind: 'row', value: fromField } : { kind: 'helper', sourceId: partner, value: fromField }
  }

  function setOrigin(index: number, at: number, origin: ValueOrigin): void {
    const own = extra[index]
    if (!own) return
    const partner = origin.kind === 'helper' ? (origin.sourceId ?? '') : ''
    const same = partner === partnerOf(index)
    change(index, {
      partnerId: partner,
      pairs: own.pairs.map((p, x) => (x === at
        ? { ...p, fromField: origin.value }
        : (same ? p : { ...p, fromField: '' }))),
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
                  origin={originOf(i, pair.fromField)}
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
