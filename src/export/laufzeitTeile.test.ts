// In die Maske reist nur, was ihre Bausteine einstecken: eine Maske aus Text
// und Tabelle traegt weder Nachschlagen noch Kanban noch Erfassen.
import { expect, test } from 'vitest'
import { laufzeitTeileFuer } from './laufzeitTeile'

test('eine Maske aus Textfeld und Tabelle traegt nur ihre eigenen Laufzeitteile', () => {
  const teile = laufzeitTeileFuer(new Set(['text', 'tabelle']))
  const namen = teile.map((t) => t.name)

  expect(namen).toContain('basis')
  expect(namen).toContain('text')
  expect(namen).toContain('tabelle')
  expect(namen).toContain('faehigkeit-quelle')
  expect(namen).toContain('faehigkeit-spalten')

  for (const fremd of ['faehigkeit-nachschlagen', 'faehigkeit-vorschlagListe', 'kanban', 'erfassung', 'formfeld']) {
    expect(namen, `${fremd} gehoert nicht in diese Maske`).not.toContain(fremd)
  }

  // Die Groessen stehen im Bericht, damit der Zuwachs je Teil sichtbar bleibt.
  const gesamt = teile.reduce((summe, t) => summe + t.bytes, 0)
  console.log(
    ['Laufzeitteile fuer Text + Tabelle:', ...teile.map((t) => `  ${t.name.padEnd(30)} ${(t.bytes / 1024).toFixed(1)} kB`),
      `  ${'zusammen'.padEnd(30)} ${(gesamt / 1024).toFixed(1)} kB`].join('\n'),
  )
})
