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

  function spot(id: string): string {
    if (id === '') return 'verbundenen Datenquelle'
    if (id === first) return 'Datenquelle'
    const at = extra.findIndex((q) => q.sourceId === id)
    return at === -1 ? 'Datenquelle' : `Hilfsquelle ${at + 1}`
  }

  function partnerOf(index: number): string {
    const own = extra[index]
    if (!own || own.pairs.length === 0) return ''
    return own.partnerId === '' || own.partnerId === own.sourceId ? first : own.partnerId
  }

  function setPartner(index: number, value: string): void {
    const own = extra[index]
    if (value === '') {
      change(index, { partnerId: '', pairs: [] })
      return
    }
    change(index, {
      partnerId: value === first ? '' : value,
      pairs: (own?.pairs.length ?? 0) === 0
        ? [{ fromField: '', toField: '' }]
        : (own?.pairs ?? []),
    })
  }

  const partnerSelection = (index: number) => {
    const own = extra[index]
    const entries = [
      { value: first, name: library.find((s) => s.id === first)?.name ?? '', badge: 'Datenquelle' },
      ...extra
        .map((q, at) => ({ q, at }))
        .filter(({ q, at }) => at !== index && q.sourceId !== '' && q.sourceId !== own?.sourceId)
        .map(({ q, at }) => ({
          value: q.sourceId,
          name: library.find((s) => s.id === q.sourceId)?.name ?? '',
          badge: `Hilfsquelle ${at + 1}`,
        })),
    ]
    return (
      <PickerControl
        label="Verbunden mit"
        name="Verbunden mit"
        groups={[{ key: 'partner', entries }]}
        value={partnerOf(index)}
        emptyText="Keine"
        onChoose={(v) => setPartner(index, v)}
      />
    )
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
          {partnerSelection(i)}

          {partnerOf(i) !== '' && (
            <KeyPairRows
              question="Verbindende Felder (freiwillig)"
              pairs={q.pairs}
              leftFields={fieldsOf(partnerOf(i))}
              rightFields={fieldsOf(q.sourceId)}
              leftName={(at) => `Feld ${at + 1} der ${spot(partnerOf(i))}`}
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
