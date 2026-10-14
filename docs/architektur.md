# Architektur

Für Programmierer, die TypeScript, React und Web Components kennen, dieses Repo aber nicht. Jede Aussage nennt die Datei, an der sie sich prüfen lässt. Was SoftEngine selbst betrifft, steht in `docs/softengine-wiki/kontrakte.md`.

## 1. Was das ist

- Ein Editor im Browser für Masken des ERP SoftEngine, das sie in WinUI über Edge WebView2 zeigt (`CLAUDE.md`). Vite, React 19, Lit 3 (`package.json`). Einstieg des Editors: `src/main.tsx`.
- Export: `exportMask()` in `src/export/exportMask.ts` liefert `{ html, sevariablen }`, eine HTML und eine JSON. `src/editor/shell/Toolbar.tsx` schreibt beide in den Zielordner der Maske oder lädt sie herunter, wenn `validateMaskHtml()` (`src/export/validator.ts`) nichts beanstandet; sonst nennt ein kleines Fenster die gescheiterte Prüfung (`Notice`, `src/editor/widgets/Notice.tsx`), und nichts geht hinaus. Danach nennt es gebundene Stellen, deren Feld die Quelle nicht hat (`lostBindings()`, `src/export/lostBindings.ts`); die Maske zeigt sie leer, der Editor wie ungebunden.
- Zielordner: die Maske trägt nur seinen Namen (`exportTarget` an der Wurzel, `src/core/block/exportTarget.ts`, neben `maskName` und `documentFrame`, `ROOT_PROPERTIES` in `src/core/block/treeOps.ts`); den Ordner selbst hält der Browser in IndexedDB unter diesem Namen (`src/editor/state/exportTarget.ts`, `src/editor/state/handleStore.ts`). `exportFolder()` holt ihn beim Klick auf „Exportieren“ und fragt die Rechte nach, bevor die Maske gebaut wird; kennt der Browser ihn nicht oder darf nicht schreiben, wird heruntergeladen und ein `Notice` sagt warum. Der Export selbst kennt den Wert nicht.
- Die HTML ist geschlossen: Stile, Datenquellen, Relationen und die ganze Laufzeit stehen darin; die Schrift ist Segoe UI, die auf jedem Windows liegt (`--se-font` in `src/design/mask.css`). Einziges fremdes Skript ist die Brücke von SoftEngine (`BRIDGE_SCRIPT` in `src/export/validator.ts`).
- Die Bausteine sind Lit-Elemente unter `src/blocks/`. Der Editor hängt dieselben Elemente auf die Leinwand, deren Tags der Export in die HTML schreibt.
- Der Schalter zwischen Editor und Maske ist das Attribut `preview` (`BlockElement.preview` in `src/blocks/base/BlockElement.ts`). Der Editor setzt es vor dem Einhängen (`src/editor/canvas/useLitElement.ts`); `nodeToHtml()` im Export kennt es nicht und schreibt es nie.
- Daten fragt ein Baustein über `maskState.host` (`src/runtime/maskState.ts`). Vorbelegt ist `softEngineHost` (`src/runtime/softEngineHost.ts`); der Editor setzt vor dem ersten Render `previewHost` (`src/main.tsx`, `src/runtime/previewHost.ts`), der nichts liefert.

## 2. Schichten

| Ordner | Inhalt |
|---|---|
| `src/core/` | Modell ohne Framework: Eigenschaften, Fähigkeiten, Registry, Baum, Raster, Datenquellen, Aktionsschritte. |
| `src/blocks/` | Die Lit-Bausteine, je einer pro Ordner, und geteilte Teile (`src/blocks/base/`, `src/blocks/parts/`, `src/blocks/list/`, `src/blocks/lookup/`). |
| `src/runtime/` | Was die laufende Maske braucht: Host-Schnittstelle `MaskHost`, Auswahl, Ereignisse und Aktionen, Datenanbindung. |
| `src/softengine/` | Die einzige Stelle mit den Globals von SoftEngine (`SEDATA`, `selib`, `basisHTML_REGISTER`, `src/softengine/bridge.ts`). |
| `src/editor/` | React-Oberfläche: Store, Leinwand, Leiste, Fenster. |
| `src/export/` | Baum → HTML und SEvariablen-JSON. |

Wer wen importiert (A → B: A importiert B):

```
editor     → blocks, export, runtime, core
export     → core   (+ src/design/mask.css und src/export/generated/runtime.js als Text)
blocks     → runtime, core
runtime    → core   (nur src/runtime/softEngineHost.ts → softengine)
softengine → core
core       → nichts außerhalb von core
```

Regeln im Linter, `eslint.config.js`:

- `src/core/`: Block `files: ['src/core/**/*.{ts,tsx}']` (Zeilen 56–74) verbietet `lit`, `react`, `react-dom` und jede äußere Schicht.
- `src/blocks/` (Zeilen 75–99): kein `softengine`, kein `editor`, kein `export`.
- `src/runtime/` (Zeilen 100–137): kein `blocks`, `editor`, `export`; `softengine` nur in `src/runtime/softEngineHost.ts`, und der ruft `hostCall` nicht selbst.
- `src/softengine/` (Zeilen 156–167): kein `blocks`, `runtime`, `editor`, `export`.
- `src/editor/` und `src/export/` haben keine Importregel.
- Farben, Radien, Schriftgrößen, Schatten, Schriften als Literal sind in `blocks`, `runtime`, `export`, `editor` verboten (Zeilen 138–155); sie kommen aus `src/design/mask.css` und `src/design/editor.css`.

