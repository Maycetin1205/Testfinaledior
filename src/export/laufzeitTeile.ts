// Die Laufzeit der Maske: die Basis und je benutztem Baustein ein Teil, als ein Skript.
import verzeichnisRoh from './generated/laufzeit.json?raw'

interface TeilEintrag {
  name: string
  datei: string
  bausteine: string[]
  braucht: string[]
}

interface Verzeichnis {
  inhalte: Record<string, string>
  basisDatei: string
  // In Ladereihenfolge: wer ein Modul eines anderen Teils benutzt, steht danach.
  teile: TeilEintrag[]
}

const verzeichnis = JSON.parse(verzeichnisRoh) as Verzeichnis

function inhaltVon(datei: string): string {
  const gefunden = verzeichnis.inhalte[datei]
  if (gefunden === undefined) {
    throw new Error(`Die Laufzeitdatei ${datei} fehlt. "npm run build:runtime" baut sie.`)
  }
  return gefunden.trim()
}

// Jeder Teil, dessen Baustein in der Maske steht, samt den Teilen, die er
// selbst benutzt (Faehigkeiten, andere Bausteine), in Ladereihenfolge und mit
// seiner Groesse: so sieht der Bauer, was eine Maske wirklich traegt.
export function laufzeitTeileFuer(typen: ReadonlySet<string>): { name: string; bytes: number }[] {
  const nachName = new Map(verzeichnis.teile.map((teil) => [teil.name, teil]))
  const gebraucht = new Set<string>()
  const dazu = (name: string): void => {
    if (gebraucht.has(name)) return
    gebraucht.add(name)
    for (const weiterer of nachName.get(name)?.braucht ?? []) dazu(weiterer)
  }
  for (const teil of verzeichnis.teile) {
    if (teil.bausteine.some((typ) => typen.has(typ))) dazu(teil.name)
  }
  return [
    { name: 'basis', bytes: inhaltVon(verzeichnis.basisDatei).length },
    ...verzeichnis.teile
      .filter((teil) => gebraucht.has(teil.name))
      .map((teil) => ({ name: teil.name, bytes: inhaltVon(teil.datei).length })),
  ]
}

// Die Basis und die gebrauchten Teile hintereinander, als ein Skript.
export function laufzeitSkriptFuer(typen: ReadonlySet<string>): string {
  return laufzeitTeileFuer(typen)
    .map((teil) => (teil.name === 'basis'
      ? inhaltVon(verzeichnis.basisDatei)
      : inhaltVon(verzeichnis.teile.find((t) => t.name === teil.name)!.datei)))
    .join('\n')
}
