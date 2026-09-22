import type { DataSource } from './dataSources'
import type { RelationTemplate } from './relations'
import { unknownPlaceholder } from './relations'
import {
  sectionsOf,
  ACTION_PLACEHOLDER,
  type Parameter,
  type Step,
} from './actions'

function bindingProblem(binding: Parameter | undefined): boolean {
  if (!binding) return true

  if (binding.source === 'fixed' || binding.source === 'previous_result') return false
  if (binding.source === 'from') return false
  if (binding.source === 'data_field') {
    return !binding.sourceId?.trim() || binding.value.trim() === ''
  }

  if (binding.source === 'block_value' || binding.source === 'chosenRow') {
    return !binding.blockId?.trim() || binding.value.trim() === ''
  }
  if (binding.source === 'step_result') {
    if (binding.resultField !== undefined && binding.resultField.trim() === '') return true
    return binding.value.trim() === ''
  }
  return binding.value.trim() === ''
}

export function stepProblem(
  step: Step,
  relations?: readonly RelationTemplate[],
  dataSources?: readonly DataSource[],

  popupIds?: readonly string[],

  resultIds?: readonly string[],

  actionValues?: readonly { blockId: string; prop: string }[],

  selectionGiverIds?: readonly string[],

  before?: readonly Step[],
): string | null {
  const resultBroken = (binding: Parameter | undefined): boolean =>
    binding?.source === 'step_result'
    && resultIds !== undefined
    && !resultIds.includes(binding.value)
  if (step.kind === 'POPUP_OPEN' || step.kind === 'POPUP_CLOSE') {
    if (step.popupId.trim() === '') return 'Der Popup-Schritt hat kein Popup gewählt.'
    if (popupIds && !popupIds.includes(step.popupId)) {
      return 'Der Popup-Schritt verweist auf eine gelöschte Popup-Seite.'
    }
    return null
  }
  if (step.kind === 'BW_LINK') {
    if (step.command.trim() === '') {
      return 'Schritt "BW-Befehl" hat keinen Befehl.'
    }
    return null
  }
  if (step.kind === 'START_TOOL') {
    if (step.toolNr.trim() === '') {
      return 'Schritt "START_TOOL" hat keine Nummer.'
    }
    if (step.toolParameter.some((param) => param.trim() === '')) {
      return 'Schritt "START_TOOL" hat einen leeren Parameter.'
    }
    const unknown = step.toolParameter.flatMap((param) => unknownPlaceholder(param, ACTION_PLACEHOLDER))
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
  if (!relation.extraParameterAllowed && step.extraParameter.length > 0) {
    return 'Schritt "Relation" hat nicht erlaubte Zusatzparameter.'
  }
  if (step.extraParameter.some(bindingProblem)) {
    return 'Schritt "Relation" hat einen leeren Zusatzparameter.'
  }
  const allBindings = [
    ...step.parameter,
    ...step.extraParameter,
  ]
  const missingSource = allBindings.find((binding) =>
    binding?.source === 'data_field'
    && dataSources
    && !dataSources.some((source) => source.id === binding.sourceId),
  )
  if (missingSource) return 'Schritt "Relation" verweist auf eine gelöschte Datenquelle.'
  const missingBlock = allBindings.find((binding) =>
    binding?.source === 'block_value'
    && actionValues
    && !actionValues.some((target) =>
      target.blockId === binding.blockId && target.prop === binding.value),
  )
  if (missingBlock) return 'Schritt "Relation" verweist auf einen gelöschten Baustein.'
  const missingGiver = allBindings.find((binding) =>
    binding?.source === 'chosenRow'
    && selectionGiverIds
    && !selectionGiverIds.includes(binding.blockId ?? ''),
  )
  if (missingGiver) {
    return 'Schritt "Relation" liest die gewählte Zeile eines Bausteins, den es nicht mehr gibt (oder der keine Auswahl mehr gibt).'
  }

  const sectionKind = before === undefined
    ? undefined
    : sectionsOf([...before, step]).at(-1)?.kind
  if (
    before !== undefined
    && allBindings.some((b) => b?.source === 'context' && b.value === 'DROP_PINDEX')
    && sectionKind !== 'deleted'
  ) {
    return 'Schritt "Relation" braucht die Satznummer der gelöschten Zeile — dafür muss ein Parameter eine gelöschte Zeile lesen.'
  }

  if (
    sectionKind === 'captured'
    && allBindings.some((b) => b?.source === 'context' && b.value === 'PINDEX')
    && !(before ?? []).some((s) => s.resultName === 'PINDEX')
  ) {
    return 'Schritt "Relation": erfasste Zeilen haben keine Satznummer — davor einen Schritt setzen, der sie holt oder den Satz anlegt (GET oder PUTADD), und diesen Parameter auf sein Ergebnis binden.'
  }
  if (allBindings.some(resultBroken)) {
    return 'Schritt "Relation": ein Parameter zeigt auf keinen GET-Schritt davor.'
  }
  return null
}