## 3. Der Weg eines Werts

Im Editor, vom Klick in der Leiste bis zum Bild:

| Station | Datei |
|---|---|
| Steuerelement ruft `editor.updateProperty(blockId, key, value)` | `src/editor/bar/BarControl.tsx` |
| `updateProperty` ruft `propertyUpdated()` | `src/editor/state/EditorStore.ts` |
| `propertyUpdated()`: reine Funktion. Liest den Wert mit `declared.type.read`, setzt abhängige Eigenschaften (`preset.by`, `sourceProp`) auf ihren Default, gibt einen neuen Baum zurück oder `same`/`refused` | `src/editor/state/editorStore/treeEdits.ts` |
| `apply()`: Schnappschuss in die Historie, Baum ersetzen, `notify()` | `src/editor/state/EditorStore.ts` |
| `notify()` erhöht `version`; `useEditor()` hängt per `useSyncExternalStore` an dieser Zahl; React rendert | `src/editor/state/useEditor.ts` |
| `BlockHost` erhält den neuen `BlockNode` | `src/editor/canvas/BlockHost.tsx` |
| Zweiter Effekt ruft `el.setDeclared(key, value)` für jeden Eintrag in `block.values` | `src/editor/canvas/useLitElement.ts` |
| `setDeclared` prüft Name und Form gegen die Deklaration und weist zu; Lit rendert | `src/blocks/base/BlockElement.ts` |

Beim Export:

| Station | Datei |
|---|---|
| `exportMask()` geht von `ROOT_ID` durch den Baum, `nodeToHtml()` je Knoten | `src/export/exportMask.ts` |
| Ein Attribut je deklarierter Eigenschaft: `declared.attribute="…"`, Wert aus `declared.type.toAttribute()`. Weggelassen bei `attribute === ''`, bei unerfülltem `when` und beim Default | `src/export/exportMask.ts` |
| Gebundene Stelle mit `previewProp`: statt des Werts der Feldname | `src/export/bindingPreview.ts` |
| Gebundene Stelle mit `nameProp` (Beschriftung des Texts): leer gelassen trägt sie den Feldnamen | `src/export/bindingPreview.ts`, im Editor `useLitElement.ts` |
| Lage im Raster als `style`, Aktionen als `data-ff-actions` | `src/export/nodeStyle.ts`, `src/core/data/steps/chains.ts` |
| In der Maske meldet die Laufzeit dieselben Klassen an | `src/blocks/register.ts` |
| Lit liest das Attribut mit dem Konverter aus `declareLitProperties()`, der `declared.type.fromAttribute(raw, default)` ruft; fehlendes Attribut = Default | `src/blocks/base/BlockElement.ts` |
| Derselbe `render()` des Bausteins, ohne `preview` | z. B. `src/blocks/formfield/FormField.ts` |

Zurück, vom Baustein zum Editor. Alle vier Ereignisse sind `CustomEvent` ohne `bubbles`; der Editor hört direkt am Element.

| Ereignis | Sender | Hörer | Wirkung |
|---|---|---|---|
| `ff-prop-change` | `sendPropChange()`, `src/blocks/base/BlockElement.ts` | `src/editor/canvas/useLitElement.ts` | `updateProperty` (z. B. Text direkt auf der Fläche umbenannt) |
| `ff-spot-click` | `sendSpotClick()`, nur bei `preview`, `src/blocks/base/BlockElement.ts` | `src/editor/canvas/useLitElement.ts` merkt sich die Stelle; `src/editor/canvas/BlockHost.tsx` und `src/editor/canvas/useFieldBinding.tsx` werten sie aus | Feld binden oder Nachschlagefenster öffnen |
| `ff-heads-placed` | `src/blocks/base/headsReport.ts`, nur bei `preview` | `src/editor/canvas/useHeadsPlaced.ts` für `ColumnControls.tsx` und `LookupColumns.tsx` | Griffe über Spaltenköpfen |
| `ff-height-reported` | `src/blocks/base/heightReport.ts`, nur bei `preview` | `src/editor/canvas/useLitElement.ts`, nur bei `grid.heightFromContent` | `fitNodeHeight()` setzt die Zeilen, ohne Historienschritt; beim zuletzt von Hand geänderten Baustein rückt `slotGrownPushing()` (`src/core/block/gridArea.ts`) das Darunter nach unten |

## 4. Ein Baustein

Beispiel `src/blocks/formfield/`: `FormField.ts` (Klasse), `properties.ts` (Deklarationen), `valueBinding.ts` (Anbindung an Daten), `formFieldStyle.ts` (CSS).

