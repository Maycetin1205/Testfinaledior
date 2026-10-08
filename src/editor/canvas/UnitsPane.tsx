import { useState } from 'react'
import { Grid, GridLine, GridNewLine, Strip } from '@/editor/widgets/Grid'
import { DECIMALS_MAX, type UnitsTerm } from '../../core/data/calculation'
import { asNumber, numberText } from '../../core/data/number'
import { PickerControl } from '../controls/PickerControl'
import { encodeOrigin } from '../origin/origins'
import { termOrigin, unitGroups, UNITS, type Names } from './calculationWords'

const PAIR_COLUMNS = [
  { name: 'Einheit 1' },
  { name: 'Einheit 2' },
  { name: 'Faktor', width: 110, right: true },
]

// The two units the factor follows and the table that gives it for each
// pair; a pair the table does not hold counts 1.
export function UnitsPane({ term, names, onChange }: {
  term: UnitsTerm
  names: Names
  onChange: (term: UnitsTerm) => void
}) {
  const [marked, setMarked] = useState<number | null>(null)
  const groups = unitGroups(names)
  const pairFrom = (v: readonly string[]) => ({ first: v[0].trim(), second: v[1].trim(), factor: asNumber(v[2]) ?? 1 })
  const valid = (v: readonly string[]): boolean => asNumber(v[2]) !== null
  const choose = (unit: 'first' | 'second', value: string): void => {
    const origin = termOrigin(value)
    if (origin) onChange({ ...term, [unit]: origin })
  }
  return (
    <>
      <Strip>{UNITS}</Strip>
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-[8px] border-b border-line px-[12px] py-[8px]">
        <span className="text-dense text-muted">Einheit 1</span>
        <PickerControl
          name="Einheit 1"
          className="w-full"
          groups={groups}
          value={term.first === undefined ? '' : encodeOrigin(term.first)}
          onChoose={(v) => choose('first', v)}
        />
        <span className="text-dense text-muted">Einheit 2</span>
        <PickerControl
          name="Einheit 2"
          className="w-full"
          groups={groups}
          value={term.second === undefined ? '' : encodeOrigin(term.second)}
          onChoose={(v) => choose('second', v)}
        />
      </div>
      <Strip right={term.table.length}>Tabelle</Strip>
      <Grid columns={PAIR_COLUMNS} fill={false} onEmpty={() => setMarked(null)}>
        {term.table.map((p, i) => (
          <GridLine
            key={i}
            cells={[p.first, p.second, numberText(p.factor, DECIMALS_MAX)]}
            marked={marked === i}
            valid={valid}
            onMark={() => setMarked(i)}
            onSave={(v) => onChange({ ...term, table: term.table.map((q, k) => (k === i ? pairFrom(v) : q)) })}
            onRemove={() => {
              onChange({ ...term, table: term.table.filter((_, k) => k !== i) })
              setMarked(null)
            }}
            removeName={`Zeile ${i + 1} löschen`}
          />
        ))}
        <GridNewLine
          names={['Einheit 1', 'Einheit 2', 'Faktor']}
          valid={valid}
          onAdd={(v) => {
            onChange({ ...term, table: [...term.table, pairFrom(v)] })
            return true
          }}
        />
      </Grid>
    </>
  )
}
