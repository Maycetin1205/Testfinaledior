// Alles, woraus ein Parameter seinen Wert ziehen kann, als ein Buendel.
import type { ReactElement } from 'react'
import type {
  Parameter,
  ParameterQuelle,
  ErgebnisSchritt,
} from '../../../core/data/aktionen'
import type { Datenquelle } from '../../../core/data/dataSources'
import type {
  AuswahlGeberOption,
  BlockValueOption,
  ErfassungsOption,
} from '../helfer'

export interface ParameterWahlen {
  dataSources: readonly Datenquelle[]
  blockValues: readonly BlockValueOption[]
  geber: readonly AuswahlGeberOption[]
  erfassungen: readonly ErfassungsOption[]
  aenderungen: readonly ErfassungsOption[]
  loeschungen: readonly ErfassungsOption[]
  schritte: readonly ErgebnisSchritt[]

  // Wenn gesetzt: nur diese Herkuenfte stehen zur Wahl. Fuer eine Datenquelle
  // waere „Gewaehlte Zeile" kein gesperrter Eintrag, sondern ein sinnloser.
  erlaubt?: readonly ParameterQuelle[]
}

export interface BindungsProps {
  binding: Parameter
  wahlen: ParameterWahlen

  platzhalter?: string
  onChange: (binding: Parameter) => void
}

// Der Startwert beim Umschalten der Herkunft, ohne `source`: ein Eintrag der
// Registry soll sich nicht auf eine fremde Quelle schreiben koennen.
export type BindungsStart = Omit<Parameter, 'source'>

export interface QuellenEintrag {
  name: string
  Control: (props: BindungsProps) => ReactElement

  start?: (wahlen: ParameterWahlen) => BindungsStart

  // Wahr = es gibt nichts, woraus diese Quelle waehlen koennte.
  leer?: (wahlen: ParameterWahlen) => boolean

  // Was an dieser Stelle wirklich hinausgeht, in Worten. Steht in der
  // Vorschauzeile des Schritts anstelle des rohen Parameters.
  text: (binding: Parameter, wahlen: ParameterWahlen) => string
}
