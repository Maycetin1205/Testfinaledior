// Der Aufruf eines Relationsschritts in Worten: dieselbe Syntax, die hinausgeht,
// nur mit Klartext statt Feldcodes an den Stellen, die erst zur Laufzeit fallen.
import { relationsSyntaxAlsText, type RelationsVorlage } from '../../../kern/daten/relationen'
import type { Parameter } from '../../../kern/daten/aktionen'
import { bindungsText } from './bindungsRegistry'
import type { ParameterWahlen } from './wahlen'

export function relationsVorschau(
  relation: Pick<RelationsVorlage, 'verb' | 'nr'>,
  params: readonly Parameter[],
  extraParams: readonly Parameter[],
  wahlen: ParameterWahlen,
): string {
  return relationsSyntaxAlsText({
    verb: relation.verb,
    nr: relation.nr,
    parameter: [...params, ...extraParams].map((binding) => bindungsText(binding, wahlen)),

    // Kein `...` am Ende: die Zeile zeigt den Aufruf DIESES Schritts, und was
    // die Vorlage noch erlauben wuerde, geht nicht mit hinaus.
    zusatzParameterErlaubt: false,
  })
}
