import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { sectionsOf, chainsRead } from '../../core/data/actions'
import { runEvent, searchCarrier } from '../behavior/events'
import { PENDING_EVENT, pendingRows } from '../behavior/pendingState'
import { startSe } from '../../softengine/bridge'
import { buttonStyle } from './buttonStyle'
import { buttonProperties, type ButtonValues } from './properties'

const CLICK = 'onClick'
const CHAINS_ATTR = 'data-ff-actions'

function openRows(el: HTMLElement): number | undefined {
  const steps = chainsRead(el.getAttribute(CHAINS_ATTR))[CLICK]
  if (!steps || steps.length === 0) return undefined
  const counted = new Set<string>()
  let open = 0
  for (const section of sectionsOf(steps)) {
    if (section.kind === 'once' || section.blockId === '') continue

    const key = section.kind + ' ' + section.blockId
    if (counted.has(key)) continue
    const carrier = searchCarrier(el.ownerDocument ?? document, section.blockId)
    if (!carrier) continue
    counted.add(key)
    open += pendingRows(carrier, section.kind)
  }
  return counted.size === 0 ? undefined : open
}

export interface Button extends ButtonValues {}

export class Button extends BlockElement {
  static readonly type = 'button'
  static readonly tag = 'ff-button'

  static override styles: CSSResultGroup = [BlockElement.styles, buttonStyle]

  @state() private open: number | undefined = undefined

  private wired = false

  private readonly count = (): void => { this.open = openRows(this) }

  override render(): TemplateResult {
    const open = this.open
    return html`<button
      data-ff-editable
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'label')}
    >${open ? `${this.label} (${open})` : this.label}</button>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.inEditor) return
    this.wireClick()
    document.addEventListener(PENDING_EVENT, this.count)
    this.count()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener(PENDING_EVENT, this.count)
  }

  private wireClick(): void {
    if (this.wired || !this.hasAttribute(CHAINS_ATTR)) return
    this.wired = true
    const chains = chainsRead(this.getAttribute(CHAINS_ATTR))

    if (Object.values(chains).some((chain) => chain.some((s) => s.kind === 'RELATION'))) startSe()
    this.addEventListener('click', () => {
      runEvent(this, CLICK, {}).catch(() => {})
    })
  }
}

defineBlock(Button, {
  name: 'Schaltfläche',
  category: 'input',
  properties: buttonProperties,
  capabilities: [{ kind: 'events', list: [{ key: CLICK, name: 'Klick' }] }],
  grid: { startWidth: 8, startHeight: 2, minWidth: 4, minHeight: 2 },
})