- Klasse: `class FormField extends BlockElement` mit `static readonly type = 'formfield'` und `static readonly tag = 'ff-formfield'` (`src/blocks/formfield/FormField.ts`).
- `properties.ts`: ein Objekt `formFieldProperties`, gebaut mit den Fabriken aus `src/core/block/property.ts` (`textProperty`, `choiceProperty`, `segmentProperty`, `booleanProperty`, `numberProperty`, `fieldProperty`, `sourceProperty`, `listProperty`). Jede Deklaration trägt `type` (`read`, `toAttribute`, `fromAttribute`, `control`), `default`, `label`, `place`, `attribute`, optional `when`, `preset`, `sourceProp`, `plainNameProp`.
- Typen: `interface FormField extends FormFieldValues {}` mit `FormFieldValues = ValuesOf<typeof formFieldProperties>`. Der Linter erlaubt diese Verschmelzung nur unter `src/blocks/` (`eslint.config.js`, Zeilen 81–85). Die Werte stehen ab dem Konstruktor (`startValues()` in `src/blocks/base/BlockElement.ts`).
- `defineBlock(FormField, { … })` am Dateiende (`src/blocks/base/BlockElement.ts`):
  - `allProperties()` fügt `gridX`, `gridY`, `gridW`, `gridH` hinzu (`GRID_PROPERTIES`, `src/core/block/grid.ts`), bei Fähigkeit `source` die Eigenschaften `source` und `extraSources`, bei `followsSelection` deren Eigenschaft.
  - `checkPropertyNames()` (`src/core/block/propertyNames.ts`) prüft jeden Namen, den Deklarationen und Fähigkeiten nennen, und wirft beim Laden des Moduls.
  - legt die Lit-Properties an, meldet das Custom Element an und trägt den Baustein mit `registerBlockType()` in die Registry ein (`src/core/block/registry.ts`).
- Weitere Felder (`BlockDeclaration`, `src/core/block/blockType.ts`): `name`, `category`, `takesChildren`, `allowedParent`, `inPalette`, `page`, `grid`.
- `grid` (`GridMetrics`, `src/core/block/grid.ts`): `startWidth`, `startHeight`, `minWidth`, `minHeight`, `heightFixed`, `heightFromContent`, `grows`. Das Raster hat 48 Spalten, Zeilen zu 12 px, 4 px Abstand (`GRID`). FormField: `{ startWidth: 12, startHeight: 3, minWidth: 4, heightFromContent: true }`.
- Capability = was der Baustein dem Rest verspricht (`Capability` in `src/core/block/capability.ts`). Editor, Export und Laufzeit fragen `capability(def, kind)` oder `hasCapability()`, nicht den Bausteintyp; Typnamen vergleichen nur die Schema-Stufen in `src/editor/state/maskSchema.ts`. FormField verspricht `source`, `followsSelection`, `recordPick`, `list`, `lookupWindow`, `bindable` (Stelle `value`, gebunden über `valueField`), `actionValue` und `events` (`onChange`).
- Contract = welche Klasse eine Fähigkeit erfüllt (`RuntimeContracts`, `ContractClasses` in `src/core/block/capability.ts`). Der Baustein nennt sie unter `contracts`, der Typprüfer hält die Klasse an das Interface. `contractOf(el, kind)` (`src/core/block/registry.ts`) gibt das Element als Vertrag zurück und wirft, wenn die Fähigkeit deklariert, aber keine Klasse genannt ist. FormField: `contracts: { actionValue: FormField }` (`ValueCarrier`: `valueRequired`, `focusValue`).
- `capture`, `change`, `holdsSent` und `compute` sind der Vertrag der Erfassung (`src/blocks/capture/Capture.ts`) mit Laufzeit und Export, darum nur dort. Leser: `src/runtime/events.ts`, `src/runtime/pendingState.ts`, `src/blocks/list/sourceRows.ts`, `src/export/exportMask.ts`, `src/export/usedSources.ts`, `src/core/block/treeQuery.ts`. Drei davon haben eine Vertragsklasse (`contracts: { capture: Capture, change: Capture, holdsSent: Capture }`); `compute` nennt nur die Eigenschaft der Berechnungen.
- Ein Baustein hat eine Fähigkeit `events`. Die Erfassung hängt ihr Ereignis „Zeile erfasst“ (`onRowCaptured`) an die drei der Liste (`listCapabilities(…, ownEvents)`, `src/blocks/list/listDeclaration.ts`); eine zweite `events`-Fähigkeit läse niemand.
- Laufzeit neben der Klasse: `src/blocks/formfield/valueBinding.ts` hängt das Feld über `makeDataLink()` (`src/runtime/source.ts`) an den Host: liest, wenn der Host Daten meldet, schreibt bei `input` über `maskState.host.writeField`, startet die Aktion `onChange` bei `change`.

## 5. Eine Eigenschaft hinzufügen

1. Eine Zeile in `properties.ts` des Bausteins, z. B. `hint: textProperty({ default: '', label: 'Hinweis', place: 'bar', attribute: 'hint' })`. `label` ist deutsch, der Ersteller der Maske liest es; `attribute` klein und englisch (Kommentare an `Property`, `src/core/block/property.ts`); `''` hält die Eigenschaft im Editor.
2. Im `render()` `this.hint` lesen. Der Typ kommt aus `ValuesOf`.

Daraus folgt ohne weiteren Code:

