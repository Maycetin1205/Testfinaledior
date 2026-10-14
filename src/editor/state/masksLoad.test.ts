import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import '../../blocks/register'
import { maskNameOf } from '../../core/block/maskName'
import { checkDataSources } from '../../core/data/dataSources'
import { checkRelationTemplates } from '../../core/data/relations'
import { exportMask } from '../../export/exportMask'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { checkTreeState } from './checkTreeState'
import { liftState } from './maskSchema'

// Every mask kept under masken/ goes the way the editor takes it: lifted to the
// current step, read like a file on load, exported and checked like the
// export button does. A step that forgets a value or a block that is gone
// shows here, before a customer opens the mask.
const MASKS_DIR = fileURLToPath(new URL('../../../masken', import.meta.url))
const MASK_SUFFIX = '.aufbau-maske.json'

function maskFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(MASK_SUFFIX))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

const files = maskFiles(MASKS_DIR)

test('unter masken/ liegen Masken', () => {
  expect(files.length, `keine ${MASK_SUFFIX} unter ${MASKS_DIR}`).toBeGreaterThan(0)
})

const named = files.map((file) => [path.relative(MASKS_DIR, file).split(path.sep).join('/'), file])

test.each(named)('%s lädt und exportiert', (_name, file) => {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>

  const lifted = liftState(raw)
  if (lifted === null) throw new Error(`der Heber liest Stufe ${String(raw.schemaVersion)} nicht`)

  const state = checkTreeState({ tree: lifted.tree })
  if (state === null) throw new Error('der Anfang der Maske fehlt')
  expect(Object.keys(state.tree).sort(), 'Bausteine fallen beim Laden weg')
    .toEqual(Object.keys(lifted.tree as object).sort())

  const sources = checkDataSources(lifted.dataSources)
  const relation = checkRelationTemplates(lifted.relation)
  expect(sources.map((s) => s.id), 'Datenquellen fallen beim Laden weg')
    .toEqual((lifted.dataSources as { id: string }[]).map((s) => s.id))
  expect(relation.map((r) => r.id), 'Relationen fallen beim Laden weg')
    .toEqual((lifted.relation as { id: string }[]).map((r) => r.id))

  const { html } = exportMask(state.tree, maskNameOf(state.tree), sources, relation)
  expect(failedChecks(validateMaskHtml(html)), 'der Export besteht seine Prüfung nicht').toEqual([])
})
