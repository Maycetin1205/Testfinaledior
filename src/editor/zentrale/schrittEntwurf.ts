// Der Entwurf eines Ketten-Schritts, solange sein Formular offen steht.
import {
  relationsParameterVorgabe,
  type Parameter,
  type Schritt,
  type SchrittArt,
} from '../../kern/daten/aktionen'
import type { RelationsVorlage } from '../../kern/daten/relationen'
import type { FeldUebernahmeZiel, UebernahmeTreffer } from './feldUebernahme'

export interface SchrittEntwurf {
  // Einmal beim Oeffnen vergeben: zoege jeder Render eine neue, pruefte die
  // Anzeige einen anderen Schritt, als Speichern schreibt.
  id: string

  typ: SchrittArt
  toolNr: string
  befehl: string
  popupId: string
  relationId: string
  relationParams: Parameter[]
  extraParams: Parameter[]

  suche: string

  // Fehler stehen erst am Formular, wenn Speichern einmal gedrueckt wurde.
  zeigeFehler: boolean

  pickerZiel: FeldUebernahmeZiel | null
  uebernahmeBestaetigung: string
}

export function vorlageVon(
  relationen: readonly RelationsVorlage[],
  id: string | undefined,
): RelationsVorlage | undefined {
  return id === undefined || id === '' ? undefined : relationen.find((r) => r.id === id)
}

export function entwurfAus(
  step: Schritt | undefined,
  relationen: readonly RelationsVorlage[],
): SchrittEntwurf {
  const relationStep = step?.art === 'RELATION' ? step : undefined
  const relation = vorlageVon(relationen, relationStep?.relationId)
  return {
    id: step?.id ?? crypto.randomUUID(),
    typ: step?.art ?? 'START_TOOL',
    toolNr: step?.art === 'START_TOOL' ? step.toolNr : '',
    befehl: step?.art === 'BW_LINK' ? step.befehl : '',
    popupId: step?.art === 'POPUP_OPEN' || step?.art === 'POPUP_CLOSE' ? step.popupId : '',
    relationId: relationStep?.relationId ?? '',
    relationParams: anfangsParams(relationStep, relation),
    extraParams: relationStep ? relationStep.zusatzParameter.map((b) => ({ ...b })) : [],
    suche: '',
    zeigeFehler: false,
    pickerZiel: null,
    uebernahmeBestaetigung: '',
  }
}

function anfangsParams(
  step: { parameter: Parameter[] } | undefined,
  relation: RelationsVorlage | undefined,
): Parameter[] {
  if (!step) return []
    // Die Vorlage hat Parameter bekommen oder verloren: dann zaehlt die Vorlage,
    // nicht der alte Stand.
  if (relation && step.parameter.length !== relation.parameter.length) {
    return relationsParameterVorgabe(relation)
  }
  return step.parameter.map((b) => ({ ...b }))
}

export function bindungFuer(
  entwurf: SchrittEntwurf,
  vorgaben: readonly Parameter[],
  index: number,
): Parameter {
  return entwurf.relationParams[index] ?? vorgaben[index] ?? { quelle: 'fixed', wert: '' }
}

// Auf Vorlagenlaenge bringen, ohne das Getippte zu verlieren: eine Relation kann
// sich aendern, waehrend das Formular offen steht.
function aufLaenge(
  aktuell: readonly Parameter[],
  relation: RelationsVorlage | undefined,
): Parameter[] {
  if (!relation) return [...aktuell]
  const next = relationsParameterVorgabe(relation)
  aktuell.forEach((binding, at) => { if (at < next.length) next[at] = binding })
  return next
}

export function uebernahmeMeldung(
  gesetzt: readonly UebernahmeTreffer[],
  name: string,
): string {
  const details = gesetzt.map((treffer) => {
    const art = treffer.art === 'pos' ? 'Position' : treffer.art === 'len' ? 'Länge' : 'Tabelle'
    return `${art} ${treffer.wert}`
  })
  return name + ' übernommen' + (details.length > 0 ? ' - ' + details.join(' - ') : '')
}

export type SchrittAktion =
  | { art: 'typ'; typ: SchrittArt }
  | { art: 'toolNr'; wert: string }
  | { art: 'befehl'; wert: string }
  | { art: 'popup'; id: string }
  | { art: 'tabelleAnsicht'; wert: string }
  | { art: 'relation'; id: string; gewaehlt: RelationsVorlage | undefined }
  | { art: 'bindung'; index: number; bindung: Parameter }
  | { art: 'zurueckholen' }
  | { art: 'extraHinzu' }
  | { art: 'extraAendern'; index: number; bindung: Parameter }
  | { art: 'extraWeg'; index: number }
  | { art: 'picker'; ziel: FeldUebernahmeZiel | null }
  | { art: 'uebernahme'; params: Parameter[]; meldung: string }
  | { art: 'zeigeFehler' }