- Lit-Property mit Konverter, nur bei `attribute !== ''` (`declareLitProperties()`, `src/blocks/base/BlockElement.ts`); Startwert ist der Default.
- Steuerelement nach `place`: `propertiesFor()` (`src/core/block/propertyPlace.ts`) verteilt auf `src/editor/bar/BlockBar.tsx` (`bar`, `font`), `src/editor/bar/SettingsWindow.tsx` (`display`, `source`, `lookup`) und `src/editor/bar/ColumnBar.tsx` (`column`); `block` bearbeitet der Baustein auf der Fläche (`inlineEdit()` → `ff-prop-change`), `none` niemand in der Leiste; die Art nach `type.control` (`src/editor/bar/BarControl.tsx`); sichtbar, solange `when` gilt.
- Der Store nimmt nur Werte, die `type.read` annimmt (`propertyUpdated()`, `src/editor/state/editorStore/treeEdits.ts`).
- Export-Attribut (`nodeToHtml()`, `src/export/exportMask.ts`).
- Laden: `checkTreeState()` (`src/editor/state/checkTreeState.ts`) → `valuesClean()` (`src/core/block/treeOps.ts`) → `readValues()` (`src/core/block/property.ts`): fehlender Wert → Default, falsche Form → Default, unbekannter Name fällt weg.
- Start-Prüfung der Namen in `when`, `sourceProp`, `plainNameProp`, `preset.by` (`checkPropertyNames()`, `src/core/block/propertyNames.ts`).

Nicht automatisch:

- Schema-Stufe, wenn gespeicherte Masken einen Wert umgerechnet brauchen (umbenannt, andere Bedeutung): `CURRENT_SCHEMA_VERSION` erhöhen, die alte Nummer in `LIFTABLE`, eine Funktion `liftToNN()` schreiben und in `liftState()` einreihen (`src/editor/state/maskSchema.ts`). Eine neue Eigenschaft allein braucht keine Stufe, fehlende Werte lädt `readValues()` als Default.
- Ändert sich der Export der Referenzmaske, `REFERENCE_REFRESH=1 npm test` (siehe 11).
- Was der Wert in der Maske mit Daten tut, schreibt der Baustein selbst (wie `src/blocks/formfield/valueBinding.ts`).

## 6. Einen Baustein hinzufügen

1. Ordner `src/blocks/<name>/` mit `properties.ts` und der Klasse: `extends BlockElement`, `static readonly type`, `static readonly tag = 'ff-<type>'`, `interface <Name> extends <Name>Values {}`, `render()`. Der Starttest sucht die Elemente als `ff-${type}` (`src/export/runtimeStarts.test.ts`).
2. `defineBlock(<Name>, { name, category, properties, capabilities, contracts, grid })` am Dateiende.
3. Import in `src/blocks/register.ts`. Diese Datei ist der Einstieg der Laufzeit (`tools/buildRuntime.mjs`); der Editor lädt sie über `src/editor/blockIcons.ts`, das `src/main.tsx` importiert.
4. Zeichen in `BLOCK_ICONS` (`src/editor/blockIcons.ts`). Ohne Eintrag zeigen `src/editor/bar/BarFrame.tsx` und `src/editor/sidebar/BlockPalette.tsx` ein Ersatzzeichen.
5. Einen Knoten des Bausteins in `referenceTree()` (`src/export/reference/referenceMask.ts`) aufnehmen; der Starttest prüft nur Typen aus diesem Baum. Dann `REFERENCE_REFRESH=1 npm test`.

Nicht anfassen: Registry, `EditorStore`, `BlockHost`, Leiste, Palette (`BlockPalette.tsx` liest `allBlockTypes()`), `exportMask.ts`, `tools/buildRuntime.mjs`. Der Test „jeder Registry-Baustein exportiert seinen Tag“ (`src/export/referenceSnapshot.test.ts`) nimmt den Baustein ohne Zutun auf.

## 7. Eine Schrittart für Aktionen hinzufügen

Ein Knoten trägt `chains: ActionChains`, Ereignisschlüssel → Liste von `Step` (`src/core/block/tree.ts`, `src/core/data/steps/steps.ts`). Welche Ereignisse ein Baustein hat, sagt seine Fähigkeit `events`.

1. Datei in `src/core/data/steps/` mit `XStep extends StepBase`, `RuntimeXStep` und `const x: StepAdapter<'X'>` (`src/core/data/steps/stepAdapter.ts`). Kleinste Vorlage: `src/core/data/steps/maskClose.ts`.
   - `read(raw, base)`: gespeicherten Schritt prüfen; gerufen von `chainsClean()` (`src/core/data/steps/chains.ts`).
   - `export(step, refs)`: Form in der Maske; Seiten und Spalten über `refs`; gerufen von `chainsForExport()`.
   - `readExported(raw, resultName)`: exportierten Schritt in der Maske prüfen; gerufen von `chainsRead()`.
   - `run(step, run)`: ausführen, `run.host` ist ein `StepHost`; gerufen von `src/runtime/events.ts`.
   - `answers`: wartet auf eine Antwort von SoftEngine; dann startet `src/blocks/button/Button.ts` den Host schon beim Verbinden.
   - `bindings`, `withBindings`: welche Werte der Schritt liest (`src/export/usedSources.ts`, `src/core/block/treeQuery.ts`, `src/editor/state/columnCleanup.ts`).
   - `withBlockIds`: Bezüge beim Duplizieren (`src/editor/state/duplicateSubtree.ts`). `relationId`: genutzte Relation.
