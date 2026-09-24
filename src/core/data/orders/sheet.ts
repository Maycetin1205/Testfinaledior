// The order sheet (SEvariablen): the blocks in the order SoftEngine's own masks
// write them. SEFILELOOP and ERPAPICALL stand there even when empty.

export interface VarEntry {
  ID: string
  FELDER: string
}

export interface SefileloopEntry {
  INDEX_NR: 0
  ALIAS: string
  ID: string
  KOPFSATZ_INDEX?: string
  FELDER: string
}

export interface ErpApiCallEntry {
  ID: string
  ALIAS: string
  FELDER: string
}

export interface DatasetEntry {
  ID: string
  ALIAS: string
  FELDER: string
}

export interface MaskEntry {
  ID: string
  BEREICH: string
  FELDER: '*'
  REFRESH_FELDER: '*'
  ALIAS: string
}

export interface Sheet {
  VAR: VarEntry[]
  SEFILELOOP: SefileloopEntry[]
  ERPAPICALL: ErpApiCallEntry[]
  DATASET: DatasetEntry[]
  MASKE: MaskEntry[]
}

export type SheetPart = Partial<Sheet>

// VAR knows every table once; entries of the same table share one field list.
function varTogether(entries: readonly VarEntry[]): VarEntry[] {
  const perId = new Map<string, string[]>()
  for (const entry of entries) {
    if (entry.ID === '') continue
    const codes = perId.get(entry.ID) ?? []
    for (const raw of entry.FELDER.split(',')) {
      const code = raw.trim()
      if (code !== '' && !codes.includes(code)) codes.push(code)
    }
    perId.set(entry.ID, codes)
  }
  return [...perId]
    .filter(([, codes]) => codes.length > 0)
    .map(([ID, codes]) => ({ ID, FELDER: codes.join(',') }))
}

export function sheetFrom(parts: readonly SheetPart[]): SheetPart {
  const all = <B extends keyof Sheet>(block: B): Sheet[B][number][] =>
    parts.flatMap((part) => part[block] ?? [])
  const vars = varTogether(all('VAR'))
  const dataset = all('DATASET')
  const mask = all('MASKE')
  return {
    ...(vars.length > 0 ? { VAR: vars } : {}),
    SEFILELOOP: all('SEFILELOOP'),
    ERPAPICALL: all('ERPAPICALL'),
    ...(dataset.length > 0 ? { DATASET: dataset } : {}),
    ...(mask.length > 0 ? { MASKE: mask } : {}),
  }
}
