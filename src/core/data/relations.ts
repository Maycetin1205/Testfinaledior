export type RelationVerb = 'GET_RELATION' | 'PUT_RELATION' | 'PUTADD_RELATION'

export const RELATION_VERBS: readonly RelationVerb[] = [
  'GET_RELATION', 'PUT_RELATION', 'PUTADD_RELATION',
]

export type PlaceholderValues = Readonly<Record<string, string | undefined>>

export interface RelationTemplate {
  id: string

  name: string
  verb: RelationVerb

  nr: string

  parameter: readonly string[]

  extraParameterAllowed?: boolean
}

export type RelationSyntax = Pick<
  RelationTemplate,
  'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'
>

export function relIdFromIdbId(idbId: string): string {
  return idbId.replace(/^IDB/, '')
}

export function todayAsText(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

export function fieldCodeSplit(code: string): { pos: string; len: string } | null {
  const m = /^(\d+)_(\d+)$/.exec(code)
  return m ? { pos: m[1], len: m[2] } : null
}

export function relationSyntaxRead(input: string): RelationSyntax | null {
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
    verb: head[1].toUpperCase() as RelationVerb,
    nr,
    parameter: params,
    extraParameterAllowed: allowExtraParams,
  }
}

export function relationSyntaxAsText(
  relation: Pick<RelationTemplate, 'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'>,
): string {
  const parts = [relation.nr, ...relation.parameter]
  if (relation.extraParameterAllowed) parts.push('...')
  return `${relation.verb}[${parts.join('!')}]`
}

export type RelationGroup = 'read' | 'write'

export function relationGroup(relation: Pick<RelationTemplate, 'verb'>): RelationGroup {
  return relation.verb === 'GET_RELATION' ? 'read' : 'write'
}

export function relationFitsToSearch(
  relation: Pick<RelationTemplate, 'name' | 'verb' | 'nr' | 'parameter' | 'extraParameterAllowed'>,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase('de')
  if (needle === '') return true
  return [relation.name, relation.nr, relationSyntaxAsText(relation)]
    .some((value) => value.toLocaleLowerCase('de').includes(needle))
}

export function placeholderInsert(
  template: Pick<RelationTemplate, 'parameter'>,
  context: PlaceholderValues,
): string[] {
  return template.parameter.map((p) =>
    p.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) =>
      String(context[key] ?? ''),
    ),
  )
}

export function unknownPlaceholder(param: string, known: readonly string[]): string[] {
  const acc: string[] = []
  for (const m of param.matchAll(/\{([A-Z_]+)\}/g)) {
    if (!known.includes(m[1])) acc.push(m[1])
  }
  return acc
}

export function checkRelationTemplates(raw: unknown): RelationTemplate[] {
  if (!Array.isArray(raw)) return []
  const acc: RelationTemplate[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '') continue
    if (seen.has(e.id)) continue
    if (typeof e.name !== 'string' || e.name.trim() === '') continue
    if (typeof e.verb !== 'string' || !RELATION_VERBS.includes(e.verb as RelationVerb)) continue
    if (typeof e.nr !== 'string' || e.nr.trim() === '') continue
    if (!Array.isArray(e.parameter) || e.parameter.some((p) => typeof p !== 'string')) continue
    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      verb: e.verb as RelationVerb,
      nr: e.nr,
      parameter: [...(e.parameter as string[])],
      extraParameterAllowed: e.extraParameterAllowed === true,
    })
  }
  return acc
}
