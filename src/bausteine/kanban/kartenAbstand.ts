// Der Abstand zwischen den Kaertchen einer Spalte oder eines Zimmers.
import { css } from 'lit'

export const kartenAbstandStil = css`
  ::slotted(*) { margin-top: 24px; }
  slot { display: contents; }
`