2. Registrieren in `src/core/data/steps/steps.ts`: Typ in die Unions `Step` und `RuntimeStep`, Eintrag in `STEP_ADAPTERS`. Der Mapped Type `{ [K in StepKind]: StepAdapter<K> }` erzwingt den Eintrag.
3. Braucht der Schritt etwas Neues von SoftEngine: Methode in `StepHost` (`src/core/data/steps/stepAdapter.ts`), umgesetzt in `src/runtime/previewHost.ts` und `src/runtime/softEngineHost.ts`, dort aus `src/softengine/` weitergereicht.
4. Nicht automatisch: das Fenster im Editor. `src/editor/actions/StepWindow.tsx` und `src/editor/actions/ActionsSection.tsx` unterscheiden die Arten einzeln.

## 8. Daten

- `DataSource` (`src/core/data/dataSources.ts`): `id`, `name`, `preset`, `tableId`, `fields` und drei Achsen: `order` (was auf der Bestellliste SEvariablen steht, `src/core/data/orders/`), `delivery` (wie die Zeilen in die Maske kommen, `src/core/data/deliveries/`), `write` (wie geschrieben wird, `src/core/data/writes/`).
- `preset` (`src/core/data/presets/`) legt fest, welche Einstellungen das Datenfenster zeigt, und füllt `order` und `delivery` vor; der Export liest es nicht.
- Ein Baustein nennt nur die `id` seiner Quelle (Eigenschaft `source`, `src/core/block/sourceProperty.ts`) und Feldcodes (z. B. `valueField`).
- Bibliothek: die Kundendatei, der Katalog aller Quellen und Relationen (`DataSourceStore`, `RelationStore` in `src/editor/state/`; Datei `src/editor/state/libraryFile.ts`).
- Mitgetragen: die Maskendatei enthält die Quellen und Relationen, die die Maske nutzt (`packMask()` in `src/editor/state/maskFile.ts` mit `collectDataSources()` aus `src/export/usedSources.ts`).
- Beim Laden einer Maskendatei gewinnt die Bibliothek: `missingOn()` (`src/editor/state/libraryFile.ts`) fügt nur Einträge mit unbekannter `id` hinzu (`replaceMask()` in `src/editor/state/EditorStore.ts`).

Lieferwege (`DELIVERY_ADAPTERS` in `src/core/data/deliveries/deliveries.ts`; `fetchOn` sagt, wann die Maske selbst holt, ausgewertet in `src/runtime/fetchingSources.ts`):

| `delivery.kind` | Weg | `fetchOn` | `order.kind` laut Vorlagen |
|---|---|---|---|
| `push` | mit dem Dokument: SoftEngine legt die Zeilen in `SEDATA.Daten` (`Var`, `SEFileLoop`, `Tabellen`, `Masken`) | `never` | `var`, `sefileloop`, `dataset`, `mask` |
| `message` | Nachricht nach dem Öffnen: die Maske fragt per ERPAPICALL (`src/softengine/queryLoader.ts`) | `delivery` | `none` (`src/core/data/presets/erpQuery.ts`) |
| `relationRows` | Lade-Relation: die Positionen des Belegs, der beim Geber gewählt ist (`src/core/data/deliveries/relationRows.ts`) | `selection` | `none` |
| `relationValue` | eine Zeile aus der Antwort einer GET-Relation, nach jeder Lieferung (`src/core/data/deliveries/relationValue.ts`) | `delivery` | `none` |

- Die SEvariablen-JSON (`buildSevariablen()`, `src/export/sevariablen.ts`; Form `Sheet` in `src/core/data/orders/sheet.ts`) enthält nur die Bestellung: die Blöcke `VAR`, `SEFILELOOP`, `ERPAPICALL`, `DATASET`, `MASKE`, je Eintrag `ID` und `FELDER`, je nach Block weitere Schlüssel wie `ALIAS`, `KOPFSATZ_INDEX`, `BEREICH`.
- Sie enthält keine Lieferwege, Relationen oder Aktionen. Die stehen in der HTML: Lieferweg und Satznummernfeld je Quelle in `window.FF_DATA_SOURCES`, Relationen in `window.FF_RELATIONS` (`src/export/exportMask.ts`), Aktionen in `data-ff-actions`.
- Quellen mit `order.kind === 'none'` stehen nicht in der SEvariablen (`src/core/data/orders/none.ts`). `order.kind === 'erpapicall'` schreibt einen Eintrag `ERPAPICALL` (`src/core/data/orders/erpapicall.ts`), keine Vorlage setzt ihn; die Abfrage nach dem Öffnen läuft über `delivery.kind === 'message'`.
- Neue Art eines Lieferwegs oder einer Bestellung: wie Schritte (7), Adapter `DeliveryAdapter` (`src/core/data/deliveries/deliveryAdapter.ts`) bzw. `OrderAdapter` (`src/core/data/orders/orderAdapter.ts`), eingetragen in `DELIVERY_ADAPTERS` bzw. `ORDER_ADAPTERS` (`src/core/data/orders/orders.ts`). Holen in der Maske: `src/softengine/fetchRows.ts`.
- Schreiben: `runEvent` (`src/runtime/events.ts`) markiert jede Zeile als hinausgehend, bevor ihre Schritte laufen, und meldet sie fertig, sobald sie hinaus ist; so nimmt kein zweiter Lauf sie. Schreibvorgänge gehen nacheinander, der nächste erst nach der Lieferung auf den vorigen, höchstens 10 s (`src/softengine/relations/hostQueue.ts`).
- Was `src/softengine/` an den Elementen der Bausteine liest, steht als Attributname in `src/core/block/typingMarks.ts`: welche Eingabe eine Lieferung nicht aufhält, welcher Klick die Bearbeitung nicht beendet.
- Alles, was SoftEngine betrifft (Dateiform, Anmeldung, Feldcodes, Reihenfolge, Schreiben): `docs/softengine-wiki/kontrakte.md`.

