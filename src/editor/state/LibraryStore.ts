import { deepClone } from '../../core/deepClone'
import { Subject } from './Subject'

export interface LibraryEntry { id: string }

export class LibraryStore<T extends LibraryEntry> extends Subject<LibraryStore<T>> {
  private _entries: T[]
  private _version = 0
  private _ofHandChanged = false

  constructor(stock: readonly T[] = []) {
    super()
    this._entries = deepClone(stock) as T[]
  }

  get list(): readonly T[] { return this._entries }
  get version(): number { return this._version }

  get ofHandChanged(): boolean { return this._ofHandChanged }

  get(id: string): T | undefined {
    return this._entries.find((e) => e.id === id)
  }

  private beforeChange = new Set<() => void>()

  observeBeforeChange(fn: () => void): () => void {
    this.beforeChange.add(fn)
    return () => { this.beforeChange.delete(fn) }
  }

  private reportBeforeChange(): void {
    this._ofHandChanged = true
    for (const fn of [...this.beforeChange]) fn()
  }

  override notify(data: LibraryStore<T>): void {
    this._version++
    super.notify(data)
  }

  add(data: Omit<T, 'id'>): T {
    const entry = { ...deepClone(data), id: crypto.randomUUID() } as T
    this.reportBeforeChange()
    this._entries = [...this._entries, entry]
    this.notify(this)
    return entry
  }

  update(id: string, data: Omit<T, 'id'>): void {
    const at = this._entries.findIndex((e) => e.id === id)
    if (at < 0) return
    const next = [...this._entries]
    next[at] = { ...deepClone(data), id } as T
    this.reportBeforeChange()
    this._entries = next
    this.notify(this)
  }

  replaceAll(entries: readonly T[]): void {
    if (entries.length === 0 && this._entries.length === 0) return
    this.reportBeforeChange()
    this._entries = deepClone(entries) as T[]
    this.notify(this)
  }

  remove(id: string): void {
    const next = this._entries.filter((e) => e.id !== id)
    if (next.length === this._entries.length) return
    this.reportBeforeChange()
    this._entries = next
    this.notify(this)
  }

}
