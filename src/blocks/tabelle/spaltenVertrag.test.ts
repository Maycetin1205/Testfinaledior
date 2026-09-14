import { expect, test } from 'vitest'
import { serializeBlockEvents, type BlockEventsMap } from '../../core/data/aktionen'
import { spalteMitKennung, spaltenSicht, type Spalte } from './spalten'

test('versteckte Tabellenspalten behalten ihren Platz fuer Laufzeit-Parameter', () => {
  const spalten: Spalte[] = [
    { kennung: 'a', titel: 'A', feld: '10_5' },
    { kennung: 'b', titel: 'B', feld: '20_5', versteckt: true },
    { kennung: 'c', titel: 'C', feld: '30_5' },
  ]

  const sicht = spaltenSicht(spalten, false)
  expect(sicht.spalten.map((spalte) => spalte.kennung)).toEqual(['a', 'c'])
  expect(sicht.plaetze).toEqual([0, 2])

  const events: BlockEventsMap = {
    onSave: [{
      id: 'schritt-1',
      type: 'RELATION',
      resultKey: '',
      relationId: 'relation-1',
      params: [{ source: 'erfassungszelle', value: 'c', blockId: 'tabelle-1' }],
      extraParams: [],
    }],
  }
  const serialisiert = serializeBlockEvents(
    events,
    ['onSave'],
    () => '',
    (_blockId, kennung) => String(spalteMitKennung(spalten, kennung)),
  )
  expect(serialisiert).not.toBeNull()

  const laufzeit = JSON.parse(serialisiert ?? '{}') as Record<
    string,
    Array<{ params: Array<{ value: string }> }>
  >
  expect(laufzeit.onSave?.[0]?.params[0]?.value).toBe('2')
})
