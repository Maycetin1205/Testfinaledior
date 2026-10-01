import type { ReactNode } from 'react'
import { Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { DataField } from '../../core/data/dataSources'
import { MAX_KEY_PAIRS, type KeyPair } from '../../core/data/extraSources'
import { PickerControl } from '../controls/PickerControl'

interface KeyPairRowsProps {
  question: string
  pairs: readonly KeyPair[]

  leftFields: readonly DataField[]

  // Where the left value comes from, in place of the field list.
  left?: (pair: KeyPair, at: number) => ReactNode
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
  left,
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
      className="w-full"
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
        // Both lines of a pair alike: the name on the left, the choice in
        // the same width on the right, the bin at the end of the first.
        <div key={at} className="grid grid-cols-[112px_minmax(0,1fr)_28px] items-center gap-x-[8px] gap-y-[4px] rounded border border-line p-[6px]">
          <span className="truncate text-dense text-muted" title={leftName(at)}>{leftName(at)}</span>
          <div className="flex min-w-0 [&>*]:w-full [&>*]:flex-1">
            {left
              ? left(pair, at)
              : fieldPicker(leftName(at), leftFields, pair.fromField,
                (code) => setPair(at, { fromField: code }))}
          </div>
          {pairs.length > 1
            ? (
                <Button
                  onlyIcon
                  aria-label={removeName(at)}
                  onClick={() => onChange(pairs.filter((_, x) => x !== at))}
                >
                  <X size={13} />
                </Button>
              )
            : <span />}
          <span className="truncate text-dense text-muted" title={rightName(at)}>{rightName(at)}</span>
          <div className="flex min-w-0 [&>*]:w-full [&>*]:flex-1">
            {fieldPicker(rightName(at), rightFields, pair.toField,
              (code) => setPair(at, { toField: code }))}
          </div>
          <span />
        </div>
      ))}
      {pairs.length < MAX_KEY_PAIRS && (
        <Button
          className="self-start"
          onClick={() => onChange([...pairs, { fromField: '', toField: '' }])}
        >
          <Plus size={13} /> Feld dazu
        </Button>
      )}
    </>
  )
}
