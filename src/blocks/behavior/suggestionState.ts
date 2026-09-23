import type { Suggestion } from './suggestionList'

function movedMark(mark: number, count: number, step: 1 | -1): number {
  if (count <= 0) return 0
  return (((mark + step) % count) + count) % count
}

function validMark(mark: number, count: number): number {
  if (count <= 0) return 0
  return mark < 0 || mark >= count ? 0 : mark
}

export type KeyAction =
  | 'markUp'
  | 'markDown'
  | 'adopt'
  | 'closeList'
  | 'openList'
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

function keyAction(key: string, l: KeysPlacement & {
  hit: number

  markByHand: boolean
}): KeyAction {
  const unique = l.markByHand || l.hit === 1

  if (key === 'Tab') {
    if (l.listOpen && unique) return 'adopt'
    return l.jumps ? 'further' : 'nothing'
  }
  if (key === 'F5') {
    return l.lookupable ? 'window' : 'nothing'
  }
  if (key === 'Escape') {
    if (l.listOpen) return 'closeList'
    return l.fieldEmpty ? 'nothing' : 'clear'
  }
  if (key === 'ArrowDown') {
    if (l.listOpen) return 'markDown'
    return l.lookupable && l.hasRecords() ? 'openList' : 'nothing'
  }
  if (key === 'ArrowUp') return l.listOpen ? 'markUp' : 'nothing'
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

  private _markByHand = false

  private _closed = false

  private _opened = false

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
    return this._closed
  }

  get opened(): boolean {
    return this._opened
  }

  show(hit: readonly T[]): void {
    this._hit = hit
    this._mark = validMark(this._mark, hit.length)
  }

  restart(): void {
    this._mark = 0
    this._markByHand = false
    this._closed = false
    this._opened = false
  }

  openList(): void {
    this._mark = 0
    this._markByHand = true
    this._closed = false
    this._opened = true
  }

  idle(): void {
    this._hit = []
    this._mark = 0
    this._markByHand = false
    this._closed = false
    this._opened = false
  }

  setMark(mark: number): void {
    this._mark = mark
  }

  actionFor(key: string, placement: KeysPlacement): KeyAction {
    const action = keyAction(key, {
      ...placement,
      hit: this._hit.length,
      markByHand: this._markByHand,
    })
    if (action === 'markUp' || action === 'markDown') {
      this._mark = movedMark(this._mark, this._hit.length, action === 'markUp' ? -1 : 1)
      this._markByHand = true
    } else if (action === 'closeList') this._closed = true
    return action
  }
}
