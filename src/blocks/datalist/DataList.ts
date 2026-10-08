import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import { opensAnArea, sendOpen } from '../../runtime/opening'
import { rowsToSelection } from '../../runtime/selection'
import { makeDataLink, readDataPreamble, rowKeys, spotValue } from '../../runtime/source'
import { animalOf, animalOutline } from '../avatar/animal'
import { dataListStyle } from './dataListStyle'
import { AVATAR_SPOT, dataListProperties, ROW_SPOTS, type DataListValues, type RowSpot } from './properties'

interface Item {
  key: string

  // What each spot of the row shows.
  values: Readonly<Record<string, string>>
}

export interface DataList extends DataListValues {}

// The records of a source as a list, as "Tiere für diesen Besuch" of the
// reception mask: several can be ticked, and the plus on top opens the area
// that names the list. In the editor one row stands for all; its spots are
// typed or bound right there.
export class DataList extends BlockElement {
  static readonly type = 'datalist'
  static readonly tag = 'ff-datalist'

  static override styles: CSSResultGroup = [BlockElement.styles, dataListStyle]

  @state() private items: readonly Item[] = []

  // The keys of the ticked rows; a row the data no longer holds drops out.
  @state() private chosen: ReadonlySet<string> = new Set()

  // The plus shows in the mask only when an area opens with it.
  @state() private opens = false

  hydrate(): void {
    const preamble = readDataPreamble(this)
    const rows = preamble ? rowsToSelection(this, preamble.rows) : []
    const keys = preamble ? rowKeys(preamble.source, rows) : []
    this.items = preamble
      ? rows.map((row, i) => ({
          key: keys[i],
          values: {
            ...Object.fromEntries(ROW_SPOTS.map(({ prop }) =>
              [prop, spotValue(this[prop], this[`${prop}Field`], row, preamble.read)])),
            avatar: this.avatarField === '' ? '' : preamble.read(row, this.avatarField),
          },
        }))
      : []
    const held = new Set(keys)
    this.chosen = new Set([...this.chosen].filter((key) => held.has(key)))
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
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  // The outline of the animal the field names, in the color of its kind; a
  // bound avatar stands in every row, so the names stay in line.
  private avatar(species: string | null): TemplateResult | typeof nothing {
    if (species !== null) {
      if (this.avatarField === '') return nothing
      const animal = animalOf(species)
      return html`<span class="avatar" style="color:var(--se-animal-${animal})">${animalOutline(animal)}</span>`
    }
    const bound = this.avatarField !== ''
    return html`<span
      class="avatar"
      data-ff-spot=${AVATAR_SPOT.prop}
      ?data-ff-bound=${bound}
    >${bound ? animalOutline('paw') : nothing}</span>`
  }

  private add(): TemplateResult | typeof nothing {
    if (this.preview) {
      return html`<button
        type="button"
        class="add"
        data-ff-opener
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'addLabel')}
      >${this.addLabel}</button>`
    }
    if (!this.opens || this.addLabel.trim() === '') return nothing
    return html`<button type="button" class="add" @click=${() => sendOpen(this)}>${this.addLabel}</button>`
  }

  // In the mask a spot without a value falls away.
  private row(item: Item): TemplateResult {
    const chosen = this.chosen.has(item.key)
    const { heading, subline, avatar } = item.values
    return html`<label class="row${chosen ? ' chosen' : ''}">
      <input type="checkbox" .checked=${chosen} @change=${() => this.toggle(item.key)} />
      ${this.avatar(avatar)}
      <span class="ident">
        ${heading.trim() === '' ? nothing : html`<span class="name">${heading}</span>`}
        ${subline.trim() === '' ? nothing : html`<span class="meta">${subline}</span>`}
      </span>
    </label>`
  }

  override render(): TemplateResult {
    return html`<div class="list">
      ${this.add()}
      ${this.preview
        ? html`<div class="row">
            <input type="checkbox" tabindex="-1" />
            ${this.avatar(null)}
            <span class="ident">${this.spot('heading', 'name')}${this.spot('subline', 'meta')}</span>
          </div>`
        : this.items.map((item) => this.row(item))}
    </div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
    if (!this.preview) this.opens = opensAnArea(this)
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
    { kind: 'followsSelection' },
    bindable<typeof dataListProperties>([...ROW_SPOTS, AVATAR_SPOT]),
    { kind: 'opener' },
  ],
  grid: { startWidth: 24, startHeight: 10, minWidth: 8, minHeight: 3 },
})
