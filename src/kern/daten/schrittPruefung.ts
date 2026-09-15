// Prueft einen Ketten-Schritt und sagt in Klartext, was ihm fehlt.
import type { Datenquelle } from './datenquellen'
import type { RelationsVorlage } from './relationen'
import { unbekanntePlatzhalter } from './relationen'
import {
  abschnitteVon,
  AKTIONS_PLATZHALTER,
  type Parameter,
  type Schritt,
} from './aktionen'

function bindingProblem(binding: Parameter | undefined): boolean {
  if (!binding) return true

  if (binding.quelle === 'fixed' || binding.quelle === 'previous_result') return false
  if (binding.quelle === 'aus') return false
  if (binding.quelle === 'data_field') {
    return !binding.quelleId?.trim() || binding.wert.trim() === ''
  }

  if (binding.quelle === 'block_value' || binding.quelle === 'gewaehlte_zeile') {
    return !binding.bausteinId?.trim() || binding.wert.trim() === ''
  }
  if (binding.quelle === 'step_result') {
    if (binding.ergebnisFeld !== undefined && binding.ergebnisFeld.trim() === '') return true
    return binding.wert.trim() === ''
  }
  return binding.wert.trim() === ''
}

export function schrittProblem(
  step: Schritt,
  relations?: readonly RelationsVorlage[],
  dataSources?: readonly Datenquelle[],

  popupIds?: readonly string[],

  ergebnisIds?: readonly string[],

  actionValues?: readonly { blockId: string; prop: string }[],

  auswahlGeberIds?: readonly string[],

  // Die Schritte VOR diesem; ohne sie bleibt die Frage nach der Loeschzeile
  // ungestellt, denn sie haengt am ganzen Abschnitt.
  vorher?: readonly Schritt[],
): string | null {
  const ergebnisKaputt = (binding: Parameter | undefined): boolean =>
    binding?.quelle === 'step_result'
    && ergebnisIds !== undefined
    && !ergebnisIds.includes(binding.wert)
  if (step.art === 'POPUP_OPEN' || step.art === 'POPUP_CLOSE') {
    if (step.popupId.trim() === '') return 'Der Popup-Schritt hat kein Popup gewählt.'
    if (popupIds && !popupIds.includes(step.popupId)) {
      return 'Der Popup-Schritt verweist auf eine gelöschte Popup-Seite.'
    }
    return null
  }
  if (step.art === 'BW_LINK') {
    if (step.befehl.trim() === '') {
      return 'Schritt "BW-Befehl" hat keinen Befehl.'
    }
    return null
  }
  if (step.art === 'START_TOOL') {
    if (step.toolNr.trim() === '') {
      return 'Schritt "START_TOOL" hat keine Nummer.'
    }
    if (step.toolParameter.some((param) => param.trim() === '')) {
      return 'Schritt "START_TOOL" hat einen leeren Parameter.'
    }
    const unknown = step.toolParameter.flatMap((param) => unbekanntePlatzhalter(param, AKTIONS_PLATZHALTER))
    if (unknown.length > 0) {
      return 'Schritt "START_TOOL" hat einen unbekannten Platzhalter.'
    }
    return null
  }
  if (step.relationId === '') return 'Schritt "Relation" hat keine Vorlage.'
  if (!relations) return null
  const relation = relations.find((entry) => entry.id === step.relationId)
  if (!relation) return 'Schritt "Relation" verweist auf eine gelöschte Vorlage.'
  if (step.parameter.length !== relation.parameter.length) {
    return 'Schritt "Relation" hat nicht alle Syntaxparameter übernommen.'
  }
  const missing = step.parameter.findIndex(bindingProblem)
  if (missing >= 0) return `Schritt "Relation": Parameter ${missing + 1} ist unvollständig.`
  if (!relation.zusatzParameterErlaubt && step.zusatzParameter.length > 0) {
    return 'Schritt "Relation" hat nicht erlaubte Zusatzparameter.'
  }
  if (step.zusatzParameter.some(bindingProblem)) {
    return 'Schritt "Relation" hat einen leeren Zusatzparameter.'
  }
  const allBindings = [
    ...step.parameter,
    ...step.zusatzParameter,
  ]
  const missingSource = allBindings.find((binding) =>
    binding?.quelle === 'data_field'
    && dataSources
    && !dataSources.some((source) => source.id === binding.quelleId),
  )
  if (missingSource) return 'Schritt "Relation" verweist auf eine gelöschte Datenquelle.'
  const missingBlock = allBindings.find((binding) =>
    binding?.quelle === 'block_value'
    && actionValues
    && !actionValues.some((target) =>
      target.blockId === binding.bausteinId && target.prop === binding.wert),
  )
  if (missingBlock) return 'Schritt "Relation" verweist auf einen gelöschten Baustein.'
  const missingGeber = allBindings.find((binding) =>
    binding?.quelle === 'gewaehlte_zeile'
    && auswahlGeberIds
    && !auswahlGeberIds.includes(binding.bausteinId ?? ''),
  )
  if (missingGeber) {
    return 'Schritt "Relation" liest die gewählte Zeile eines Bausteins, den es nicht mehr gibt (oder der keine Auswahl mehr gibt).'
  }
  // {DROP_PINDEX} fuellt nur ein Abschnitt, der GELOESCHTE Zeilen abarbeitet.
  // Sonst ginge die Loesch-Relation mit leerer Satznummer hinaus.
  const abschnittsArt = vorher === undefined
    ? undefined
    : abschnitteVon([...vorher, step]).at(-1)?.art
  if (
    vorher !== undefined
    && allBindings.some((b) => b?.quelle === 'context' && b.wert === 'DROP_PINDEX')
    && abschnittsArt !== 'geloescht'
  ) {
    return 'Schritt "Relation" braucht die Satznummer der gelöschten Zeile — dafür muss ein Parameter eine gelöschte Zeile lesen.'
  }
  // Eine erfasste Zeile steht noch nicht im ERP, hat also keine Satznummer.
  // {PINDEX} bleibt dann leer, es sei denn ein Schritt davor hat eine geholt
  // und legt sie unter diesem Namen ab.
  if (
    abschnittsArt === 'erfasst'
    && allBindings.some((b) => b?.quelle === 'context' && b.wert === 'PINDEX')
    && !(vorher ?? []).some((s) => s.ergebnisName === 'PINDEX')
  ) {
    return 'Schritt "Relation": erfasste Zeilen haben keine Satznummer — davor einen Schritt setzen, der sie holt oder den Satz anlegt (GET oder PUTADD), und diesen Parameter auf sein Ergebnis binden.'
  }
  if (allBindings.some(ergebnisKaputt)) {
    return 'Schritt "Relation": ein Parameter zeigt auf keinen GET-Schritt davor.'
  }
  return null
}
