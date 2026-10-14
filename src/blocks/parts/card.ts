import { css, html, nothing, type TemplateResult } from 'lit'
import { fieldProperty, textProperty, type Property } from '../../core/block/property'
import { animalOf, animalOutline } from './animal'

// The card: what a card of the board and a row of the data list are made of.
// Its spots show a text typed on the block or the value of a field; the
// avatar beside them only ever shows a field.

// A spot of a card or a row: typed on the block itself, or bound to a field.
export function typedSpot(label: string, attribute: string): Property<string> {
  return textProperty({
    default: '',
    label,
    place: 'block',
    attribute,
  })
}

export function spotBinding(label: string, attribute: string): Property<string> {
  return fieldProperty({
    default: '',
    label: `${label} — Feld`,
    place: 'none',
    attribute,
  })
}

// The avatar, .av of the sample docs/design/behandlung-modern.html: a circle
// tinted in the color of the animal with its thin outline, or a symbol on a
// grey circle, or a picture. The board and the data list take it; a block
// sets --avatar-size.
export const avatarStyle = css`
  .avatar {
    box-sizing: border-box;
    flex: none;
    width: var(--avatar-size, 36px);
    height: var(--avatar-size, 36px);
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--animal-soft, var(--se-neutral-soft)) no-repeat center / cover;
    color: var(--animal, var(--se-ink-2));
  }
  .avatar svg { width: 56%; height: 56%; }

  /* In the editor an avatar to bind is a dotted circle; a bound one has a
     dotted edge, as a bound form field. */
  :host([preview]) .avatar[data-ff-spot]:not([data-ff-bound]):empty {
    background: none;
    outline: var(--se-border) dashed var(--se-box-line);
    outline-offset: -1px;
  }
  :host([preview]) .avatar[data-ff-bound] {
    outline: var(--se-border) dotted var(--se-accent);
    outline-offset: 1px;
  }
  :host([preview][data-editable]) .avatar { cursor: pointer; }
`

// The avatar in the mask: the outline of the animal its field names, in the
// color of that kind.
export function animalAvatarTpl(species: string): TemplateResult {
  const animal = animalOf(species)
  return html`<span
    class="avatar"
    style="--animal:var(--se-animal-${animal});--animal-soft:var(--se-animal-${animal}-soft)"
  >${animalOutline(animal)}</span>`
}

// The avatar as a symbol chosen on the block, the same in every row.
export function symbolAvatarTpl(symbol: TemplateResult | typeof nothing): TemplateResult {
  return html`<span class="avatar">${symbol}</span>`
}

// The avatar in the mask as the picture at the address its field holds; a
// picture that does not load leaves it empty.
export function imageAvatarTpl(address: string): TemplateResult {
  return html`<span class="avatar" style=${`background-image:url(${JSON.stringify(address)})`}></span>`
}

// The avatar in the editor: it names itself, and its clicks go to the editor,
// which binds it. With paw it shows the outline the mask draws for an animal
// it does not know; else the symbol given, if any.
export function avatarSpotTpl(
  prop: string,
  bound: boolean,
  paw: boolean,
  report: (e: MouseEvent) => void,
  symbol: TemplateResult | typeof nothing = nothing,
): TemplateResult {
  return html`<span
    class="avatar"
    data-ff-spot=${prop}
    ?data-ff-bound=${bound}
    @click=${report}
    @dblclick=${report}
  >${paw ? animalOutline('paw') : symbol}</span>`
}
