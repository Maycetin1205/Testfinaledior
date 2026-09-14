// Die EINE Eingabestelle mit Vorschlagsliste: Erfassungszelle und Formularfeld.
import { css, html, nothing, type TemplateResult } from 'lit'
import { vorschlagListeTpl, type Vorschlag } from './vorschlagListe'

// Ruhig = der Wert steht so in den Daten. Geaendert = vorgemerkt, noch nicht
// geschrieben. Automatisch = aus einem gewaehlten Satz gefuellt.
export type ZellenZustand = 'ruhig' | 'geaendert' | 'automatisch'

export interface EingabeStelleLage {
  wert: string

  // Beschriftung fuer die Vorlesehilfe; die Zelle nimmt ihren Spaltentitel.
  titel: string

  // Leer heisst keiner. Die naechste Erfassungszeile zeigt ihn dauerhaft;
  // das Formularfeld zeichnet seinen eigenen darueber.
  platzhalter: string

  // Die Klasse des Eingabefeldes: die Zelle traegt darin ihren Zustand, das
  // Formularfeld sein `ctrl`.
  klasse: string

  // Die Klasse des Halters, an dem die Liste haengt. Er braucht
  // `position: relative`; das steht beim jeweiligen Baustein.
  halterKlasse: string

  // Nur die Zelle: der Platz in der VOLLEN Spaltenliste, nicht die Nummer des
  // gezeichneten Feldes — eine versteckte Spalte davor traefe sonst die falsche
  // Zelle.
  platz?: number

  vorschlaege: readonly Vorschlag[]

  marke: number

  listeNachOben?: boolean

  // Was im Feld mit drinsteht: die Lupe des Formularfelds.
  neben?: TemplateResult
}

export interface EingabeStelleHandeln {
  tippen: (text: string) => void

  taste: (e: KeyboardEvent) => void

  verlassen: (text: string) => void

  waehleVorschlag: (index: number) => void

  setzeMarke: (index: number) => void
}

const ZELL_KLASSE: Record<ZellenZustand, string> = {
  ruhig: 'zell-eingabe',
  geaendert: 'zell-eingabe geaendert',
  automatisch: 'zell-eingabe auto',
}

export function zellenKlasse(zustand: ZellenZustand): string {
  return ZELL_KLASSE[zustand]
}

export function eingabeStelleTpl(
  lage: EingabeStelleLage,
  tun: EingabeStelleHandeln,
): TemplateResult {
  return html`<div
    class=${lage.listeNachOben === true ? `${lage.halterKlasse} nach-oben` : lage.halterKlasse}
  >
    <input
      class=${lage.klasse}
      type="text"
      data-spalte=${lage.platz ?? nothing}
      aria-label=${lage.titel !== '' ? lage.titel : nothing}
      placeholder=${lage.platzhalter !== '' ? lage.platzhalter : nothing}
      .value=${lage.wert}
      @input=${(e: Event) => tun.tippen((e.target as HTMLInputElement).value)}
      @keydown=${(e: KeyboardEvent) => tun.taste(e)}
      @blur=${(e: Event) => tun.verlassen((e.target as HTMLInputElement).value)}
    />
    ${lage.neben ?? nothing}
    ${lage.vorschlaege.length === 0 ? nothing : vorschlagListeTpl({
      eintraege: lage.vorschlaege,
      marke: lage.marke,
      onWaehlen: (i) => tun.waehleVorschlag(i),
      onMarke: (i) => tun.setzeMarke(i),
    })}
  </div>`
}

// Die Eingabestellen eines Bereichs an DIESEM Platz, in Zeilenreihenfolge.
export function zellenFelder(
  wurzel: ShadowRoot | null | undefined,
  bereich: string,
  platz: number,
): HTMLInputElement[] {
  const gefunden = wurzel?.querySelectorAll<HTMLInputElement>(
    `${bereich} .zell-eingabe[data-spalte="${platz}"]`,
  )
  return gefunden === undefined ? [] : Array.from(gefunden)
}

// In eine Eingabestelle gehen: Fokus, Text markiert, ins Bild gerollt.
export function geheInZelle(feld: HTMLInputElement | null | undefined): boolean {
  if (!feld) return false
  feld.focus()
  feld.select()
  feld.scrollIntoView({ block: 'nearest' })
  return true
}

export const zellenEingabeStil = css`
      .zell-beschriftung {
        display: block;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .zell-halter {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
      }

      .zell-halter.nach-oben .vorschlaege {
        top: auto;
        bottom: 100%;
        margin: 0 0 2px;
      }

      .zell-eingabe {
        box-sizing: border-box;
        width: 100%;
        height: calc(var(--zeilen-hoehe) - 8px);
        min-width: 0;
        padding: 0 var(--se-eingabe-x);
        font-family: var(--se-font);
        font-size: var(--se-fs);
        color: var(--se-ink);
        background: transparent;
        border: var(--se-border) solid transparent;
        border-radius: var(--se-r-sm);
      }

      /* Die Zelle mit der Schreibmarke zeigt es: Rahmen in der Kennfarbe. */
      .zell-eingabe:focus {
        outline: none;
        border-color: var(--se-accent);
        background: var(--se-panel);
      }

      /* Eine Zahl sitzt rechts, in der Eingabezelle wie in jeder anderen Zelle
         der Tabelle. Nur unter dem Schreibzeiger nicht: „1," ist noch keine
         Zahl, die Schrift spraenge beim Komma hin und her. */
      .zahl > .zell-halter > .zell-eingabe { text-align: right; }
      .zahl > .zell-halter > .zell-eingabe:focus { text-align: left; }

      .zell-eingabe::placeholder { color: transparent; }
      .zeile.erfassung .zell-eingabe::placeholder { color: var(--se-faint); }
      .zeile:focus-within .zell-eingabe::placeholder { color: var(--se-faint); }

      .zell-eingabe.geaendert {
        background: var(--se-amber-shell);
        border-color: var(--se-amber-line);
        color: var(--se-ink);
        font-weight: 600;
      }

      /* Aus dem gewaehlten Satz uebernommen: die Flaeche sagt es, die Schrift
         bleibt die der Zeile. Kursiv und Kennfarbe lasen sich wie ein Fehler. */
      .zell-eingabe.auto {
        color: var(--se-ink);
        background: var(--se-accent-soft);
      }
`
