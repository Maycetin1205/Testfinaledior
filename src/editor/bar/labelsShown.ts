import { createContext } from 'react'

// In the bar itself only the signs and the values stand; the names in front
// of a control are there for a screen reader alone. A window at the bar shows
// them again.
export const LabelsShown = createContext(true)
