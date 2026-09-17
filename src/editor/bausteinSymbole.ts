// Die Editor-Angaben zu den Bausteinen: Symbole fuer Palette und Inspector.
import '../bausteine/anmeldung'

import { ergaenzeEditorAngaben } from '../kern/maske/editorAngaben'
import {
  ZeichenBereich,
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
import { Bereich } from '../bausteine/bereich/Bereich'
import { Button } from '../bausteine/button/Button'
import { Karte } from '../bausteine/karte/Karte'
import { Datum } from '../bausteine/datum/Datum'
import { FormFeld } from '../bausteine/formfeld/FormFeld'
import { Kanban } from '../bausteine/kanban/Kanban'
import { KanbanSpalte } from '../bausteine/kanban/KanbanSpalte'
import { Popup } from '../bausteine/popup/Popup'
import { Tabelle } from '../bausteine/tabelle/Tabelle'
import { Text } from '../bausteine/text/Text'
import { Trenner } from '../bausteine/trenner/Trenner'

// Sie stehen hier und nicht am Baustein, damit die Maske keinen Editor-Code traegt.
const SYMBOLE = [
  [Bereich.typ, ZeichenBereich],
  [Button.typ, ZeichenSchaltflaeche],
  [Karte.typ, ZeichenKarte],
  [Datum.typ, ZeichenDatum],
  [FormFeld.typ, ZeichenFormularfeld],
  [Kanban.typ, ZeichenKanban],
  [KanbanSpalte.typ, ZeichenKanbanSpalte],
  [Popup.typ, ZeichenPopup],
  [Tabelle.typ, ZeichenTabelle],
  [Text.typ, ZeichenText],
  [Trenner.typ, ZeichenTrenner],
] as const

for (const [typ, symbol] of SYMBOLE) ergaenzeEditorAngaben(typ, { symbol })
