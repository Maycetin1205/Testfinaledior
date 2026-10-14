import { downloadFile } from './downloadFile'
import { writeText } from './folderOnDisk'

interface PickerOptions {
  suggestedName?: string
  types?: readonly { description: string; accept: Record<string, readonly string[]> }[]
}

type SaveFilePicker = (options: PickerOptions) => Promise<FileSystemFileHandle>

// Where the mask was kept at one step of the history.
export interface FilePlace {
  handle: FileSystemFileHandle | null
  path: string | null
}

const JSON_KIND = [{ description: 'Aufbau-Editor', accept: { 'application/json': ['.json'] } }]

function savePicker(): SaveFilePicker | undefined {
  const spot = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof spot === 'function' ? spot : undefined
}

// The file the work is kept in: one of the folder of the masks, or one the
// builder picked. From then on every change goes there; the browser store
// stays the clipboard behind it. Edge and Chrome hand out such a file, every
// other browser downloads.
export class FileOnDisk {
  private handle: FileSystemFileHandle | null = null

  // Where in the folder of the masks the file lies. The browser store keeps
  // it over a restart, the handle it does not; the place is then known before
  // the folder is open again.
  private _path: string | null = null

  // What the file holds as far as the editor knows: the same text is not
  // written again, so a click on a block leaves the file alone.
  private written: string | null = null

  // A file whose text is known, just opened, stays as it is until the builder
  // changes something, also when the editor fits a height on opening.
  private quiet = false

  get attached(): boolean { return this.handle !== null }

  get path(): string | null { return this._path }

  get name(): string { return this.handle?.name ?? '' }

  get place(): FilePlace { return { handle: this.handle, path: this._path } }

  remember(handle: FileSystemFileHandle, path: string | null = null, holds: string | null = null): void {
    this.handle = handle
    this._path = path
    this.written = holds
    this.quiet = holds !== null
  }

  // Back to the file of a step of the history; what it holds is not known.
  restore(place: FilePlace): void {
    if (place.handle === null) this.expect(place.path)
    else this.remember(place.handle, place.path)
  }

  // The builder changed something: from now on the file follows.
  stir(): void {
    this.quiet = false
  }

  // The place of the last time, the file not yet at hand.
  expect(path: string | null): void {
    this.handle = null
    this._path = path
    this.written = null
    this.quiet = false
  }

  forget(): void {
    this.expect(null)
  }

  // Throws when the file cannot be written.
  async write(text: string): Promise<void> {
    const handle = this.handle
    if (handle === null) throw new Error('keine Datei gewählt')
    this.quiet = false
    if (text === this.written) return
    await writeText(handle, text)
    if (handle === this.handle) this.written = text
  }

  // Every later change. Without a file it writes nothing; a file that can no
  // longer be written is let go, its place kept.
  async writeAgain(text: string): Promise<boolean> {
    const handle = this.handle
    if (handle === null) return false
    if (this.quiet) return true
    try {
      await this.write(text)
      return true
    } catch {
      if (handle === this.handle) this.handle = null
      return false
    }
  }
}

// What „Speichern" does without a folder of masks, in a browser that cannot
// open one: pick the file the first time, write it every time.
export async function writeFile(
  file: FileOnDisk,
  suggestedName: string,
  text: string,
): Promise<void> {
  if (await file.writeAgain(text)) return

  const pick = savePicker()
  if (pick === undefined) {
    downloadFile(suggestedName, text, 'application/json')
    return
  }

  let handle: FileSystemFileHandle
  try {
    handle = await pick({ suggestedName, types: JSON_KIND })
  } catch {
    // The builder closed the picker; that is no failure.
    return
  }
  file.remember(handle)
  await file.writeAgain(text)
}
