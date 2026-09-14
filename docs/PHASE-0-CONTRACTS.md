# Phase 0 – bestehende Verträge

Stand: `master` bei Beginn der Phase 0: `a441d523db6633dc71f72d0c51c2278eb2909004`.

Dieses Dokument beschreibt den **tatsächlich vorgefundenen** Zustand. Es ist keine Zielarchitektur. Spätere Refactorings dürfen die hier aufgeführten beobachtbaren Verträge nicht versehentlich ändern.

## Authoritative Sources of Truth

- `Editor._tree` ist die maßgebliche Quelle für Blockbaum, Block-Properties, Seiten und Block-Aktionen.
- `Editor._selectedId` und `Editor._activePageId` halten Auswahl bzw. aktive Seite. Auswahlwechsel und Seitenwechsel sind derzeit keine eigenen History-Schritte.
- `DataSourceStore` und `RelationStore` sind die maßgeblichen Quellen für Datenquellen und Relationen. Beide erben von `VorlagenStore`; React liest deren Listen/Versionen, statt sie in einem zweiten UI-State zu duplizieren.
- Lit-Custom-Elements auf der Canvas sind Projektionen des Editor-Baums. `useLitElement` schreibt Tree-Properties in das Element; Änderungen kommen synchron als `ff-prop-change` zum Editor zurück.
- Block-Metadaten entstehen derzeit aus statischen Properties der Lit-Blockklassen. `BasicBlock.defineAndRegister()` definiert das Custom Element und schreibt daraus eine `BlockDefinition` in die globale Registry.
- Die Modul-Registry in `core/blocks/blockRegistry.ts` ist global und mutierbar. Doppelte `type`-Registrierungen werfen.

## History / Undo / Redo

`Historie` speichert Vollsnapshots mit:

- `tree`
- `selectedId`
- `activePageId`
- `datenquellen`
- `relationen`

Das Limit beträgt 50 vergangene Snapshots.

Ein Snapshot wird **vor** einer erfolgreichen mutierenden Editor-Operation erzeugt. Das betrifft aktuell insbesondere Hinzufügen, Entfernen, Property-Änderung, Block-Aktionen, Duplizieren, Verschieben, Raster-Verschieben, Raster-Resize, Einfügen in Raster, Leeren und das Ersetzen einer geladenen Maske. Datenquellen-/Relations-Stores melden ebenfalls unmittelbar **vor** ihrer Änderung an den Editor und erzeugen dadurch History.

Keinen eigenen Snapshot erzeugen reine Auswahländerungen und `setActivePage()`.

Transaktionen/Gesten existieren bereits. `Historie.begin()` schreibt nur beim Eintritt in die äußerste Transaktion einen Snapshot; `record()` ist während einer offenen Transaktion wirkungslos. `Editor.oeffneGeste()` verwendet diese Klammer.

Aktuelle Interaktionsgrenzen:

- Zahlenfeld: erste gültige Änderung öffnet eine Eingabesitzung, Blur schließt sie; mehrere Zwischenwerte sind ein Undo-Schritt.
- Block-Resize: die Geste öffnet beim ersten effektiven Pointer-Move und schließt bei Pointer-Up, Pointer-Cancel oder Window-Blur.
- Lit-interne Ziehgesten können `geste: 'beginn' | 'ende'` auf `ff-prop-change` setzen; `useLitElement` klammert alle Zwischenwerte.
- Tabellen-Spaltenbreite hält Pointer-Zwischenstände flüchtig und schreibt im Editor erst beim Loslassen genau eine neue Spaltenliste in den Baum; Escape/Cancel verwirft den Zug.
- HTML5-DnD für Blöcke verändert den Baum nicht während der Vorschau. `commitDrop()` führt am Drop eine einzige Move-/Add-Operation aus.

## Persistenz und Loader

### Browser-Autosave

- Local-Storage-Key: `aufbau_editor_mvp_v1`
- Debounce: 500 ms
- aktuelles `schemaVersion`: **8**
- gespeicherte Form: `{ schemaVersion, tree, selectedId, datenquellen, relationen, activePageId }`
- der aktuelle Loader akzeptiert nur exakt Schema 8. Ältere und neuere Schemas werden nicht konvertiert; unlesbare/inkompatible Stände werden nach Möglichkeit als Notfallkopie gesichert.

### Maskendatei

Aktuelles Format:

```json
{
  "art": "aufbau-editor-maske",
  "dateiVersion": 2,
  "schemaVersion": 8,
  "tree": {},
  "datenquellen": [],
  "relationen": []
}
```

