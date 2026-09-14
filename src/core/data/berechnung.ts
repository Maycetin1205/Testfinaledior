// Die Berechnung einer Tabellenzeile: EINE Produktgleichung ueber Spalten,
// Datenfelder und feste Zahlen, die sich nach jeder ihrer Groessen aufloesen
// laesst. Damit stehen alle Rechenrichtungen in einer Angabe, ohne dass irgendwo
// ein Gleichungsloeser stuende.
import {
  ausBasis,
  bildAlsText,
  bilderGleich,
  bildMit,
  EINHEIT_STANDARD,
  einheitKurz,
  GROESSENBILD_LEER,
  inBasis,
  type Groessenbild,
} from './einheiten'

// ---- Zahlen und Rundung ----

export type RundungsRichtung = 'auf' | 'ab' | 'kfm'

export interface Rundung {
  stellen: number
  richtung: RundungsRichtung
}

export const RUNDEN_STANDARD: Rundung = { stellen: 3, richtung: 'kfm' }

export const STELLEN_MAX = 6

// Getippte Zahl, deutsch und STRENG: '0.750' bleibt ungelesen, denn raten hiesse
// hier Faktor 1000.
const STRENG = /^-?\d+(,\d+)?$|^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/

export function zahlStreng(text: string): number | null {
  const t = text.trim()
  if (t === '' || !STRENG.test(t)) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function rundeWert(wert: number, runden: Rundung): number {
  const f = Math.pow(10, Math.max(0, runden.stellen))
  const x = wert * f
  // Epsilon gegen Gleitkomma-Reste: 9.000000001 darf nicht auf 10 aufrunden.
  const grob = runden.richtung === 'auf'
    ? Math.ceil(x - 1e-9)
    : runden.richtung === 'ab' ? Math.floor(x + 1e-9) : Math.round(x)
  return grob / f
}

// Gerechnete Werte reisen ohne Tausender-Gruppierung, so liest jeder Parser sie
// eindeutig zurueck.
export function zahlText(wert: number, stellen: number): string {
  return wert.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, stellen),
  })
}

export function alsRundung(roh: unknown): Rundung {
  if (!roh || typeof roh !== 'object') return { ...RUNDEN_STANDARD }
  const o = roh as Record<string, unknown>
  const stellen = typeof o.stellen === 'number' && Number.isInteger(o.stellen)
    && o.stellen >= 0 && o.stellen <= STELLEN_MAX
    ? o.stellen
    : RUNDEN_STANDARD.stellen
  const richtung = o.richtung === 'auf' || o.richtung === 'ab' || o.richtung === 'kfm'
    ? o.richtung
    : RUNDEN_STANDARD.richtung
  return { stellen, richtung }
}

// ---- Die Berechnung ----

// Ein Faktor ist eine Spalte der Zeile, ein Feld des zugeordneten Datensatzes
// oder eine feste Zahl. Ergebnis werden kann nur eine Spalte: ein Datenfeld
// gehoert dem ERP und eine feste Zahl steht fest.
export interface SpaltenFaktor {
  art: 'spalte'
  kennung: string

  // Die dauerhafte Kennung der Spalte, nie ihr Platz.
  spalte: string
  einheit: string

  // Darf rueckwaerts aus den uebrigen gerechnet werden.
  ergebnis: boolean

  // Gilt nur, wenn diese Spalte gerade das Ergebnis ist.
  runden: Rundung
}

export interface DatenFaktor {
  art: 'datenfeld'
  kennung: string

  // Der Anzeigename; der Feldcode ist Technik und steht nicht auf dem Schild.
  name: string

  // Feldbindung: „quelleId::code".
  feld: string
  einheit: string
}

export interface ZahlFaktor {
  art: 'zahl'
  kennung: string
  name: string
  zahl: number
  einheit: string
}

export type Faktor = SpaltenFaktor | DatenFaktor | ZahlFaktor

export interface Berechnung {
  kennung: string
  name: string

  // Die Leitgroesse links vom Gleichheitszeichen: leit = zaehler… ÷ nenner…
  leit: SpaltenFaktor
  zaehler: readonly Faktor[]
  nenner: readonly Faktor[]
}

