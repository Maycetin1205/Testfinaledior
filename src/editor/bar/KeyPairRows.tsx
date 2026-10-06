import type { ReactNode } from 'react'
import { Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { DataField } from '../../core/data/dataSources'
import { MAX_KEY_PAIRS, type KeyPair } from '../../core/data/extraSources'
import { PickerControl } from '../controls/PickerControl'

interface KeyPairRowsProps {
  pairs: readonly KeyPair[]

  // Where the value comes from: the right side of the sentence.
  left: (pair: KeyPair, at: number) => ReactNode

  // The fields of the source: the left side of the sentence.
  rightFields: readonly DataField[]
  rightName: (at: number) => string
  removeName: (at: number) => string
  onChange: (pairs: KeyPair[]) => void

  // Whether a click on the sign turns "=" into "≠" and back.
  comparable?: boolean
}

// One sentence per pair: the field of the source, "=", where its value comes
// from. The plus at the end of the last sentence adds a pair, the cross takes
// one away.
export function KeyPairRows({
  pairs,
  left,
  rightFields,
  rightName,
  removeName,
  onChange,
  comparable = false,
}: KeyPairRowsProps) {
  const setPair = (at: number, part: Partial<KeyPair>) =>
    onChange(pairs.map((p, i) => (i === at ? { ...p, ...part } : p)))

  const add = () => onChange([...pairs, { fromField: '', toField: '' }])

  const plus = (
    <Button onlyIcon aria-label="Feld dazu" title="Feld dazu" onClick={add}>
      <Plus size={13} />
    </Button>
  )

  if (pairs.length === 0) return plus

  return (
    <>
      {pairs.map((pair, at) => (
        <div key={at} className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-x-[6px]">
          <PickerControl
            className="w-full"
            name={rightName(at)}
            groups={[{
              key: 'fields',
              entries: rightFields.map((f) => ({ value: f.code, name: f.name, badge: f.code })),
            }]}
            value={pair.toField}
            emptyText="Nicht gebunden"
            onChoose={(code) => setPair(at, { toField: code })}
          />
          {comparable
            ? (
                <Button
                  onlyIcon
                  aria-label={pair.unequal ? 'Ungleich' : 'Gleich'}
                  title={pair.unequal ? 'Ungleich' : 'Gleich'}
                  onClick={() => onChange(pairs.map((p, i) => {
                    if (i !== at) return p
                    const { unequal, ...rest } = p
                    return unequal ? rest : { ...rest, unequal: true }
                  }))}
                >
                  {pair.unequal ? '≠' : '='}
                </Button>
              )
            : <span className="text-muted">=</span>}
          <div className="flex min-w-0 [&>*]:w-full [&>*]:flex-1">{left(pair, at)}</div>
          <span className="flex items-center">
            {pairs.length > 1 && (
              <Button
                onlyIcon
                aria-label={removeName(at)}
                onClick={() => onChange(pairs.filter((_, x) => x !== at))}
              >
                <X size={13} />
              </Button>
            )}
            {at === pairs.length - 1 && pairs.length < MAX_KEY_PAIRS && plus}
          </span>
        </div>
      ))}
    </>
  )
}