## 9. Die Naht React–Lit

- `BlockHost` (`src/editor/canvas/BlockHost.tsx`) zeichnet einen Rahmen-`div` (Auswahl als `outline`, sonst bei „Umrisse“ die Klasse `block-outline` aus `src/design/editor.css`; Klicks), darin einen Container-`div` für das Element, daneben die Hilfen des Editors: Feldwähler, `ColumnControls`, `BlockBar`, `Grip`.
- `useLitElement` (`src/editor/canvas/useLitElement.ts`), erster Effekt: `document.createElement(def.tag)`, `preview` setzen, `appendChild`, Hörer für `ff-prop-change`, `ff-spot-click`, `ff-height-reported` anhängen; Aufräumen entfernt Hörer und Element. Abhängigkeiten `[block.type, editor, blockRef]`: ein neues Element nur bei neuem Typ.
- Zweiter Effekt: bei jeder Änderung `setDeclared` für alle Werte, die Feldnamen gebundener Stellen, `editable` (= ausgewählt) und das Attribut `fills`.
- Kinder: Für `takesChildren` rendert `BlockHost` die Kinder (`NodeList`, `src/editor/canvas/NodeList.tsx`) mit `createPortal(children, element)` ins Light DOM des Elements. Area und Popup zeigen sie über `<slot>` (`src/blocks/area/Area.ts`, `src/blocks/popup/Popup.ts`).
- Warum so, laut Code: Das Element lebt, solange `BlockHost` steht und der Typ gleich bleibt; React-Renders ändern nur Werte. `preview` steht fest, bevor der Baustein verbunden ist (Kommentar an `preview`, `src/blocks/base/BlockElement.ts`). `setDeclared` reicht den Wert aus dem Baum unverändert durch, damit eine unveränderte Liste ihre Identität behält und Lit nichts neu misst (Kommentar an `setDeclared`).
- Wenn etwas doppelt gezeichnet wird:
  - das ganze Element: Aufräumen und Abhängigkeiten des ersten Effekts in `src/editor/canvas/useLitElement.ts`.
  - Kinder: das Portal in `src/editor/canvas/BlockHost.tsx` (der einzige Weg, auf dem Kinder ins Element kommen) und die `<slot>` im Baustein.
  - Griffe über Köpfen: der Baustein zeichnet die Köpfe, der Editor legt nur Griffe auf die gemeldeten Stellen (`src/blocks/base/headsReport.ts` → `src/editor/canvas/useHeadsPlaced.ts` → `src/editor/canvas/ColumnControls.tsx`).
  - etwas nur im Editor oder nur in der Maske: die Zweige über `this.preview` im `render()` des Bausteins (z. B. `controlTpl()` in `src/blocks/formfield/FormField.ts`).

## 10. Store, Historie, Speichern

