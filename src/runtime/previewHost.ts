import type { MaskHost } from './maskHost'

// The host of the editor: no rows, no answers, nothing sent, no sign-in. A block
// asking it gets the empty value and shows its placeholders.
export const previewHost: MaskHost = {
  start: () => {},
  hasData: () => false,
  onData: () => () => {},

  sources: () => [],
  source: () => undefined,
  rows: () => [],
  readField: () => '',
  writeField: () => false,

  relation: () => undefined,
  resolveParameter: () => '',
  runRelation: () => Promise.resolve({ value: '', raw: undefined, failed: true }),
  sendStartTool: () => false,
  sendBwLink: () => false,
  requestFreshData: () => {},

  loadRowsPerRelation: () => {},
  fetchValueSource: () => {},
  fetchQuerySource: () => {},
}
