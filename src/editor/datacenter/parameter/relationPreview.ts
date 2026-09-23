import { relationSyntaxAsText, type RelationTemplate } from '../../../core/data/relations'
import type { Parameter } from '../../../core/data/actions'
import { bindingText } from './bindingRegistry'
import type { ParameterChoices } from './choices'

export function relationPreview(
  relation: Pick<RelationTemplate, 'verb' | 'nr'>,
  params: readonly Parameter[],
  extraParams: readonly Parameter[],
  choices: ParameterChoices,
): string {
  return relationSyntaxAsText({
    verb: relation.verb,
    nr: relation.nr,
    parameter: [...params, ...extraParams].map((binding) => bindingText(binding, choices)),

    extraParameterAllowed: false,
  })
}
