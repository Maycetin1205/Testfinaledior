import { expect, test } from 'vitest'
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../core/blocks/BlockData'
import { Historie, type EditorSnapshot } from './history'

function stand(wert: number): EditorSnapshot {
  const tree: Maskenbaum = {
    [WURZEL_ID]: {
      id: WURZEL_ID,
      type: WURZEL_TYP,
      parentId: null,
      childIds: [],
      props: { pruefwert: wert },
    },
  }
  return {
    tree,
    selectedId: null,
    activePageId: WURZEL_ID,
    datenquellen: [],
    relationen: [],
  }
}

test('eine Transaktion fasst mehrere Zwischenstaende zu einem Undo-Schritt zusammen', () => {
  const historie = new Historie()
  let wert = 0
  const snapshot = () => stand(wert)

  historie.begin(snapshot)
  wert = 1
  historie.record(snapshot)
  wert = 2
  historie.record(snapshot)
  historie.end()

  const vorher = historie.undo(snapshot)
  expect(vorher?.tree[WURZEL_ID]?.props.pruefwert).toBe(0)
  expect(historie.canUndo).toBe(false)
  expect(historie.canRedo).toBe(true)

  wert = 0
  const nachher = historie.redo(snapshot)
  expect(nachher?.tree[WURZEL_ID]?.props.pruefwert).toBe(2)
})
