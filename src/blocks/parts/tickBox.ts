import { css, html, type TemplateResult } from 'lit'
import { icon } from './icons'

// The box of a tick: white with a grey edge, ticked the edge and the tick in
// the second ink, as a box on a form; the accent is not its color. The form
// field and the rows of the data list take it; the input inside keeps the
// keyboard and the change, the tick is drawn over it.
export const tickBoxStyle = css`
  .box {
    position: relative;
    flex: none;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
  }
  .box input {
    position: absolute;
    inset: 0;
    width: 20px;
    height: 20px;
    margin: 0;
    border: 1.5px solid var(--se-box-line);
    border-radius: var(--se-radius-sm);
    background: var(--se-panel);
    cursor: pointer;
    appearance: none;
    transition: background-color var(--se-move), border-color var(--se-move);
  }
  .box input:hover { border-color: var(--se-ink-2); background: var(--se-hover); }
  .box input:checked { border-color: var(--se-ink-2); }
  .box input:focus-visible { outline: none; box-shadow: var(--se-focus-ring); }
  .box .icon {
    position: relative;
    width: 12px;
    height: 12px;
    color: var(--se-ink);
    visibility: hidden;
    pointer-events: none;
  }
  .box input:checked + .icon { visibility: visible; }
`

// The box around an input of type checkbox the block renders itself.
export function tickBoxTpl(input: TemplateResult): TemplateResult {
  return html`<span class="box">${input}${icon('check')}</span>`
}
