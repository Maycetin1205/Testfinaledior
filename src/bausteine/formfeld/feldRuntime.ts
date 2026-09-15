// Das Formularfeld am SoftEngine-Datenstrom: Wert setzen und die Zeile weitergeben.
import { bindungsAttr } from '../../kern/maske/faehigkeiten'
import { satzIndexVon, feldSchreiben } from '../../softengine/data'
import { geberIdVon, klareAuswahl, setzeAuswahl } from '../faehigkeiten/auswahl'
import { macheDatenAnschluss } from '../faehigkeiten/quelle'
import { leseGebundeneStelle } from '../shared/gebundeneStelle'
import { meldeKettenFehler, runEvent } from '../faehigkeiten/ereignisse'

export interface RuntimeFieldElement extends HTMLElement {
  value: string

  pruefeEigenenWert?: () => void
}

interface FieldData {
  row: unknown
  code: string
  pindex: string
}

const fieldData = new WeakMap<RuntimeFieldElement, FieldData>()
const wired = new WeakSet<RuntimeFieldElement>()

export function dateValueToInput(value: string): string {
  const german = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  return german ? `${german[3]}-${german[2]}-${german[1]}` : value
}

export function inputValueToDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : value
}

function currentValue(field: RuntimeFieldElement): string {
  return typeof field.value === 'string' ? field.value : ''
}

function hydrateField(field: RuntimeFieldElement): void {
  field.pruefeEigenenWert?.()

  if (field.getAttribute('fieldtype') === 'nachschlagen') {
    fieldData.delete(field)
    return
  }

  const stelle = leseGebundeneStelle(field, bindungsAttr('value'))
  if (stelle.art !== 'wert') {
    fieldData.delete(field)
  // Ein gebundenes Feld ist Geber seiner ANGEZEIGTEN Zeile; zeigt es keine, gibt
  // es auch keine.
    klareAuswahl(geberIdVon(field))

    if (stelle.art === 'ohneZeile') field.value = ''
    return
  }

  const { zeile, quelle, quelleId, reinerCode, wert } = stelle
  const pindex = satzIndexVon(quelle, zeile)

  if (quelleId === '') fieldData.set(field, { row: zeile, code: reinerCode, pindex })
  else fieldData.delete(field)
  field.value = wert
  // Gleiches Merkmal = stiller Ruf, darum kreist die Hydrier-Kette nicht.
  setzeAuswahl(geberIdVon(field), zeile)
}

function writeLocal(field: RuntimeFieldElement): FieldData | undefined {
  const data = fieldData.get(field)
  if (data) feldSchreiben(data.row, data.code, currentValue(field))
  return data
}

function wireField(field: RuntimeFieldElement): void {
  if (wired.has(field)) return
  wired.add(field)
  field.addEventListener('input', () => { writeLocal(field) })
  field.addEventListener('change', () => {
    const data = writeLocal(field)
    runEvent(field, 'onChange', {
      VALUE: currentValue(field),
      PINDEX: data?.pindex ?? '',
    }).catch(meldeKettenFehler)
  })
}

const anschluss = macheDatenAnschluss<RuntimeFieldElement>({
  hydriere: hydrateField,
  verdrahte: wireField,
})

export const connectField = anschluss.connect
export const disconnectField = anschluss.disconnect