- Ein `EditorStore` (`src/editor/state/EditorStore.ts`), einmal erzeugt in `src/editor/providers.tsx`, bereitgestellt über `src/editor/state/EditorProvider.tsx` und `src/editor/state/EditorContext.ts`. Er hält Baum, Auswahl, aktive Seite, `dataSources`, `relation`, Historie und den Ansichtszustand (`src/editor/state/editorStore/viewState.ts`).
- Baum: `MaskTree = Record<string, BlockNode>`, flach, Knoten mit `parentId` und `childIds` (`src/core/block/tree.ts`). Änderungen über reine Funktionen, die einen neuen Baum liefern (`src/editor/state/editorStore/treeEdits.ts`, `src/core/block/gridArea.ts`, `src/editor/state/duplicateSubtree.ts`); `treeEdits.ts` kopiert nur die geänderten Knoten (`{ ...tree, [id]: … }`).
- Melden: `Subject` (`src/editor/state/Subject.ts`). `notify()` erhöht `version` und plant das Speichern. React hängt mit `useSyncExternalStore` an `version` (`src/editor/state/useEditor.ts`). Offene Fenster melden sich getrennt über `view` und `viewVersion` (`src/editor/state/useView.ts`) und planen kein Speichern.
- Historie: `History` (`src/editor/state/history.ts`) hält bis zu 50 Schnappschüsse `EditorSnapshot`: tiefe Kopie des Baums, Auswahl, Seite, Quellen, Relationen und die Datei der Maske (`FilePlace`). Jede Änderung des Baums ruft vorher `pushHistory()` (meist über `apply()`), nur `fitNodeHeight()` nicht. `transaction()`, `beginTransaction()`/`endTransaction()` und `openGesture()` fassen mehrere Änderungen zu einem Schritt. `restoreFrom()` setzt auch die Datei zurück: „Rückgängig“ nach dem Öffnen einer Maske schreibt die vorige nie in die Datei der geöffneten.
- Speichern (`src/editor/state/editorStore/persistence.ts`): 500 ms nach der letzten Änderung (`SAVE_DEBOUNCE_MS` in `src/editor/state/maskStorage.ts`, `src/editor/state/savePlanner.ts`) in `localStorage` unter `aufbau_editor_mask` und `aufbau_editor_library`; zur Maske dort `file` (ihr Platz im Ordner der Masken) und `savedAt` (wann sich ihr Text zuletzt änderte, nicht bei jedem Klick). Der Schalter „Umrisse“ (`EditorView`, `src/editor/state/editorStore/viewState.ts`) liegt unter `aufbau_editor_outlines`, sofort beim Umschalten (`persistOutlines()` in `src/editor/state/maskStorage.ts`), nicht in der Maske. Zusätzlich in die Datei der Maske und die Datei der Bibliothek, sobald es sie gibt (`FileOnDisk`, `src/editor/state/fileOnDisk.ts`). `FileOnDisk` schreibt denselben Text nicht zweimal, und eine gerade geöffnete Datei erst nach der ersten Änderung des Erstellers (`stir()` in `pushHistory()`). Der Port 5300 ist fest, weil `localStorage` und IndexedDB am Origin hängen (`vite.config.ts`).
- Ordner der Masken (`MaskFolder`, `src/editor/state/maskFolder.ts`, Zugriff in `src/editor/state/folderOnDisk.ts`): `showDirectoryPicker` (Edge, Chrome), der Griff in IndexedDB (`aufbau_editor`, `src/editor/state/handleStore.ts`), beim Start zurückgeholt (`reopenFolder()` in `src/editor/state/EditorStore.ts`, aus `src/editor/providers.tsx`). Nach einem Neustart verlangt der Browser oft einen Klick, bevor der Editor schreiben darf (Zustand `ask`). `list()` liest jede `*.aufbau-maske.json` bis vier Ordner tief, ohne `.`-Ordner und `node_modules`; Name und Rahmen-Nummer aus der Wurzel, Datum aus der Datei; was unter `Vorlagen/` liegt, ist eine Vorlage. `rejoin()` im Store findet nach dem Start die Datei der Maske wieder: gleicher Text, dann nur verbunden; Datei jünger als `savedAt`, dann wird sie geladen; sonst schreibt der Browser hinein.
- Die Knöpfe (`src/editor/state/maskFile.ts`): `saveMask()` („Speichern“, Strg+S) schreibt in die Datei der Maske, legt ohne Datei eine neue oben im Ordner an (`saveNew()`, nie über eine bestehende) und wählt den Ordner beim ersten Mal; ein Browser ohne Ordner wählt eine Datei oder lädt herunter wie bisher (`writeFile()`). `openMaskFile()`, `newMaskFrom()` (Vorlage, ohne Name und Zielordner), `saveAsTemplate()` (nach `Vorlagen/`, überschreibt gleichen Namen), `loadMaskFromFile()` (eine einzelne Datei, ohne Verbindung). Das Fenster dazu: `src/editor/masks/MasksWindow.tsx`. Was schiefgeht, steht im `notice` von `EditorView`, das `src/editor/shell/Toolbar.tsx` zeigt; was gelang, zeigt der Knopf kurz mit Haken (`markDone()`, `src/editor/widgets/DoneLabel.tsx`).
- Maskendatei: `kind`, `fileVersion`, `schemaVersion`, `tree`, `dataSources`, `relation` (`packMask()`, `src/editor/state/maskFile.ts`). `packMaskFrom()` sagt, warum eine Datei nicht lädt (kein JSON, Kundendatei, Stufe zu alt oder zu neu, beschädigt); das Fenster „Masken“ zeigt es im `Notice`.
- Schema-Heber `liftState()` (`src/editor/state/maskSchema.ts`): eine Funktion `liftToNN()` je Stufe, nacheinander von der gespeicherten Version bis `CURRENT_SCHEMA_VERSION`. Gelesen werden Masken ab Version 20 (`LIFTABLE`); ältere und neuere ergeben `null`. Ab 20 geht keine Stufe verloren. Aufgerufen beim Laden aus Datei (`src/editor/state/maskFile.ts`) und aus dem Browser (`src/editor/state/maskStorage.ts`); der Ladetest (11) hebt jede Maske in `masken/`.
- Die Kundendatei hat einen eigenen Heber, der keine Stufe verliert (`src/editor/state/librarySchema.ts`).

## 11. Bauen, Prüfen, Export

Befehle (`package.json`):

| Befehl | Tut |
|---|---|
| `npm run dev` | Vite auf Port 5300, `strictPort` (`vite.config.ts`); vorher `build:runtime` |
| `npm run check` | `tsc -b && eslint src` |
| `npm test` | `vitest run`; vorher `build:runtime` |
| `npm run build` | `tsc -b && vite build`; vorher `build:runtime` |
| `npm run build:runtime` | `tools/buildRuntime.mjs`: baut `src/blocks/register.ts` als IIFE, minifiziert, mit `NODE_ENV=production`, nach `src/export/generated/runtime.js` (in `.gitignore`) |

