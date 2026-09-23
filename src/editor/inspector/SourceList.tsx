import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { Plus, X } from '@/editor/icons/icon'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/PushButton'
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
import { useSection } from './sectionState'
import { PickerControl } from './controls/PickerControl'
import { KeyPairRows } from './KeyPairRows'

interface SourcesListProps {
  block: BlockNode
}

export function SourcesList({ block }: SourcesListProps) {
  const [open, toggle] = useSection('dataSources')
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
    if (id === first) return 'Datenquelle 1'
    const at = extra.findIndex((q) => q.sourceId === id)
    return at === -1 ? 'Datenquelle 1' : `Datenquelle ${at + 2}`
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
        ? [{ ofField: '', toField: '' }]
        : (own?.pairs ?? []),
    })
  }

  const partnerSelection = (index: number) => {
    const own = extra[index]
    const entries = [
      { value: first, name: library.find((s) => s.id === first)?.name ?? '', badge: 'Datenquelle 1' },
      ...extra
        .map((q, at) => ({ q, at }))
        .filter(({ q, at }) => at !== index && q.sourceId !== '' && q.sourceId !== own?.sourceId)
        .map(({ q, at }) => ({
          value: q.sourceId,
          name: library.find((s) => s.id === q.sourceId)?.name ?? '',
          badge: `Datenquelle ${at + 2}`,
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
      <Group title="Datenquellen" open={open} onToggle={toggle}>
        <Button className="self-start" onClick={openDataCenter}>Datencenter öffnen</Button>
      </Group>
    )
  }

  return (
    <Group title="Datenquellen" open={open} onToggle={toggle}>
      {sourcesSelection(first, 'Datenquelle 1', (v) => ed.updateProperty(block.id, SOURCE_PROP, v))}

      {extra.map((q, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded border border-line p-2">
          <div className="flex items-end gap-1">
            <div className="min-w-0 flex-1">
              {sourcesSelection(q.sourceId, `Datenquelle ${i + 2}`, (v) => change(i, { sourceId: v }))}
            </div>
            <Button
              onlyIcon
              aria-label={`Datenquelle ${i + 2} entfernen`}
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
              rightName={(at) => `Feld ${at + 1} der Datenquelle ${i + 2}`}
              removeName={(at) => `Zeile ${at + 1} entfernen`}
              onChange={(keyPairs) => change(i, { pairs: keyPairs })}
            />
          )}
        </div>
      ))}

      {first !== '' && (
        <Button
          className="self-start"
          onClick={() => setExtra([...extra, { sourceId: '', partnerId: '', pairs: [] }])}
        >
          <Plus size={13} /> Datenquelle
        </Button>
      )}
    </Group>
  )
}
