import { downloadFile } from './fileDownload'

interface PickerOptions {
  suggestedName?: string
  types?: readonly { description: string; accept: Record<string, readonly string[]> }[]
}

type SaveFilePicker = (options: PickerOptions) => Promise<FileSystemFileHandle>

const JSON_KIND = [{ description: 'Aufbau-Editor', accept: { 'application/json': ['.json'] } }]

function savePicker(): SaveFilePicker | undefined {
  const spot = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof spot === 'function' ? spot : undefined
}

// A file the builder picked once. From then on every change goes there; the
// browser store stays the clipboard behind it. Edge and Chrome hand out such a
// file, every other browser downloads as before.
export class FileOnDisk {
  private handle: FileSystemFileHandle | null = null

  remember(handle: FileSystemFileHandle): void {
    this.handle = handle
  }

  private async put(handle: FileSystemFileHandle, text: string): Promise<void> {
    const open = await handle.createWritable()
    await open.write(text)
    await open.close()
  }

  // Every later change. Without a picked file it writes nothing.
  async writeAgain(text: string): Promise<boolean> {
    const handle = this.handle
    if (handle === null) return false
    try {
      await this.put(handle, text)
      return true
    } catch {
      this.handle = null
      return false
    }
  }
}

// What „Speichern" does: pick the file the first time, write it every time.
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
