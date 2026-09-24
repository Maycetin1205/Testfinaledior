import { SOURCES_DIVIDER } from '../block/blockType'

// The one form of a field code SoftEngine lists: position and length.
export const POS_LEN = /^\d+_\d+$/

export function fieldCode(pos: string, len: string, prefix = ''): string {
  const p = pos.trim()
  const l = len.trim()
  if (!/^\d+$/.test(p) || !/^\d+$/.test(l) || Number(l) < 1) return ''
  return `${fieldPrefixFromInput(prefix)}${p}_${l}`
}

const PREFIX_FORM = /^[A-Za-z0-9_]+$/

export function fieldPrefixFromInput(raw: string): string {
  const t = raw.trim()
  return t !== '' && PREFIX_FORM.test(t) ? t : ''
}

const KEY_IDB_SHORT = /^(?:IDB)?ID(\d{1,4})$/i
const KEY_FREE = /^[A-Za-z][A-Za-z0-9.]*$/

export function keyFromInput(raw: string, idbShortForm = true): string {
  const t = raw.trim()
  const short = idbShortForm ? KEY_IDB_SHORT.exec(t) : null
  if (short) return `IDBID${short[1].padStart(4, '0')}`
  return KEY_FREE.test(t) ? t : ''
}

const HEADER_KEY_FORM = /^[A-Za-z][A-Za-z0-9]*_\d+_\d+$/

export function headerKeyFromInput(raw: string): string {
  const t = raw.trim()
  return HEADER_KEY_FORM.test(t) ? t : ''
}

export function keyDisplay(key: string | undefined): string {
  const m = /^IDB(ID\d{4})$/.exec(key ?? '')
  return m ? m[1] : (key ?? '')
}

export function columnsNameFromInput(raw: string): string {
  const t = raw.trim()
  if (t === '' || t.includes(',') || t.includes(SOURCES_DIVIDER)) return ''
  return t
}