Der aktuelle Loader akzeptiert nur `dateiVersion === 2` und Schema 8. Die mitgelieferte `masken/mustermaske.json` hat genau diese Form.

### Bibliotheksdatei

- `art`: `aufbau-editor-bibliothek`
- `dateiVersion`: 1
- Inhalt: `datenquellen` und `relationen`, kein Baum
- Laden ergänzt/aktualisiert nach ID und löscht vorhandene Einträge nicht. Beide Stores werden zusammen in einer Editor-Transaktion geändert.

### Reale historische Formate im Git-Verlauf

Der unmittelbare Vorgänger des aktuellen Loaders (`b05415f02fb49d959ff0367907ca7359d0cdf57c`) enthält echte Altpfade, die am 13.09.2026 bewusst entfernt wurden:

- fehlendes `schemaVersion` wurde als Schema **1** behandelt,
- Browserstände konnten neben `tree` auch ein flaches `blocks`-Format enthalten,
- Migrationen für ältere Baumstände bis Schema 7 existierten; u. a. Flow→Raster und Raster 24→48 Spalten,
- der damalige Maskendatei-Loader akzeptierte `dateiVersion >= 1` bis zur aktuellen Version 2,
- der tote separate Local-Storage-Key `aufbau_editor_verknuepfungen_v1` wurde noch aktiv entfernt.

Das sind historische Verträge im Repository-Verlauf, **keine** heute unterstützten Importformate. Ein späterer Loader-Umbau darf sie nicht versehentlich wieder teilweise und verlustbehaftet akzeptieren.

## Tabellen-/Spaltenlogik und SoftENGINE-Ordinalität

Die Spaltenliste ist ein geordnetes Array. Eine Spalte hat eine stabile `kennung` für Editor-Verweise, aber Laufzeit-/ERP-Zellparameter arbeiten mit dem **physischen Index** in der vollständigen Liste.

Wichtiger Vertrag:

- `versteckt` entfernt eine Spalte nur aus der Darstellung.
- `spaltenSicht()` liefert für sichtbare Spalten zusätzlich `plaetze`, also die Indizes in der vollständigen Liste.
- Datenzeilen und Formeln bleiben positionsbasiert zur vollständigen Spaltenliste.
- Aktionsparameter `erfassungszelle`, `aenderungszelle` und `loeschzelle` speichern im Baum die stabile Spaltenkennung; beim Export wird sie in den aktuellen physischen Spaltenindex übersetzt.
- Verschieben oder Löschen kann damit den Laufzeitindex ändern. Reines Ausblenden darf ihn **nicht** ändern.
- Spaltenbreiten werden ebenfalls vom sichtbaren Index zurück auf den vollen Platz abgebildet.

Dieser Vertrag ist mit `src/blocks/tabelle/spaltenVertrag.test.ts` explizit eingefroren.

## React-/Lit-Grenze

React besitzt Editor-Shell, Canvas-Host, Inspector und DnD. Lit besitzt die eigentlichen Block-Custom-Elements und deren Shadow DOM.

`BlockHost` erzeugt das Lit-Element imperativ über `document.createElement(def.tagName)`. React-Kinder von Containerblöcken werden per Portal **in das Custom Element** gesetzt; Lit rendert sein eigenes Shadow DOM. Der Event-Vertrag über `ff-prop-change` ist `bubbles: true` und `composed: true`.

Ein späteres Refactoring darf nicht gleichzeitig React und Lit dieselben Shadow-DOM-Knoten verwalten lassen.

## Exportpfad

`exportMask()` erzeugt zwei Artefakte:

1. vollständiges SoftENGINE-HTML inklusive eingebetteter Runtime,
2. `SEvariablen`-JSON für die ERP-Bestellung.

Der Export liest Registry-Metadaten, Baum, Datenquellen und Relationen. Er schreibt u. a.:

- `window.FF_DATA_SOURCES`
- `window.FF_RELATIONS`
- `data-ff-block-id` für zur Laufzeit adressierbare Blöcke
- serialisierte `data-ff-aktionen`

Die Runtime wird nicht nachgeladen. `laufzeitTeile.ts` liest `src/export/generated/laufzeit.json` und hängt Basis plus benötigte Blockteile in Abhängigkeitsreihenfolge zu einem Skript zusammen.

Bestehende Goldens:

- `src/export/referenz/referenz.html`
- `src/export/referenz/referenz.sevariablen.json`
- `src/export/referenzabzug.test.ts` vergleicht HTML-Struktur und ERP-Konfiguration.
- `src/export/runtimeBuendel.test.ts` baut die Runtime frisch und vergleicht die bereitgestellten Runtime-Dateien bytegenau.

