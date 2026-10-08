import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import { chooseSelection, giverIdOf, relocateSelection, rowsToSelection } from '../../runtime/selection'
import { makeDataLink, readDataPreamble, rowKeys, spotValue } from '../../runtime/source'
import { animalAvatarTpl, avatarSpotTpl } from '../parts/card'
import { dataListStyle } from './dataListStyle'
import { AVATAR_SPOT, dataListProperties, PICK_ONE, ROW_SPOTS, type DataListValues, type RowSpot } from './properties'

interface Item {
  key: string
  row: unknown

  // What each spot of the row shows.
  values: Readonly<Record<string, string>>
}

export interface DataList extends DataListValues {}

// The records of a source as a list, as "Tiere für diesen Besuch" of the
// reception mask. A click chooses one row, as at the table, or ticks several,
// or does nothing. In the editor one row stands for all; its spots are typed
// or bound right there.
export class DataList extends BlockElement {
  static readonly type = 'datalist'
  static readonly tag = 'ff-datalist'

  static override styles: CSSResultGroup = [BlockElement.styles, dataListStyle]

  @state() private items: readonly Item[] = []

  // The keys of the chosen or ticked rows; a row the data no longer holds
  // drops out.
  @state() private chosen: ReadonlySet<string> = new Set()

  hydrate(): void {
    const preamble = readDataPreamble(this)
    const rows = preamble ? rowsToSelection(this, preamble.rows) : []
    const keys = preamble ? rowKeys(preamble.source, rows) : []
    this.items = preamble
      ? rows.map((row, i) => ({
          key: keys[i],
          row,
          values: {
            ...Object.fromEntries(ROW_SPOTS.map(({ prop }) =>
              [prop, spotValue(this[prop], this[`${prop}Field`], row, preamble.read)])),
            avatar: this.avatarField === '' ? '' : preamble.read(row, this.avatarField),
          },
        }))
      : []
    if (this.pick === 'one') {
      const hit = relocateSelection(giverIdOf(this), this.items, (item) => item.row, (item) => item.key)
      this.chosen = new Set(hit.slice(0, 1).map((i) => this.items[i].key))
      return
    }
    const held = new Set(keys)
    this.chosen = new Set([...this.chosen].filter((key) => held.has(key)))
  }

  // A second click on the chosen row lets it go.
  private choose(item: Item): void {
    chooseSelection(giverIdOf(this), item.row, item.key)
  }

  private toggle(key: string): void {
    const next = new Set(this.chosen)
    if (!next.delete(key)) next.add(key)
    this.chosen = next
  }

  private spot(prop: RowSpot, className: string): TemplateResult {
    return html`<span
      class=${className}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field`] !== ''}
      @click=${this.reportSpot}
      @dblclick=${(e: MouseEvent) => {
        this.reportSpot(e)
        this.inlineEdit(e, prop)
      }}
    >${this[prop]}</span>`
  }

  // The outline of the animal the field names, in the color of its kind; a
  // bound avatar stands in every row, so the names stay in line.
  private avatar(species: string | null): TemplateResult | typeof nothing {
    const bound = this.avatarField !== ''
    if (species !== null) return bound ? animalAvatarTpl(species) : nothing
    return avatarSpotTpl(AVATAR_SPOT.prop, bound, bound, (e) => this.reportSpot(e))
  }

  // In the mask a spot without a value falls away.
  private row(item: Item): TemplateResult {
    const chosen = this.chosen.has(item.key)
    const { heading, subline, avatar } = item.values
    const content = html`${this.avatar(avatar)}
      <span class="ident">
        ${heading.trim() === '' ? nothing : html`<span class="name">${heading}</span>`}
        ${subline.trim() === '' ? nothing : html`<span class="meta">${subline}</span>`}
      </span>`
    if (this.pick === 'several') {
      return html`<label class="row${chosen ? ' chosen' : ''}">
        <input type="checkbox" .checked=${chosen} @change=${() => this.toggle(item.key)} />
        ${content}
      </label>`
    }
    if (this.pick !== 'one') return html`<div class="row">${content}</div>`
    return html`<div
      class="row${chosen ? ' chosen' : ''}"
      role="button"
      tabindex="0"
      aria-pressed=${String(chosen)}
      @click=${() => this.choose(item)}
      @keydown=${(e: KeyboardEvent) => {
        if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== e.currentTarget) return
        e.preventDefault()
        this.choose(item)
      }}
    >${content}</div>`
  }

  override render(): TemplateResult {
    return html`<div class="list pick-${this.pick}">
      ${this.preview
        ? html`<div class="row">
            ${this.pick === 'several' ? html`<input type="checkbox" tabindex="-1" />` : nothing}
            ${this.avatar(null)}
            <span class="ident">${this.spot('heading', 'name')}${this.spot('subline', 'meta')}</span>
          </div>`
        : this.items.map((item) => this.row(item))}
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }
}

const link = makeDataLink<DataList>({
  hydrate: (el) => { el.hydrate() },
})

defineBlock(DataList, {
  name: 'Datenliste',
  category: 'display',
  properties: dataListProperties,
  capabilities: [
    { kind: 'source' },
    { kind: 'recordPick', gives: PICK_ONE },
    { kind: 'followsSelection' },
    bindable<typeof dataListProperties>([...ROW_SPOTS, AVATAR_SPOT]),
  ],
  grid: { startWidth: 24, startHeight: 10, minWidth: 8, minHeight: 3 },
})
