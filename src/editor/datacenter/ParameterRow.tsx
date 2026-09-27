import { Link2, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Badge } from '@/editor/widgets/Badge'
import { PickerControl } from '../controls/PickerControl'
import type { Parameter, ParameterSource } from '../../core/data/actions'
import type { FieldAdoptTarget } from './fieldAdopt'
import { PARAM_SOURCES, originEntries, newBinding } from './parameter/bindingRegistry'
import type { ParameterChoices } from './parameter/choices'
import { placeholderName } from './parameterText'

export function ParameterRow({
  number,
  template = '',
  binding,
  choices,
  placeholder,
  remove,
  trigger,
  onChange,
  onTrigger,
}: {
  number: number

  template?: string
  binding: Parameter
  choices: ParameterChoices

  placeholder?: string

  remove?: { label: string; onClick: () => void }
  trigger?: FieldAdoptTarget
  onChange: (binding: Parameter) => void
  onTrigger?: (anchor: HTMLElement) => void
}) {
  const { Control } = PARAM_SOURCES[binding.source]
  const plainName = placeholderName(template)
  const label = template === '' ? `${number}.` : `${number}. ${plainName || template}`

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-right text-dense tabular-nums text-muted">
        {number}.
      </span>
      {plainName === ''
        ? <span className="w-24 shrink-0" aria-hidden />
        : (
            <span className="w-24 shrink-0 truncate text-ui text-ink">
              {plainName}
            </span>
          )}
      {template === ''
        ? <span className="w-20 shrink-0" aria-hidden />
        : <Badge className="w-20">{template}</Badge>}

      <div className="min-w-0 flex-1">
        <PickerControl
          name={`Herkunft für ${label}`}
          groups={[{ key: 'origin', entries: originEntries(binding, choices) }]}
          value={binding.source}
          onChoose={(source) => onChange(newBinding(source as ParameterSource, choices))}
        />
      </div>
      <div
        className="min-w-0 flex-1"
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !trigger || !onTrigger) return
          e.preventDefault()
          onTrigger(e.currentTarget)
        }}
      >
        <Control
          binding={binding}
          choices={choices}
          placeholder={placeholder}
          onChange={onChange}
        />
      </div>
      {trigger && onTrigger && (
        <Button
          onlyIcon
          aria-label={trigger === 'field' ? 'Feld übernehmen' : 'Tabelle übernehmen'}
          onClick={(e) => onTrigger(e.currentTarget)}
        >
          <Link2 size={13} />
        </Button>
      )}
      {remove && (
        <Button onlyIcon aria-label={remove.label} onClick={remove.onClick}>
          <X size={13} />
        </Button>
      )}
    </div>
  )
}
