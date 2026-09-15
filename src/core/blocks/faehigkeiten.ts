// Die Faehigkeiten eines Bausteintyps: was er ueber Anzeige und Layout hinaus
// kann. Editor, Export und Laufzeit fragen diese Liste; kein Bausteintyp kommt
// bei ihnen vor.
import type { ListenBindung } from './listenBindung'
import { propertySichtbar, type PropertyVisibilityCondition } from './PropertyDescription'

export interface BindableSpot {
  prop: string
  label: string
  wenn?: PropertyVisibilityCondition
  vorschauProp?: string
}

export interface ActionValueSpot {
  prop: string
  label: string
}

export interface BlockEventSpec {
  key: string
  name: string
}

// Das Nachschlage-Fenster einer Stelle: WO seine Spalten und sein Mass stehen.
// Eingestellt wird es im Inspector, der Baustein haelt nur die Eigenschaften und
// liest sie beim Oeffnen.
export interface SuchFenster {
  // Ohne Angabe hat der Baustein EIN Fenster in seinen eigenen Eigenschaften.
  // Mit ihr hat jeder Eintrag dieser Liste eines (die Spalten der Erfassung).
  eintraegeProp?: string
  spaltenKey: string
  breiteKey: string
  hoeheKey: string
  // Woher die Felder des Fensters kommen: eine Quellen-Eigenschaft am Baustein
  // oder die Bindung in diesem Schluessel des Eintrags.
  quelleProp?: string
  quelleKey?: string
  speicherFeldProp?: string
  speicherTitelProp?: string
  titelKey?: string
  // Was ohne gestellte Spalten geschieht, in Worten fuer den Bauer.
  automatik: string
  // CSS-Auswahl der Stelle im Baustein, deren Klick das Fenster aufmacht.
  stelle?: string
  wenn?: PropertyVisibilityCondition
}

export type Faehigkeit =
  // Liest eine Datenquelle (Eigenschaft `source`).
  | { art: 'quelle'; wenn?: PropertyVisibilityCondition }
  // Gibt eine gewaehlte oder angezeigte Zeile her. `wenn` schaltet die
  // Faehigkeit nicht, es waehlt nur die Quell-Eigenschaft.
  | { art: 'satzwahl'; quelleProp?: string; wenn?: PropertyVisibilityCondition }
  // Filtert seine Zeilen nach der Auswahl eines anderen Bausteins.
  | { art: 'auswahlFolgen' }
  // Stellen, die an ein Feld gebunden werden koennen.
  | { art: 'bindbar'; stellen: readonly BindableSpot[] }
  // Werte, die eine Kette als „Wert aus Baustein" lesen kann.
  | { art: 'aktionswert'; stellen: readonly ActionValueSpot[] }
  // Fuehrt eine Liste von Eintraegen (Spalten, Fensterspalten).
  | { art: 'liste'; bindung: ListenBindung }
  | { art: 'suchfenster'; fenster: SuchFenster }
  // Nimmt neue Zeilen entgegen, bevor sie im ERP existieren.
  | { art: 'erfassen'; wenn?: PropertyVisibilityCondition }
  | { art: 'loeschen'; wenn?: PropertyVisibilityCondition }
  // Gibt geaenderte Zeilen her; `schluessel` ist der Eintrags-Schalter der Liste.
  | { art: 'aendern'; schluessel: string }
  // Haelt gesendete Zeilen, bis eine Lieferung sie zeigt.
  | { art: 'haeltGesendete' }
  // Traegt Berechnungen in der genannten Eigenschaft.
  | { art: 'rechnen'; prop: string }
  | { art: 'ereignisse'; liste: readonly BlockEventSpec[] }

export type FaehigkeitsArt = Faehigkeit['art']

export type FaehigkeitVon<A extends FaehigkeitsArt> = Extract<Faehigkeit, { art: A }>

export interface Faehig {
  faehigkeiten: readonly Faehigkeit[]
}

export function faehigkeit<A extends FaehigkeitsArt>(
  traeger: Faehig | undefined,
  art: A,
): FaehigkeitVon<A> | undefined {
  return traeger?.faehigkeiten.find((f): f is FaehigkeitVon<A> => f.art === art)
}

export function hatFaehigkeit(traeger: Faehig | undefined, art: FaehigkeitsArt): boolean {
  return faehigkeit(traeger, art) !== undefined
}

// Eine Faehigkeit mit `wenn` gilt nur, solange die Eigenschaften es sagen.
export function gilt(
  f: { wenn?: PropertyVisibilityCondition } | undefined,
  props: Record<string, unknown>,
): boolean {
  return f !== undefined && propertySichtbar(f.wenn, props)
}

// ---- Bindbare Stellen: die Eigenschaft `xField` traegt die Bindung von `x` ----

export type BindingProp<P extends string = string> = `${P}Field`

export type BindingAttr = `${string}field`

