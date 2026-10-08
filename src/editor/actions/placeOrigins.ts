import type { ListGroup } from '@/editor/widgets/List'
import type { Parameter } from '../../core/data/actions'
import { parameterRole } from '../../core/data/relations'
import { originParameter, parameterOrigin, type OriginKind, type ValueOrigin } from '../../core/data/valueOrigin'
import { originKey, originName, originOf, originsOf, valueName } from '../origin/origins'
import type { Reach } from '../origin/reach'
import { adoptFields } from './fieldAdopt'

// The places of a relation read what the reach of the mask holds. Position,
// length and table take a field of a source instead, which fills all three.
const ADOPT = 'adopt:'

// What stands in a place, in plain words: the typed value, or the name of the
// field, column or value it reads.
export function placeEntry(b: Parameter, reach: Reach): string {
  const o = parameterOrigin(b)
  return o === null ? '' : valueName(o, reach)
}

// What the column "Eingabe" shows: a form field, named in "Herkunft", gives
// its content.
export function entryText(b: Parameter, reach: Reach): string {
  return b.source === 'blockValue' ? 'Inhalt' : placeEntry(b, reach)
}

// Where a place takes its value from, as the key of an origin, or of a source
// whose field fills position, length and table. Empty while the place is empty.
export function placeOrigin(b: Parameter, raw: string, adopted: { sourceId: string } | undefined): string {
  if (b.source === 'fixed') {
    if (b.value.trim() === '') return ''
    return parameterRole(raw) !== null && adopted ? `${ADOPT}${adopted.sourceId}` : 'fixed'
  }
  const o = parameterOrigin(b)
  return o === null ? '' : originKey(o)
}

// The origin in a few words, as the column "Herkunft" shows it.
export function placeOriginName(key: string, reach: Reach, adoptedLabel?: string): string {
  if (!key.startsWith(ADOPT)) return originName(key, reach)
  const source = reach.sources?.find((s) => `${ADOPT}${s.id}` === key)?.name ?? ''
  return adoptedLabel ? `${source}: ${adoptedLabel}` : source
}

// What a place can take its value from: a short list of only what this mask
// has, each form field by its own name. Position, length and table take a
// field of a source, which fills all three. The sources stand in a group of
// their own.
export function placeGroups(raw: string, reach: Reach): ListGroup[] {
  const fixed = { value: 'fixed', name: originName('fixed', reach) }
  const sources = reach.sources ?? []
  if (parameterRole(raw) !== null) {
    const fields = adoptFields(sources)
    return [
      { key: 'fixed', entries: [fixed] },
      {
        key: 'adopt',
        name: 'Feld einer Quelle',
        entries: sources
          .filter((s) => fields.some((f) => f.sourceId === s.id))
          .map((s) => ({ value: `${ADOPT}${s.id}`, name: s.name })),
      },
    ].filter((g) => g.entries.length > 0)
  }
  const origins = originsOf(reach)
  const of = (kinds: readonly OriginKind[]) => origins
    .filter((o) => kinds.includes(o.kind) && (o.kind !== 'source' || o.entries.length > 0))
    .map((o) => ({ value: o.key, name: o.name }))
  return [
    { key: 'fixed', entries: [fixed, ...of(['event'])] },
    { key: 'mask', name: 'Maske', entries: of(['captured', 'changed', 'chosenRow', 'step']) },
    { key: 'formFields', name: 'Formularfelder', entries: of(['formField']) },
    { key: 'sources', name: 'Quelle', entries: of(['source']) },
  ].filter((g) => g.entries.length > 0)
}

// A chosen entry: a value for the place, or a field whose position and length
// fill every place that asks for them.
type PlacePick = { set: Parameter } | { adopt: { sourceId: string; code: string } }

export function placePicked(value: string): PlacePick | null {
  const picked = JSON.parse(value) as ValueOrigin | { adopt: { sourceId: string; code: string } }
  if ('adopt' in picked) return picked
  const set = originParameter(picked)
  return set ? { set } : null
}

// What one origin offers for the column "Eingabe": only its own fields,
// columns or values. A step offers its whole answer.
export function placeEntries(key: string, reach: Reach): ListGroup[] {
  const entries = key.startsWith(ADOPT)
    ? adoptFields(reach.sources ?? [])
        .filter((f) => `${ADOPT}${f.sourceId}` === key)
        .map((f) => ({ value: JSON.stringify({ adopt: { sourceId: f.sourceId, code: f.code } }), name: f.label, badge: f.code }))
    : originOf(key, reach)?.entries ?? []
  return entries.length > 0 ? [{ key, entries }] : []
}
