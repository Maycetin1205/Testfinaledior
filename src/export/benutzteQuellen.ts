// Welche Quellen und Felder die Maske wirklich liest — danach wird bestellt.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../kern/maske/baum'
import { feldWahlenLesen, listeLesen, zerlegeBindung } from '../kern/maske/bausteinArt'
import { bindungsProp, faehigkeit } from '../kern/maske/faehigkeiten'
import { bausteinArt } from '../kern/maske/registry'
import { eigenschaftSichtbar } from '../kern/maske/eigenschaft'
import {
  auswahlQuelleIdVon,
  bindbareStellenVon,
  darfAuswahlFolgen,
  quellenIdsInKettenVon,
  traegtEigeneQuelle,
} from '../kern/maske/baumFragen'
import { AUSWAHL_FOLGE_PROP, auswahlFolgenAus, folgeBrauchbar } from '../kern/daten/auswahlFolge'
import { datenfelderAus } from '../kern/daten/berechnung'
import { ladeRelationVon, quellenAusHolWert, type Datenquelle } from '../kern/daten/datenquellen'
import {
  quelleBrauchbar,
  vollstaendigePaare,
  WEITERE_QUELLEN_PROP,
  weitereQuellenAus,
  type QuelleInReichweite,
} from '../kern/daten/weitereQuellen'
import { quellenInReichweite } from '../kern/maske/quellenReichweite'

