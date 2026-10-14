import { expect, test } from 'vitest'
import '../blocks/register'
import { allBlockTypes } from '../core/block/registry'
import { runtimeFor } from './runtime'

test('jeder Registry-Baustein hat seine Laufzeit', () => {
  for (const def of allBlockTypes()) {
    expect(runtimeFor([def.type]), `${def.type} fehlt in der Laufzeit`).toContain(`\`${def.tag}\``)
  }
})

test('eine Maske traegt nur die Laufzeit ihrer Bausteine', () => {
  const all = runtimeFor(allBlockTypes().map((def) => def.type))
  const text = runtimeFor(['text'])
  for (const tag of ['ff-kanban', 'ff-datalist', 'ff-formfield', 'ff-capture', 'ff-popup', 'ff-date']) {
    expect(text, `${tag} reist in einer Maske nur mit Text mit`).not.toContain(`\`${tag}\``)
  }
  expect(text.length).toBeLessThan(all.length / 2)
})

test('ohne Bausteine keine Laufzeit, ein unbekannter Baustein bricht ab', () => {
  expect(runtimeFor([])).toBe('')
  expect(() => runtimeFor(['gibtsnicht'])).toThrow(/gibtsnicht/)
})
