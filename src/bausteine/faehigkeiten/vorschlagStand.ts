// Der Stand der Vorschlagsliste an EINER Eingabestelle: Treffer, Marke, zugemacht.
import type { Vorschlag } from './vorschlagListe'

// Die Marke laeuft um: unter dem letzten Treffer geht es oben wieder los.
function bewegteMarke(marke: number, anzahl: number, schritt: 1 | -1): number {
  if (anzahl <= 0) return 0
  return (((marke + schritt) % anzahl) + anzahl) % anzahl
}

// Eine Marke hinter dem Ende waere eine Uebernahme ins Leere.
function gueltigeMarke(marke: number, anzahl: number): number {
  if (anzahl <= 0) return 0
  return marke < 0 || marke >= anzahl ? 0 : marke
}

export type TastenFolge =
  | 'marke-hoch'
  | 'marke-runter'
  | 'uebernehmen'
  | 'liste-zu'
  | 'liste-auf'
  | 'fenster'
  | 'weiter'
  | 'leeren'
  | 'nichts'

// Alt+Pfeil-runter ist das zweite F5: auf manchen Tastaturen liegt F5 auf einer
// Zweitbelegung.
export function tasteVon(e: KeyboardEvent): string {
  return e.key === 'ArrowDown' && e.altKey ? 'F5' : e.key
}

export interface TastenLage {
  // Die Liste dieser Stelle steht offen. Eine Erfassungszeile teilt sich einen
  // Stand ueber alle Zellen, darum sagt es der Aufrufer.
  listeOffen: boolean

  feldLeer: boolean

  // Der Bediener hat in DIESER Stelle selbst getippt.
  getippt: boolean

  // Hinter der Stelle steht eine Nachschlage-Quelle. Eine freie Zelle kennt nur
  // Weitergehen und Leeren.
  nachschlagbar: boolean

  // Ob die Quelle Saetze hat, wird erst gefragt, wenn eine Taste sie braucht:
  // die Antwort kostet einen Durchgang durch die Quelle.
  hatSaetze: () => boolean

  // Die Stelle kann selbst zur naechsten springen (die Erfassungszeile kann es,
  // das Formularfeld nicht — dort geht Tab den Weg des Browsers).
  springt: boolean
}

// Die EINE Tastenlogik fuer Formularfeld und Erfassungszelle.
function tastenFolge(taste: string, l: TastenLage & {
  treffer: number

  // Hat der Bediener selbst ausgesucht, gilt seine Wahl.
  markeVonHand: boolean
}): TastenFolge {
  // Eindeutig ist die Wahl, wenn der Bediener sie selbst markiert hat oder nur
  // ein Treffer dasteht.
  const eindeutig = l.markeVonHand || l.treffer === 1

  if (taste === 'Tab') {
    if (l.listeOffen && eindeutig) return 'uebernehmen'
    return l.springt ? 'weiter' : 'nichts'
  }
  if (taste === 'F5') {
    return l.nachschlagbar ? 'fenster' : 'nichts'
  }
  if (taste === 'Escape') {
    if (l.listeOffen) return 'liste-zu'
    return l.feldLeer ? 'nichts' : 'leeren'
  }
  if (taste === 'ArrowDown') {
    if (l.listeOffen) return 'marke-runter'
    return l.nachschlagbar && l.hatSaetze() ? 'liste-auf' : 'nichts'
  }
  if (taste === 'ArrowUp') return l.listeOffen ? 'marke-hoch' : 'nichts'
  if (taste !== 'Enter') return 'nichts'

  // Genau ein Treffer ist keine Auswahl, sondern das Ergebnis; bei mehreren geht
  // das grosse Fenster auf, statt stumm den ersten zu nehmen.
  if (l.listeOffen) return eindeutig ? 'uebernehmen' : 'fenster'

  if (l.feldLeer) {
    // Wer weitergehen kann, geht weiter; wer nicht, macht das Fenster auf, denn
    // ein leeres Feld hat nichts, wonach es suchen koennte.
    if (l.springt) return 'weiter'
    return l.nachschlagbar && l.hatSaetze() ? 'fenster' : 'nichts'
  }
  // Getippter Text ohne Treffer bleibt stehen: das Fenster belohnte sonst den
  // Tippfehler und der Bediener verliert seinen Text aus den Augen.
  if (l.getippt && l.nachschlagbar) return 'nichts'
  return l.springt ? 'weiter' : 'nichts'
}

export class VorschlagStand<T extends Vorschlag = Vorschlag> {
  private _treffer: readonly T[] = []

  private _marke = 0

  // Nur eine SELBST getroffene Wahl schlaegt die Trefferzahl.
  private _vonHand = false

  // Escape macht die Liste zu, ohne das Getippte anzuruehren.
  private _zu = false

  // Aufgemacht heisst: zeigen, was da ist, auch ohne Getipptes.
  private _auf = false

  get treffer(): readonly T[] {
    return this._treffer
  }

  get marke(): number {
    return this._marke
  }

  get offen(): boolean {
    return this._treffer.length > 0
  }

  get zugemacht(): boolean {
    return this._zu
  }

  get aufgemacht(): boolean {
    return this._auf
  }

  // Einmal je Darstellung: Tastatur und Anzeige muessen denselben Stand sehen.
  zeige(treffer: readonly T[]): void {
    this._treffer = treffer
    this._marke = gueltigeMarke(this._marke, treffer.length)
  }

  // Ein neuer Tastendruck im Feld: die Liste faengt oben an und ist wieder auf.
  vonVorn(): void {
    this._marke = 0
    this._vonHand = false
    this._zu = false
    this._auf = false
  }

  // Aufgemacht heisst alles zeigen; die Marke gilt dann als selbst gesetzt.
  aufmachen(): void {
    this._marke = 0
    this._vonHand = true
    this._zu = false
    this._auf = true
  }

  ruhe(): void {
    this._treffer = []
    this._marke = 0
    this._vonHand = false
    this._zu = false
    this._auf = false
  }

  setzeMarke(marke: number): void {
    this._marke = marke
  }

  // Was eine Taste an dieser Stelle bedeutet. Marke und Zumachen zieht der
  // Stand selbst nach; der Aufrufer macht nur, was nach aussen wirkt.
  folgeFuer(taste: string, lage: TastenLage): TastenFolge {
    const folge = tastenFolge(taste, {
      ...lage,
      treffer: this._treffer.length,
      markeVonHand: this._vonHand,
    })
    if (folge === 'marke-hoch' || folge === 'marke-runter') {
      this._marke = bewegteMarke(this._marke, this._treffer.length, folge === 'marke-hoch' ? -1 : 1)
      this._vonHand = true
    } else if (folge === 'liste-zu') this._zu = true
    return folge
  }
}