export const BERECHNUNGEN_PROP = 'berechnungen'

export function alleFaktoren(b: Berechnung): Faktor[] {
  return [b.leit, ...b.zaehler, ...b.nenner]
}

// Die beiden Seiten der Gleichung: links mal links = rechts mal rechts.
function seiten(b: Berechnung): { links: Faktor[]; rechts: Faktor[] } {
  return { links: [b.leit, ...b.nenner], rechts: [...b.zaehler] }
}

export function ergebnisFaktoren(b: Berechnung): SpaltenFaktor[] {
  return alleFaktoren(b).filter(
    (f): f is SpaltenFaktor => f.art === 'spalte' && f.ergebnis && f.spalte !== '',
  )
}

export function faktorName(f: Faktor, spaltenTitel: (kennung: string) => string): string {
  if (f.art !== 'spalte') return f.name === '' ? '?' : f.name
  const titel = spaltenTitel(f.spalte)
  return titel === '' ? '?' : titel
}

// „Abgabemenge = Tiere × Tage × Körpergewicht × Behandlungsmenge ÷ Stammgewicht"
export function berechnungAlsText(
  b: Berechnung,
  spaltenTitel: (kennung: string) => string,
): string {
  return richtungAlsText(b, b.leit.kennung, spaltenTitel)
}

// Dieselbe Gleichung, nach EINEM Faktor aufgeloest und in Worten.
export function richtungAlsText(
  b: Berechnung,
  kennung: string,
  spaltenTitel: (kennung: string) => string,
): string {
  const { links, rechts } = seiten(b)
  const ziel = alleFaktoren(b).find((f) => f.kennung === kennung)
  if (ziel === undefined) return ''
  const eigene = links.some((f) => f.kennung === kennung) ? links : rechts
  const andere = eigene === links ? rechts : links
  const name = (f: Faktor): string => faktorName(f, spaltenTitel)
  const oben = andere.map(name).join(' × ')
  const unten = eigene.filter((f) => f.kennung !== kennung).map(name)
  const rest = unten.length === 0 ? '' : ` ÷ ${unten.join(' ÷ ')}`
  return `${name(ziel)} = ${oben}${rest}`
}

// Was ein Faktor gerade beitraegt. Leer, null, ungueltig und „noch nicht da"
// sind vier verschiedene Dinge und duerfen nie zu derselben Antwort fuehren.
export type FaktorStand =
  | { art: 'zahl'; zahl: number }
  | { art: 'leer' }
  | { art: 'ungueltig'; text: string }

  // Die Quelle hat Zeilen, aber fuer DIESE Zeile ist kein Satz zugeordnet.
  | { art: 'ohneSatz' }

  // Die Quelle hat noch gar nichts geliefert.
  | { art: 'nichtGeladen' }

export type BerechnungsLage =
  // Genau eine Luecke, und sie ist gerechnet.
  | { art: 'ergebnis'; kennung: string; spalte: string; zahl: number; text: string }

  // Mehr als eine Luecke: es wird nicht geraten.
  | { art: 'offen' }

  // Alles gefuellt und stimmig.
  | { art: 'stimmt' }

  | { art: 'widerspruch'; text: string }

  // Aufbau kaputt, Daten fehlen, Einheiten passen nicht, Teilen durch null.
  | { art: 'unvollstaendig'; text: string }

const FAST_NULL = 1e-12

function produkt(werte: readonly number[]): number {
  return werte.reduce((a, b) => a * b, 1)
}

// Die Groesse beider Seiten muss dieselbe sein, sonst rechnete die Gleichung
// Milligramm gegen Milliliter.
export function einheitenProbe(b: Berechnung): string {
  const { links, rechts } = seiten(b)
  const bildVon = (faktoren: readonly Faktor[]): Groessenbild | null => {
    let bild: Groessenbild | null = GROESSENBILD_LEER
    for (const f of faktoren) {
      if (bild === null) return null
      bild = bildMit(bild, f.einheit, 1)
    }
    return bild
  }
  const l = bildVon(links)
  const r = bildVon(rechts)
  if (l === null || r === null) return 'Eine Einheit ist unbekannt.'
  if (bilderGleich(l, r)) return ''
  return `Die Einheiten passen nicht zusammen: links ${bildAlsText(l)}, rechts ${bildAlsText(r)}.`
}

