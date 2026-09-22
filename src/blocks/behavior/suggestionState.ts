import type { Suggestion } from './suggestionList'

function movedMark(mark: number, count: number, step: 1 | -1): number {
  if (count <= 0) return 0
  return (((mark + step) % count) + count) % count
}

function validMark(mark: number, count: number): number {
  if (count <= 0) return 0
  return mark < 0 || mark >= count ? 0 : mark
}

export type KeysFollow =
  | 'marke-hoch'
  | 'marke-runter'
  | 'adopt'
  | 'liste-zu'
  | 'liste-auf'
  | 'window'
  | 'further'
  | 'clear'
  | 'nothing'

export function keyOf(e: KeyboardEvent): string {
  return e.key === 'ArrowDown' && e.altKey ? 'F5' : e.key
}

export interface KeysPlacement {
  listOpen: boolean

  fieldEmpty: boolean

  typed: boolean

  lookupable: boolean

  hasRecords: () => boolean

  jumps: boolean
}

function keysFollow(key: string, l: KeysPlacement & {
  hit: number

  markOfHand: boolean
}): KeysFollow {
  const unique = l.markOfHand || l.hit === 1

  if (key === 'Tab') {
    if (l.listOpen && unique) return 'adopt'
    return l.jumps ? 'further' : 'nothing'
  }
  if (key === 'F5') {
    return l.lookupable ? 'window' : 'nothing'
  }
  if (key === 'Escape') {
    if (l.listOpen) return 'liste-zu'
    return l.fieldEmpty ? 'nothing' : 'clear'
  }
  if (key === 'ArrowDown') {
    if (l.listOpen) return 'marke-runter'
    return l.lookupable && l.hasRecords() ? 'liste-auf' : 'nothing'
  }
  if (key === 'ArrowUp') return l.listOpen ? 'marke-hoch' : 'nothing'
  if (key !== 'Enter') return 'nothing'

  if (l.listOpen) return unique ? 'adopt' : 'window'

  if (l.fieldEmpty) {
    if (l.jumps) return 'further'
    return l.lookupable && l.hasRecords() ? 'window' : 'nothing'
  }

  if (l.typed && l.lookupable) return 'nothing'
  return l.jumps ? 'further' : 'nothing'
}

export class SuggestionState<T extends Suggestion = Suggestion> {
  private _hit: readonly T[] = []

  private _mark = 0

  private _ofHand = false

  private _to = false

  private _on = false

  get hit(): readonly T[] {
    return this._hit
  }

  get mark(): number {
    return this._mark
  }

  get open(): boolean {
    return this._hit.length > 0
  }

  get closed(): boolean {
    return this._to
  }

  get opened(): boolean {
    return this._on
  }

  show(hit: readonly T[]): void {
    this._hit = hit
    this._mark = validMark(this._mark, hit.length)
  }

  ofFront(): void {
    this._mark = 0
    this._ofHand = false
    this._to = false
    this._on = false
  }

  openList(): void {
    this._mark = 0
    this._ofHand = true
    this._to = false
    this._on = true
  }

  idle(): void {
    this._hit = []
    this._mark = 0
    this._ofHand = false
    this._to = false
    this._on = false
  }

  setMark(mark: number): void {
    this._mark = mark
  }

  followFor(key: string, placement: KeysPlacement): KeysFollow {
    const follow = keysFollow(key, {
      ...placement,
      hit: this._hit.length,
      markOfHand: this._ofHand,
    })
    if (follow === 'marke-hoch' || follow === 'marke-runter') {
      this._mark = movedMark(this._mark, this._hit.length, follow === 'marke-hoch' ? -1 : 1)
      this._ofHand = true
    } else if (follow === 'liste-zu') this._to = true
    return follow
  }
}
