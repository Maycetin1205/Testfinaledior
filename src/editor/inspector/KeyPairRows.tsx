import { Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/PushButton'
import type { DataField } from '../../core/data/dataSources'
import { MAX_KEY_PAIRS, type KeyPair } from '../../core/data/extraSources'
import { PickerControl } from './controls/PickerControl'

interface KeyPairRowsProps {
  question: string
  pairs: readonly KeyPair[]

  leftFields: readonly DataField[]
  rightFields: readonly DataField[]
  leftName: (at: number) => string
  rightName: (at: number) => string
  removeName: (at: number) => string
  onChange: (pairs: KeyPair[]) => void
}

export function KeyPairRows({
  question,
  pairs,
  leftFields,
  rightFields,
  leftName,
  rightName,
  removeName,
  onChange,
}: KeyPairRowsProps) {
  const setPair = (at: number, part: Partial<KeyPair>) =>
    onChange(pairs.map((p, i) => (i === at ? { ...p, ...part } : p)))

  const fieldPicker = (
    name: string,
    fields: readonly DataField[],
    value: string,
    onChoose: (code: string) => void,
  ) => (
    <PickerControl
      className="flex-1"
      name={name}
      groups={[{
        key: 'fields',
        entries: fields.map((f) => ({ value: f.code, name: f.name, badge: f.code })),
      }]}
      value={value}
      emptyText="Nicht gebunden"
      onChoose={onChoose}
    />
  )

  return (
    <>
      <span className="text-dense text-muted">{question}</span>

      {pairs.map((pair, at) => (
        <div key={at} className="flex flex-col gap-1 rounded border border-line p-1.5">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-dense text-muted">
              {leftName(at)}
            </span>
            {pairs.length > 1 && (
              <Button
                onlyIcon
                aria-label={removeName(at)}
                onClick={() => onChange(pairs.filter((_, x) => x !== at))}
              >
                <X size={13} />
              </Button>
            )}
          </div>
          {fieldPicker(leftName(at), leftFields, pair.ofField,
            (code) => setPair(at, { ofField: code }))}
          <span className="text-dense text-muted">{rightName(at)}</span>
          {fieldPicker(rightName(at), rightFields, pair.toField,
            (code) => setPair(at, { toField: code }))}
        </div>
      ))}
      {pairs.length < MAX_KEY_PAIRS && (
        <Button
          className="self-start"
          onClick={() => onChange([...pairs, { ofField: '', toField: '' }])}
        >
          <Plus size={13} /> Feld dazu
        </Button>
      )}
    </>
  )
}
