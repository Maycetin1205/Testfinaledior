// Die Relations-Vorlagen und wie ihre Parameter zur Laufzeit gefuellt werden.
import type { EintragProblem } from './ladeProblem'

export type RelationsVerb = 'GET_RELATION' | 'PUT_RELATION' | 'PUTADD_RELATION'

export const RELATIONS_VERBEN: readonly RelationsVerb[] = [
  'GET_RELATION', 'PUT_RELATION', 'PUTADD_RELATION',
]

const RELATION_PLACEHOLDERS = [
  'FELD_POS', 'FELD_LEN', 'PINDEX', 'SELKEY', 'DROP_PINDEX',
  'RELID', 'VALUE', 'ZIMMER', 'NOW_DATE',
] as const

export type Platzhalterwerte = Readonly<Record<string, string | undefined>>

export interface RelationsVorlage {
  id: string

  name: string
  verb: RelationsVerb

  nr: string

  params: readonly string[]

  allowExtraParams?: boolean
}

export type RelationsSyntax = Pick<
  RelationsVorlage,
  'verb' | 'nr' | 'params' | 'allowExtraParams'
>

export const EINGEBAUTE_RELATIONEN: readonly RelationsVorlage[] = [
  {
    id: 'standard-put',
    name: 'Standard-Schreiben (PUT)',
    verb: 'PUT_RELATION',
    nr: '174',
    params: ['{FELD_POS}', '{FELD_LEN}', 'L', '{PINDEX}', '{RELID}', '{VALUE}'],
  },
]

export function relIdAusIdbId(idbId: string): string {
  return idbId.replace(/^IDB/, '')
}

export function heuteAlsText(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

export function feldCodeZerlegen(code: string): { pos: string; len: string } | null {
  const m = /^(\d+)_(\d+)$/.exec(code)
  return m ? { pos: m[1], len: m[2] } : null
}

export function relationsSyntaxLesen(input: string): RelationsSyntax | null {
  const raw = input.trim()
  const head = /^(GET_RELATION|PUTADD_RELATION|PUT_RELATION)\[/i.exec(raw)
  if (!head || !raw.endsWith(']') || /[\r\n]/.test(raw)) return null

  const body = raw.slice(head[0].length, -1)
  const parts = body.split('!')
  const nr = parts.shift() ?? ''
  if (!/^\d+$/.test(nr)) return null

  let allowExtraParams = false
  if (parts.at(-1) === '...') {
    allowExtraParams = true
    parts.pop()
  }

  const params = parts.map((param) => {
    const doubled = /^\{\{([A-Za-z0-9_]+)\}\}$/.exec(param)
    return doubled ? `{${doubled[1]}}` : param
  })

  return {
    verb: head[1].toUpperCase() as RelationsVerb,
    nr,
    params,
    allowExtraParams,
  }
}

export function relationsSyntaxAlsText(
  relation: Pick<RelationsVorlage, 'verb' | 'nr' | 'params' | 'allowExtraParams'>,
): string {
  const parts = [relation.nr, ...relation.params]
  if (relation.allowExtraParams) parts.push('...')
  return `${relation.verb}[${parts.join('!')}]`
}

export type RelationsGruppe = 'lesen' | 'schreiben'

export function relationsGruppe(relation: Pick<RelationsVorlage, 'verb'>): RelationsGruppe {
  return relation.verb === 'GET_RELATION' ? 'lesen' : 'schreiben'
}

export function relationPasstZurSuche(
  relation: Pick<RelationsVorlage, 'name' | 'verb' | 'nr' | 'params' | 'allowExtraParams'>,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase('de')
  if (needle === '') return true
  return [relation.name, relation.nr, relationsSyntaxAlsText(relation)]
    .some((value) => value.toLocaleLowerCase('de').includes(needle))
}

export function platzhalterEinsetzen(
  template: Pick<RelationsVorlage, 'params'>,
  context: Platzhalterwerte,
): string[] {
  return template.params.map((p) =>
    p.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) =>
      String(context[key] ?? ''),
    ),
  )
}

export function unbekanntePlatzhalter(
  param: string,
  known: readonly string[] = RELATION_PLACEHOLDERS,
): string[] {
  const acc: string[] = []
  for (const m of param.matchAll(/\{([A-Z_]+)\}/g)) {
    if (!known.includes(m[1])) acc.push(m[1])
  }
  return acc
}

export function pruefeRelationsVorlagen(
  raw: unknown,
): { liste: RelationsVorlage[]; probleme: EintragProblem[] } {
  const probleme: EintragProblem[] = []
  if (!Array.isArray(raw)) return { liste: [], probleme }
  const acc: RelationsVorlage[] = []
  const seen = new Set<string>()
  let nr = 0
  for (const entry of raw) {
    nr++
    const stelle = entry && typeof entry === 'object'
      && typeof (entry as Record<string, unknown>).id === 'string'
      && (entry as Record<string, unknown>).id !== ''
      ? (entry as Record<string, unknown>).id as string
      : `Eintrag ${nr}`
    const weg = (grund: string): void => { probleme.push({ stelle, grund }) }
    if (!entry || typeof entry !== 'object') {
      weg('die Relations-Vorlage ist unlesbar')
      continue
    }
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '') {
      weg('der Vorlage fehlt ihre Kennung')
      continue
    }
    if (seen.has(e.id)) {
      weg('diese Kennung kommt zweimal vor')
      continue
    }
    if (typeof e.name !== 'string' || e.name.trim() === '') {
      weg('der Klarname fehlt')
      continue
    }
    if (typeof e.verb !== 'string' || !RELATIONS_VERBEN.includes(e.verb as RelationsVerb)) {
      weg('die Art des Aufrufs (GET/PUT/PUTADD) fehlt oder ist unbekannt')
      continue
    }
    if (typeof e.nr !== 'string' || e.nr.trim() === '') {
      weg('die Relations-Nummer fehlt')
      continue
    }
    if (!Array.isArray(e.params) || e.params.some((p) => typeof p !== 'string')) {
      weg('die Parameter-Syntax ist unbrauchbar')
      continue
    }
    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      verb: e.verb as RelationsVerb,
      nr: e.nr,
      params: [...(e.params as string[])],
      allowExtraParams: e.allowExtraParams === true,
    })
  }
  return { liste: acc, probleme }
}