## SoftENGINE-Bridge und globale Namen

Die Bridge erwartet/benutzt aktuell folgende SoftENGINE-Globals bzw. Host-Hooks:

- `SEDATA`
- `selib.Json.InitializeERPConnection`
- `InitialisiereSchnittstelle`
- `ResetDataBasis`
- `InitialisiereDatenBasis`
- `ReloadInputJSON`
- `basisHTML_REGISTER`
- `basisHTML_SetConsoleLog`
- `basisHTML_DoSetFocusToHTML`
- `enableCustomFind`
- `Erstellen`
- `initData`
- `ReloadData`

Zusätzlich definiert der Export `FF_DATA_SOURCES` und `FF_RELATIONS` global.

Der Runtime-Builder definiert `window.FF` und modulbezogene globale Namen nach dem Schema
`FF.<relativer-src-Pfad>`, wobei alle Nicht-Alphanumerika zu `$` werden, z. B. `src/core/blocks/BlockData.ts` → `FF.core$blocks$BlockData`.

Diese Namen sind Integrationsverträge. Umbenennen ist kein rein internes Refactoring.

## `tools/laufzeitBauen.mjs`: Sourcecode- und Pfadverträge

Der Builder ist derzeit bewusst sourcecode-sensitiv. Er setzt voraus:

- Runtime-Wurzeln sind **exakt** `src/blocks`, `src/core`, `src/softengine`.
- Nur `.ts` wird rekursiv eingesammelt; `.test.ts` wird ausgeschlossen. `.tsx` gehört nicht zur Runtime-Suche.
- Unter `src/blocks` bildet jeder direkte Unterordner einen Runtime-Teil; `base` und `shared` gehören ausnahmsweise zur Basis.
- Die Basis importiert `src/export/fehlerWache`.
- Ein Blockteil meldet seine Einstiegsmodule über Dateinamen, die auf `Block.ts` enden.
- Jeder Nicht-Basis-Teil muss mindestens einen Bausteintyp enthalten, den diese Regex erkennt:
  `static` + optional `override` + optional `readonly` + `blockType` + optional `: string` + `=` + Stringliteral.
- Laufzeitimporte werden per Regex gelesen. Erlaubt sind benannte `{ Name }`-Imports/Exports, reine Type-Imports und Side-Effect-Imports. Default-Imports bzw. gemischte Importformen über eine Teilgrenze sind nicht Teil des Vertrags und können den Builder absichtlich scheitern lassen.
- Relative Auflösung versucht: exakter Pfad, `.ts`, `/index.ts`, `.js`→`.ts`.
- Ein Runtime-Modul darf keine eigene Quelle außerhalb `blocks/core/softengine` importieren.
- Cross-Part-Abhängigkeiten werden allein aus diesen geparsten Imports abgeleitet.
- Ausgabedateien heißen `ff-basis.js`, `ff-<teil>.js`, `teile.json`, `laufzeit.json`.
- Default-Ziel ist `src/export/generated`; `--ziel` darf ein alternatives Ziel angeben.
- `laufzeit.json` wird erst am Ende atomar über `.tmp` umbenannt und enthält Manifest **und** die gebauten JS-Inhalte.

`npm test` und `npm run build` führen durch `pretest`/`prebuild` zuerst `npm run build:runtime` aus. Änderungen an Quellpfaden oder Syntax können deshalb Test und Build bereits vor TypeScript/Vitest brechen.

## Datenquellen und Relationen

- `DataSourceStore` und `RelationStore` sind eigenständige Stores, aber Teil jedes Editor-History-Snapshots.
- Datenquellen tragen stabile IDs, Namen, Quelle-Art, optional Tabellen-/Index-/Kopfsatzangaben und Feldlisten.
- Der Export bestellt nicht blind alle bekannten Felder, sondern sammelt tatsächlich verwendete Felder und notwendige Schlüssel.
- SoftENGINE-Laufzeitzeilen sind Objekte; Feldcodes werden über `getField()` gelesen. Für `pos_len`-Codes existiert ein Rückfall auf den Rohsatz (`SATZNEU`/`SATZ`/`RAW`).
- Relationen und Datenquellen werden gemeinsam mit Maskendateien gespeichert; Bibliotheksdateien können sie separat transportieren.

## Bestätigte Annahmen

