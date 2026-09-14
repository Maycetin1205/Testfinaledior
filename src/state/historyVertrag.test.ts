import { expect, test } from 'vitest'
import { ROOT_ID, ROOT_TYPE, type BlockTree } from '../core/blocks/BlockData'
import { Historie, type EditorSnapshot } from './history'

function stand(wert: number): EditorSnapshot {
  const tree: BlockTree = {
    [ROOT_ID]: {
      id: ROOT_ID,
      type: ROOT_TYPE,
      parentId: null,
      childIds: [],
      props: { pruefwert: wert },
    },
  }
  return {
    tree,
    selectedId: null,
    activePageId: ROOT_ID,
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
  expect(vorher?.tree[ROOT_ID]?.props.pruefwert).toBe(0)
  expect(historie.canUndo).toBe(false)
  expect(historie.canRedo).toBe(true)

  wert = 0
  const nachher = historie.redo(snapshot)
  expect(nachher?.tree[ROOT_ID]?.props.pruefwert).toBe(2)
})