interface Gewogen {
  faktor: Faktor
  seite: 'links' | 'rechts'
  stand: FaktorStand

  // In der Basiseinheit; null, solange kein Wert dasteht.
  basis: number | null
}

function wiege(b: Berechnung, standVon: (f: Faktor) => FaktorStand): Gewogen[] | string {
  const { links, rechts } = seiten(b)
  const raus: Gewogen[] = []
  for (const [seite, faktoren] of [['links', links], ['rechts', rechts]] as const) {
    for (const faktor of faktoren) {
      const stand = standVon(faktor)
      if (stand.art === 'zahl') {
        const basis = inBasis(stand.zahl, faktor.einheit)
        if (basis === null) return `Die Einheit von „${faktor.kennung}" ist unbekannt.`
        raus.push({ faktor, seite, stand, basis })
      } else {
        raus.push({ faktor, seite, stand, basis: null })
      }
    }
  }
  return raus
}

function stoerung(g: Gewogen, name: (f: Faktor) => string): string {
  if (g.stand.art === 'ungueltig') {
    return `„${name(g.faktor)}" ist keine Zahl: ${g.stand.text}`
  }
  if (g.stand.art === 'ohneSatz') {
    return `Für „${name(g.faktor)}" ist kein Datensatz zugeordnet.`
  }
  if (g.stand.art === 'nichtGeladen') {
    return `„${name(g.faktor)}" ist noch nicht geladen.`
  }
  return ''
}

// Den Faktor aus den uebrigen: seine eigene Seite ohne ihn teilt die andere.
function loese(alle: readonly Gewogen[], ziel: Gewogen): number | 'null' | null {
  const ohneZiel = alle.filter((g) => g !== ziel)
  if (ohneZiel.some((g) => g.basis === null)) return null
  const eigene = ohneZiel.filter((g) => g.seite === ziel.seite).map((g) => g.basis as number)
  const andere = ohneZiel.filter((g) => g.seite !== ziel.seite).map((g) => g.basis as number)
  const teiler = produkt(eigene)
  if (Math.abs(teiler) < FAST_NULL) return 'null'
  const wert = produkt(andere) / teiler
  return Number.isFinite(wert) ? wert : null
}