- Tabellen-Spalten besitzen einen positionsabhängigen Laufzeit-/ERP-Vertrag; stabile Kennungen werden beim Export auf volle Array-Indizes aufgelöst.
- `laufzeitBauen.mjs` hängt an konkreten Ordnern, Dateinamensmustern, statischen `blockType`-Deklarationen, Importformen und Regexen.
- Der Editor-Baum sowie DataSource-/Relation-Stores sind die maßgeblichen fachlichen Zustände; Canvas-Lit-Elemente sind Projektionen.
- History-Snapshots entstehen vor Mutationen und Bibliotheksänderungen; Transaktionen/Gesten gruppieren mehrere Zwischenänderungen.
- Export und Runtime besitzen bereits Golden-/Reproduzierbarkeitstests.
- SoftENGINE-Bridge und Runtime verwenden mehrere globale Host-/`FF*`-Namen als echte Integrationsverträge.

## Widerlegte oder korrigierte Annahmen

- Gesten-Gruppierung ist **nicht erst in einer späteren Phase einzuführen**; sie existiert bereits für Zahlenbearbeitung, Block-Resize und Lit-Gesten. Spätere Arbeit muss dieses Verhalten erhalten oder bewusst vereinheitlichen.
- Der aktuelle Projektdatei-Vertrag ist **nicht** ein hypothetisches `format/version: 1`-Objekt. Heute gelten `art: "aufbau-editor-maske"`, `dateiVersion: 2`, `schemaVersion: 8`.
- Der aktuelle Loader migriert alte Projektstände **nicht** mehr. Alt-Migrationen wurden unmittelbar vor diesem Plan bewusst entfernt.
- Im aktuellen Inspector gibt es keinen eigenen Slider-Control; Zahlenwerte sind Textfelder mit Eingabesitzung. Der kontinuierliche Änderungsvertrag liegt derzeit bei Zahleneingabe und Pointer-Gesten.

## Gefährliche / noch nicht außerhalb des Repos verifizierte Bereiche

- Die echte SoftENGINE-Hostumgebung wurde in Phase 0 nicht gestartet. Host-Globals und Datenformen sind aus Bridge, Verträgen, Referenzexport und Tests verifiziert, nicht gegen eine reale ERP-Sitzung.
- `laufzeitBauen.mjs` parst TypeScript mit Regexen. Syntaktisch harmlose Refactorings können dadurch Build-Verhalten ändern.
- Block-Metadaten haben zwei gekoppelte Leser: `BasicBlock` liest statische Properties semantisch; der Runtime-Builder liest `blockType` zusätzlich textuell per Regex.
- Die globale Registry hat keinen Reset. Tests verlassen sich deshalb auf einmalige Side-Effect-Registrierung über `blocks/register`.
- React portaliert Containerkinder in Lit-Custom-Elements. Änderungen an Mount-Reihenfolge, Shadow-DOM oder Container-Slots sind besonders regressionsgefährdet.
- Browser-Persistenz und Maskendatei haben unterschiedliche Hüllen und unterschiedliche Fehler-/Backup-Pfade, obwohl beide denselben Baum prüfen.

## Verträge, die spätere Phasen nicht brechen dürfen

1. Ein sichtbares Nutzerkommando bleibt ein sinnvoller Undo-Schritt; bereits gruppierte Gesten dürfen nicht wieder Snapshot-Spam erzeugen.
2. Undo/Redo muss Baum **und** Datenquellen/Relationen konsistent wiederherstellen.
3. Hidden-Spalten behalten ihren physischen Index; Kennung→Index wird erst am Export-/Runtime-Rand aufgelöst.
4. Aktuelle Masken-, Browser- und Bibliotheksformate dürfen nicht stillschweigend anders interpretiert oder verlustbehaftet teilgeladen werden.
5. Golden-Export, `SEvariablen` und Runtime-Bündel bleiben reproduzierbar.
6. SoftENGINE-Hostnamen und exportierte `FF_DATA_SOURCES`/`FF_RELATIONS` sowie builder-erzeugte `FF.*`-Globals bleiben kompatibel, bis ein expliziter Migrationspfad existiert.
7. Blocktypen, Tags und Metadaten dürfen durch Registry-/Metadata-Umbauten weder verschwinden noch doppelt registriert werden.
8. React bleibt Host/Editor, Lit bleibt Block-Runtime; die bestehende Ereignis- und Portalgrenze muss bei Umbauten ausdrücklich nachgewiesen werden.
9. Datenquellen-/Relations-IDs und Block-/Spaltenkennungen bleiben stabile Referenzen; numerische Positionen werden nur dort verwendet, wo die aktuelle Laufzeit sie verlangt.
10. Änderungen an `src/blocks`-Pfaden, `*Block.ts`, `static blockType`, Importsyntax oder Runtime-Wurzeln sind Build-Vertragsänderungen und brauchen angepasste Builder-Tests/Manifestlogik statt bloßes Verschieben von Dateien.
