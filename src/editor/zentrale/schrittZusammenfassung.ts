// Der Kurztext eines Ketten-Schritts fuer die Liste.
import type { Maskenbaum } from '../../kern/maske/baum'
import { bausteinName } from '../../kern/maske/bausteinName'
import type { Parameter, Schritt } from '../../kern/daten/aktionen'
import {
  quellenKennung,
  tabellenIdVon,
  type Datenquelle,
} from '../../kern/daten/datenquellen'
import {
  relIdAusIdbId,
  feldCodeZerlegen,
  type RelationsVorlage,
} from '../../kern/daten/relationen'
import { feldUebernahmeArt } from './feldUebernahme'

export interface SchrittZusammenfassung {
  was: string

  ziel: string

  herkunft: string

  tabelle: string
}

function festerWert(binding: Parameter | undefined): string {
  return binding?.quelle === 'fixed' ? binding.wert.trim() : ''
}

function quelleAusRelId(
  relation: RelationsVorlage,
  params: readonly Parameter[],
  quellen: readonly Datenquelle[],
): Datenquelle | undefined {
  const index = relation.parameter.findIndex((p) => feldUebernahmeArt(p) === 'relid')
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
  relation.parameter.forEach((p, i) => {
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
  const eigen = quelle?.felder.find((f) => f.code === code)
  if (eigen) return eigen.name
  if (quelle) return ''
  const treffer = quellen.filter((q) => q.felder.some((f) => f.code === code))
  return treffer.length === 1
    ? (treffer[0].felder.find((f) => f.code === code)?.name ?? '')
    : ''
}

function herkunftText(
  binding: Parameter | undefined,
  tree: Maskenbaum,
  quellen: readonly Datenquelle[],
  schrittNr: (id: string) => number,
): string {
  if (!binding) return ''
  switch (binding.quelle) {
    case 'fixed':
      return binding.wert.trim() === '' ? '' : `Fest: ${binding.wert.trim()}`
    case 'context':
      return binding.wert === '' ? '' : binding.wert
    case 'se_variable':
      return binding.wert === '' ? '' : `SE VAR ${binding.wert}`
    case 'previous_result':
      return 'Vorheriger Schritt'
    case 'aus':
      return 'leer'
    case 'step_result': {
      const nr = schrittNr(binding.wert)
      return nr > 0 ? `Ergebnis von Schritt ${nr}` : 'Ergebnis von Schritt'
    }
    case 'data_field': {
      const quelle = quellen.find((q) => q.id === binding.quelleId)
      const feld = quelle?.felder.find((f) => f.code === binding.wert)?.name ?? ''
      if (!quelle) return ''
      return feld === '' ? quelle.name : `${quelle.name} · ${feld}`
    }
    case 'gewaehlte_zeile': {
      const knoten = binding.bausteinId ? tree[binding.bausteinId] : undefined
      const feld = klarnameFuerCode(binding.wert, undefined, quellen)
      const wer = knoten ? bausteinName(knoten, quellen) : 'Gewählte Zeile'
      return feld === '' ? `Gewählte Zeile · ${wer}` : `${wer} · ${feld}`
    }
    case 'block_value': {
      const knoten = binding.bausteinId ? tree[binding.bausteinId] : undefined
      return knoten ? `Baustein „${bausteinName(knoten, quellen)}“` : ''
    }
    case 'erfassungszelle': {
      const knoten = binding.bausteinId ? tree[binding.bausteinId] : undefined
      const wer = knoten ? bausteinName(knoten, quellen) : 'Erfassungszelle'
      return `Erfassungszelle · ${wer}`
    }
    case 'aenderungszelle': {
      const knoten = binding.bausteinId ? tree[binding.bausteinId] : undefined
      const wer = knoten ? bausteinName(knoten, quellen) : 'Geänderte Zelle'
      return `Geänderte Zelle · ${wer}`
    }
    case 'loeschzelle': {
      const knoten = binding.bausteinId ? tree[binding.bausteinId] : undefined
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
  const index = relation.parameter.findIndex((p) => p.trim().toUpperCase() === '{VALUE}')
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
  if (step.art !== 'RELATION' || !relation) return leer

  const quelle = quelleAusRelId(relation, step.parameter, quellen)
  const code = feldcodeAusParams(relation, step.parameter)
  return {
    was,
    ziel: klarnameFuerCode(code, quelle, quellen)

      || (code !== '' && feldCodeZerlegen(code) ? code : ''),
    herkunft: herkunftText(wertBinding(relation, step.parameter), tree, quellen, schrittNr),
    tabelle: quelle ? `${quelle.name} · ${quellenKennung(quelle)}` : '',
  }
}

export function ankerSchrittId(step: Schritt): string {
  if (step.art !== 'RELATION') return ''
  for (const b of [...step.parameter, ...step.zusatzParameter]) {
    if (b.quelle === 'step_result' && b.wert !== '') return b.wert
  }
  return ''
}
