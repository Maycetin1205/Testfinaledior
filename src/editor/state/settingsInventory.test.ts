import { expect, test } from 'vitest'
import '../../blocks/register'
import type { BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { allBlockTypes } from '../../core/block/registry'

// How many settings the builder can reach at the blocks: every property the
// editor shows somewhere (bar, window, column head, block) and every switch,
// field choice and place choice at an entry of a list. The ceiling falls with
// every chat that strikes a setting (offen.md, 5g and 5h) and rises only with
// a line in entschieden.md that names the mask which needs the new setting.
// 14.10.: 77 settings, 29 of them never touched by any of the three masks.
const CEILING = 77

function settingsOf(def: BlockType): number {
  const shown = Object.values(def.properties).filter((p) => p.place !== 'none').length
  const binding = capability(def, 'list')?.binding
  if (!binding) return shown
  return shown
    + (binding.entryFlag?.length ?? 0)
    + (binding.entryFieldChoice?.length ?? 0)
    + (binding.entryPlace ? 1 : 0)
}

test('der Editor zeigt nicht mehr Einstellungen als die Decke erlaubt', () => {
  const counts = allBlockTypes().map((def) => `${def.name} ${settingsOf(def)}`)
  const total = allBlockTypes().reduce((sum, def) => sum + settingsOf(def), 0)
  expect(total, `${total} Einstellungen (${counts.join(', ')}), die Decke ist ${CEILING}; `
    + 'eine neue Einstellung braucht eine Zeile in docs/entschieden.md mit der Maske, die sie braucht')
    .toBeLessThanOrEqual(CEILING)
})
