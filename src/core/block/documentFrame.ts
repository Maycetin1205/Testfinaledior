import { ROOT_ID, type MaskTree } from './tree'

export const DOCUMENT_FRAME_PROP = 'documentFrame'

export const FRAME_SPOTS = 5

export function frameNumber(raw: unknown): string {
  const text = typeof raw === 'string'
    ? raw.trim()
    : typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : ''
  if (!/^\d{1,5}$/.test(text) || Number(text) === 0) return ''
  return text.padStart(FRAME_SPOTS, '0')
}

export function frameNumberOf(tree: MaskTree): string {
  return frameNumber(tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP])
}

export function documentFileNames(number: string): { html: string; sevariablen: string } {
  return {
    html: `Rahmen${number}.basis.source.html`,
    sevariablen: `Rahmen${number}.basis.SEvariablen.json`,
  }
}
