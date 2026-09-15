// Quellen, die ihre Zeilen erst auf eine Auswahl hin holen, samt Bremse gegen Kreis-Feuer.
import type { BausteinArt } from '../../kern/maske/bausteinArt'
import { faehigkeit, hatFaehigkeit } from '../../kern/maske/faehigkeiten'
import { alleBausteinArten } from '../../kern/maske/registry'
import { eigenschaftSichtbar } from '../../kern/maske/eigenschaft'
import { QUELLE_PROP } from '../../kern/maske/quelleProp'
import { BAUSTEIN_ID_ATTR } from '../../kern/daten/aktionen'
import { hatSeDaten, onSeDaten } from '../../softengine/bridge'
import { laufzeitQuellen } from '../../softengine/laufzeitQuellen'
import { meldeFehler } from '../../softengine/meldung'
import { ladeZeilenPerRelation } from '../../softengine/relationLader'
import { holeWertQuelle } from '../../softengine/wertLader'
import {
  aufAuswahlHoeren,
  auswahlFuer,
  auswahlGeberVon,
  auswahlNummer,
  merkmalVon,
} from './auswahl'

const letzterAbdruck = new Map<string, string>()
// Die Bremse gegen Kreis-Feuer: je Quelle die Abdruecke, die ohne Bedienung
// schon geladen wurden. Ohne sie schaukeln sich zwei Geber derselben Quelle
// gegenseitig hoch und fragen im Halbsekundentakt gegen das ERP.
const stillGeladen = new Map<string, Set<string>>()
// Je Quelle einmal gemeldet: die Pruefung laeuft bei jedem Klick, der Satz
// bliebe aber derselbe.
const ohneGeberGemeldet = new Set<string>()
let verdrahtet = false

export function defsMitSatzWahl(): Map<string, BausteinArt> {
  const map = new Map<string, BausteinArt>()
  for (const def of alleBausteinArten()) {
    if (hatFaehigkeit(def, 'satzwahl')) map.set(def.tag.toLowerCase(), def)
  }
  return map
}

// Die wenn-Bedingung der satzWahl waehlt die Eigenschaft; erfuellt das Element
// sie nicht, gilt `source`. Pauschal je Tag wuerde ein Text-Formularfeld mit
// uebriger Nachschlage-Quelle zum falschen Geber.
function quellenAttrFuer(el: Element, def: BausteinArt): string {
  const wahl = faehigkeit(def, 'satzwahl')
  if (!wahl) return ''
  let aktiv = true
  if (wahl.wenn) {
    const name = wahl.wenn.schluessel
    const wert = el.getAttribute(name.toLowerCase()) ?? def.vorgaben[name]
    aktiv = eigenschaftSichtbar(wahl.wenn, { [name]: wert })
  }
  return (aktiv ? wahl.quelleProp ?? QUELLE_PROP : QUELLE_PROP).toLowerCase()
}

// Die Zeile, fuer die eine holende Quelle fragt: die Auswahl der Bausteine, denen
// die Bausteine dieser Quelle folgen. Der letzte Klick gewinnt — zeigen mehrere
// Bausteine dieselbe Quelle, gilt die juengste Auswahl, nicht der erste Baustein
// in DOM-Reihenfolge. `geber` sagt, ob ueberhaupt einer eingestellt ist; ohne ihn
// koennte die Quelle nie etwas holen.
export function gewaehlteZeileDerQuelle(
  quelleId: string,
  defsJeTag: Map<string, BausteinArt>,
  wurzel: ParentNode | undefined = typeof document === 'undefined' ? undefined : document,
): { zeile: unknown; geber: boolean } {
  if (quelleId === '' || wurzel === undefined) return { zeile: undefined, geber: false }
  let juengste: { zeile: unknown; nummer: number } | null = null
  let geber = false
  for (const el of Array.from(wurzel.querySelectorAll(`[${BAUSTEIN_ID_ATTR}]`))) {
    const def = defsJeTag.get(el.tagName.toLowerCase())
    if (!def) continue
    const attr = quellenAttrFuer(el, def)
    if (attr === '' || el.getAttribute(attr) !== quelleId) continue
    for (const geberId of auswahlGeberVon(el as HTMLElement)) {
      geber = true
      const zeile = auswahlFuer(geberId)
      if (zeile === undefined) continue
      const nummer = auswahlNummer(geberId)
      if (juengste === null || nummer > juengste.nummer) juengste = { zeile, nummer }
    }
  }
  return { zeile: juengste?.zeile, geber }
}

// Eine Bedienung laedt immer und beginnt die Spur neu; eine Programm-Meldung
// laedt jeden Abdruck nur einmal.
export function darfLaden(quelleId: string, abdruck: string, durchBedienung: boolean): boolean {
  if (letzterAbdruck.get(quelleId) === abdruck) return false
  if (durchBedienung) {
    stillGeladen.set(quelleId, new Set([abdruck]))
  } else {
    const spur = stillGeladen.get(quelleId) ?? new Set<string>()
    if (spur.has(abdruck)) return false
    spur.add(abdruck)
    stillGeladen.set(quelleId, spur)
  }
  letzterAbdruck.set(quelleId, abdruck)
  return true
}

function pruefeHolendeQuellen(durchBedienung: boolean): void {
  const defsJeTag = defsMitSatzWahl()
  for (const quelle of laufzeitQuellen()) {
    if (!quelle.ladeRelation) continue
    const { zeile, geber } = gewaehlteZeileDerQuelle(quelle.id, defsJeTag)
    // Ohne Geber wartet die Quelle auf einen Klick, den es nie gibt. Still
    // bliebe die Tabelle leer und niemand saehe warum.
    if (!geber) {
      if (!ohneGeberGemeldet.has(quelle.id)) {
        ohneGeberGemeldet.add(quelle.id)
        meldeFehler(
          `„${quelle.name}" holt ihre Zeilen erst auf einen Klick hin, aber an keinem `
          + 'Baustein mit dieser Quelle steht, wessen Auswahl er folgt. '
          + 'Im Editor am Baustein unter „Auswahl folgen" die Belegliste wählen.',
        )
      }
      continue
    }
    if (!darfLaden(quelle.id, merkmalVon(zeile), durchBedienung)) continue
    ladeZeilenPerRelation(quelle, quelle.ladeRelation, zeile)
  }
}

// Die Quellen, die EINEN Wert holen. Sie haengen an keiner Auswahl: ihr Anlass
// ist eine neue Lieferung von SoftEngine.
function holeWertQuellen(): void {
  for (const quelle of laufzeitQuellen()) {
    if (!quelle.holWert) continue
    holeWertQuelle(quelle, quelle.holWert)
  }
}

export function verdrahteHolendeQuellen(): void {
  if (verdrahtet) return
  verdrahtet = true
  aufAuswahlHoeren(pruefeHolendeQuellen)

// NUR bei einer echten Lieferung: das Ablegen der Antwort stoesst selbst an,
// und ein Anstoss, der wieder holt, waere ein unbremsbarer Kreis.
  onSeDaten((lieferung) => { if (lieferung) holeWertQuellen() })

  // Stand die Lieferung schon, als der erste Baustein sich anschloss, kommt
  // fuer sie kein `lieferung`-Ruf mehr.
  if (hatSeDaten()) holeWertQuellen()
}
