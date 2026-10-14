import { frameNumberOf } from '../../core/block/documentFrame'
import { MASK_NAME_DEFAULT, MASK_NAME_PROP } from '../../core/block/maskName'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../../core/block/tree'
import {
  accessOf,
  askAccess,
  entriesOf,
  fileNameFrom,
  freeFileName,
  pickFolder,
  reasonOf,
  writeText,
} from './folderOnDisk'
import { keepHandle, keptHandle } from './handleStore'
import { Subject } from './Subject'

export const MASK_SUFFIX = '.aufbau-maske.json'

// The masks every new one may start from, a folder in the folder of the masks.
export const TEMPLATE_FOLDER = 'Vorlagen'

const KEPT_KEY = 'masken'

// A customer's folder in a folder of customers is deep enough; a folder picked
// too high up, the whole disk, would be walked for minutes.
const DEPTH = 4

// A mask lying in the folder, as the list of masks shows it.
export interface MaskEntry {
  // Where in the folder, the parts joined with „/“.
  path: string
  // The folder it lies in, '' at the top.
  folder: string
  name: string
  // The number of its Layoutrahmen, '' without.
  frame: string
  modified: number
  template: boolean
  file: FileSystemFileHandle
}

// none: no folder picked yet. ask: picked before, and after a restart the
// browser wants a click before the editor may read and write it again.
export type FolderState = 'none' | 'ask' | 'open'

// The one folder the builder keeps the masks in. The browser keeps it over a
// restart (handleStore.ts); the editor reads every mask in it and in its
// folders, and writes new ones into it.
export class MaskFolder extends Subject<MaskFolder> {
  private handle: FileSystemDirectoryHandle | null = null
  private _state: FolderState = 'none'
  private _entries: readonly MaskEntry[] = []
  private _failure: string | null = null
  private _version = 0

  get version(): number { return this._version }
  get state(): FolderState { return this._state }
  get name(): string { return this.handle?.name ?? '' }
  get entries(): readonly MaskEntry[] { return this._entries }
  // Why the folder could not be read, or null.
  get failure(): string | null { return this._failure }

  private changed(): void {
    this._version++
    this.notify(this)
  }

  // The folder of the last time, at the start of the editor.
  async restore(): Promise<void> {
    const kept = await keptHandle<FileSystemDirectoryHandle>(KEPT_KEY)
    if (kept === null || this.handle !== null) return
    this.handle = kept
    await this.opened(await accessOf(kept) === 'granted')
  }

  private async opened(granted: boolean): Promise<void> {
    this._state = granted ? 'open' : 'ask'
    this.changed()
    if (granted) await this.list()
  }

  // Also another folder in place of the one before: then „switched“. Throws
  // when the browser refuses the picker.
  async pick(): Promise<'closed' | 'picked' | 'switched'> {
    const before = this.handle
    const picked = await pickFolder(KEPT_KEY, before ?? undefined)
    if (picked === null) return 'closed'
    const same = before !== null && await before.isSameEntry(picked)
    this.handle = picked
    await keepHandle(KEPT_KEY, picked)
    await this.opened(true)
    return before === null || same ? 'picked' : 'switched'
  }

  async grant(): Promise<boolean> {
    if (this.handle === null || !(await askAccess(this.handle))) return false
    await this.opened(true)
    return true
  }

  // Open to read and write, after one click of the builder at most: the
  // folder of the last time is granted again, else one is picked.
  async ready(): Promise<boolean> {
    if (this._state === 'open') return true
    if (this._state === 'ask') return this.grant()
    return await this.pick() !== 'closed'
  }

  async list(): Promise<void> {
    const handle = this.handle
    if (handle === null || this._state !== 'open') return
    let found: MaskEntry[] = []
    let failure: string | null = null
    try {
      await walk(handle, [], found)
    } catch (error) {
      found = []
      failure = reasonOf(error)
    }
    if (handle !== this.handle) return
    this._entries = found.sort(byPlace)
    this._failure = failure
    this.changed()
  }

  // The file at that place of the folder, or null when it is gone.
  async fileAt(path: string): Promise<FileSystemFileHandle | null> {
    let folder = this.handle
    if (folder === null || this._state !== 'open') return null
    const parts = path.split('/')
    const name = parts.pop()
    if (name === undefined) return null
    try {
      for (const part of parts) folder = await folder.getDirectoryHandle(part)
      return await folder.getFileHandle(name)
    } catch {
      return null
    }
  }

  private opening(): FileSystemDirectoryHandle {
    if (this.handle === null || this._state !== 'open') throw new Error('kein Ordner für die Masken offen')
    return this.handle
  }

  // A mask without a file of its own gets one at the top of the folder, named
  // after the mask; nothing lying there is written over.
  async saveNew(name: string, text: string): Promise<{ file: FileSystemFileHandle; path: string }> {
    const folder = this.opening()
    const fileName = await freeFileName(folder, fileNameFrom(name, MASK_NAME_DEFAULT), MASK_SUFFIX)
    const file = await folder.getFileHandle(fileName, { create: true })
    await writeText(file, text)
    await this.list()
    return { file, path: fileName }
  }

  // A template of the same name is written over: saving a mask as a template
  // again brings the template up to date.
  async saveTemplate(name: string, text: string): Promise<string> {
    const folder = await this.opening().getDirectoryHandle(TEMPLATE_FOLDER, { create: true })
    const fileName = fileNameFrom(name, MASK_NAME_DEFAULT) + MASK_SUFFIX
    await writeText(await folder.getFileHandle(fileName, { create: true }), text)
    await this.list()
    return `${folder.name}/${fileName}`
  }
}

async function walk(folder: FileSystemDirectoryHandle, at: readonly string[], found: MaskEntry[]): Promise<void> {
  for await (const entry of entriesOf(folder)) {
    if (entry.kind === 'directory') {
      if (at.length < DEPTH && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(entry, [...at, entry.name], found)
      }
    } else if (entry.name.endsWith(MASK_SUFFIX)) {
      found.push(await entryOf(entry, at))
    }
  }
}

// A file that does not read as a mask is listed all the same, under its file
// name; opening it says why it does not load.
async function entryOf(file: FileSystemFileHandle, at: readonly string[]): Promise<MaskEntry> {
  const data = await file.getFile()
  const values = rootValues(await data.text())
  const named = values[MASK_NAME_PROP]?.trim() ?? ''
  const tree: MaskTree = { [ROOT_ID]: { id: ROOT_ID, type: ROOT_TYPE, values, parentId: null, childIds: [] } }
  return {
    path: [...at, file.name].join('/'),
    folder: at.join('/'),
    name: named === '' ? file.name.slice(0, -MASK_SUFFIX.length) : named,
    frame: frameNumberOf(tree),
    modified: data.lastModified,
    template: at[0]?.toLowerCase() === TEMPLATE_FOLDER.toLowerCase(),
    file,
  }
}

function rootValues(text: string): Record<string, string> {
  try {
    const values: unknown = (JSON.parse(text) as { tree?: Record<string, { values?: unknown }> }).tree?.[ROOT_ID]?.values
    if (!values || typeof values !== 'object') return {}
    return Object.fromEntries(Object.entries(values).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch {
    return {}
  }
}

// The top of the folder first, then its folders by name, the templates last.
function byPlace(a: MaskEntry, b: MaskEntry): number {
  if (a.template !== b.template) return a.template ? 1 : -1
  if (a.folder !== b.folder) {
    if (a.folder === '') return -1
    if (b.folder === '') return 1
    return a.folder.localeCompare(b.folder, 'de')
  }
  return a.name.localeCompare(b.name, 'de')
}
