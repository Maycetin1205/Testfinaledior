// Eine Parameter-Zeile im Schritt-Formular: Herkunft und Wert.
import { Link2, X } from '@/ui/zeichen'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Marke } from '@/ui/werkbank/Marke'
import { PickerControl } from '../inspector/controls/PickerControl'
import type { Parameter, ParameterQuelle } from '../../core/data/aktionen'
import type { FeldUebernahmeZiel } from './feldUebernahme'
import { PARAM_QUELLEN, herkunftsEintraege, neueBindung } from './parameter/bindungsRegistry'
import type { ParameterWahlen } from './parameter/wahlen'
import { platzhalterName } from './helfer'

export function ParameterZeile({
  nummer,
  kennung = '',
  binding,
  wahlen,
  platzhalter,
  entfernen,
  ausloeser,
  onChange,
  onAusloeser,
}: {
  // Der wievielte Parameter; steht wie die Schrittnummer links und grau.
  nummer: number

  // Was die Relationsvorlage an dieser Stelle vorsieht, roh. Sieht sie einen
  // Platzhalter vor, fuehrt dessen Klarname und der rohe Code steht daneben;
  // ein fester Wert wie 'L' zeigt sich selbst. Zusatzparameter haben keine
  // Vorlage; dort bleiben beide Plaetze leer, damit die Bedienelemente an
  // derselben Kante beginnen.
  kennung?: string
  binding: Parameter
  wahlen: ParameterWahlen

  platzhalter?: string

  entfernen?: { label: string; onClick: () => void }
  ausloeser?: FeldUebernahmeZiel
  onChange: (binding: Parameter) => void
  onAusloeser?: (anchor: HTMLElement) => void
}) {
  const { Control } = PARAM_QUELLEN[binding.source]
  const klarname = platzhalterName(kennung)
  const label = kennung === '' ? `${nummer}.` : `${nummer}. ${klarname || kennung}`

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-right text-dicht tabular-nums text-matt">
        {nummer}.
      </span>
      {klarname === ''
        ? <span className="w-24 shrink-0" aria-hidden />
        : (
            <span className="w-24 shrink-0 truncate text-ui text-tinte" title={klarname}>
              {klarname}
            </span>
          )}
      {kennung === ''
        ? <span className="w-20 shrink-0" aria-hidden />
        : <Marke className="w-20" hinweis={kennung}>{kennung}</Marke>}

      <div className="min-w-0 flex-1">
        <PickerControl
          bezeichnung={`Herkunft für ${label}`}
          gruppen={[{ key: 'herkunft', eintraege: herkunftsEintraege(binding, wahlen) }]}
          wert={binding.source}
          onWaehle={(source) => onChange(neueBindung(source as ParameterQuelle, wahlen))}
        />
      </div>
      <div
        className="min-w-0 flex-1"
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !ausloeser || !onAusloeser) return
          e.preventDefault()
          onAusloeser(e.currentTarget)
        }}
      >
        <Control
          binding={binding}
          wahlen={wahlen}
          platzhalter={platzhalter}
          onChange={onChange}
        />
      </div>
      {ausloeser && onAusloeser && (
        <Knopf
          nurZeichen
          aria-label={ausloeser === 'feld' ? 'Feld übernehmen' : 'Tabelle übernehmen'}
          onClick={(e) => onAusloeser(e.currentTarget)}
        >
          <Link2 size={13} />
        </Knopf>
      )}
      {entfernen && (
        <Knopf nurZeichen aria-label={entfernen.label} onClick={entfernen.onClick}>
          <X size={13} />
        </Knopf>
      )}
    </div>
  )
}
