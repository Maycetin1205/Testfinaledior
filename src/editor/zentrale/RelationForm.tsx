// Das Formular einer Relations-Vorlage: Verb, Nummer, Parameter.
import { useState } from 'react'
import { Feld } from '@/ui/werkbank/Feld'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Zeile } from '@/ui/werkbank/Zeile'
import {
  relationsSyntaxAlsText,
  relationsSyntaxLesen,
  type RelationsVorlage,
} from '../../core/data/relations'
import { useRelations } from '../../state/useRelations'
import { FormularKarte } from './FormularKarte'

interface RelationFormProps {
  relation?: RelationsVorlage
  onClose: () => void
}

export function RelationForm({ relation, onClose }: RelationFormProps) {
  const store = useRelations()
  const [name, setName] = useState(relation?.name ?? '')
  const [syntaxInput, setSyntaxInput] = useState(
    relation ? relationsSyntaxAlsText(relation) : '',
  )
  const [zeigeFehler, setZeigeFehler] = useState(false)

  const syntax = syntaxInput.trim() === '' ? null : relationsSyntaxLesen(syntaxInput)
  const nameFehler = name.trim() === '' ? 'Anzeigename fehlt.' : ''
  const syntaxFehler = syntaxInput.trim() === ''
    ? 'Syntax fehlt.'
    : syntax
      ? ''
      : 'Syntax ist ungültig.'

  function speichern() {
    if (nameFehler !== '' || !syntax) {
      setZeigeFehler(true)
      return
    }
    const daten: Omit<RelationsVorlage, 'id'> = {
      name: name.trim(),
      verb: syntax.verb,
      nr: syntax.nr,
      params: [...syntax.params],
      allowExtraParams: syntax.allowExtraParams,
    }
    if (relation) store.update(relation.id, daten)
    else store.add(daten)
    onClose()
  }

  return (
    <FormularKarte title={relation ? 'Relation bearbeiten' : 'Neue Relation'} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Zeile label="Anzeigename" fehler={zeigeFehler ? nameFehler : undefined}>
          {(kind) => (
            <Feld
              {...kind}
              value={name}
              placeholder="z. B. Termin verschieben"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Zeile>

        <Zeile
          breit
          label="SoftEngine-Syntax"
          fehler={
            zeigeFehler || (syntaxInput.trim() !== '' && !syntax) ? syntaxFehler : undefined
          }
        >
          {(kind) => (
            <Feld
              {...kind}
              value={syntaxInput}
              placeholder="z. B. GET_RELATION[640!{IDBID}!{DATUM}]"
              className="font-mono text-dicht"
              onChange={(e) => setSyntaxInput(e.target.value)}
            />
          )}
        </Zeile>

        {syntax && (
          <div className="rounded border border-linie bg-control p-2 text-dicht">
            <div className="font-medium text-tinte">
              {syntax.verb.replace('_RELATION', '')} {syntax.nr} · {syntax.params.length} Parameter
              {syntax.allowExtraParams ? ' · weitere erlaubt' : ''}
            </div>
            <div className="mt-1 max-h-32 overflow-y-auto font-mono text-matt">
              {syntax.params.map((param, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right">{i + 1}.</span>
                  <span>{param === '' ? '(leer)' : param}</span>
                </div>
              ))}
              {syntax.params.length === 0 && <div>Keine Parameter.</div>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-linie pt-3">
          <Knopf onClick={onClose}>Abbrechen</Knopf>
          <Knopf art="primaer" onClick={speichern}>Speichern</Knopf>
        </div>
      </div>
    </FormularKarte>
  )
}
