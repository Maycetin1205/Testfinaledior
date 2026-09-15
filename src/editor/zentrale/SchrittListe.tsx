// Die Schritte einer Kette als Liste: Reihenfolge, Kurztext, Fundstellen.
import { ArrowDown, ArrowUp, Copy, X } from '@/editor/zeichen/zeichen'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Marke } from '@/editor/werkbank/Marke'
import { wertstellenImBaum, auswahlGeberImBaum } from '../../kern/maske/baumFragen'
import { ergebnisSchritteVor, type Schritt } from '../../kern/daten/aktionen'
import { relationsSyntaxAlsText } from '../../kern/daten/relationen'
import { schrittProblem } from '../../kern/daten/schrittPruefung'
import { schrittName } from './beschriftungen'
import { istFensterSeite } from '../../kern/maske/seiten'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'
import { useRelations } from '../zustand/useRelations'
import { VERB_KURZ } from './helfer'
import { istUngetaufteVorlage } from './relationAnzeige'
import { ankerSchrittId, schrittZusammenfassung } from './schrittZusammenfassung'

interface SchrittListeProps {
  steps: readonly Schritt[]

  aktivId?: string

  onWaehle?: (step: Schritt) => void

  onAendern?: (steps: Schritt[]) => void
}

// Nur die Liste. Das Formular des gewaehlten Schritts steht rechts daneben:
// klappte es unter der Zeile auf, saehe das Fenster aus wie kein anderes.
export function SchrittListe({
  steps, aktivId, onWaehle, onAendern,
}: SchrittListeProps) {
  const ed = useEditor()
  const relations = useRelations()
  const dataSources = useDataSources()

  const popupSeiten = ed.pages.filter(istFensterSeite)
  const actionValueRefs = wertstellenImBaum(ed.tree).map(({ node, spot }) => ({
    blockId: node.id,
    prop: spot.prop,
  }))

  const geberIds = auswahlGeberImBaum(ed.tree).map((n) => n.id)

  const verschiebe = (from: number, to: number): void => {
    if (!onAendern) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onAendern(next)
  }

  const setzeNotiz = (at: number, text: string): void => {
    if (!onAendern) return
    const next = steps.map((s, i) => {
      if (i !== at) return s
      const kopie = { ...s }
      if (text.trim() === '') delete kopie.notiz
      else kopie.notiz = text
      return kopie
    })
    onAendern(next)
  }

  const dupliziere = (at: number): void => {
    if (!onAendern) return
    const quelle = steps[at]
    const kopie: Schritt = quelle.art === 'START_TOOL'
      ? { ...quelle, toolParameter: [...quelle.toolParameter], id: crypto.randomUUID() }
      : quelle.art === 'RELATION'
        ? {
            ...quelle,
            parameter: quelle.parameter.map((binding) => ({ ...binding })),
            zusatzParameter: quelle.zusatzParameter.map((binding) => ({ ...binding })),
            id: crypto.randomUUID(),
          }
        : { ...quelle, id: crypto.randomUUID() }
    const next = [...steps]
    next.splice(at + 1, 0, kopie)
    onAendern(next)
  }

  return (
    <ol>
      {steps.map((s, i) => {
        const problem = schrittProblem(
          s, relations.list, dataSources.list, popupSeiten.map((seite) => seite.id),
          ergebnisSchritteVor(steps, s.id, relations.list).map((g) => g.id),
          actionValueRefs,
          geberIds,
          steps.slice(0, i),
        )
        const relation = s.art === 'RELATION' ? relations.get(s.relationId) : undefined
        const popupName = s.art === 'POPUP_OPEN' || s.art === 'POPUP_CLOSE'
          ? popupSeiten.find((seite) => seite.id === s.popupId)?.name
          : undefined
  // Eine Relation mit eigenem Namen nennt IHN; eine ungetaufte Vorlage heisst
  // schlicht „Relation", und welche es ist, sagt die Marke rechts.
        const was = s.art === 'RELATION' && relation && !istUngetaufteVorlage(relation)
          ? relation.name
          : schrittName(s.art)
        const zus = schrittZusammenfassung(
          s, was, relation, ed.tree, dataSources.list,
          (id) => steps.findIndex((x) => x.id === id) + 1,
        )

        const naeher = [zus.ziel !== '' ? zus.ziel : zus.tabelle, zus.herkunft]
          .filter((t) => t !== '')
          .join('  ←  ')
        const notizOffen = onAendern !== undefined && s.id === aktivId
        const anker = ankerSchrittId(s)
        const eingerueckt = anker !== '' && steps.some((x) => x.id === anker)

        return (
          <li key={s.id} className="border-b border-linie last:border-b-0">
            <div
              className={`flex items-center gap-2 border-l-2 py-1.5 pr-1 transition-colors ${
                eingerueckt ? 'pl-5' : 'pl-1'
              } ${
                problem !== null
                  ? 'border-vormerkung bg-vormerkung/15'
                  : s.id === aktivId
                    ? 'border-akzent bg-akzent/15'
                    : 'border-transparent hover:bg-control'
              }`}
            >

              <span className="w-6 shrink-0 text-right text-dicht tabular-nums text-matt">
                {i + 1}.
              </span>
              {/* Zweizeilig: `Knopf` ist eine Zeilen-Flexbox fester Hoehe, darum
                  hier `flex-col` und `h-auto` — sonst stuenden Was und Naeheres
                  nebeneinander statt uebereinander. */}
              <Knopf
                disabled={!onWaehle}
                onClick={() => onWaehle?.(s)}
                title={problem ?? undefined}
                className="h-auto min-w-0 flex-[3] flex-col items-start justify-start py-1 text-left"
              >
                <span className="block w-full truncate text-dicht">
                  {zus.was}
                  {s.art === 'START_TOOL' && s.toolNr.trim() !== '' ? ` — Nr. ${s.toolNr}` : ''}
                  {s.art === 'BW_LINK' && s.befehl.trim() !== '' ? ` — ${s.befehl}` : ''}
                  {popupName ? ` — ${popupName}` : ''}
                  {problem !== null ? ' — unvollständig' : ''}
                </span>
                {naeher !== '' && (
                  <span className="block w-full truncate text-dicht text-matt">
                    {naeher}
                  </span>
                )}
              </Knopf>

              {/* Welche Relation der Schritt ruft — dieselbe Marke wie in der
                  Relationen-Liste des Datencenters (VERB + Nummer, voller
                  Aufruf im Tooltip). */}
              {relation && (
                <Marke hinweis={relationsSyntaxAlsText(relation)}>
                  {VERB_KURZ[relation.verb]} {relation.nr}
                </Marke>
              )}

              {/* Die Notiz steht als Text da, wo es eine gibt; das Eingabefeld
                  erscheint nur am geoeffneten Schritt. */}
              {notizOffen ? (
                <Feld
                  aria-label={`Notiz zu Schritt ${i + 1}`}
                  placeholder="Notiz"
                  value={s.notiz ?? ''}
                  onChange={(e) => setzeNotiz(i, e.target.value)}
                  className="min-w-0 flex-[2] border-transparent bg-transparent text-dicht hover:border-linie"
                />
              ) : (
                s.notiz !== undefined && s.notiz !== '' && (
                  <span
                    title={s.notiz}
                    className="min-w-0 flex-[2] truncate text-dicht italic text-matt"
                  >
                    {s.notiz}
                  </span>
                )
              )}
              {onAendern && (
                <span className="flex shrink-0 items-center">
                  <Knopf
                    nurZeichen
                    aria-label={`Schritt ${i + 1} nach oben`}
                    disabled={i === 0}
                    onClick={() => verschiebe(i, i - 1)}
                  >
                    <ArrowUp size={12} />
                  </Knopf>
                  <Knopf
                    nurZeichen
                    aria-label={`Schritt ${i + 1} nach unten`}
                    disabled={i === steps.length - 1}
                    onClick={() => verschiebe(i, i + 1)}
                  >
                    <ArrowDown size={12} />
                  </Knopf>
                  <Knopf
                    nurZeichen
                    aria-label={`Schritt ${i + 1} duplizieren`}
                    onClick={() => dupliziere(i)}
                  >
                    <Copy size={12} />
                  </Knopf>
                  <Knopf
                    nurZeichen
                    aria-label={`Schritt ${i + 1} löschen`}
                    onClick={() => onAendern(steps.filter((x) => x.id !== s.id))}
                  >
                    <X size={12} />
                  </Knopf>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
