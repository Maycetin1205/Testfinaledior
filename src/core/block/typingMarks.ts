// Marks the blocks set on their own elements for the door to SoftEngine
// (src/softengine/), which may not ask the blocks themselves.

// An input whose typing the block keeps itself, as the capture keeps its
// rows: a new delivery does not wait while the cursor stands in it.
export const KEEPS_TYPING_ATTR = 'data-ff-keeps-typing'

// A spot whose click puts the cursor into typing, as the rows below the line
// of the capture do: SoftEngine is not told that editing ended.
export const LEADS_TO_TYPING_ATTR = 'data-ff-leads-to-typing'