export function rechneBerechnung(
  b: Berechnung,
  standVon: (f: Faktor) => FaktorStand,
  spaltenTitel: (kennung: string) => string,
  maengel: readonly string[] = [],
): BerechnungsLage {
  const name = (f: Faktor): string => faktorName(f, spaltenTitel)
  if (maengel.length > 0) return { art: 'unvollstaendig', text: maengel[0] }
  const probe = einheitenProbe(b)
  if (probe !== '') return { art: 'unvollstaendig', text: probe }

  const gewogen = wiege(b, standVon)
  if (typeof gewogen === 'string') return { art: 'unvollstaendig', text: gewogen }

  // Ein ungueltiger, nicht zugeordneter oder noch nicht geladener Faktor haelt
  // die ganze Gleichung an: sonst kaeme ein scheinbar gueltiges Ergebnis heraus.
  for (const g of gewogen) {
    const text = stoerung(g, name)
    if (text !== '') return { art: 'unvollstaendig', text }
  }

  const luecken = gewogen.filter((g) => g.basis === null)
  if (luecken.length > 1) return { art: 'offen' }

  if (luecken.length === 1) {
    const ziel = luecken[0]
    const f = ziel.faktor
    if (f.art !== 'spalte' || !f.ergebnis) return { art: 'offen' }
    const basis = loese(gewogen, ziel)
    if (basis === 'null') {
      return { art: 'unvollstaendig', text: `„${name(f)}" ließe sich nur durch Teilen durch null berechnen.` }
    }
    if (basis === null) return { art: 'offen' }
    const wert = ausBasis(basis, f.einheit)
    if (wert === null || !Number.isFinite(wert)) {
      return { art: 'unvollstaendig', text: `„${name(f)}" ergibt keine brauchbare Zahl.` }
    }
    const gerundet = rundeWert(wert, f.runden)
    return {
      art: 'ergebnis',
      kennung: f.kennung,
      spalte: f.spalte,
      zahl: gerundet,
      text: zahlText(gerundet, f.runden.stellen),
    }
  }

  // Alles gefuellt: nichts wird ersetzt, aber ein Widerspruch muss auffallen.
  // Stimmig heisst, dass sich WENIGSTENS EINE Groesse aus den uebrigen ergibt —
  // gerundete Werte treffen einander sonst nie genau.
  const pruefbar = gewogen.filter((g) => g.faktor.art === 'spalte' && g.faktor.ergebnis)
  if (pruefbar.length === 0) return { art: 'stimmt' }
  const abweichungen: string[] = []
  for (const g of pruefbar) {
    const f = g.faktor as SpaltenFaktor
    const basis = loese(gewogen, g)
    if (basis === 'null' || basis === null) continue
    const soll = ausBasis(basis, f.einheit)
    if (soll === null || !Number.isFinite(soll)) continue
    const ist = ausBasis(g.basis as number, f.einheit) as number
    const stufe = Math.pow(10, -Math.max(0, f.runden.stellen))
    if (Math.abs(soll - ist) <= stufe / 2 + 1e-9) return { art: 'stimmt' }
    abweichungen.push(
      `${name(f)} ${zahlText(ist, f.runden.stellen)} statt ${zahlText(rundeWert(soll, f.runden), f.runden.stellen)} ${einheitKurz(f.einheit)}`.trim(),
    )
  }
  if (abweichungen.length === 0) return { art: 'stimmt' }
  return {
    art: 'widerspruch',
    text: `Die Werte passen nicht zusammen (${b.name}): ${abweichungen.join('; ')}.`,
  }
}

// ---- Alle Berechnungen einer Zeile ----

export interface Zeilenwert {
  zahl: number
  text: string
}

export interface Zeilenrechnung {
  // Je Platz in der vollen Spaltenliste das Ergebnis, das dort hingehoert.
  werte: ReadonlyMap<number, Zeilenwert>

  // Je Berechnung, wie sie zuletzt ausging.
  lagen: ReadonlyMap<string, BerechnungsLage>
}

// Alle Berechnungen einer Zeile, so oft, wie eine der naechsten noch einen
// Wert liefern kann. Jede Zelle wird hoechstens EINMAL gefuellt, darum steht
// die Runde nach endlich vielen Durchgaengen still: gegenseitiges Neuberechnen
// ist so nicht moeglich. `standVon` liefert nur das GEGEBENE einer Zelle; was
// eine Berechnung gefuellt hat, reicht diese Stelle selbst an die naechste.
export function rechneZeile(
  berechnungen: readonly Berechnung[],
  platzVon: (spaltenKennung: string) => number,
  standVon: (f: Faktor) => FaktorStand,
  maengelVon: (b: Berechnung) => readonly string[],
  spaltenTitel: (kennung: string) => string,
): Zeilenrechnung {
  const werte = new Map<number, Zeilenwert>()
  const lagen = new Map<string, BerechnungsLage>()
  const stand = (f: Faktor): FaktorStand => {
    if (f.art === 'spalte') {
      const wert = werte.get(platzVon(f.spalte))
      if (wert !== undefined) return { art: 'zahl', zahl: wert.zahl }
    }
    return standVon(f)
  }
  for (let runde = 0; runde <= berechnungen.length; runde++) {
    let gefuellt = false
    for (const b of berechnungen) {
      if (lagen.get(b.kennung)?.art === 'ergebnis') continue
      const lage = rechneBerechnung(b, stand, spaltenTitel, maengelVon(b))
      if (lage.art === 'ergebnis') {
        const platz = platzVon(lage.spalte)
        if (platz !== -1 && !werte.has(platz)) {
          werte.set(platz, { zahl: lage.zahl, text: lage.text })
          gefuellt = true
        }
      }
      lagen.set(b.kennung, lage)
    }
    if (!gefuellt) break
  }
  return { werte, lagen }
}

