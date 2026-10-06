import { createContext, useContext } from 'react'

// The strip under the toolbar, once BarStrip has drawn it.
export const StripContext = createContext<HTMLElement | null>(null)

export function useBarStrip(): HTMLElement | null {
  return useContext(StripContext)
}
