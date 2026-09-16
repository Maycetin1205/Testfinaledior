// Schreibt die Maskendatei: aus dem Baustein-Baum wird HTML fuer SoftEngine.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../kern/maske/baum'
import { listeFuerExport, listeLesen } from '../kern/maske/bausteinArt'
import { bindungsProp, faehigkeit, gilt } from '../kern/maske/faehigkeiten'
import { bausteinArt } from '../kern/maske/registry'
import {
  bindbareStellenVon,
  darfAuswahlFolgen,
  ersterNachfahreVomTyp,
  istAuswahlGeber,
  QUELLE_PROP,
  traegtAenderungen,
  traegtEigeneQuelle,
  traegtLoeschungen,
} from '../kern/maske/baumFragen'
import { BAUSTEIN_ID_ATTR, kettenFuerExport } from '../kern/daten/aktionen'
import { AUSWAHL_FOLGE_PROP } from '../kern/daten/auswahlFolge'
import {
  felderHinterSchnitt,
  istOffenerSatz,
  holWertVon,
  ladeRelationVon,
  mitEindeutigenNamen,
  satzNummerVon,
  tabellenIdVon,
  type Datenquelle,
} from '../kern/daten/datenquellen'
import type { RelationsVorlage } from '../kern/daten/relationen'
import { WEITERE_QUELLEN_PROP } from '../kern/daten/weitereQuellen'
import { seitenDerMaske } from '../kern/maske/seiten'
import { istRasterFlaeche } from '../kern/maske/rasterFlaeche'
import {
  richtungDerKinder,
  WURZEL_FLUSS,
  type Richtung,
} from '../kern/maske/fluss'
import { rasterFlaecheCss } from '../kern/maske/raster'
import tokensCssRaw from '../design/maske.css?raw'
import {
  benutzteFelderJeQuelle,
  collectDataSources,
  holSchluesselJeGeber,
} from './benutzteQuellen'
import { collectRelations } from './benutzteRelationen'
import { baueSevariablen } from './sevariablen'
import { vorschauRoh, vorschauStellenVon } from './bindungsVorschau'
import { styleAttr } from './knotenStil'
import { laufzeitSkriptFuer } from './laufzeitTeile'
import {
  escapeHtmlAttr,
  escapeHtmlText,
  escapeNonAsciiJs,
  guardJsonScript,
  guardScriptContent,
  stripCssComments,
} from './serializer'
import { BRUECKE_SKRIPT } from './validator'

const LAYOUT_ATTR_AUSNAHME = new Set(['width', 'height', 'rasterX', 'rasterY', 'rasterW', 'rasterH'])

const EIGENE_QUELLE_PROPS = new Set([QUELLE_PROP, WEITERE_QUELLEN_PROP])

export interface MaskExport {
  html: string
  sevariablen: string
}

function attributWert(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify(value) : String(value ?? '')
}

interface TemplateCtx {
  type: string
  id: string | undefined
}

// Spalten-Kennung -> Platz fuer die Ketten-Parameter, generisch ueber die
// Listen-Bindung des Ziel-Bausteins. Unbekannt gibt '-1', die Laufzeit liefert
// dann den leeren Wert.
function spaltenIndexFuer(tree: Maskenbaum): (blockId: string, kennung: string) => string {
  return (blockId, kennung) => {
    const ziel = tree[blockId]
    const bindung = ziel ? faehigkeit(bausteinArt(ziel.typ), 'liste')?.bindung : undefined
    const key = bindung?.kennungSchluessel
    if (!ziel || !bindung || key === undefined) return '-1'
    return String(listeLesen(ziel.werte[bindung.prop], bindung)
      .findIndex((eintrag) => eintrag[key] === kennung))
  }
}

