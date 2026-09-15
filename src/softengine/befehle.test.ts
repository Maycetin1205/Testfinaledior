import { expect, test, vi } from 'vitest'

// Was die Maske als Bruecke sieht. Nur diese eine Funktion entscheidet, ob ein
// Befehl ueberhaupt hinausgeht.
const brueckeGlobal: { basisHTML_SND_MSG?: (verb: string, obj: unknown) => void } = {}

vi.mock('./bridge', () => ({ seFenster: () => brueckeGlobal }))

const { sendeBwLink } = await import('./befehle')

// Dieselbe Form wie SoftEngines sendBWLinkIntern (kontrakte.md 13). Ohne Bruecke
// muss die Kette erfahren, dass nichts hinausging, sonst liefe sie weiter.
test('ein BW-Befehl geht hinaus wie bei SoftEngines sendBWLinkIntern', () => {
  expect(sendeBwLink('TABELLEPOS_DETAILS,48')).toBe(false)

  const gesendet: unknown[] = []
  brueckeGlobal.basisHTML_SND_MSG = (verb, obj) => { gesendet.push([verb, obj]) }
  expect(sendeBwLink('TABELLEPOS_DETAILS,48')).toBe(true)
  expect(sendeBwLink('0,START_TOOL,5')).toBe(true)
  expect(gesendet).toEqual([
    ['HTMLEVENT', { art: 'BWLINK', params: 'TABELLEPOS_DETAILS,48' }],
    ['START_TOOL', { NR: '5' }],
  ])
})
