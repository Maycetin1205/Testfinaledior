// The names a type declares, across every member of a union.
type KeysOf<T> = T extends unknown ? keyof T : never

// A stored T before it is read: from the mask file, the customer file, an
// attribute or browser storage. The names are T's own, each value unchecked,
// so a reader can only ask for what the type declares.
export type Unread<T> = { readonly [K in KeysOf<T>]?: unknown }

export function isUnread<T>(raw: unknown): raw is Unread<T> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}