// Eine FERTIGE Zeile, geliefert oder gebucht: was leer ist, wird gefuellt, wo
// eine Berechnung es kann. Ein Datenfeld hat hier keinen gewaehlten Satz.
export function ergaenzeZeile(
  berechnungen: readonly Berechnung[],
  platzVon: (spaltenKennung: string) => number,
  gegeben: (platz: number) => string,
  zahlVon: (text: string) => number | null,
): ReadonlyMap<number, Zeilenwert> {
  if (berechnungen.length === 0) return new Map()
  return rechneZeile(
    berechnungen,
    platzVon,
    (f) => {
      if (f.art === 'zahl') return { art: 'zahl', zahl: f.zahl }
      if (f.art === 'datenfeld') return { art: 'ohneSatz' }
      const platz = platzVon(f.spalte)
      const text = platz === -1 ? '' : gegeben(platz).trim()
      if (text === '') return { art: 'leer' }
      const zahl = zahlVon(text)
      return zahl === null ? { art: 'ungueltig', text } : { art: 'zahl', zahl }
    },
    () => [],
    () => '',
  ).werte
}

// Die Plaetze, die eine der Berechnungen fuellen kann.
export function ergebnisPlaetze(
  berechnungen: readonly Berechnung[],
  platzVon: (spaltenKennung: string) => number,
): Set<number> {
  const raus = new Set<number>()
  for (const b of berechnungen) {
    for (const f of ergebnisFaktoren(b)) {
      const platz = platzVon(f.spalte)
      if (platz !== -1) raus.add(platz)
    }
  }
  return raus
}

// ---- Lesen und Schreiben ----

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function alsFaktor(roh: unknown, nr: number): Faktor | null {
  if (!roh || typeof roh !== 'object') return null
  const o = roh as Record<string, unknown>
  const kennung = text(o.kennung) === '' ? `f${nr}` : text(o.kennung)
  const einheit = text(o.einheit) === '' ? EINHEIT_STANDARD : text(o.einheit)
  if (o.art === 'datenfeld') {
    return { art: 'datenfeld', kennung, name: text(o.name), feld: text(o.feld), einheit }
  }
  if (o.art === 'zahl') {
    const zahl = typeof o.zahl === 'number' && Number.isFinite(o.zahl) ? o.zahl : 1
    return { art: 'zahl', kennung, name: text(o.name), zahl, einheit }
  }
  return {
    art: 'spalte',
    kennung,
    spalte: text(o.spalte),
    einheit,
    ergebnis: o.ergebnis !== false,
    runden: alsRundung(o.runden),
  }
}

function alsLeit(roh: unknown, nr: number): SpaltenFaktor {
  const faktor = alsFaktor(roh, nr)
  // Die Leitgroesse ist immer eine Spalte; steht dort etwas anderes, bleibt sie
  // leer und die Berechnung meldet sich als unvollstaendig.
  if (faktor === null || faktor.art !== 'spalte') {
    return {
      art: 'spalte',
      kennung: `f${nr}`,
      spalte: '',
      einheit: EINHEIT_STANDARD,
      ergebnis: true,
      runden: { ...RUNDEN_STANDARD },
    }
  }
  return { ...faktor, ergebnis: true }
}

function alsListe(roh: unknown, ab: number): Faktor[] {
  if (!Array.isArray(roh)) return []
  const raus: Faktor[] = []
  roh.forEach((eintrag, i) => {
    const faktor = alsFaktor(eintrag, ab + i)
    if (faktor !== null) raus.push(faktor)
  })
  return raus
}

// Zwei Faktoren mit derselben Kennung fielen in jeder Aufloesung zusammen.
function mitEindeutigenKennungen(b: Berechnung): Berechnung {
  const vergeben = new Set<string>()
  let nr = 0
  const eindeutig = <T extends Faktor>(f: T): T => {
    let kennung = f.kennung
    while (kennung === '' || vergeben.has(kennung)) kennung = `f${++nr}`
    vergeben.add(kennung)
    return kennung === f.kennung ? f : { ...f, kennung }
  }
  return {
    ...b,
    leit: eindeutig(b.leit),
    zaehler: b.zaehler.map(eindeutig),
    nenner: b.nenner.map(eindeutig),
  }
}

