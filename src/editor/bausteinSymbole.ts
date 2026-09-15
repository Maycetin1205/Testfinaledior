// Die Editor-Angaben zu den Bausteinen: Symbole fuer Palette und Inspector.
import '../bausteine/anmeldung'

import { ergaenzeEditorAngaben } from '../kern/maske/editorAngaben'
import {
  ZeichenDatum,
  ZeichenFormularfeld,
  ZeichenKanban,
  ZeichenKanbanSpalte,
  ZeichenKarte,
  ZeichenNavi,
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
import { NaviBlock } from '../bausteine/navi/NaviBlock'
import { NaviEintragBlock } from '../bausteine/navi/NaviEintragBlock'
import { PopupBlock } from '../bausteine/popup/PopupBlock'
import { TabelleBlock } from '../bausteine/tabelle/TabelleBlock'
import { TextBlock } from '../bausteine/text/TextBlock'
import { TrennerBlock } from '../bausteine/trenner/TrennerBlock'

// Sie stehen hier und nicht am Baustein, damit die Maske keinen Editor-Code traegt.
const SYMBOLE = [
  [ButtonBlock.blockType, ZeichenSchaltflaeche],
  [CardBlock.blockType, ZeichenKarte],
  [DatumBlock.blockType, ZeichenDatum],
  [FormFeldBlock.blockType, ZeichenFormularfeld],
  [KanbanBlock.blockType, ZeichenKanban],
  [KanbanSpalteBlock.blockType, ZeichenKanbanSpalte],
  [NaviBlock.blockType, ZeichenNavi],
  [NaviEintragBlock.blockType, ZeichenNavi],
  [PopupBlock.blockType, ZeichenPopup],
  [TabelleBlock.blockType, ZeichenTabelle],
  [TextBlock.blockType, ZeichenText],
  [TrennerBlock.blockType, ZeichenTrenner],
] as const

for (const [typ, symbol] of SYMBOLE) ergaenzeEditorAngaben(typ, { symbol })
