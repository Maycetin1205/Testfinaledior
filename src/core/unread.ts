// The names a type declares, across every member of a union.
type KeysOf<T> = T extends unknown ? keyof T : never

// A stored T before it is read, from a file, an attribute or browser storage:
// T's own names, each value unchecked, so a reader asks only for what T declares.
export type Unread<T> = { readonly [K in KeysOf<T>]?: unknown }

export function isUnread<T>(raw: unknown): raw is Unread<T> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}
