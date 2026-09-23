export interface DtkField {
  code: string
  name: string
}

export interface DtkTable {
  key: string

  name: string

  fields: DtkField[]

  expectedCount: number
}

const PAGE = 2048
const HEAD_LENGTH = 30

const HEAD_OFFSET = 2042

function isContinuationHead(bytes: Uint8Array, p: number): boolean {
  if (bytes[p] !== 0xfa) return false
  for (let i = p + 16; i <= p + 20; i++) if (bytes[i] !== 0xff) return false
  for (let i = p + 24; i <= p + 29; i++) if (bytes[i] !== 0xff) return false
  return true
}

function latin1(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)))
  }
  return s
}

function dtkTextFromBytes(bytes: Uint8Array): string {
  const parts: string[] = []
  let start = 0
  for (let p = HEAD_OFFSET; p + HEAD_LENGTH <= bytes.length; p += PAGE) {
    if (!isContinuationHead(bytes, p)) continue
    parts.push(latin1(bytes.subarray(start, p)))
    start = p + HEAD_LENGTH
  }
  parts.push(latin1(bytes.subarray(start)))
  return parts.join('')
}

function isGarbageIcon(c: number): boolean {
  return c < 32 || (c >= 127 && c <= 159) || c === 255
}

function cleanLabel(raw: string): string {
  let of = 0
  let to = raw.length
  while (of < to && isGarbageIcon(raw.charCodeAt(of))) of++
  while (to > of && isGarbageIcon(raw.charCodeAt(to - 1))) to--
  const t = raw.slice(of, to).trim()
  if (t === '' || t.length > 60) return ''
  for (let i = 0; i < t.length; i++) {
    if (isGarbageIcon(t.charCodeAt(i))) return ''
  }

  if (t.includes('@') || /^\d+,/.test(t)) return ''
  return t
}

interface RawField {
  pos: number
  len: number
  label: string
}

const codeOf = (f: RawField) => `${f.pos}_${f.len}`

const RECORD_ROW =
  /IDB(ID\d{4})_(\d+)_(\d+),(\d*),(\d+),(\d+),([^,\r\n]+),([A-Z]{1,4}\d?)/g

function harvestRecord(text: string): Map<string, Map<string, RawField>> {
  const tables = new Map<string, Map<string, RawField>>()
  for (const m of text.matchAll(RECORD_ROW)) {
    if (m[2] !== m[5] || m[3] !== m[6]) continue
    const label = cleanLabel(m[7])
    if (label === '') continue
    const field = { pos: Number(m[5]), len: Number(m[6]), label }
    let fields = tables.get(m[1])
    if (!fields) {
      fields = new Map()
      tables.set(m[1], fields)
    }
    if (!fields.has(codeOf(field))) fields.set(codeOf(field), field)
  }
  return tables
}

const POS_RECORD = /3,POS,(ID\d{4}), {5,9}(\d{1,4}) {50,64}\1/g

const FIELD_IN_POS_RECORD =
  / {100,}(\S[^\r\n]{0,49}?) {2,}(?:(\d{1,4}) +)?(\d{1,4})([A-Z]{1,4}\d?)(?=[ \r\n])/

const FLAGS_AFTER = /[NJ]{2}/

const RECORD_WINDOW = 1300

function harvestPosRecords(text: string): Map<string, Map<number, RawField>> {
  const tables = new Map<string, Map<number, RawField>>()
  for (const record of text.matchAll(POS_RECORD)) {
    if (record.index === undefined) continue
    const number = Number(record[2])
    const fields = tables.get(record[1])
    if (fields?.has(number)) continue
    const window = text.slice(record.index, record.index + RECORD_WINDOW)
    const m = FIELD_IN_POS_RECORD.exec(window)
    if (!m || m.index === undefined) continue
    const label = cleanLabel(m[1])
    if (label === '') continue
    const pos = Number(m[2] ?? 0)
    const len = Number(m[3])
    if (len < 1 || pos > 9999) continue
    const behind = window.slice(m.index + m[0].length, m.index + m[0].length + 60)
    if (!FLAGS_AFTER.test(behind)) continue
    const target = fields ?? new Map<number, RawField>()
    if (!fields) tables.set(record[1], target)
    target.set(number, { pos, len, label })
  }
  return tables
}

const POS_NUMBER = /3,POS,(ID\d{4}), {5,9}(\d{1,4})/g

function expectedCounts(text: string): Map<string, number> {
  const numbers = new Map<string, Set<number>>()
  for (const m of text.matchAll(POS_NUMBER)) {
    let s = numbers.get(m[1])
    if (!s) {
      s = new Set()
      numbers.set(m[1], s)
    }
    s.add(Number(m[2]))
  }
  return new Map([...numbers].map(([id, s]) => [id, s.size]))
}

const HEADER_KEY = /0,(ID\d{4}) {2,}/g
const NAME_BEFORE_TIME = / {2,}(\S[^\r\n]{0,58}?) {2,}\d{5}\.\d{2}\.\d{4}/

function tablesNames(text: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const m of text.matchAll(HEADER_KEY)) {
    if (m.index === undefined || names.has(m[1])) continue
    const window = text.slice(m.index, m.index + 500)
    const name = cleanLabel(NAME_BEFORE_TIME.exec(window)?.[1] ?? '')
    if (name !== '' && !/^ID\d{4}$/.test(name)) names.set(m[1], name)
  }
  return names
}

function addTogether(
  a: Map<string, RawField> | undefined,
  b: Map<number, RawField> | undefined,
  expected: number,
): RawField[] {
  const aFields = [...(a?.values() ?? [])]
  const bFields = [...(b?.values() ?? [])]
  const aCodes = new Set(aFields.map(codeOf))
  const bCodes = new Set(bFields.map(codeOf))

  const merged = new Map<string, RawField>()
  for (const f of [...aFields, ...bFields]) {
    if (!merged.has(codeOf(f))) merged.set(codeOf(f), f)
  }

  if (expected > 0 && merged.size > expected) {
    const confirmed = [...bCodes].filter((c) => aCodes.has(c)).length
    if (confirmed * 2 >= bCodes.size) {
      return aFields
    }

    return bFields
  }
  return [...merged.values()]
}

function parseDtk(text: string): DtkTable[] {
  const a = harvestRecord(text)
  const b = harvestPosRecords(text)
  const expected = expectedCounts(text)
  const names = tablesNames(text)

  const ids = new Set([...a.keys(), ...b.keys(), ...expected.keys()])
  const out: DtkTable[] = []
  for (const id of [...ids].sort()) {
    const expectedCount = expected.get(id) ?? 0
    const fields = addTogether(a.get(id), b.get(id), expectedCount).sort(
      (x, y) => x.pos - y.pos || x.len - y.len,
    )

    if (fields.length === 0 && expectedCount === 0) continue
    out.push({
      key: `IDB${id}`,
      name: names.get(id) ?? '',
      fields: fields.map((f) => ({ code: codeOf(f), name: f.label })),
      expectedCount: expectedCount,
    })
  }
  return out
}

export function dtkRead(bytes: Uint8Array): DtkTable[] {
  return parseDtk(dtkTextFromBytes(bytes))
}