function nodeToHtml(
  tree: Maskenbaum,
  node: Baustein,
  parentDirection: Richtung,
  depth: number,

  popupName: (id: string) => string,

  spaltenIndex: (blockId: string, kennung: string) => string,

  sources: readonly Datenquelle[],
  templateCtx?: TemplateCtx,

  rasterEbene = false,
): string {
  const def = bausteinArt(node.typ)
  if (!def) return ''
  const liste = faehigkeit(def, 'liste')?.bindung

  const pad = '  '.repeat(depth)
  if (templateCtx && node.typ === templateCtx.type) {
    if (node.id !== templateCtx.id) return ''
    const inner = nodeToHtml(tree, node, parentDirection, depth + 1, popupName, spaltenIndex, sources, undefined, rasterEbene)
    return `${pad}<template data-ff-template>\n${inner}\n${pad}</template>`
  }

  const bindbareStellen = bindbareStellenVon(node)
  const bindbar = new Set(bindbareStellen.map((spot) => spot.prop))
  const stilleBindungen = new Set<string>(
    (faehigkeit(def, 'bindbar')?.stellen ?? [])
      .filter((spot) => !bindbar.has(spot.prop))
      .map((spot) => bindungsProp(spot.prop)),
  )

  const vorschauStellen = vorschauStellenVon(node)

  const nurImEditor = new Set(
    def.eigenschaften.filter((p) => p.nurImEditor).map((p) => p.schluessel),
  )

  const seitenKlarname = new Map<string, string>()
  for (const p of def.eigenschaften) {
    if (p.art === 'seite' && p.klarnameProp) seitenKlarname.set(p.klarnameProp, p.schluessel)
  }

  const attrs = Object.keys(def.vorgaben)
    .filter((key) => !LAYOUT_ATTR_AUSNAHME.has(key))
    .map((key) => {
      if (key === AUSWAHL_FOLGE_PROP && !darfAuswahlFolgen(node)) return ''

      if (EIGENE_QUELLE_PROPS.has(key) && !traegtEigeneQuelle(node)) return ''
      if (stilleBindungen.has(key)) return ''

      if (nurImEditor.has(key)) return ''
      const standard = def.vorgaben[key]

      const seitenIdProp = seitenKlarname.get(key)
      const wert = seitenIdProp !== undefined
        ? popupName(String(node.werte[seitenIdProp] ?? ''))
        : liste !== undefined && key === liste.prop
          ? listeFuerExport(node.werte[key] ?? standard, liste)
          : (node.werte[key] ?? standard)
      const roh = vorschauStellen.has(key)
        ? vorschauRoh(node, vorschauStellen.get(key)!, sources, standard)
        : attributWert(wert)

      if (roh === attributWert(standard)) return ''
      return ` ${key.toLowerCase()}="${escapeHtmlAttr(roh)}"`
    })
    .join('')

  const aktionen = kettenFuerExport(node.ketten, (faehigkeit(def, 'ereignisse')?.liste ?? []).map((e) => e.schluessel), popupName, spaltenIndex)
  const aktionenAttr = aktionen ? ` data-ff-aktionen="${escapeHtmlAttr(aktionen)}"` : ''
  // Die EINE Kennung eines Bausteins in der Maske. Sie traegt, wer fuer eine
  // Kette adressierbar sein muss und wer eine Zeile gibt; alle Leser der
  // Laufzeit greifen ueber dieses Attribut.
  const adressierbar = (faehigkeit(def, 'aktionswert')?.stellen.length ?? 0) > 0
    || gilt(faehigkeit(def, 'erfassen'), node.werte)
    || traegtAenderungen(node)
    || traegtLoeschungen(node)
    || istAuswahlGeber(node)
  const kennungAttr = adressierbar ? ` ${BAUSTEIN_ID_ATTR}="${escapeHtmlAttr(node.id)}"` : ''

  const fuelltAttr = rasterEbene && def.seite !== true ? ' fuellt' : ''

  const seitenAttr = node.elternId === WURZEL_ID && !def.seite ? ' data-ff-hauptinhalt' : ''
  const open = `${pad}<${def.tag}${attrs}${aktionenAttr}${kennungAttr}${seitenAttr}${fuelltAttr}${styleAttr(node, parentDirection, def.festeBreite, rasterEbene, def.seite === true)}>`
  if (!def.nimmtKinder || node.kinderIds.length === 0) {
    return `${open}</${def.tag}>`
  }

  const childDirection = richtungDerKinder(def, node.werte)

  const childCtx: TemplateCtx | undefined = def.musterKind
    ? { type: def.musterKind.type, id: ersterNachfahreVomTyp(tree, node.id, def.musterKind.type) }
    : templateCtx
  const children = node.kinderIds
    .map((id) => tree[id])
    .filter((c): c is Baustein => Boolean(c))
    // Ist dieser Knoten eine FLAECHE, liegen seine Kinder in Zellen. Gefragt
    // wird die eine Stelle, die auch der Editor fragt: raet der Export selbst,
    // sitzen die Bausteine in SoftEngine woanders als im Editor.
    .map((c) => nodeToHtml(tree, c, childDirection, depth + 1, popupName, spaltenIndex, sources, childCtx, istRasterFlaeche(node)))
    .filter((html) => html !== '')
    .join('\n')
  return children === ''
    ? `${open}</${def.tag}>`
    : `${open}\n${children}\n${pad}</${def.tag}>`
}

