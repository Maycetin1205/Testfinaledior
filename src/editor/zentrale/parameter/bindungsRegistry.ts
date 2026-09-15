// Je Parameter-Quelle ein Eintrag: was sie heisst, woraus sie waehlt, wie sie
// startet, was sie in Worten hinausschickt.
import type { ListeEintrag } from '@/editor/werkbank/Liste'
import {
  PARAMETER_QUELLEN,
  type Parameter,
  type ParameterQuelle,
} from '../../../kern/daten/aktionen'
import { PLATZHALTER_KLARTEXT, blockValueKey } from '../helfer'
import {
  BausteinBindung,
  DatenfeldBindung,
  GewaehlteZeileBindung,
  LeerBindung,
  PlatzhalterBindung,
  SchrittErgebnisBindung,
  TextBindung,
  VorigesErgebnisBindung,
  ZellenBindung,
} from './bindungen'
import type { BindungsStart, ParameterWahlen, QuellenEintrag } from './wahlen'

// Steht nur eine Tabelle zur Wahl, ist sie gemeint.
function einziger(liste: readonly { blockId: string }[]): BindungsStart {
  return liste.length === 1 ? { bausteinId: liste[0].blockId, wert: '' } : { wert: '' }
}

// Was noch niemand gewaehlt hat, steht als Fragezeichen da: die Zeile soll
// zeigen, dass an dieser Stelle nichts hinausgeht.
const OFFEN = '?'

function gewaehlt(wert: string | undefined): string {
  return wert === undefined || wert.trim() === '' ? OFFEN : wert
}

// Die Klammern gehoeren zur Vorschau, nicht zum Text: ein fester Wert steht
// nackt in der Zeile, alles Errechnete in Klammern.
function eingeklammert(...teile: readonly string[]): string {
  return `{${teile.join(' ')}}`
}

function bausteinLabel(
  liste: readonly { blockId: string; label: string }[],
  blockId: string | undefined,
): string {
  return liste.find((e) => e.blockId === blockId)?.label ?? OFFEN
}

// Der Spaltentitel der vorgemerkten Zeile; im Baum steht in `value` die
// dauerhafte Kennung, nicht der Platz.
function spaltenTitel(
  liste: readonly { blockId: string; spalten: readonly { kennung: string; titel: string }[] }[],
  binding: Parameter,
): string {
  const spalte = liste.find((e) => e.blockId === binding.bausteinId)
    ?.spalten.find((s) => s.kennung === binding.wert)
  return spalte?.titel ?? gewaehlt(binding.wert)
}

