import { expect, test } from 'vitest'
import { feldLesen } from './data'

// SoftEngine liefert ein Feld mal blank, mal als Kasten {WERT: ...}. Stuende der
// Kasten woertlich als "[object Object]" in der Zelle, waere er nicht leer -- und
// weder die Namensvariante noch der Schnitt aus SATZ kaemen je an die Reihe.
test('ein Feld im Kasten wird ausgepackt, ein Kasten ohne WERT gilt als leer', () => {
  expect(feldLesen({ '0_3': { WERT: 'XY' }, SATZ: 'ABCDEF' }, '0_3')).toBe('XY')
  expect(feldLesen({ '0_3': { WERT: 7 }, SATZ: 'ABCDEF' }, '0_3')).toBe('7')
  expect(feldLesen({ '0_3': {}, SATZ: 'ABCDEF' }, '0_3')).toBe('ABC')
  expect(feldLesen({ '0_3': { ANDERS: 'ZZ' }, SATZ: 'ABCDEF' }, '0_3')).toBe('ABC')
  expect(feldLesen({ '0_3': {}, '0_3_NAME': { WERT: 'NV' } }, '0_3')).toBe('NV')
  expect(feldLesen({ '0_3': 'DI', SATZ: 'ABCDEF' }, '0_3')).toBe('DI')
})
