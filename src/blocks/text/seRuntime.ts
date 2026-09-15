// Der Text am SoftEngine-Datenstrom: den gebundenen Wert einsetzen.
import { bindingAttr } from '../../core/blocks/faehigkeiten'
import { macheDatenAnschluss } from '../shared/datenAnschluss'
import { leseGebundeneStelle } from '../shared/gebundeneStelle'

export interface RuntimeTextElement extends HTMLElement {
  text: string
}

const TEXT_ATTR = bindingAttr('text')

function gebunden(el: RuntimeTextElement): { sourceId: string; code: string } | undefined {
  const sourceId = el.getAttribute('source') ?? ''
  const code = el.getAttribute(TEXT_ATTR) ?? ''
  return sourceId === '' || code === '' ? undefined : { sourceId, code }
}

function hydriereText(el: RuntimeTextElement): void {
  const stelle = leseGebundeneStelle(el, TEXT_ATTR)

  if (stelle.art === 'ungebunden') return
  el.text = stelle.art === 'wert' ? stelle.wert : ''
}

function verdrahteText(el: RuntimeTextElement): void {
  if (gebunden(el)) el.text = ''
}

const anschluss = macheDatenAnschluss<RuntimeTextElement>({
  hydriere: hydriereText,
  verdrahte: verdrahteText,
})

export const connectText = anschluss.connect
export const disconnectText = anschluss.disconnect