// Geschluesselt ueber ALLE Quellen, `aus` eingeschlossen: das Record erzwingt
// einen Eintrag je Quelle, sonst saehe eine neue Quelle wie ein Freitext aus.
export const PARAM_QUELLEN: Record<ParameterQuelle, QuellenEintrag> = {
  fixed: {
    name: 'Fest',
    Control: TextBindung,
    text: (b) => b.wert,
  },
  context: {
    name: 'Ereigniswert',
    Control: PlatzhalterBindung,
    start: () => ({ wert: 'VALUE' }),
    text: (b) => eingeklammert(
      PLATZHALTER_KLARTEXT[b.wert]?.name ?? gewaehlt(b.wert),
    ),
  },
  data_field: {
    name: 'Datenfeld',
    Control: DatenfeldBindung,
    leer: (w) => w.dataSources.length === 0,
    text: (b, w) => eingeklammert(
      'Feld',
      gewaehlt(b.wert),
      'aus',
      gewaehlt(w.dataSources.find((q) => q.id === b.quelleId)?.name),
    ),
  },
  block_value: {
    name: 'Baustein',
    Control: BausteinBindung,
    leer: (w) => w.blockValues.length === 0,
    start: (w) => (w.blockValues.length === 1
      ? { bausteinId: w.blockValues[0].blockId, wert: w.blockValues[0].prop }
      : { wert: '' }),
    text: (b, w) => eingeklammert(
      'Baustein',
      gewaehlt(w.blockValues.find((o) => o.key === blockValueKey(b.bausteinId ?? '', b.wert))?.label),
    ),
  },
  gewaehlte_zeile: {
    name: 'Gewählte Zeile',
    Control: GewaehlteZeileBindung,
    leer: (w) => w.geber.length === 0,
    start: (w) => einziger(w.geber),
    text: (b, w) => {
      const geber = w.geber.find((g) => g.blockId === b.bausteinId)
      const feld = geber?.felder.find((f) => f.code === b.wert)?.name
      return eingeklammert(
        'Gewählte Zeile',
        `${bausteinLabel(w.geber, b.bausteinId)}:`,
        feld ?? gewaehlt(b.wert),
      )
    },
  },
  erfassungszelle: {
    name: 'Erfassungszelle',
    Control: ZellenBindung,
    leer: (w) => w.erfassungen.length === 0,
    start: (w) => einziger(w.erfassungen),
    text: (b, w) => eingeklammert('Zelle', spaltenTitel(w.erfassungen, b)),
  },
  aenderungszelle: {
    name: 'Geänderte Zelle',
    Control: ZellenBindung,
    leer: (w) => w.aenderungen.length === 0,
    start: (w) => einziger(w.aenderungen),
    text: (b, w) => eingeklammert('Geänderte Zelle', spaltenTitel(w.aenderungen, b)),
  },
  loeschzelle: {
    name: 'Gelöschte Zeile',
    Control: ZellenBindung,
    leer: (w) => w.loeschungen.length === 0,
    start: (w) => einziger(w.loeschungen),
    text: (b, w) => eingeklammert('Gelöschte Zeile', spaltenTitel(w.loeschungen, b)),
  },
  previous_result: {
    name: 'Vorheriger Schritt',
    Control: VorigesErgebnisBindung,
    text: () => eingeklammert('Ergebnis des vorigen Schritts'),
  },
  step_result: {
    name: 'Ergebnis von Schritt',
    Control: SchrittErgebnisBindung,
    leer: (w) => w.schritte.length === 0,
    start: (w) => ({ wert: w.schritte.length === 1 ? w.schritte[0].id : '' }),
    text: (b, w) => {
      const nr = w.schritte.find((s) => s.id === b.wert)?.nr
      const feld = b.ergebnisFeld ?? ''
      return eingeklammert(
        'Ergebnis Schritt',
        nr === undefined ? OFFEN : String(nr),
        ...(feld === '' ? [] : [`Feld ${feld}`]),
      )
    },
  },
  se_variable: {
    name: 'SE VAR-Array',
    Control: TextBindung,
    text: (b) => eingeklammert('VAR', gewaehlt(b.wert)),
  },
  aus: {
    name: 'Weggelassen',
    Control: LeerBindung,

    // Weggelassen heisst leer, nicht weg: der Platz im Aufruf bleibt.
    text: () => '',
  },
}

export function neueBindung(
  source: ParameterQuelle,
  wahlen: ParameterWahlen,
): Parameter {
  return { quelle: source, ...(PARAM_QUELLEN[source].start?.(wahlen) ?? { wert: '' }) }
}

// `aus` steht nicht in der Wahl: weggelassen wird ueber das Kreuz an der Zeile.
// Ist der Parameter schon weggelassen, muss die Quelle trotzdem erscheinen.
export function herkunftsEintraege(
  binding: Parameter,
  wahlen: ParameterWahlen,
): ListeEintrag[] {
  const eintraege: ListeEintrag[] = PARAMETER_QUELLEN
    .filter((source) => wahlen.erlaubt === undefined || wahlen.erlaubt.includes(source))
    .map((source) => ({
      wert: source,
      name: PARAM_QUELLEN[source].name,
      deaktiviert: PARAM_QUELLEN[source].leer?.(wahlen) ?? false,
    }))
  if (binding.quelle === 'aus') {
    eintraege.push({ wert: 'aus', name: PARAM_QUELLEN.aus.name, deaktiviert: true })
  }
  return eintraege
}

export function bindungsText(
  binding: Parameter,
  wahlen: ParameterWahlen,
): string {
  return PARAM_QUELLEN[binding.quelle].text(binding, wahlen)
}
