// Der Vertrag der Tastenkuerzel: was auf die Flaeche wirkt, haelt vor einem
// offenen Fenster an.
import { expect, test } from 'vitest'
import { tastenwirkung, type Tastenlage } from './useKeyboardShortcuts'

function lage(teil: Partial<Tastenlage>): Tastenlage {
  return {
    taste: '',
    mod: false,
    shift: false,
    imEingabefeld: false,
    fensterOffen: false,
    etwasGewaehlt: true,
    ...teil,
  }
}

test('bei offenem Datencenter trifft keine Taste den Baustein dahinter', () => {
  expect(tastenwirkung(lage({ taste: 'Delete', fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'Backspace', fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'd', mod: true, fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'z', mod: true, fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'z', mod: true, shift: true, fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'y', mod: true, fensterOffen: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'Escape', fensterOffen: true }))).toBe('nichts')
})

test('auf der offenen Flaeche wirken dieselben Tasten auf den gewaehlten Baustein', () => {
  expect(tastenwirkung(lage({ taste: 'Delete' }))).toBe('loeschen')
  expect(tastenwirkung(lage({ taste: 'Backspace' }))).toBe('loeschen')
  expect(tastenwirkung(lage({ taste: 'd', mod: true }))).toBe('duplizieren')
  expect(tastenwirkung(lage({ taste: 'z', mod: true }))).toBe('zurueck')
  expect(tastenwirkung(lage({ taste: 'z', mod: true, shift: true }))).toBe('vor')
  expect(tastenwirkung(lage({ taste: 'y', mod: true }))).toBe('vor')
  expect(tastenwirkung(lage({ taste: 'Escape' }))).toBe('abwaehlen')
})

test('Strg+S speichert auch im Eingabefeld und ueber einem offenen Fenster', () => {
  expect(tastenwirkung(lage({ taste: 's', mod: true }))).toBe('speichern')
  expect(tastenwirkung(lage({ taste: 's', mod: true, fensterOffen: true }))).toBe('speichern')
  expect(tastenwirkung(lage({ taste: 's', mod: true, imEingabefeld: true }))).toBe('speichern')
})

test('ohne gewaehlten Baustein loescht und dupliziert keine Taste', () => {
  expect(tastenwirkung(lage({ taste: 'Delete', etwasGewaehlt: false }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'd', mod: true, etwasGewaehlt: false }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'Escape', etwasGewaehlt: false }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'z', mod: true, etwasGewaehlt: false }))).toBe('zurueck')
})

test('im Eingabefeld bleibt die Flaeche unberuehrt', () => {
  expect(tastenwirkung(lage({ taste: 'Delete', imEingabefeld: true }))).toBe('nichts')
  expect(tastenwirkung(lage({ taste: 'z', mod: true, imEingabefeld: true }))).toBe('nichts')
})