Was in jede exportierte HTML eingebettet wird (`src/export/exportMask.ts`):

- die Laufzeit `src/export/generated/runtime.js` (Import `?raw`), ganz, mit allen Bausteinen aus `src/blocks/register.ts`, gleich welche die Maske nutzt.
- `src/design/mask.css` im einzigen `<style>`, ohne eigene Schrift (seit 14.10. Segoe UI aus Windows statt eingebettetem Manrope).
- `window.FF_DATA_SOURCES` und `window.FF_RELATIONS`. Die Skripte werden auf ASCII maskiert (`escapeNonAsciiJs()`, `src/export/serializer.ts`); `validateMaskHtml()` prüft u. a. nur LF, nur ASCII, genau ein `<style>`, eingebettete Laufzeit.
- Der Editor lädt `exportMask.ts` erst beim ersten Export (`import()` in `src/editor/shell/Toolbar.tsx`).

Referenzabzug, `src/export/referenceSnapshot.test.ts`:

- Exportiert `referenceTree()` mit `REFERENCE_SOURCES` und `REFERENCE_RELATION` (`src/export/reference/referenceMask.ts`) und vergleicht Zeichen für Zeichen mit `src/export/reference/reference.html` (ohne das Laufzeit-Skript) und `src/export/reference/reference.sevariablen.json`.
- Jeder Baustein der Registry erscheint mit seinem Tag im Export.
- Je Baustein erreicht die erste Text-Eigenschaft mit Attribut (ohne Quelle und Feldbindungen), geändert, den Export als Attribut.
- Erneuern: `REFERENCE_REFRESH=1 npm test` schreibt beide Dateien neu. Nur wenn sich der Export gewollt ändert, und im Commit sagen, was sich änderte (`CLAUDE.md`).

Starttest, `src/export/runtimeStarts.test.ts`:

- Schreibt die exportierte Referenzmaske nach `node_modules/.tmp/runtime-start`, öffnet sie in headless Chromium (`playwright-core`) und wartet 800 ms.
- Erwartet keine Fehler außer dem fehlenden Brückenskript von SoftEngine (`BRIDGE_SCRIPT`), und für jeden Typ im Referenzbaum: `ff-<type>` ist angemeldet und hat ins Shadow DOM gezeichnet.
- Braucht einmal `node node_modules/playwright-core/cli.js install chromium-headless-shell` (Meldung im Test).

Ladetest, `src/editor/state/masksLoad.test.ts`:

- Nimmt jede `*.aufbau-maske.json` unter `masken/`, auch in Unterordnern, und geht den Weg des Editors: `liftState()`, `checkTreeState()`, `checkDataSources()` und `checkRelationTemplates()` wie `loadMaskFromFile()` (`src/editor/state/maskFile.ts`), dann `exportMask()` mit dem Namen der Maske und `failedChecks(validateMaskHtml())` wie der Export-Knopf.
- Schlägt an, wenn der Heber die Stufe nicht liest, wenn beim Lesen ein Baustein, eine Quelle oder eine Relation wegfällt, oder wenn eine Prüfung des Exports scheitert. Der Testname nennt die Datei; ein Ordner `masken/` ohne Maske ist ein Fehler.
- Eine neue Maske unter `masken/` nimmt er ohne Zutun auf. Den gespeicherten Export (`*.basis.*`) vergleicht er nicht; das ist Sache des Referenzabzugs.

## 12. Bekannte Grenzen

- Tests: drei Dateien für den ganzen Kern, `src/export/referenceSnapshot.test.ts`, `src/export/runtimeStarts.test.ts` und `src/editor/state/masksLoad.test.ts`, alle über den Export. Gespeicherte Masken älterer Stufe hebt nur der Ladetest, und nur von den Stufen, auf denen die Masken in `masken/` stehen (14.10.: 33). Kein Test lädt eine alte Kundendatei, keiner prüft Store, Leinwand oder Leiste.
- `maskState` ist ein Modul-Singleton (`src/runtime/maskState.ts`): ein Host, eine Auswahl, ein Nachschlagefenster je Seite, also eine Maske je Seite. Im Editor teilen alle Bausteine der Leinwand diesen Zustand. `src/softengine/bridge.ts` hält seinen Zustand ebenfalls im Modul.
- Ordner der Masken und Zielordner gibt es nur in Edge und Chrome (`showDirectoryPicker`); andere Browser speichern wie vorher über eine gewählte Datei oder den Download. Ein Browser kennt nur die Ordner, die in ihm gewählt wurden; auf einem anderen Rechner wird ein Zielordner einmal neu gewählt.
- Einstellungen am Baustein gibt es nur über die Leiste am Baustein und ihre kleinen Fenster (`PropertyPlace` in `src/core/block/property.ts`, `src/editor/bar/`), keinen Inspektor. Was `place: 'none'` hat, setzt ein eigenes Fenster oder der Editor.
- `Condition.otherwise` (`src/core/block/property.ts`) entsteht an einer Stelle: `either()` in `src/blocks/base/BlockElement.ts`, für die Bedingung von `followsSelection`, wenn `recordPick` unter einer Bedingung eine eigene Quelle nennt (so bei FormField). Kein Baustein schreibt `otherwise` selbst.
