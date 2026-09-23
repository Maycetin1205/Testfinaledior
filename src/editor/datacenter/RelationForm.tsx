import { useState } from 'react'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { Row } from '@/editor/widgets/Row'
import {
  relationSyntaxAsText,
  relationSyntaxRead,
  type RelationTemplate,
} from '../../core/data/relations'
import { useRelations } from '../state/useRelations'
import { FormCard } from './FormCard'

interface RelationFormProps {
  relation?: RelationTemplate
  onClose: () => void
}

export function RelationForm({ relation, onClose }: RelationFormProps) {
  const store = useRelations()
  const [name, setName] = useState(relation?.name ?? '')
  const [syntaxInput, setSyntaxInput] = useState(
    relation ? relationSyntaxAsText(relation) : '',
  )
  const [showError, setShowError] = useState(false)

  const syntax = syntaxInput.trim() === '' ? null : relationSyntaxRead(syntaxInput)
  const nameError = name.trim() === '' ? 'Anzeigename fehlt.' : ''
  const syntaxError = syntaxInput.trim() === ''
    ? 'Syntax fehlt.'
    : syntax
      ? ''
      : 'Syntax ist ungültig.'

  function save() {
    if (nameError !== '' || !syntax) {
      setShowError(true)
      return
    }
    const data: Omit<RelationTemplate, 'id'> = {
      name: name.trim(),
      verb: syntax.verb,
      nr: syntax.nr,
      parameter: [...syntax.parameter],
      extraParameterAllowed: syntax.extraParameterAllowed,
    }
    if (relation) store.update(relation.id, data)
    else store.add(data)
    onClose()
  }

  return (
    <FormCard title={relation ? 'Relation bearbeiten' : 'Neue Relation'} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Row label="Anzeigename" error={showError ? nameError : undefined}>
          {(control) => (
            <Field
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Row>

        <Row
          wide
          label="SoftEngine-Syntax"
          error={
            showError || (syntaxInput.trim() !== '' && !syntax) ? syntaxError : undefined
          }
        >
          {(control) => (
            <Field
              {...control}
              value={syntaxInput}
              className="font-mono text-dense"
              onChange={(e) => setSyntaxInput(e.target.value)}
            />
          )}
        </Row>

        {syntax && (
          <div className="rounded border border-line bg-control p-2 text-dense">
            <div className="font-medium text-ink">
              {syntax.verb.replace('_RELATION', '')} {syntax.nr} · {syntax.parameter.length} Parameter
              {syntax.extraParameterAllowed ? ' · weitere erlaubt' : ''}
            </div>
            <div className="mt-1 max-h-32 overflow-y-auto font-mono text-muted">
              {syntax.parameter.map((param, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right">{i + 1}.</span>
                  <span>{param}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" onClick={save}>Speichern</Button>
        </div>
      </div>
    </FormCard>
  )
}
