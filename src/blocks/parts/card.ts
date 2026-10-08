import { html, nothing, type TemplateResult } from 'lit'
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

// The avatar in the mask: the outline of the animal its field names, in the
// color of that kind.
export function animalAvatarTpl(species: string): TemplateResult {
  const animal = animalOf(species)
  return html`<span class="avatar" style="color:var(--se-animal-${animal})">${animalOutline(animal)}</span>`
}

// The avatar in the mask as the picture at the address its field holds; a
// picture that does not load leaves it empty.
export function imageAvatarTpl(address: string): TemplateResult {
  return html`<span class="avatar" style=${`background-image:url(${JSON.stringify(address)})`}></span>`
}

// The avatar in the editor: it names itself, and its clicks go to the editor,
// which binds it. With paw it shows the outline the mask draws for an animal
// it does not know.
export function avatarSpotTpl(
  prop: string,
  bound: boolean,
  paw: boolean,
  report: (e: MouseEvent) => void,
): TemplateResult {
  return html`<span
    class="avatar"
    data-ff-spot=${prop}
    ?data-ff-bound=${bound}
    @click=${report}
    @dblclick=${report}
  >${paw ? animalOutline('paw') : nothing}</span>`
}
