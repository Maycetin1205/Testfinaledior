import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { BlockElement, defineBlock } from '../base/BlockElement'
import { bindable } from '../../core/block/capability'
import { chooseSelection, giverIdOf, relocateSelection, rowsToSelection } from '../../runtime/selection'
import { makeDataLink, readDataPreamble, rowKeys, sampleValue, spotValue } from '../../runtime/source'
import { animalAvatarTpl, avatarStyle } from '../parts/card'
import { tickBoxStyle, tickBoxTpl } from '../parts/tickBox'
import { dataListStyle } from './dataListStyle'
import { dataListProperties, PICK_ONE, ROW_SPOTS, type DataListValues, type RowSpot } from './properties'

interface Item {
  key: string
  row: unknown

  // What each spot of the row shows.
  values: Readonly<Record<string, string>>
}

export interface DataList extends DataListValues {}

// The records of a source as a list, as "Tiere für diesen Besuch" of the
// reception mask. A click chooses one row, as at the table, or ticks several,
// or does nothing. In the editor one row stands for all; its spots are
// bound right there.
export class DataList extends BlockElement {
  static readonly type = 'datalist'
  static readonly tag = 'ff-datalist'

  static override styles: CSSResultGroup = [BlockElement.styles, avatarStyle, tickBoxStyle, dataListStyle]

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
              [prop, spotValue('', this[`${prop}Field`], row, preamble.read)])),
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

  // In the editor a spot shows what the editor gives it: the sample value of
  // its fields or their names; a spot without a field stands empty.
  private spot(prop: RowSpot, className: string): TemplateResult {
    return html`<span
      class=${className}
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field`] !== ''}
      @click=${this.reportSpot}
      @dblclick=${this.reportSpot}
    >${this.spotTexts[prop] ?? ''}</span>`
  }

  // The outline of the animal the field names, in the color of its kind; a
  // bound avatar stands in every row, so the names stay in line, an animal
  // it does not know as a paw. Without a field there is no avatar.
  private avatar(species: string): TemplateResult | typeof nothing {
    return this.avatarField === '' ? nothing : animalAvatarTpl(species)
  }

  // In the editor a bound avatar shows the animal of the samples, else nothing.
  private sampleAvatar(): TemplateResult | typeof nothing {
    const species = sampleValue(this, this.avatarField)
    return species === '' ? nothing : this.avatar(species)
  }

  // In the mask a spot without a value falls away.
  private row(item: Item): TemplateResult {
    const chosen = this.chosen.has(item.key)
    const { heading, subline, aside, avatar } = item.values
    const content = html`${this.avatar(avatar)}
      <span class="ident">
        ${heading.trim() === '' ? nothing : html`<span class="name">${heading}</span>`}
        ${subline.trim() === '' ? nothing : html`<span class="meta">${subline}</span>`}
      </span>
      ${aside.trim() === '' ? nothing : html`<span class="aside">${aside}</span>`}`
    if (this.pick === 'several') {
      return html`<label class="row${chosen ? ' chosen' : ''}">
        ${tickBoxTpl(html`<input type="checkbox" .checked=${chosen} @change=${() => this.toggle(item.key)} />`)}
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
            ${this.pick === 'several' ? tickBoxTpl(html`<input type="checkbox" tabindex="-1" />`) : nothing}
            ${this.sampleAvatar()}
            <span class="ident">${this.spot('heading', 'name')}${this.spot('subline', 'meta')}</span>
            ${this.spot('aside', 'aside')}
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
    bindable<typeof dataListProperties>(ROW_SPOTS),
  ],
  grid: { startWidth: 24, startHeight: 10, minWidth: 8, minHeight: 3 },
})
