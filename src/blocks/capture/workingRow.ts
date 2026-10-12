import { clearSelection, giverIdOf, selectionFor, setMadeSelection } from '../../runtime/selection'
import type { CaptureColumn } from './column'

const TYPING = 'typing'
const CAPTURED = 'captured'

// The position the operator works on, given to what follows the capture as its
// chosen row before SoftEngine has it: the row being typed, and a captured or
// written position clicked. So what follows, like the stock of the article,
// shows at once. The row holds the values by field code, as a delivered one
// would.
export class WorkingRow {
  private readonly block: HTMLElement

  private given: { key: string; trait: string; row: Record<string, string> } | null = null

  constructor(block: HTMLElement) {
    this.block = block
  }

  private get giverId(): string {
    return giverIdOf(this.block)
  }

  private get stands(): boolean {
    return this.given !== null && selectionFor(this.giverId) === this.given.row
  }

  // What the operator touched last stands. The row being typed, unchanged,
  // does not take back a row clicked meanwhile; a click gives its row anew.
  private give(key: string, columns: readonly CaptureColumn[], values: readonly string[], byClick: boolean): void {
    const row: Record<string, string> = {}
    columns.forEach((column, i) => {
      const value = values[i] ?? ''
      if (column.field !== '' && value !== '') row[column.field] = value
    })
    const trait = `${key}:${JSON.stringify(row)}`
    if (this.given?.trait === trait && (this.stands || !byClick)) return
    this.given = { key, trait, row }
    setMadeSelection(this.giverId, row, trait)
  }

  private drop(): void {
    if (this.stands) clearSelection(this.giverId)
    this.given = null
  }

  // After each drawing: the row being typed stands while it holds something.
  // Captured, it stays as the position it became; emptied or given up, it goes.
  followTyping(
    columns: readonly CaptureColumn[],
    touched: boolean,
    values: () => readonly string[],
    captured: boolean,
  ): void {
    if (touched) {
      this.give(TYPING, columns, values(), false)
      return
    }
    if (this.given?.key !== TYPING) return
    if (captured) this.given = { ...this.given, key: CAPTURED }
    else this.drop()
  }

  // A click on a captured or written position: it stands, or, standing
  // already, it goes.
  toggleCaptured(key: string, columns: readonly CaptureColumn[], values: readonly string[]): void {
    if (this.chosen(key)) {
      this.drop()
      return
    }
    this.give(key, columns, values, true)
  }

  // Whether the captured position with this key is the one that stands.
  chosen(key: string): boolean {
    return this.given?.key === key && this.stands
  }
}
