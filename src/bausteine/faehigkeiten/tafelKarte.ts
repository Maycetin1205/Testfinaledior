// Faehigkeit Tafelkarte: welche Stellen eine Karte der Tafel hat, wie viel Platz
// jede bekommt, woher sie ihren Wert holt und wie die Karte gezeichnet wird.
import { html, nothing, type TemplateResult } from 'lit'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { farbweltEigenschaft, farbweltWert, type FarbweltWert } from './farbwelt'
import { tierSymbol } from './tierSymbol'

export type Stelle = 'titel' | 'titelZusatz' | 'unterzeile' | 'zeit' | 'marke' | 'text' | 'datum' | 'chip' | 'bild'

export type KartenWerte = Record<Stelle, string>

// Der Platz steht im Namen, nicht in einem Tooltip: auf dem Tablet gibt es
// keinen, und wer ein langes Feld bindet, soll vorher lesen, was abgeschnitten wird.
export const STELLEN: readonly { stelle: Stelle; name: string; platz: string }[] = [
  { stelle: 'titel', name: 'Titel', platz: '1 Zeile, danach …' },
  { stelle: 'titelZusatz', name: 'Zusatz neben dem Titel', platz: 'teilt sich die Zeile mit dem Titel' },
  { stelle: 'unterzeile', name: 'Unterzeile', platz: '1 Zeile, danach …' },
  { stelle: 'zeit', name: 'Zeit oben rechts', platz: 'kurz, etwa 5 Zeichen' },
  { stelle: 'marke', name: 'Markierung', platz: 'kurz, etwa 12 Zeichen' },
  { stelle: 'text', name: 'Text', platz: 'bis 2 Zeilen, danach …' },
  { stelle: 'datum', name: 'Datum', platz: 'kurz, etwa 10 Zeichen' },
  { stelle: 'chip', name: 'Chip', platz: '1 Zeile, etwa 20 Zeichen' },
  { stelle: 'bild', name: 'Avatar', platz: 'Bild oder Tiersymbol' },
]

export interface Markierung {
  wert: string
  farbwelt: FarbweltWert
}

export interface KartenEinstellung {
  gebunden: (stelle: Stelle) => boolean
  bildArt: string
  chipFarbwelt: FarbweltWert
  marken: readonly Markierung[]
}

const STRICH = '—'

export function markenLesen(v: unknown): Markierung[] {
  let roh = v
  if (typeof roh === 'string') {
    try { roh = JSON.parse(roh) } catch { roh = [] }
  }
  if (!Array.isArray(roh)) return []
  return roh.map((x) => {
    const o = x && typeof x === 'object' ? x as Record<string, unknown> : {}
    return { wert: typeof o.wert === 'string' ? o.wert : '', farbwelt: farbweltWert(String(o.farbwelt ?? '')) }
  })
}

// Rang = Platz in der Liste; ein Wert, den die Liste nicht kennt, steht neutral
// hinter allen bekannten, ein leeres Feld ganz hinten.
export function markeVon(wert: string, marken: readonly Markierung[]): { rang: number; farbwelt: FarbweltWert } {
  const gesucht = wert.trim().toLowerCase()
  if (gesucht === '') return { rang: marken.length + 1, farbwelt: 'neutral' }
  const platz = marken.findIndex((m) => m.wert.trim().toLowerCase() === gesucht)
  return platz < 0 ? { rang: marken.length, farbwelt: 'neutral' } : { rang: platz, farbwelt: marken[platz].farbwelt }
}

// Zuerst nach der Liste der Markierungen („Notfall“ vor „OP“ vor allen anderen),
// dann nach dem Sortierfeld; Uhrzeiten und Nummern vergleichen als Zahl.
export function vergleicheKarten(
  a: KartenWerte & { sortierung: string },
  b: KartenWerte & { sortierung: string },
  marken: readonly Markierung[],
): number {
  const rang = markeVon(a.marke, marken).rang - markeVon(b.marke, marken).rang
  if (rang !== 0) return rang
  return a.sortierung.localeCompare(b.sortierung, 'de', { numeric: true })
}

