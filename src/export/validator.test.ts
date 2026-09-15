import { describe, expect, test } from 'vitest'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../kern/maske/baum'
import { exportMask } from './exportMask'
import { END_MARKER, START_MARKER, failedChecks, validateMaskHtml } from './validator'

function maske(): Maskenbaum {
  return {
    [WURZEL_ID]: { id: WURZEL_ID, typ: WURZEL_TYP, werte: {}, elternId: null, kinderIds: [] },
  }
}

function echterExport(): string {
  return exportMask(maske(), 'Pruefmaske', [], []).html
}

function beanstandet(html: string): string[] {
  return failedChecks(validateMaskHtml(html)).map((f) => f.name)
}

test('eine echt exportierte Maske wird nicht beanstandet', () => {
  const html = echterExport()
  expect(beanstandet(html)).toEqual([])
  expect(html.startsWith(START_MARKER)).toBe(true)
  expect(html.trimEnd().endsWith(END_MARKER)).toBe(true)
})

describe('kaputte Maske', () => {
  test('CR-Zeichen: SoftEngine laedt die Datei nicht', () => {
    expect(beanstandet(echterExport().replace(/\n/g, '\r\n'))).toContain('LF-only')
  })

  test('Umlaut statt Entity', () => {
    const html = echterExport().replace('class="ff-root"', 'class="ff-root" title="Grün"')
    expect(beanstandet(html)).toContain('ASCII-only')
  })

  test('fehlender Start-Marker', () => {
    const html = echterExport().split('\n').slice(1).join('\n')
    expect(beanstandet(html)).toContain('Start-Marker Zeile 1')
  })

  test('fremdes Skript: die Maske laedt nichts nach', () => {
    const html = echterExport().replace('<script>', '<script src="fremd.js"></script>\n<script>')
    expect(beanstandet(html)).toContain('kein fremdes Skript')
  })

  test('Laufzeit nicht eingebettet: die Maske waere stumm', () => {
    const html = echterExport().replace(/customElements\.define/g, 'nichts')
    expect(beanstandet(html)).toContain('Laufzeit eingebettet')
  })

  // Jede Beanstandung muss dem Bediener sagen, WAS sie gefunden hat — die
  // Toolbar zeigt genau dieses Feld an (editor/shell/Toolbar.tsx).
  test('die Meldung nennt den Fund', () => {
    const html = echterExport().replace(/\n/g, '\r\n')
    const lf = failedChecks(validateMaskHtml(html)).find((f) => f.name === 'LF-only')
    expect(lf?.detail).toMatch(/CR-Zeichen/)
  })
})
