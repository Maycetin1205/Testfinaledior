// Liest eine DTK-Datei aus SoftEngine: Tabellen mit ihren Feldern.
export interface DtkFeld {
  code: string
  label: string
}

export interface DtkTabelle {
  kennung: string

  name: string

  felder: DtkFeld[]

  soll: number
}

const SEITE = 2048
const KOPF_LAENGE = 30

const KOPF_VERSATZ = 2042

function istFortsetzungsKopf(bytes: Uint8Array, p: number): boolean {
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

function dtkTextAusBytes(bytes: Uint8Array): string {
  const teile: string[] = []
  let start = 0
  for (let p = KOPF_VERSATZ; p + KOPF_LAENGE <= bytes.length; p += SEITE) {
    if (!istFortsetzungsKopf(bytes, p)) continue
    teile.push(latin1(bytes.subarray(start, p)))
    start = p + KOPF_LAENGE
  }
  teile.push(latin1(bytes.subarray(start)))
  return teile.join('')
}

function istMuellZeichen(c: number): boolean {
  return c < 32 || (c >= 127 && c <= 159) || c === 255
}

function sauberesLabel(roh: string): string {
  let von = 0
  let bis = roh.length
  while (von < bis && istMuellZeichen(roh.charCodeAt(von))) von++
  while (bis > von && istMuellZeichen(roh.charCodeAt(bis - 1))) bis--
  const t = roh.slice(von, bis).trim()
  if (t === '' || t.length > 60) return ''
  for (let i = 0; i < t.length; i++) {
    if (istMuellZeichen(t.charCodeAt(i))) return ''
  }

  if (t.includes('@') || /^\d+,/.test(t)) return ''
  return t
}

interface RohFeld {
  pos: number
  len: number
  label: string
}

const codeVon = (f: RohFeld) => `${f.pos}_${f.len}`

const DSATZ_ZEILE =
  /IDB(ID\d{4})_(\d+)_(\d+),(\d*),(\d+),(\d+),([^,\r\n]+),([A-Z]{1,4}\d?)/g

function ernteDsatz(text: string): Map<string, Map<string, RohFeld>> {
  const tabellen = new Map<string, Map<string, RohFeld>>()
  for (const m of text.matchAll(DSATZ_ZEILE)) {
    if (m[2] !== m[5] || m[3] !== m[6]) continue
    const label = sauberesLabel(m[7])
    if (label === '') continue
    const feld = { pos: Number(m[5]), len: Number(m[6]), label }
    let felder = tabellen.get(m[1])
    if (!felder) {
      felder = new Map()
      tabellen.set(m[1], felder)
    }
    if (!felder.has(codeVon(feld))) felder.set(codeVon(feld), feld)
  }
  return tabellen
}

const POS_SATZ = /3,POS,(ID\d{4}), {5,9}(\d{1,4}) {50,64}\1/g

const FELD_IM_POS_SATZ =
  / {100,}(\S[^\r\n]{0,49}?) {2,}(?:(\d{1,4}) +)?(\d{1,4})([A-Z]{1,4}\d?)(?=[ \r\n])/

const FLAGS_DANACH = /[NJ]{2}/

const SATZ_FENSTER = 1300

function erntePosSaetze(text: string): Map<string, Map<number, RohFeld>> {
  const tabellen = new Map<string, Map<number, RohFeld>>()
  for (const satz of text.matchAll(POS_SATZ)) {
    if (satz.index === undefined) continue
    const nummer = Number(satz[2])
    const felder = tabellen.get(satz[1])
    if (felder?.has(nummer)) continue
    const fenster = text.slice(satz.index, satz.index + SATZ_FENSTER)
    const m = FELD_IM_POS_SATZ.exec(fenster)
    if (!m || m.index === undefined) continue
    const label = sauberesLabel(m[1])
    if (label === '') continue
    const pos = Number(m[2] ?? 0)
    const len = Number(m[3])
    if (len < 1 || pos > 9999) continue
    const dahinter = fenster.slice(m.index + m[0].length, m.index + m[0].length + 60)
    if (!FLAGS_DANACH.test(dahinter)) continue
    const ziel = felder ?? new Map<number, RohFeld>()
    if (!felder) tabellen.set(satz[1], ziel)
    ziel.set(nummer, { pos, len, label })
  }
  return tabellen
}

const POS_NUMMER = /3,POS,(ID\d{4}), {5,9}(\d{1,4})/g

function sollZahlen(text: string): Map<string, number> {
  const nummern = new Map<string, Set<number>>()
  for (const m of text.matchAll(POS_NUMMER)) {
    let s = nummern.get(m[1])
    if (!s) {
      s = new Set()
      nummern.set(m[1], s)
    }
    s.add(Number(m[2]))
  }
  return new Map([...nummern].map(([id, s]) => [id, s.size]))
}

const KOPFSATZ = /0,(ID\d{4}) {2,}/g
const NAME_VOR_ZEIT = / {2,}(\S[^\r\n]{0,58}?) {2,}\d{5}\.\d{2}\.\d{4}/

function tabellenNamen(text: string): Map<string, string> {
  const namen = new Map<string, string>()
  for (const m of text.matchAll(KOPFSATZ)) {
    if (m.index === undefined || namen.has(m[1])) continue
    const fenster = text.slice(m.index, m.index + 500)
    const name = sauberesLabel(NAME_VOR_ZEIT.exec(fenster)?.[1] ?? '')
    if (name !== '' && !/^ID\d{4}$/.test(name)) namen.set(m[1], name)
  }
  return namen
}

function fuegeZusammen(
  a: Map<string, RohFeld> | undefined,
  b: Map<number, RohFeld> | undefined,
  soll: number,
): RohFeld[] {
  const aFelder = [...(a?.values() ?? [])]
  const bFelder = [...(b?.values() ?? [])]
  const aCodes = new Set(aFelder.map(codeVon))
  const bCodes = new Set(bFelder.map(codeVon))

  const vereinigt = new Map<string, RohFeld>()
  for (const f of [...aFelder, ...bFelder]) {
    if (!vereinigt.has(codeVon(f))) vereinigt.set(codeVon(f), f)
  }

  if (soll > 0 && vereinigt.size > soll) {
    const bestaetigt = [...bCodes].filter((c) => aCodes.has(c)).length
    if (bestaetigt * 2 >= bCodes.size) {
      return aFelder
    }

    return bFelder
  }
  return [...vereinigt.values()]
}

function parseDtk(text: string): DtkTabelle[] {
  const a = ernteDsatz(text)
  const b = erntePosSaetze(text)
  const soll = sollZahlen(text)
  const namen = tabellenNamen(text)

  const ids = new Set([...a.keys(), ...b.keys(), ...soll.keys()])
  const raus: DtkTabelle[] = []
  for (const id of [...ids].sort()) {
    const sollZahl = soll.get(id) ?? 0
    const felder = fuegeZusammen(a.get(id), b.get(id), sollZahl).sort(
      (x, y) => x.pos - y.pos || x.len - y.len,
    )

    if (felder.length === 0 && sollZahl === 0) continue
    raus.push({
      kennung: `IDB${id}`,
      name: namen.get(id) ?? '',
      felder: felder.map((f) => ({ code: codeVon(f), label: f.label })),
      soll: sollZahl,
    })
  }
  return raus
}

export function dtkLesen(bytes: Uint8Array): DtkTabelle[] {
  return parseDtk(dtkTextAusBytes(bytes))
}
