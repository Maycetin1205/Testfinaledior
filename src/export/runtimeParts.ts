import manifestRaw from './generated/runtime.json?raw'

interface PartEntry {
  name: string
  file: string
  blockTypes: string[]
  needs: string[]
}

interface Manifest {
  contents: Record<string, string>
  baseFile: string
  parts: PartEntry[]
}

const manifest = JSON.parse(manifestRaw) as Manifest

function contentOf(file: string): string {
  const found = manifest.contents[file]
  if (found === undefined) {
    throw new Error(`Die Laufzeitdatei ${file} fehlt. "npm run build:runtime" baut sie.`)
  }
  return found.trim()
}

export function runtimePartsFor(types: ReadonlySet<string>): { name: string; bytes: number }[] {
  const byName = new Map(manifest.parts.map((part) => [part.name, part]))
  const used = new Set<string>()
  const add = (name: string): void => {
    if (used.has(name)) return
    used.add(name)
    for (const further of byName.get(name)?.needs ?? []) add(further)
  }
  for (const part of manifest.parts) {
    if (part.blockTypes.some((type) => types.has(type))) add(part.name)
  }
  return [
    { name: 'base', bytes: contentOf(manifest.baseFile).length },
    ...manifest.parts
      .filter((part) => used.has(part.name))
      .map((part) => ({ name: part.name, bytes: contentOf(part.file).length })),
  ]
}

export function runtimeScriptFor(types: ReadonlySet<string>): string {
  return runtimePartsFor(types)
    .map((part) => (part.name === 'base'
      ? contentOf(manifest.baseFile)
      : contentOf(manifest.parts.find((p) => p.name === part.name)!.file)))
    .join('\n')
}
