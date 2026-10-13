import { cn } from './cn'

// The look of a line in a list or a table of the editor, as a row of the mask:
// under the pointer the hover ground of a field; the chosen one in the soft
// blue of a chosen row with ink text and a stroke of the accent on its left
// edge. Every list of the editor takes these, none writes the blue itself.
export const LINE_HOVER = 'hover:bg-hover'
export const LINE_CHOSEN = 'bg-accent-soft text-ink shadow-mark hover:bg-accent-soft'
// A row of a table: the stroke stands on its first cell.
export const ROW_CHOSEN = 'bg-accent-soft text-ink [&>td:first-child]:shadow-mark'

// The bin at the end of a line on the ground of the line, so it covers the
// text beneath; there while the pointer is on the line or it is marked.
export const binArea = (marked: boolean): string => cn(
  'absolute inset-y-0 right-0 items-center px-[8px] text-muted hover:text-error',
  marked ? 'flex bg-accent-soft' : 'hidden bg-hover group-hover:flex',
)