export function kartenEigenschaften(): Eigenschaft[] {
  return [
    ...STELLEN.map(({ stelle, name, platz }): Eigenschaft => ({
      schluessel: `${stelle}Feld`,
      name: `Karte: ${name} · ${platz}`,
      beschreibung: `Feld, das auf jeder Karte als ${name} steht. Leer: die Stelle fehlt.`,
      art: 'field',
    })),
    {
      schluessel: 'sortierFeld',
      name: 'Karten sortieren nach',
      beschreibung: 'Nach den Markierungen (in ihrer Reihenfolge) werden die Karten nach diesem Feld sortiert, z. B. der Uhrzeit. Leer: wie geliefert.',
      art: 'field',
    },
    {
      schluessel: 'bildArt',
      name: 'Avatar zeigt',
      beschreibung: 'Bild: das Feld enthält eine Bildadresse. Tiersymbol: das Feld enthält die Tierart (Hund, Katze, …).',
      art: 'segment',
      bearbeitung: 'inspector',
      optionen: [{ wert: 'bild', name: 'Bild' }, { wert: 'tier', name: 'Tiersymbol' }],
      wenn: { schluessel: 'bildFeld', ungleich: '' },
    },
    {
      schluessel: 'marken',
      name: 'Markierungen',
      beschreibung: 'Welche Werte des Felds „Markierung“ welche Farbe tragen. Die Reihenfolge ist auch die Sortierung: der erste Wert steht oben.',
      art: 'eintraege',
      bearbeitung: 'inspector',
      eintragName: 'Markierung',
      titelSchluessel: 'wert',
      neuerEintrag: () => ({ wert: '', farbwelt: 'danger' }),
      wenn: { schluessel: 'markeFeld', ungleich: '' },
      eintrag: [
        { schluessel: 'wert', name: 'Wert im Feld', beschreibung: 'Genau dieser Wert, Groß- und Kleinschreibung egal, z. B. „Notfall“.', art: 'text' },
        farbweltEigenschaft('farbwelt', 'Farbe der Markierung. „Fehler“ rahmt zusätzlich die ganze Karte rot.'),
      ],
    },
    {
      ...farbweltEigenschaft('chipFarbwelt', 'Bedeutung des Chips auf den Karten — bestimmt die Chip-Farbe.'),
      name: 'Farbe des Chips',
      bearbeitung: 'inspector',
      wenn: { schluessel: 'chipFeld', ungleich: '' },
    },
  ]
}

// Ohne Werte zeichnet der Editor die Form: jede gebundene Stelle als Strich.
// In der Maske fehlt eine Stelle, deren Feld leer ist.
export function karteInhalt(werte: KartenWerte | null, e: KartenEinstellung): TemplateResult {
  const wert = (s: Stelle): string => werte?.[s] ?? ''
  const zeigt = (s: Stelle): boolean => e.gebunden(s) && (werte === null || wert(s).trim() !== '')
  const text = (s: Stelle, klasse: string): TemplateResult =>
    html`<span class=${klasse} data-ff-spot=${s}>${wert(s).trim() === '' ? STRICH : wert(s)}</span>`
  const leer = !(['titel', 'titelZusatz', 'unterzeile', 'text', 'chip', 'marke'] as const).some(zeigt)
  const marke = markeVon(wert('marke'), e.marken)
  const fuss = zeigt('datum') || zeigt('chip')
  return html`
    <div class="haupt">
      ${zeigt('bild') ? avatar(wert('bild'), e.bildArt) : nothing}
      <div class="ident">
        <div class="zeile1">
          ${zeigt('titel') || leer ? text('titel', 'name') : nothing}
          ${zeigt('titelZusatz') ? text('titelZusatz', 'zusatz') : nothing}
        </div>
        ${zeigt('unterzeile') ? text('unterzeile', 'unterzeile') : nothing}
      </div>
      ${zeigt('zeit') ? text('zeit', 'zeit') : nothing}
    </div>
    ${zeigt('marke') ? html`<div class="marken">${text('marke', `marke v-${marke.farbwelt}`)}</div>` : nothing}
    ${zeigt('text') ? text('text', 'grund') : nothing}
    ${fuss ? html`<div class="fuss">
      ${zeigt('datum') ? text('datum', 'datum') : nothing}
      ${zeigt('chip') ? text('chip', `chip v-${farbweltWert(e.chipFarbwelt)}`) : nothing}
    </div>` : nothing}`
}

function avatar(wert: string, art: string): TemplateResult {
  if (art === 'tier') {
    const tier = tierSymbol(wert)
    return html`<span class="bild tier" data-ff-spot="bild" style="color:${tier.farbe}">${tier.umriss}</span>`
  }
  return html`<span class="bild" data-ff-spot="bild">${wert.trim() === ''
    ? nothing
    : html`<img src=${wert} alt="" @error=${(e: Event) => { (e.target as HTMLElement).hidden = true }}>`}</span>`
}
