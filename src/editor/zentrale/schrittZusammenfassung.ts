// Der Kurztext eines Ketten-Schritts fuer die Liste.
import type { Maskenbaum } from '../../core/blocks/BlockData'
import { bausteinName } from '../../core/blocks/bausteinName'
import type { Parameter, Schritt } from '../../core/data/aktionen'
import {
  quellenKennung,
  tabellenIdVon,
  type Datenquelle,
} from '../../core/data/dataSources'
import {
  relIdAusIdbId,
  feldCodeZerlegen,
  type RelationsVorlage,
} from '../../core/data/relations'
import { feldUebernahmeArt } from './feldUebernahme'

export interface SchrittZusammenfassung {
  was: string

  ziel: string

  herkunft: string

  tabelle: string
}

function festerWert(binding: Parameter | undefined): string {
  return binding?.source === 'fixed' ? binding.value.trim() : ''
}

function quelleAusRelId(
  relation: RelationsVorlage,
  params: readonly Parameter[],
  quellen: readonly Datenquelle[],
): Datenquelle | undefined {
  const index = relation.params.findIndex((p) => feldUebernahmeArt(p) === 'relid')
  const wert = index < 0 ? '' : festerWert(params[index])
  if (wert === '') return undefined
  return quellen.find((q) => relIdAusIdbId(tabellenIdVon(q)) === wert)
}

function feldcodeAusParams(
  relation: RelationsVorlage,
  params: readonly Parameter[],
): string {
  let pos = ''
  let len = ''
  relation.params.forEach((p, i) => {
    const art = feldUebernahmeArt(p)
    if (art === 'pos') pos = festerWert(params[i])
    else if (art === 'len') len = festerWert(params[i])
  })
  return pos !== '' && len !== '' ? `${pos}_${len}` : ''
}

function klarnameFuerCode(
  code: string,
  quelle: Datenquelle | undefined,
  quellen: readonly Datenquelle[],
): string {
  if (code === '') return ''
  const eigen = quelle?.fields.find((f) => f.code === code)
  if (eigen) return eigen.label
  if (quelle) return ''
  const treffer = quellen.filter((q) => q.fields.some((f) => f.code === code))
  return treffer.length === 1
    ? (treffer[0].fields.find((f) => f.code === code)?.label ?? '')
    : ''
}

function herkunftText(
  binding: Parameter | undefined,
  tree: Maskenbaum,
  quellen: readonly Datenquelle[],
  schrittNr: (id: string) => number,
): string {
  if (!binding) return ''
  switch (binding.source) {
    case 'fixed':
      return binding.value.trim() === '' ? '' : `Fest: ${binding.value.trim()}`
    case 'context':
      return binding.value === '' ? '' : binding.value
    case 'se_variable':
      return binding.value === '' ? '' : `SE VAR ${binding.value}`
    case 'previous_result':
      return 'Vorheriger Schritt'
    case 'aus':
      return 'leer'
    case 'step_result': {
      const nr = schrittNr(binding.value)
      return nr > 0 ? `Ergebnis von Schritt ${nr}` : 'Ergebnis von Schritt'
    }
    case 'data_field': {
      const quelle = quellen.find((q) => q.id === binding.dataSourceId)
      const feld = quelle?.fields.find((f) => f.code === binding.value)?.label ?? ''
      if (!quelle) return ''
      return feld === '' ? quelle.name : `${quelle.name} · ${feld}`
    }
    case 'gewaehlte_zeile': {
      const knoten = binding.blockId ? tree[binding.blockId] : undefined
      const feld = klarnameFuerCode(binding.value, undefined, quellen)
      const wer = knoten ? bausteinName(knoten, quellen) : 'Gewählte Zeile'
      return feld === '' ? `Gewählte Zeile · ${wer}` : `${wer} · ${feld}`
    }
    case 'block_value': {
      const knoten = binding.blockId ? tree[binding.blockId] : undefined
      return knoten ? `Baustein „${bausteinName(knoten, quellen)}“` : ''
    }
    case 'erfassungszelle': {
      const knoten = binding.blockId ? tree[binding.blockId] : undefined
      const wer = knoten ? bausteinName(knoten, quellen) : 'Erfassungszelle'
      return `Erfassungszelle · ${wer}`
    }
    case 'aenderungszelle': {
      const knoten = binding.blockId ? tree[binding.blockId] : undefined
      const wer = knoten ? bausteinName(knoten, quellen) : 'Geänderte Zelle'
      return `Geänderte Zelle · ${wer}`
    }
    case 'loeschzelle': {
      const knoten = binding.blockId ? tree[binding.blockId] : undefined
      const wer = knoten ? bausteinName(knoten, quellen) : 'Gelöschte Zeile'
      return `Gelöschte Zeile · ${wer}`
    }
    default:
      return ''
  }
}

function wertBinding(
  relation: RelationsVorlage,
  params: readonly Parameter[],
): Parameter | undefined {
  const index = relation.params.findIndex((p) => p.trim().toUpperCase() === '{VALUE}')
  return index < 0 ? undefined : params[index]
}

export function schrittZusammenfassung(
  step: Schritt,
  was: string,
  relation: RelationsVorlage | undefined,
  tree: Maskenbaum,
  quellen: readonly Datenquelle[],

  schrittNr: (id: string) => number,
): SchrittZusammenfassung {
  const leer: SchrittZusammenfassung = { was, ziel: '', herkunft: '', tabelle: '' }
  if (step.type !== 'RELATION' || !relation) return leer

  const quelle = quelleAusRelId(relation, step.params, quellen)
  const code = feldcodeAusParams(relation, step.params)
  return {
    was,
    ziel: klarnameFuerCode(code, quelle, quellen)

      || (code !== '' && feldCodeZerlegen(code) ? code : ''),
    herkunft: herkunftText(wertBinding(relation, step.params), tree, quellen, schrittNr),
    tabelle: quelle ? `${quelle.name} · ${quellenKennung(quelle)}` : '',
  }
}

export function ankerSchrittId(step: Schritt): string {
  if (step.type !== 'RELATION') return ''
  for (const b of [...step.params, ...step.extraParams]) {
    if (b.source === 'step_result' && b.value !== '') return b.value
  }
  return ''
}