export function bindingProp<P extends string>(prop: P): BindingProp<P> {
  return `${prop}Field`
}

export function bindingAttr(prop: string): BindingAttr {
  return `${prop.toLowerCase()}field`
}

export type BindableSpotProp<Props> = keyof Props extends infer K
  ? K extends BindingProp<infer P> ? P : never
  : never

export type BindableSpotsFor<Props> = ReadonlyArray<
  Omit<BindableSpot, 'prop' | 'vorschauProp'> & {
    prop: BindableSpotProp<Props>
    vorschauProp?: keyof Props & string
  }
>

export type ActionValueSpotsFor<Props> = ReadonlyArray<{
  prop: keyof Props & string
  label: string
}>

// Die zwei Faehigkeiten, deren Stellen zu den Eigenschaften des Bausteins
// passen muessen: der Typpruefer sieht es an der Klasse.
export function bindbar<Props>(stellen: BindableSpotsFor<Props>): FaehigkeitVon<'bindbar'> {
  return { art: 'bindbar', stellen }
}

export function aktionswert<Props>(stellen: ActionValueSpotsFor<Props>): FaehigkeitVon<'aktionswert'> {
  return { art: 'aktionswert', stellen }
}

// ---- Die Laufzeit-Vertraege: was ein Element mit der Faehigkeit haben muss ----

// Die drei Vormerk-Listen, ueber die Kette, Baustein und Statusbalken reden.
export type VormerkArt = 'erfasst' | 'geaendert' | 'geloescht'

// erfassteSchluessel steht Platz fuer Platz neben erfassteZeilen, denn der PLATZ
// taugt nicht als Kennung.
export interface ErfassungsTraegerElement {
  erfassteZeilen: readonly (readonly string[])[]
  erfassteSchluessel: readonly string[]
}

// Die Werte reisen mit, weil eine Loesch-Relation mehr als die Satznummer
// verlangen kann.
export interface LoeschTraegerElement {
  geloeschteZeilen: readonly { satz: string; werte: readonly string[] }[]
}

export interface AenderungsTraegerElement {
  geaenderteZeilen: readonly { satz: string; werte: readonly string[] }[]
}

// Was eine Lieferung von SoftEngine ueber ihre Zeilen sagt, ohne dass der
// Baustein die Quelle kennt.
export interface Lieferung {
  zeilen: readonly unknown[]
  satzVon: (zeile: unknown) => string
  lies: (zeile: unknown, feld: string) => string
}

// null = keine Quelle, dann ist nichts zu beweisen.
export interface GesendeteZeilenElement {
  pruefeAnkunft: (lieferung: Lieferung | null) => void
}

// Die Satznummer, mit der eine Zeile wirklich hinausging; ohne sie waere eine
// neue Position in der naechsten Lieferung nur noch ueber ihre Felder zu finden.
export interface GeschriebeneZeile {
  schluessel: string
  satz: string
}

// Der Bericht des Ketten-Laufs an den Baustein: je Zeile, und laufFertig erst,
// wenn ALLE Abschnitte durch sind.
export interface LaufBerichtElement {
  zeileSchreibt: (art: VormerkArt, schluessel: string) => void
  zeileGescheitert: (art: VormerkArt, schluessel: string, meldung: string) => void
  laufFertig: (art: VormerkArt, geschrieben: readonly GeschriebeneZeile[]) => void
}

export interface LaufzeitVertraege {
  erfassen: ErfassungsTraegerElement & LaufBerichtElement
  aendern: AenderungsTraegerElement & LaufBerichtElement
  loeschen: LoeschTraegerElement & LaufBerichtElement
  haeltGesendete: GesendeteZeilenElement
}

const VERTRAGS_MITGLIEDER: { [A in keyof LaufzeitVertraege]: readonly string[] } = {
  erfassen: ['erfassteZeilen', 'erfassteSchluessel', 'zeileSchreibt', 'zeileGescheitert', 'laufFertig'],
  aendern: ['geaenderteZeilen', 'zeileSchreibt', 'zeileGescheitert', 'laufFertig'],
  loeschen: ['geloeschteZeilen', 'zeileSchreibt', 'zeileGescheitert', 'laufFertig'],
  haeltGesendete: ['pruefeAnkunft'],
}

// Der Vertrag hinter einer gemeldeten Faehigkeit. Fehlt ein Stueck, faellt es
// hier auf, statt dass die Kette still nichts tut.
export function vertragVon<A extends keyof LaufzeitVertraege>(
  el: Element,
  art: A,
): LaufzeitVertraege[A] {
  for (const mitglied of VERTRAGS_MITGLIEDER[art]) {
    if (!(mitglied in el)) {
      throw new Error(
        `<${el.tagName.toLowerCase()}> meldet die Faehigkeit „${art}", hat aber „${mitglied}" nicht.`,
      )
    }
  }
  return el as unknown as LaufzeitVertraege[A]
}
