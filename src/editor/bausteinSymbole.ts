// Die Editor-Angaben zu den Bausteinen: Symbole fuer Palette und Inspector.
import '../bausteine/anmeldung'

import { ergaenzeEditorAngaben } from '../kern/maske/editorAngaben'
import {
  ZeichenDatum,
  ZeichenFormularfeld,
  ZeichenKanban,
  ZeichenKanbanSpalte,
  ZeichenKarte,
  ZeichenPopup,
  ZeichenSchaltflaeche,
  ZeichenTabelle,
  ZeichenText,
  ZeichenTrenner,
} from './zeichen/bausteinZeichen'
import { ButtonBlock } from '../bausteine/button/ButtonBlock'
import { CardBlock } from '../bausteine/card/CardBlock'
import { DatumBlock } from '../bausteine/datum/DatumBlock'
import { FormFeldBlock } from '../bausteine/formfeld/FormFeldBlock'
import { KanbanBlock } from '../bausteine/kanban/KanbanBlock'
import { KanbanSpalteBlock } from '../bausteine/kanban/KanbanSpalteBlock'
import { PopupBlock } from '../bausteine/popup/PopupBlock'
import { TabelleBlock } from '../bausteine/tabelle/TabelleBlock'
import { TextBlock } from '../bausteine/text/TextBlock'
import { TrennerBlock } from '../bausteine/trenner/TrennerBlock'

// Sie stehen hier und nicht am Baustein, damit die Maske keinen Editor-Code traegt.
const SYMBOLE = [
  [ButtonBlock.typ, ZeichenSchaltflaeche],
  [CardBlock.typ, ZeichenKarte],
  [DatumBlock.typ, ZeichenDatum],
  [FormFeldBlock.typ, ZeichenFormularfeld],
  [KanbanBlock.typ, ZeichenKanban],
  [KanbanSpalteBlock.typ, ZeichenKanbanSpalte],
  [PopupBlock.typ, ZeichenPopup],
  [TabelleBlock.typ, ZeichenTabelle],
  [TextBlock.typ, ZeichenText],
  [TrennerBlock.typ, ZeichenTrenner],
] as const

for (const [typ, symbol] of SYMBOLE) ergaenzeEditorAngaben(typ, { symbol })
