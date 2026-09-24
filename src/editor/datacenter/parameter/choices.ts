import type { ReactElement } from 'react'
import type { Parameter, ParameterSource } from '../../../core/data/actions'
import type { ResultStep } from '../../../core/data/steps/chains'
import type { DataSource } from '../../../core/data/dataSources'
import type {
  SelectionGiverOption,
  BlockValueOption,
  CaptureOption,
} from '../parameterText'

export interface ParameterChoices {
  dataSources: readonly DataSource[]
  blockValues: readonly BlockValueOption[]
  giver: readonly SelectionGiverOption[]
  captures: readonly CaptureOption[]
  changes: readonly CaptureOption[]
  deletions: readonly CaptureOption[]
  steps: readonly ResultStep[]

  allowed?: readonly ParameterSource[]
}

export interface BindingProps {
  binding: Parameter
  choices: ParameterChoices

  placeholder?: string
  onChange: (binding: Parameter) => void
}

export type BindingStart = Omit<Parameter, 'source'>

export interface SourcesEntry {
  name: string
  Control: (props: BindingProps) => ReactElement

  start?: (choices: ParameterChoices) => BindingStart

  empty?: (choices: ParameterChoices) => boolean

  text: (binding: Parameter, choices: ParameterChoices) => string
}