export function berechnungenAus(roh: unknown): Berechnung[] {
  if (!Array.isArray(roh)) return []
  const raus: Berechnung[] = []
  roh.forEach((eintrag, i) => {
    if (!eintrag || typeof eintrag !== 'object') return
    const o = eintrag as Record<string, unknown>
    const zaehler = alsListe(o.zaehler, 100)
    const nenner = alsListe(o.nenner, 200)
    raus.push(mitEindeutigenKennungen({
      kennung: text(o.kennung) === '' ? `b${i + 1}` : text(o.kennung),
      name: text(o.name) === '' ? `Berechnung ${i + 1}` : text(o.name),
      leit: alsLeit(o.leit, 0),
      zaehler,
      nenner,
    }))
  })
  return raus
}

export function neuerFaktor(kennung: string): SpaltenFaktor {
  return {
    art: 'spalte',
    kennung,
    spalte: '',
    einheit: EINHEIT_STANDARD,
    ergebnis: true,
    runden: { ...RUNDEN_STANDARD },
  }
}

export function freieBerechnungsKennung(vorhandene: readonly Berechnung[]): string {
  let nr = vorhandene.length + 1
  const vergeben = new Set(vorhandene.map((b) => b.kennung))
  while (vergeben.has(`b${nr}`)) nr++
  return `b${nr}`
}

export function neueBerechnung(vorhandene: readonly Berechnung[]): Berechnung {
  const kennung = freieBerechnungsKennung(vorhandene)
  return {
    kennung,
    name: `Berechnung ${kennung.slice(1)}`,
    leit: neuerFaktor('f0'),
    zaehler: [neuerFaktor('f100')],
    nenner: [],
  }
}

// Eine freie Kennung fuer einen neuen Faktor DIESER Berechnung.
export function freieFaktorKennung(b: Berechnung): string {
  const vergeben = new Set(alleFaktoren(b).map((f) => f.kennung))
  let nr = 1
  while (vergeben.has(`f${nr}`)) nr++
  return `f${nr}`
}

// Was dem Aufbau fehlt, in Klartext. Eine gestrichene Spalte oder Quelle laesst
// die Berechnung UNVOLLSTAENDIG zurueck; ihr einfach den Operanden zu nehmen
// und mit einer anderen Formel weiterzurechnen waere stumm falsch.
export function berechnungsMaengel(
  b: Berechnung,
  spaltenTitel: (kennung: string) => string | null,
  feldName: (feld: string) => string | null,
): string[] {
  const maengel: string[] = []
  const name = (f: Faktor): string => faktorName(f, (k) => spaltenTitel(k) ?? '')
  if (b.zaehler.length === 0) maengel.push('Der Berechnung fehlt der rechte Teil der Formel.')
  for (const f of alleFaktoren(b)) {
    if (f.art === 'spalte') {
      if (f.spalte === '') {
        maengel.push('Eine Größe der Berechnung hat noch keine Spalte.')
      } else if (spaltenTitel(f.spalte) === null) {
        maengel.push(`Die Spalte einer Größe der Berechnung gibt es nicht mehr (${f.spalte}).`)
      }
      continue
    }
    if (f.art === 'datenfeld') {
      if (f.feld === '') maengel.push(`„${name(f)}" hat noch kein Datenfeld.`)
      else if (feldName(f.feld) === null) {
        maengel.push(`Das Datenfeld von „${name(f)}" gibt es nicht mehr.`)
      }
    }
  }
  if (ergebnisFaktoren(b).length === 0) {
    maengel.push('Keine Größe der Berechnung darf Ergebnis sein.')
  }
  const probe = einheitenProbe(b)
  if (probe !== '') maengel.push(probe)
  return maengel
}

// Die Feldbindungen, die eine Berechnung liest: der Export muss sie bestellen.
export function datenfelderAus(roh: unknown): string[] {
  const raus: string[] = []
  for (const b of berechnungenAus(roh)) {
    for (const f of alleFaktoren(b)) {
      if (f.art === 'datenfeld' && f.feld !== '' && !raus.includes(f.feld)) raus.push(f.feld)
    }
  }
  return raus
}
