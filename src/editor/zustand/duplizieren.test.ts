// Der Vertrag von Duplizieren am Popup: die Kopie ist ein zweites Fenster mit
// demselben Inhalt, und der Editor zeigt sie.
import { expect, test } from 'vitest'
import '../../bausteine/anmeldung'
import type { Baustein } from '../../kern/maske/baum'
import { Editor } from './Editor'

function da(node: Baustein | null, was: string): Baustein {
  if (!node) throw new Error(`${was}: nicht angelegt`)
  return node
}

test('Duplizieren am Popup legt ein zweites Fenster samt Inhalt an', () => {
  const ed = new Editor()
  const popup = da(ed.addSeite('popup'), 'Popup')
  const text = da(ed.addBlock('text', popup.id), 'Text im Popup')
  ed.updateProperty(text.id, 'text', 'Kundennummer')

  const kopie = da(ed.duplicateBlock(popup.id), 'Kopie des Popups')

  // Zwei Fenster, nicht eines: eigene Kennung, eigener Name.
  expect(kopie.id).not.toBe(popup.id)
  expect(ed.pages.map((s) => s.name)).toEqual(['Hauptseite', 'Popup', 'Popup 2'])

  // Der Inhalt ist mitgekommen: eigene Kennung, derselbe Wert.
  const kinder = ed.childNodesOf(kopie.id)
  expect(kinder).toHaveLength(1)
  expect(kinder[0].id).not.toBe(text.id)
  expect(kinder[0].werte.text).toBe('Kundennummer')

  // Das Original bleibt unberuehrt, und die Kopie ist die gezeigte Seite.
  expect(ed.childNodesOf(popup.id).map((n) => n.id)).toEqual([text.id])
  expect(ed.activePageId).toBe(kopie.id)
})
