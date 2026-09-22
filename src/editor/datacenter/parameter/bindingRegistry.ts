import type { ListEntry } from '@/editor/widgets/List'
import {
  PARAMETER_SOURCES,
  type Parameter,
  type ParameterSource,
} from '../../../core/data/actions'
import { PLACEHOLDER_PLAIN_TEXT, blockValueKey } from '../parameterText'
import {
  BlockBinding,
  DataFieldBinding,
  ChosenRowBinding,
  EmptyBinding,
  PlaceholderBinding,
  StepResultBinding,
  TextBinding,
  PreviousResultBinding,
  CellsBinding,
} from './bindings'
import type { BindingStart, ParameterChoices, SourcesEntry } from './choices'

function only(list: readonly { blockId: string }[]): BindingStart {
  return list.length === 1 ? { blockId: list[0].blockId, value: '' } : { value: '' }
}

const OPEN = '?'

function chosen(value: string | undefined): string {
  return value === undefined || value.trim() === '' ? OPEN : value
}

function bracketed(...parts: readonly string[]): string {
  return `{${parts.join(' ')}}`
}

function blockLabel(
  list: readonly { blockId: string; label: string }[],
  blockId: string | undefined,
): string {
  return list.find((e) => e.blockId === blockId)?.label ?? OPEN
}

function columnsTitle(
  list: readonly { blockId: string; columns: readonly { key: string; title: string }[] }[],
  binding: Parameter,
): string {
  const column = list.find((e) => e.blockId === binding.blockId)
    ?.columns.find((s) => s.key === binding.value)
  return column?.title ?? chosen(binding.value)
}

export const PARAM_SOURCES: Record<ParameterSource, SourcesEntry> = {
  fixed: {
    name: 'Fest',
    Control: TextBinding,
    text: (b) => b.value,
  },
  context: {
    name: 'Ereigniswert',
    Control: PlaceholderBinding,
    start: () => ({ value: 'VALUE' }),
    text: (b) => bracketed(
      PLACEHOLDER_PLAIN_TEXT[b.value]?.name ?? chosen(b.value),
    ),
  },
  data_field: {
    name: 'Datenfeld',
    Control: DataFieldBinding,
    empty: (w) => w.dataSources.length === 0,
    text: (b, w) => bracketed(
      'Feld',
      chosen(b.value),
      'from',
      chosen(w.dataSources.find((q) => q.id === b.sourceId)?.name),
    ),
  },
  block_value: {
    name: 'Baustein',
    Control: BlockBinding,
    empty: (w) => w.blockValues.length === 0,
    start: (w) => (w.blockValues.length === 1
      ? { blockId: w.blockValues[0].blockId, value: w.blockValues[0].prop }
      : { value: '' }),
    text: (b, w) => bracketed(
      'Baustein',
      chosen(w.blockValues.find((o) => o.key === blockValueKey(b.blockId ?? '', b.value))?.label),
    ),
  },
  chosenRow: {
    name: 'Gewählte Zeile',
    Control: ChosenRowBinding,
    empty: (w) => w.giver.length === 0,
    start: (w) => only(w.giver),
    text: (b, w) => {
      const giver = w.giver.find((g) => g.blockId === b.blockId)
      const field = giver?.fields.find((f) => f.code === b.value)?.name
      return bracketed(
        'Gewählte Zeile',
        `${blockLabel(w.giver, b.blockId)}:`,
        field ?? chosen(b.value),
      )
    },
  },
  captureCell: {
    name: 'Erfassungszelle',
    Control: CellsBinding,
    empty: (w) => w.captures.length === 0,
    start: (w) => only(w.captures),
    text: (b, w) => bracketed('Zelle', columnsTitle(w.captures, b)),
  },
  changeCell: {
    name: 'Geänderte Zelle',
    Control: CellsBinding,
    empty: (w) => w.changes.length === 0,
    start: (w) => only(w.changes),
    text: (b, w) => bracketed('Geänderte Zelle', columnsTitle(w.changes, b)),
  },
  deleteCell: {
    name: 'Gelöschte Zeile',
    Control: CellsBinding,
    empty: (w) => w.deletions.length === 0,
    start: (w) => only(w.deletions),
    text: (b, w) => bracketed('Gelöschte Zeile', columnsTitle(w.deletions, b)),
  },
  previous_result: {
    name: 'Vorheriger Schritt',
    Control: PreviousResultBinding,
    text: () => bracketed('Ergebnis des vorigen Schritts'),
  },
  step_result: {
    name: 'Ergebnis von Schritt',
    Control: StepResultBinding,
    empty: (w) => w.steps.length === 0,
    start: (w) => ({ value: w.steps.length === 1 ? w.steps[0].id : '' }),
    text: (b, w) => {
      const nr = w.steps.find((s) => s.id === b.value)?.nr
      const field = b.resultField ?? ''
      return bracketed(
        'Ergebnis Schritt',
        nr === undefined ? OPEN : String(nr),
        ...(field === '' ? [] : [`Feld ${field}`]),
      )
    },
  },
  seVariable: {
    name: 'SE VAR-Array',
    Control: TextBinding,
    text: (b) => bracketed('VAR', chosen(b.value)),
  },
  from: {
    name: 'Weggelassen',
    Control: EmptyBinding,

    text: () => '',
  },
}

export function newBinding(
  source: ParameterSource,
  choices: ParameterChoices,
): Parameter {
  return { source: source, ...(PARAM_SOURCES[source].start?.(choices) ?? { value: '' }) }
}

export function originEntries(
  binding: Parameter,
  choices: ParameterChoices,
): ListEntry[] {
  const entries: ListEntry[] = PARAMETER_SOURCES
    .filter((source) => choices.allowed === undefined || choices.allowed.includes(source))
    .map((source) => ({
      value: source,
      name: PARAM_SOURCES[source].name,
      disabled: PARAM_SOURCES[source].empty?.(choices) ?? false,
    }))
  if (binding.source === 'from') {
    entries.push({ value: 'from', name: PARAM_SOURCES.from.name, disabled: true })
  }
  return entries
}

export function bindingText(
  binding: Parameter,
  choices: ParameterChoices,
): string {
  return PARAM_SOURCES[binding.source].text(binding, choices)
}
