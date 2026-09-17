// Prueft die Bauweise der Bausteine, nicht ihr Verhalten: das koennen Tests
// nicht. Ein Baustein gilt als umgebaut, sobald seine Verhaltensdatei wie der
// Baustein heisst (Tabelle.ts statt einer Block-Datei); dann gelten alle Regeln,
// und jeder Verstoss bricht ab. Alte Bausteine werden nur genannt.
// Aufruf: node tools/bausteinPruefen.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORDNER = path.join(WURZEL, 'src/bausteine')
const KEIN_BAUSTEIN = new Set(['grund', 'shared', 'faehigkeiten'])
const HOECHSTENS_DATEIEN = 3

// Englische Namen, die an einer Eigenschaft eines umgebauten Bausteins nichts
// mehr verloren haben. Lit- und DOM-Namen (render, styles, connectedCallback)
// sind keine Eigenschaften und fallen nicht darunter.
const ENGLISCH = /^(source|width|height|label|value|field|fieldType|options|placeholder|heading|meta|date|time|variant|status|editable|direction|items|rows|columns|selected|visible|disabled|name)$/

function dateienIn(ordner) {
  return readdirSync(ordner).filter((n) => statSync(path.join(ordner, n)).isFile())
}

// Ein Ordner darf mehrere Bausteine halten, die nur miteinander vorkommen (die
// Tafel, ihre Spalten, ihre Unterteilungen). Gezaehlt wird darum je Baustein.
// Haelt der Ordner mehrere, tragen Stil und Test den Namen ihres Bausteins
// vorn; der laengste Treffer gewinnt, sonst zoege Kanban den kanbanSpalteStil.
function bausteineIn(ordner, dateien) {
  const namen = dateien
    .filter((d) => /class \w+ extends Grundbaustein/.test(readFileSync(path.join(ordner, d), 'utf8')))
    .map((d) => d.replace(/\.ts$/, ''))
  const zuordnung = new Map(namen.map((n) => [n, []]))
  if (namen.length === 1) return { zuordnung: new Map([[namen[0], dateien]]), ohne: [] }
  const ohne = []
  for (const datei of dateien) {
    const klein = datei.toLowerCase()
    const treffer = namen
      .filter((n) => klein.startsWith(n.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0]
    if (treffer === undefined) ohne.push(datei)
    else zuordnung.get(treffer).push(datei)
  }
  return { zuordnung, ohne }
}

function pruefeBaustein(name) {
  const ordner = path.join(ORDNER, name)
  const dateien = dateienIn(ordner)
  if (dateien.some((d) => /Block\.ts$/.test(d))) return { name, alt: true, maengel: [] }
  const maengel = []
  const wo0 = (satz) => maengel.push(`${name}: ${satz}`)
  const { zuordnung, ohne } = bausteineIn(ordner, dateien)
  if (zuordnung.size === 0) wo0('kein Baustein; der Ordner meldet keine Klasse am Grundbaustein an')
  for (const datei of ohne) {
    wo0(`${datei} gehoert zu keinem Baustein; Stil und Test heissen wie ihr Baustein`)
  }
  for (const [baustein, eigene] of zuordnung) {
    if (eigene.length > HOECHSTENS_DATEIEN) {
      wo0(`${baustein} hat ${eigene.length} Dateien; erlaubt sind Verhalten, Stil, Test`)
    }
  }
  for (const datei of dateien) {
    const text = readFileSync(path.join(ordner, datei), 'utf8').replace(/\r\n/g, '\n')
    const zeilen = text.split('\n')
    const wo = (satz) => maengel.push(`${name}/${datei}: ${satz}`)

    // An einem Seiten-Baustein ist `name` kein englisches Wort, sondern der
    // Name der Seite: kern/maske/seiten.ts liest ihn dort, nicht der Baustein.
    const seitenBaustein = /static (?:override )?readonly seite = true/.test(text)
    const englisch = (wort) => ENGLISCH.test(wort) && !(wort === 'name' && seitenBaustein)

    if (!/^\/\/ \S/.test(zeilen[0])) wo('die erste Zeile sagt nicht, wofuer die Datei da ist')

    for (const m of text.matchAll(/from '([^']+)'/g)) {
      const spec = m[1]
      if (/^\.\.\/shared\//.test(spec)) wo(`holt aus shared (${spec}); shared gibt es fuer umgebaute Bausteine nicht`)
      else if (/^\.\.\/(?!grund\/|faehigkeiten\/)[a-z]+\//.test(spec)) wo(`holt aus einem anderen Baustein (${spec}); was beide brauchen, ist eine Faehigkeit`)
      if (/softengine\/bridge'/.test(spec) && /\bseFenster\b/.test(text)) wo('fasst SoftEngine direkt an')
    }

    for (const m of text.matchAll(/class \w+ extends (\w+)/g)) {
      if (m[1] !== 'Grundbaustein') wo(`erbt von ${m[1]}; erlaubt ist nur der Grundbaustein`)
    }

    if (/as unknown as/.test(text)) wo('deutet ein Objekt blind um (as unknown as); der Vertrag gehoert in faehigkeiten.ts')
    if (/\btyp === '|\.typ !== '/.test(text)) wo('fragt nach dem Bausteintyp; Faehigkeiten fragen')

    for (const m of text.matchAll(/@property\([^)]*\)\s+(?:override\s+)?(\w+)/g)) {
      if (englisch(m[1])) wo(`Eigenschaft „${m[1]}" heisst englisch`)
    }
    const vorgaben = /static (?:override )?readonly vorgaben = \{([\s\S]*?)\n  \}/.exec(text)
    if (vorgaben) {
      for (const m of vorgaben[1].matchAll(/^\s+(\w+):/gm)) {
        if (englisch(m[1])) wo(`Vorgabe „${m[1]}" heisst englisch`)
      }
    }

    if (/class \w+ extends Grundbaustein/.test(text) && !/static (?:override )?readonly faehigkeiten/.test(text)) {
      wo('meldet keine Faehigkeiten; auch eine leere Liste ist eine Aussage')
    }

    const code = zeilen.filter((z) => z.trim() !== '').length
    const kommentare = zeilen.filter((z) => /^\s*\/\//.test(z)).length
    if (code > 0 && kommentare / code > 0.25) {
      wo(`${kommentare} Kommentarzeilen auf ${code} Zeilen; Kommentare sagen warum, in ein bis zwei Zeilen`)
    }
    if (zeilen.length > 500) wo(`${zeilen.length} Zeilen; eine Sache liest man am Stueck, das hier sind zwei`)
  }
  return { name, alt: false, maengel: [...new Set(maengel)] }
}

const namen = readdirSync(ORDNER).filter((n) => !KEIN_BAUSTEIN.has(n) && statSync(path.join(ORDNER, n)).isDirectory())
let fehler = 0
for (const name of namen) {
  const ergebnis = pruefeBaustein(name)
  if (ergebnis.alt) { process.stdout.write(`${name.padEnd(12)} noch alt (${dateienIn(path.join(ORDNER, name)).length} Dateien)\n`); continue }
  if (ergebnis.maengel.length === 0) { process.stdout.write(`${name.padEnd(12)} umgebaut, ohne Beanstandung\n`); continue }
  fehler += ergebnis.maengel.length
  process.stdout.write(`${name.padEnd(12)} umgebaut, ${ergebnis.maengel.length} Maengel:\n`)
  for (const m of ergebnis.maengel) process.stdout.write(`  - ${m}\n`)
}
if (fehler > 0) {
  process.stderr.write(`\n${fehler} Maengel. Ein umgebauter Baustein muss ohne Beanstandung sein.\n`)
  process.exit(1)
}
