// Der Text am SoftEngine-Datenstrom: den gebundenen Wert einsetzen.
import { quelleIdVon } from '../faehigkeiten/quelle'
import { bindungsAttr } from '../../kern/maske/faehigkeiten'
import { macheDatenAnschluss } from '../faehigkeiten/quelle'
import { leseGebundeneStelle } from '../faehigkeiten/gebundeneStelle'

export interface RuntimeTextElement extends HTMLElement {
  text: string
}

const TEXT_ATTR = bindungsAttr('text')

function gebunden(el: RuntimeTextElement): { quelleId: string; code: string } | undefined {
  const quelleId = quelleIdVon(el)
  const code = el.getAttribute(TEXT_ATTR) ?? ''
  return quelleId === '' || code === '' ? undefined : { quelleId, code }
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