// Die Vorlagen stecken im Reducer statt in jeder Aktion: nur sie wissen, wie
// viele Parameter es gibt.
export function schrittReducer(relationen: readonly RelationsVorlage[]) {
  return (entwurf: SchrittEntwurf, aktion: SchrittAktion): SchrittEntwurf => {
    const relation = vorlageVon(relationen, entwurf.relationId)
    switch (aktion.art) {
      case 'typ':
        return { ...entwurf, typ: aktion.typ, pickerZiel: null, uebernahmeBestaetigung: '' }
      case 'toolNr':
        return { ...entwurf, toolNr: aktion.wert }
      case 'befehl':
        return { ...entwurf, befehl: aktion.wert }
      case 'popup':
        return { ...entwurf, popupId: aktion.id }
      case 'tabelleAnsicht':
        return { ...entwurf, suche: aktion.wert }
      case 'relation': {
        const gewaehlt = aktion.gewaehlt
        const rumpf = {
          ...entwurf,
          relationId: aktion.id,
          pickerZiel: null,
          uebernahmeBestaetigung: '',
        }
        if (!gewaehlt) return rumpf
        return {
          ...rumpf,
          relationParams: relationsParameterVorgabe(gewaehlt),
          extraParams: gewaehlt.zusatzParameterErlaubt ? rumpf.extraParams : [],
        }
      }
      case 'bindung': {
        const params = aufLaenge(entwurf.relationParams, relation)
        params[aktion.index] = aktion.bindung
        return { ...entwurf, relationParams: params, uebernahmeBestaetigung: '' }
      }
      case 'zurueckholen': {
        const vorgaben = relation ? relationsParameterVorgabe(relation) : []
        return {
          ...entwurf,
          relationParams: entwurf.relationParams.map((binding, index) =>
            binding.quelle === 'aus'
              ? vorgaben[index] ?? { quelle: 'fixed', wert: '' }
              : binding),
        }
      }
      case 'extraHinzu':
        return { ...entwurf, extraParams: [...entwurf.extraParams, { quelle: 'fixed', wert: '' }] }
      case 'extraAendern':
        return {
          ...entwurf,
          extraParams: entwurf.extraParams.map((b, at) => (at === aktion.index ? aktion.bindung : b)),
        }
      case 'extraWeg':
        return {
          ...entwurf,
          extraParams: entwurf.extraParams.filter((_, at) => at !== aktion.index),
        }
      case 'picker':
        return { ...entwurf, pickerZiel: aktion.ziel }
      case 'uebernahme':
        return {
          ...entwurf,
          relationParams: aktion.params,
          pickerZiel: null,
          uebernahmeBestaetigung: aktion.meldung,
        }
      case 'zeigeFehler':
        return { ...entwurf, zeigeFehler: true }
    }
  }
}

export function kandidatAus(
  entwurf: SchrittEntwurf,
  relation: RelationsVorlage | undefined,
  vorher: Schritt | undefined,
): Schritt {
  const { id, typ } = entwurf
    // Das Formular zeigt toolParams und resultKey nicht an; geladene Werte darf
    // Speichern trotzdem nicht wegwerfen.
  if (typ === 'POPUP_OPEN' || typ === 'POPUP_CLOSE') {
    return {
      id,
      art: typ,
      ergebnisName: vorher?.art === typ ? vorher.ergebnisName : '',
      popupId: entwurf.popupId,
    }
  }
  if (typ === 'BW_LINK') {
    return {
      id,
      art: 'BW_LINK',
      ergebnisName: vorher?.art === 'BW_LINK' ? vorher.ergebnisName : '',
      befehl: entwurf.befehl.trim(),
    }
  }
  if (typ === 'START_TOOL') {
    const alt = vorher?.art === 'START_TOOL' ? vorher : undefined
    return {
      id,
      art: 'START_TOOL',
      ergebnisName: alt?.ergebnisName ?? '',
      toolNr: entwurf.toolNr.trim(),
      toolParameter: alt ? [...alt.toolParameter] : [],
    }
  }
  const vorgaben = relation ? relationsParameterVorgabe(relation) : []
  return {
    id,
    art: 'RELATION',
    relationId: entwurf.relationId,
    parameter: relation
      ? relation.parameter.map((_, index) => {
          const binding = bindungFuer(entwurf, vorgaben, index)
          return { ...binding, value: binding.wert.trim() }
        })
      : [],
    zusatzParameter: entwurf.extraParams.map((b) => ({ ...b, value: b.wert.trim() })),
    ergebnisName: vorher?.ergebnisName ?? '',
  }
}