export function exportMask(
  tree: Maskenbaum,
  title = 'Maske',

  sources: readonly Datenquelle[] = [],

  relations: readonly RelationsVorlage[] = [],
): MaskExport {
  const root = tree[WURZEL_ID]

  const seitenNameById = new Map(seitenDerMaske(tree).map((s) => [s.id, s.name]))
  const popupName = (id: string): string => seitenNameById.get(id) ?? ''
  const spaltenIndex = spaltenIndexFuer(tree)

  const blocks = (root?.kinderIds ?? [])
    .map((id) => tree[id])
    .filter((n): n is Baustein => Boolean(n))
    .map((n) => nodeToHtml(tree, n, 'column', 2, popupName, spaltenIndex, sources, undefined, true))
    .join('\n')

  // Eindeutige Namen VOR beiden Verbrauchern: Bestellung und FF_DATA_SOURCES
  // muessen denselben Namen tragen, sonst sucht die Laufzeit einen Alias, den
  // SoftEngine nie geliefert hat.
  const used = mitEindeutigenNamen(collectDataSources(tree, sources))

  const benutzteFelder = benutzteFelderJeQuelle(tree, sources)

  const holSchluessel = holSchluesselJeGeber(tree, used)
  const usedRelations = collectRelations(tree, relations, used)

  const tokensCss = stripCssComments(tokensCssRaw)
  // Die Maske bleibt eine Datei plus die SEvariablen: der Kunde bekommt einen
  // festen Stand, nichts wird nachgeladen.
  const laufzeitJs = guardScriptContent(escapeNonAsciiJs(laufzeitSkriptFuer(benutzteTypen(tree))))

  const sourcesJs = guardJsonScript(escapeNonAsciiJs(
    'window.FF_DATA_SOURCES = ' + JSON.stringify(used.map((s) => {
      const lade = ladeRelationVon(s)
      const hol = holWertVon(s)
      return {
        id: s.id,
        name: s.name,
        tabellenId: tabellenIdVon(s),
        satzFeld: satzNummerVon(s),
        ...(istOffenerSatz(s) ? { offenerSatz: true } : {}),
        ...(lade
          ? { ladeRelation: { ...lade, zusatzFelder: felderHinterSchnitt(benutzteFelder.get(s.id)) } }
          : {}),
        ...(hol ? { holWert: { ...hol, felder: s.felder.map((f) => f.code) } } : {}),
      }
    })) + ';',
  ))

  const relationsJs = guardJsonScript(escapeNonAsciiJs(
    'window.FF_RELATIONS = ' + JSON.stringify(usedRelations.map((r) => ({
      id: r.id,
      verb: r.verb,
      nr: r.nr,
      parameter: r.parameter,
      zusatzParameterErlaubt: r.zusatzParameterErlaubt === true,
    }))) + ';',
  ))

  const wurzelPadding = `${WURZEL_FLUSS.padding}px`

  const html = [
    '<!DOCTYPE html>',
    '<html lang="de">',
    '<head>',
    '<meta charset="UTF-8" />',
    `<title>${escapeHtmlText(title)}</title>`,
    // Nur die Bruecke, nicht SoftEngines ganzer Kopf (kontrakte.md 1).
    BRUECKE_SKRIPT,
    '<style>',
    tokensCss,
    '',
    '/* Grundgeruest + Wurzel-Raster (identisch zum Editor-Canvas, rasterFlaecheStil) */',
    'html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }',
    // Farbe und Schrift haengen an der Wurzel, nicht am body, und jeder Baustein
    // erbt sie ausdruecklich: SoftEngines Rahmen faerbt html/body selbst und gibt
    // mit `*` jedem Element Tahoma 12px.
    `.ff-root { box-sizing: border-box; width: 100%; height: 100%; overflow: auto;`
      + ` background: var(--se-bg); font-family: var(--se-font); font-size: var(--se-fs);`
      + ` line-height: var(--se-lh); color: var(--se-ink);`
      + ` ${rasterFlaecheCss()}; padding: ${wurzelPadding}; }`,
    '.ff-root * { font-family: inherit; font-size: inherit; }',
    '</style>',
    '</head>',
    '<body>',
    '  <div class="ff-root">',
    blocks,
    '  </div>',
    '<script>',
    sourcesJs,
    relationsJs,
    '</script>',
    '<script>',
    laufzeitJs,
    '</script>',
    '</body>',
    '</html>',
  ].join('\n')

  const sevariablen = baueSevariablen(used, benutzteFelder, holSchluessel)

  return { html, sevariablen }
}

// Welche Bausteintypen in der Maske stehen — danach richtet sich, welche
// Laufzeitteile sie braucht.
function benutzteTypen(tree: Maskenbaum): Set<string> {
  const typen = new Set<string>()
  const gehe = (id: string): void => {
    const node = tree[id]
    if (!node) return
    if (id !== WURZEL_ID) typen.add(node.typ)
    for (const kindId of node.kinderIds) gehe(kindId)
  }
  gehe(WURZEL_ID)
  return typen
}
