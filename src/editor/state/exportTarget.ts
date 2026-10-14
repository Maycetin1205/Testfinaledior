import { accessOf, askAccess, pickFolder, reasonOf, writeText } from './folderOnDisk'
import { keepHandle, keptHandle } from './handleStore'

// The folders exports go to, kept by this browser under the name the mask
// carries (exportTarget at the root of the mask). A browser never tells a
// folder's path, only its name; two folders of the same name, „10000“ of two
// customers, get „10000“ and „10000 (2)“, so no mask writes into another's.
const KEPT_KEY = 'exportziele'

interface KeptTarget {
  name: string
  folder: FileSystemDirectoryHandle
}

async function keptTargets(): Promise<KeptTarget[]> {
  return await keptHandle<KeptTarget[]>(KEPT_KEY) ?? []
}

async function keptFolder(name: string): Promise<FileSystemDirectoryHandle | null> {
  return (await keptTargets()).find((t) => t.name === name)?.folder ?? null
}

// Whether this browser has the folder of that name; on another machine a
// mask names a folder it has never seen.
export async function knowsExportTarget(name: string): Promise<boolean> {
  return await keptFolder(name) !== null
}

// The name the mask is to carry for the folder the builder picks, or null
// when the picker was closed.
export async function pickExportTarget(now: string): Promise<string | null> {
  const before = now === '' ? null : await keptFolder(now)
  const folder = await pickFolder('export', before ?? undefined)
  if (folder === null) return null
  const targets = await keptTargets()
  for (const t of targets) {
    if (await t.folder.isSameEntry(folder)) return t.name
  }
  const taken = new Set(targets.map((t) => t.name))
  let name = folder.name
  for (let n = 2; taken.has(name); n++) name = `${folder.name} (${n})`
  await keepHandle(KEPT_KEY, [...targets, { name, folder }])
  return name
}

export type ExportFolder =
  | { ok: true; folder: FileSystemDirectoryHandle }
  | { ok: false; why: string }

// The folder, open for writing. Asked for at the click on „Exportieren“,
// before anything else: only then may the browser ask the builder again.
export async function exportFolder(name: string): Promise<ExportFolder> {
  const folder = await keptFolder(name)
  if (folder === null) {
    return { ok: false, why: 'ist auf diesem Rechner noch nicht gewählt; das geht im Fenster „Masken“ unten.' }
  }
  if (await accessOf(folder) === 'ask' && !(await askAccess(folder))) {
    return { ok: false, why: 'darf der Editor nicht beschreiben; der Browser hat es nicht erlaubt.' }
  }
  return { ok: true, folder }
}

// Null when both files are written, else why not.
export async function writeExport(
  folder: FileSystemDirectoryHandle,
  files: readonly { name: string; text: string }[],
): Promise<string | null> {
  try {
    for (const f of files) await writeText(await folder.getFileHandle(f.name, { create: true }), f.text)
    return null
  } catch (error) {
    return `ließ sich nicht beschreiben (${reasonOf(error)}).`
  }
}
