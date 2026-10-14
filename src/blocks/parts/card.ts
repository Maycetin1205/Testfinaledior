import { css, html, type TemplateResult } from 'lit'
import { fieldProperty, type Property } from '../../core/block/property'
import { animalOf, animalOutline } from './animal'

// The card: what a card of the board and a row of the data list are made of.
// Its spots show the value of a field, bound right on the block; the avatar
// beside them the animal its field names.

// A spot of a card or a row, bound to a field on the block itself.
export function spotBinding(label: string, attribute: string): Property<string> {
  return fieldProperty({
    default: '',
    label: `${label} — Feld`,
    place: 'none',
    attribute,
  })
}

// The field of the avatar, chosen with the source; without one no avatar.
export function avatarBinding(label: string): Property<string> {
  return fieldProperty({
    default: '',
    label,
    place: 'source',
    attribute: 'avatarfield',
  })
}

// The avatar, .av of the sample docs/design/behandlung-modern.html: a circle
// tinted in the color of the animal with its thin outline. The board and the
// data list take it; a block sets --avatar-size.
export const avatarStyle = css`
  .avatar {
    box-sizing: border-box;
    flex: none;
    width: var(--avatar-size, 36px);
    height: var(--avatar-size, 36px);
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--animal-soft, var(--se-neutral-soft));
    color: var(--animal, var(--se-ink-2));
  }
  .avatar svg { width: 56%; height: 56%; }
`

// The outline of the animal its field names, in the color of that kind.
export function animalAvatarTpl(species: string): TemplateResult {
  const animal = animalOf(species)
  return html`<span
    class="avatar"
    style="--animal:var(--se-animal-${animal});--animal-soft:var(--se-animal-${animal}-soft)"
  >${animalOutline(animal)}</span>`
}