export function collectDataSources(
  tree: Maskenbaum,
  sources: readonly Datenquelle[],
): Datenquelle[] {
  const seen = new Set<string>()
  const acc: Datenquelle[] = []
  const add = (id: unknown): void => {
    const src = typeof id === 'string' ? sources.find((s) => s.id === id) : undefined
    if (src && !seen.has(src.id)) {
      seen.add(src.id)
      acc.push(src)
    }
  }
  const visit = (node: Baustein | undefined): void => {
    if (!node) return

    if (traegtEigeneQuelle(node)) {
      add(node.props.source)

      for (const q of weitereQuellenAus(node.props[WEITERE_QUELLEN_PROP])) {
        if (quelleBrauchbar(q)) add(q.quelleId)
      }
    }

    const def = bausteinArt(node.type)
    for (const prop of def?.customProperties ?? []) {
      if (prop.kind === 'quelle' && eigenschaftSichtbar(prop.visibleWhen, node.props)) {
        add(node.props[prop.attributeName])
      }
    }

    const rechnen = faehigkeit(def, 'rechnen')
    if (rechnen) {
      for (const feld of datenfelderAus(node.props[rechnen.prop])) {
        add(zerlegeBindung(feld).quelleId)
      }
    }

    for (const id of quellenIdsInKettenVon(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[WURZEL_ID])

  // Eine holende Quelle kann ihre Parameter aus einer ANDEREN Quelle ziehen; die
  // muss mit in die Maske, sonst ginge der Parameter still leer hinaus.
  for (let i = 0; i < acc.length; i++) {
    for (const { quelleId } of quellenAusHolWert(acc[i])) add(quelleId)
  }
  return acc
}

export function benutzteFelderJeQuelle(
  tree: Maskenbaum,
  sources: readonly Datenquelle[],
): Map<string, ReadonlySet<string>> {
  const felder = new Map<string, Set<string>>()

  const merke = (quelleId: string, code: unknown): void => {
    if (quelleId === '' || typeof code !== 'string' || code.trim() === '') return
    const vorhanden = felder.get(quelleId)
    if (vorhanden) vorhanden.add(code.trim())
    else felder.set(quelleId, new Set([code.trim()]))
  }

  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    const def = bausteinArt(node.type)

    let reichweite: QuelleInReichweite[] | undefined
    const inReichweite = (): QuelleInReichweite[] => (
      reichweite ??= quellenInReichweite(tree, node.id, sources)
    )

    const merkeBindung = (wert: unknown): void => {
      if (typeof wert !== 'string' || wert === '') return
      const { quelleId, code } = zerlegeBindung(wert)
      const ziel = quelleId === ''
        ? inReichweite()[0]
        : inReichweite().find((q) => q.source.id === quelleId)
      if (ziel) merke(ziel.source.id, code)
    }

    for (const spot of bindbareStellenVon(node)) {
      merkeBindung(node.props[bindungsProp(spot.prop)])
    }

    const b = faehigkeit(def, 'liste')?.bindung
    if (b) {

    // Traegt die Bindung ein `quelleProp`, speichern ihre Eintraege den NACKTEN
    // Feldcode einer benannten Quelle. Ihn wie eine Bindung aufzuloesen waere
    // falsch: dann bestellt der Export ihre Felder gar nicht.
      const eigeneQuelle = b.quelleProp === undefined
        ? undefined
        : String(node.props[b.quelleProp] ?? '')
      const merkeEintragsFeld = (wert: unknown): void => {
        if (eigeneQuelle === undefined) merkeBindung(wert)
        else merke(eigeneQuelle, wert)
      }

      for (const eintrag of listeLesen(node.props[b.prop], b)) {
        merkeEintragsFeld(eintrag[b.feldKey])
        // Das Fuellfeld zeigt auf eine HILFSQUELLE; bliebe es aussen vor, faende
        // die Erfassungszeile in SoftEngine nichts zum Vorschlagen.
        for (const { wert } of feldWahlenLesen(b, eintrag)) merkeEintragsFeld(wert)
      }
    }

    // Was eine Berechnung aus einem Datensatz liest, muss mit in die Maske;
    // sonst rechnete die Laufzeit mit einem leeren Feld.
    const rechnen = faehigkeit(def, 'rechnen')
    if (rechnen) {
      for (const feld of datenfelderAus(node.props[rechnen.prop])) {
        merkeBindung(feld)
      }
    }

    for (const prop of def?.customProperties ?? []) {
      if (prop.kind !== 'field') continue
      if (!eigenschaftSichtbar(prop.visibleWhen, node.props)) continue
      // Ohne `quelleProp` steht im Wert dieselbe Form wie in einer Bindung; er
      // muss aufgeloest werden, sonst bestellt der Export den ganzen Token.
      if (prop.quelleProp === undefined) merkeBindung(node.props[prop.attributeName])
      else merke(String(node.props[prop.quelleProp] ?? ''), node.props[prop.attributeName])
    }

    if (traegtEigeneQuelle(node)) {
      const erste = typeof node.props.source === 'string' ? node.props.source : ''
      for (const q of weitereQuellenAus(node.props[WEITERE_QUELLEN_PROP])) {
        if (!quelleBrauchbar(q)) continue
  // Die linke Seite eines Paares gehoert der PARTNER-Quelle, nicht zwangslaeufig
  // der ersten: sonst kaeme das Schluesselfeld nicht mit.
        const partner = q.partnerId === '' ? erste : q.partnerId
        for (const paar of vollstaendigePaare(q)) {
          merke(partner, paar.fromField)
          merke(q.quelleId, paar.toField)
        }
      }
    }

    if (darfAuswahlFolgen(node)) {
      const eigene = auswahlQuelleIdVon(node)
      for (const folge of auswahlFolgenAus(node.props[AUSWAHL_FOLGE_PROP])) {
        if (!folgeBrauchbar(folge)) continue
        const geber = auswahlQuelleIdVon(tree[folge.geberId])
        for (const paar of vollstaendigePaare(folge)) {
          merke(geber, paar.fromField)
          merke(eigene, paar.toField)
        }
      }
    }

    for (const event of faehigkeit(def, 'ereignisse')?.liste ?? []) {
      for (const step of node.events?.[event.key] ?? []) {
        if (step.type !== 'RELATION') continue
        for (const binding of [...step.params, ...step.extraParams]) {
          if (binding.source === 'data_field') {
            merke(binding.dataSourceId ?? '', binding.value)
          } else if (binding.source === 'gewaehlte_zeile') {
            merke(auswahlQuelleIdVon(tree[binding.blockId ?? '']), binding.value)
          }
        }
      }
    }
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[WURZEL_ID])

  // Woraus eine holende Quelle ihre Parameter zieht, steht an der QUELLE und
  // nicht im Baum; ohne diese Runde ginge der Parameter leer hinaus. Nur die
  // Quellen, die die Maske benutzt: eine bloss in der Bibliothek liegende darf
  // keiner benutzten Quelle Felder unterschieben.
  for (const source of collectDataSources(tree, sources)) {
    for (const { quelleId, code } of quellenAusHolWert(source)) merke(quelleId, code)
  }
  return felder
}

// Woher eine holende Quelle ihren Beleg nimmt, steht als „Auswahl folgen" am
// Baustein. Die Schluesselfelder muessen trotzdem bei der GEBER-Quelle bestellt
// werden, sonst ginge der Parameter der Relation leer hinaus.
export function holSchluesselJeGeber(
  tree: Maskenbaum,
  sources: readonly Datenquelle[],
): Map<string, string[]> {
  const proGeber = new Map<string, string[]>()
  const merke = (geberId: string, codes: readonly string[]): void => {
    if (geberId === '') return
    const liste = proGeber.get(geberId) ?? []
    for (const code of codes) if (code !== '' && !liste.includes(code)) liste.push(code)
    proGeber.set(geberId, liste)
  }
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    const quelle = sources.find((s) => s.id === auswahlQuelleIdVon(node))
    const lade = quelle ? ladeRelationVon(quelle) : null
    if (lade) {
      // Ohne Feldpaare ist die Folge fuer den Filter unbrauchbar, fuer die
      // Holung reicht sie: die Schluessel nennt die Relation selbst.
      for (const folge of auswahlFolgenAus(node.props[AUSWAHL_FOLGE_PROP])) {
        merke(
          auswahlQuelleIdVon(tree[folge.geberId]),
          [lade.belegartFeld, lade.belegnummerFeld, lade.jahrFeld, lade.archivFeld],
        )
      }
    }
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[WURZEL_ID])
  return proGeber
}
