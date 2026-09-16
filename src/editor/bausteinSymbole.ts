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
import { Button } from '../bausteine/button/Button'
import { CardBlock } from '../bausteine/card/CardBlock'
import { Datum } from '../bausteine/datum/Datum'
import { FormFeld } from '../bausteine/formfeld/FormFeld'
import { KanbanBlock } from '../bausteine/kanban/KanbanBlock'
import { KanbanSpalteBlock } from '../bausteine/kanban/KanbanSpalteBlock'
import { Popup } from '../bausteine/popup/Popup'
import { Tabelle } from '../bausteine/tabelle/Tabelle'
import { Text } from '../bausteine/text/Text'
import { TrennerBlock } from '../bausteine/trenner/TrennerBlock'

// Sie stehen hier und nicht am Baustein, damit die Maske keinen Editor-Code traegt.
const SYMBOLE = [
  [Button.typ, ZeichenSchaltflaeche],
  [CardBlock.typ, ZeichenKarte],
  [Datum.typ, ZeichenDatum],
  [FormFeld.typ, ZeichenFormularfeld],
  [KanbanBlock.typ, ZeichenKanban],
  [KanbanSpalteBlock.typ, ZeichenKanbanSpalte],
  [Popup.typ, ZeichenPopup],
  [Tabelle.typ, ZeichenTabelle],
  [Text.typ, ZeichenText],
  [TrennerBlock.typ, ZeichenTrenner],
] as const

for (const [typ, symbol] of SYMBOLE) ergaenzeEditorAngaben(typ, { symbol })
