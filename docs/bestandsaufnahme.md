# Bestandsaufnahme

Durchsicht des ganzen Codes. Stand: Commit `3d7ff3c`, 23.09.2026.

Wie sie entstand: Der Code wurde nur gelesen, nichts wurde im Browser oder
in SoftEngine ausprobiert. Die schweren Befunde sind im Code nachgeprüft und
mit **[nachgeprüft]** markiert. Die übrigen stammen aus derselben Durchsicht
und sind nicht einzeln nachgeprüft. Typprüfung (`tsc`) und Linter (`eslint`)
laufen ohne Fehler.

Wenn ein Befund behoben ist, wird er im selben Commit hier gestrichen.

---

## 1. Kurz gesagt

Unter der Oberfläche steckt ein durchdachter Kern:

- Jeder Baustein beschreibt seine Eigenschaften einmal. Daraus entstehen
  Inspector, Export und das Laden.
- Der Editor zeigt dasselbe Element wie die Maske.
- Es gibt einen einzigen Zustand im Editor, mit Rückgängig.
- Die Typen sind streng, es gibt fast keine Schlupflöcher.
- SoftEngine wird nur an einer Stelle angesprochen.

Ein erfahrener Programmierer würde sehen: kein Schrott, aber an vielen Stellen
sichtbar KI. Das meiste davon stammt aus der großen Umbenennung
Deutsch → Englisch (Commit `4cd762f`, 528 Dateien). Sie wurde mechanisch
gemacht:

- Viele neue Namen bedeuten etwas anderes als das Gemeinte, einige davon
  stehen schon in gespeicherten Dateien.
- Fast alle erklärenden Kommentare wurden gelöscht statt übersetzt.
- Von 43 Testdateien sind 2 geblieben.
- An mehreren Stellen ging Verhalten kaputt: Code und Stil benutzen jetzt
  verschiedene Namen. Die zwei Tests sehen das nicht.

Der schwächste Teil ist die Anbindung an SoftEngine (Abschnitt 3):

- Fehler werden dort verschluckt.
- Die Form der Daten wird geraten.
- Antworten werden über die Zeit zugeordnet statt über eine Kennung.

---

## 2. Fehler, die man merkt

### In der Maske

1. **Aussehen seit der Umbenennung kaputt** [nachgeprüft]. Der Code setzt
   englische Klassennamen, der Stil erwartet noch die deutschen. Folgen:
   - Die Erfassung zeigt keine Statusfarben mehr: kein Punkt, kein roter
     Fehlerhintergrund, kein Pulsieren beim Schreiben
     (`src/blocks/capture/ledger.ts:49-57` gegen `captureStyle.ts:74-83`).
   - Zum Löschen vorgemerkte Zeilen sind nicht mehr durchgestrichen
     (`capture/body.ts:152` gegen `captureStyle.ts:70`, `:108`).
   - Tippbare Zellen ohne Zahl verlieren ihr Layout
     (`capture/body.ts:20` gegen `captureStyle.ts:118`, `:125`).
   - Zahlen stehen in Tabelle und Erfassung nicht mehr rechtsbündig
     (`behavior/tableBody.ts:178`, `capture/body.ts:108`, `capture/row.ts:72`
     gegen `behavior/tableStyle.ts:155`).
   - Versteckte Spalten sind im Editor nicht mehr abgeblendet
     (`tableBody.ts:177`, `:215`, `capture/row.ts:59` gegen `tableStyle.ts:210`).
   - Vorschläge in Formularfeld und Erfassung haben keinen Stil, außer dem
     markierten (`behavior/suggestionList.ts:137` gegen `:174-193`).
   - Eine senkrechte Trennlinie wird waagerecht gezeichnet
     (`divider/Divider.ts:49` gegen `dividerStyle.ts:21`).

   Ursache: 78 von 95 Klassennamen im Stil sind noch deutsch. Der
   Kanban-Chat hat denselben Fehler bei den Karten schon behoben (`3d7ff3c`).
2. **Die Kanban-Auffangspalte wirkt nie** [nachgeprüft].
   `src/blocks/kanban/places.ts:85` prüft auf den Text `'ja'`, gespeichert
   wird aber `true`/`false`. Karten ohne passende Spalte landen deshalb in der
   ersten Spalte. Das ist seit Schritt 2 so: Da wurden Ja/Nein-Texte zu echten
   Wahrheitswerten, die Stelle wurde übersehen.
3. **Escape schließt ein zweites Fenster nicht** [nachgeprüft].
   In `src/blocks/behavior/DialogFrame.ts:37-44` heißt ein Parameter
   `window` und verdeckt damit das echte Browserfenster. Der Tastenhorcher
   hängt deshalb am ersten Dialog statt an der Seite. Beispiel: das
   Nachschlage-Fenster aus einem Feld in einem offenen Popup.
4. **Der Text-Baustein bleibt leer, ohne Grund zu nennen,** wenn die Quelle
   fehlt oder keine Zeile passt (`src/blocks/text/Text.ts:73-74`). Das
   Formularfeld nennt in derselben Lage den Grund.
5. **Der Wert einer Formularfeld-Checkbox erreicht keine Aktion.** Der Haken
   liegt nur im Element (`src/blocks/formfield/FormField.ts:61`), Aktionen
   lesen `value`. Das war schon vor dem Umbau so.

### Im Editor

6. **Listen zeigen ihre Zusatzangabe nicht** [nachgeprüft]. Das Feld heißt in
   der Liste `badge`, geschrieben wird an rund 12 Stellen aber `key`. Beim
   Auswahlfeld ist es umgekehrt. Beispiele:
   - Die Notfallkopien zeigen nicht, wann sie entstanden
     (`src/editor/shell/BackupsWindow.tsx:49`).
   - Der Hinweis „kein Feld dieser Quelle“ erscheint nie
     (`inspector/controls/SelectControl.tsx:22`).
   - Das aktuelle Feld ist nicht markiert (`datacenter/FieldAdoptPicker.tsx:62-72`).

   Weitere Stellen: `KeyPairRows.tsx:43`, `SourceList.tsx:78`, `:85`, `:109`,
   `FieldPicker.tsx:68`, `:127`, `FieldBinding.tsx:56`, `:62`, `:172`,
   `parameter/bindings.tsx:20`, `:95`.
7. **Die Kundendatei kann verloren gehen** [Kette nachgeprüft, nicht ausprobiert]:
   - Das Datenquellen-Formular speichert eine Nachlade-Angabe mit leeren
     Feldern (`DataSourceForm.tsx:71-77`, `:258-265`).
   - Beim nächsten Laden gilt genau diese Form als ungültig
     (`src/core/data/fetchRelation.ts:59-62`), und damit die ganze Datei als
     „beschädigt“ (`editor/state/libraryFile.ts:41`).
   - Der Editor startet dann mit leerer Kundendatei (`maskStorage.ts:47-54`)
     und speichert diese nach einer halben Sekunde über die alte.
   - Eine Notfallkopie entsteht zwar, das Wiederherstellen-Fenster zeigt aber
     nur Kopien von Masken (`state/backupPick.ts:50-52`).
8. **Speicherfehler bleiben still** [nachgeprüft]:
   - Scheitert das Speichern der Kundendatei im Browser, wird der Fehler
     verschluckt (`state/maskStorage.ts:169-173`). Bei der Maske direkt
     darüber wird er gemeldet.
   - Scheitert das Schreiben der gewählten Datei auf der Platte, hört das
     Speichern dorthin ohne Meldung auf (`state/fileOnDisk.ts:42-48`).
   - Notfallkopien werden nie gelöscht und füllen den Browserspeicher.
9. **Alte Masken mit Berechnung lassen sich nicht öffnen**
   [im Code nachgeprüft, nicht mit echter Datei ausprobiert]. Die Umwandlung
   alter Masken (Schema 15, Stand `7ebe69c`) benennt die Schlüssel einer
   Berechnung um, aber nicht ihre deutschen Werte (`spalte`, `zahl`,
   `datenfeld`, `auf`, `ab`, `anzahl`). Siehe `editor/state/maskSchema.ts:254-258`
   und `core/data/calculation.ts:401-420`. Das Laden lehnt die Maske dann ab.
10. **Ein nicht gefundenes Feld sieht im Editor aus wie „nicht gebunden“**
    statt wie „Feld fehlt“ (`editor/canvas/useLitElement.ts:106-116`).
    Export und Store behalten die Bindung.
11. **Aktionen ändern sich still:**
    - Passt die Zahl der Parameter nicht mehr zur Vorlage, werden alle
      Belegungen ohne Meldung auf die Vorgabe gesetzt
      (`datacenter/stepDraft.ts:58-68`).
    - Die Umwandlung auf Schema 18 setzt `ZIMMER` stumm auf leer
      (`maskSchema.ts:446-472`).
12. **Die Ladeprüfung vergleicht keine Parameterwerte mehr** [nachgeprüft].
    Aus `'wert' in roh` wurde bei der Umbenennung `'value' in raw`
    (`core/data/actions.ts:266`). Die Bedingung ist jetzt immer wahr, jeder
    Wert fällt aus dem Vergleich. Daten gehen dabei nicht verloren.

---

## 3. SoftEngine-Anbindung (`src/softengine/`)

Gut gemacht ist:

- Es läuft immer nur eine Anfrage, so wie SoftEngine es braucht.
- Veraltete Antworten werden verworfen.
- Neue Daten warten, solange der Bediener tippt.
- Viele Fehler haben eine genaue deutsche Meldung.
- `docs/softengine-wiki/kontrakte.md` ist ungewöhnlich gute Doku.

Die Befunde:

1. **Fehler werden verschluckt** [nachgeprüft]:
   - `bridge.ts:12-19` (`hostCall`) wirft jede Ausnahme weg und gibt
     `false` zurück. Wirft SoftEngine bei START_TOOL oder BW_LINK, heißt es
     „keine Verbindung zu SoftEngine“, und das stimmt dann nicht.
   - `bridge.ts:91-98` verschluckt Fehler beim Verteilen neuer Daten.
     Scheitert ein Baustein, bekommen die folgenden die Daten nicht.
   - `src/export/errorGuard.ts` fängt nur abgelehnte Promises, keine
     gewöhnlichen Fehler.
   - Die rote Fehlerleiste (`report.ts`) zeigt immer nur eine Meldung und
     überschreibt die vorige. Nach 8 Sekunden verschwindet sie, in die
     Konsole schreibt sie nichts.

   In SoftEngine gibt es keine Konsole. Ein Fehler sieht dort aus wie eine
   leere Maske.
2. **Fehlende Parameter gehen als leerer Text raus, auch beim Schreiben.**
   `relations.ts:429-476` gibt in sechs Fällen `''` zurück: Quelle, Zeile,
   Feld oder Variable fehlen, oder es ist keine Zeile gewählt.
   `blocks/behavior/events.ts:213-214` schickt die Relation trotzdem los.
   Eine PUT_RELATION kann so einen leeren Wert ins ERP schreiben.
3. **Die Form der Daten wird geraten.** Belegt sind nur die Namen in
   `kontrakte.md`. Im Code stehen viel mehr Schreibweisen, zum Beispiel:
   - acht Namen für eine Zeilenliste (`data.ts:187-190`);
   - sechs für den Satz (`data.ts:133`);
   - 13 Kandidaten für ein Ergebnis, darunter der feste Feldcode `'0_10'`
     (`relations.ts:50-53`).

   Am Ende nimmt `firstScalar` (`relations.ts:86-89`) den ersten einfachen
   Wert irgendwo in der Antwort. Jede Schreibweise zu viel kann das Falsche
   treffen und still einen falschen Wert liefern.
4. **Antworten werden über die Zeit zugeordnet, nicht über eine Kennung**
   (`relations.ts:209-314`):
   - Die nächste Nachricht, die wie ein Ergebnis aussieht, gilt als Antwort.
     Rückruf und Nachfrage alle 100 ms laufen dabei gegeneinander.
   - Nach 20 Sekunden Warten wird die nächste Antwort als „verspätete“
     verworfen. Kommt die verspätete nie, trifft das die Antwort auf die
     nächste Anfrage.

   Vielleicht bietet SoftEngine keine Kennung an. Erklärt ist das im Code
   nicht, getestet auch nicht.
5. **Ungeprüfte Grenze.** `bridge.ts:5-9`: `seWindow(): any`, 22 Aufrufe in
   5 Dateien. Was von SoftEngine kommt, wird nirgends geprüft.
6. **Nach jedem Schreiben ruft der Code `ReloadInputJSON` auf**
   (`bridge.ts:117-125`, `blocks/behavior/events.ts:321`). Laut
   `kontrakte.md` §7 gibt es diese Funktion in SoftEngine gar nicht.
7. **Die 12 Parameterplätze der Relation 69 stehen fest im Code**
   (`relationLoader.ts:25-49`). Die Nummer der Relation ist Daten, ihre Form
   nicht. Eine andere Relation mit anderer Form liefe still falsch.
8. **Nachrichten von jedem Absender werden angenommen,** wenn
   `basisHTML_REGISTER` fehlt (`bridge.ts:217-221`).
9. **Deutsche Namen stehen noch im Code:** `Objekt`, `isObjekt` (59-mal),
   `afterRunBeenden`, `dataAreNeu`, `direkt`, `geberId`, `MAX_POSITIONEN`
   und weitere.
10. **Die Tests dieser Teile gibt es nicht mehr.** Die Testdateien für
    `bridge`, `data`, `relations`, `relationLader`, `wertLader` und
    `befehle` wurden bei der Umbenennung gelöscht.

---

## 4. Was ein Programmierer sofort sieht

1. **Falsche Übersetzungen, einige davon im Dateiformat.** Wort für Wort
   übersetzt:

   | Im Code | Gemeint |
   |---|---|
   | `icon` | Zeichenzahl eines Feldes (`zeichen`) |
   | `spots` | Nachkommastellen |
   | `on` / `off` | runden auf / ab |
   | `from` | aus (abgeschaltet) |
   | `sizes` | Masse |
   | `kind` | Kind im Baum |
   | `next` | neu |
   | `'null'` | Teilen durch Null |
   | `toRender` | nach dem Zeichnen |
   | `leftOf` | Verknüpfungen von |
   | `numerator` | Zähler im Sinn von „Anzahl“ |

   Dazu kommen Namen nach deutschem Satzbau: `rowsTheSource`, `pagesTheMask`,
   `TITLE_OF_HAND`. Weil `icon`, `spots`, `on`/`off` und `from` schon in
   gespeicherten Masken und Kundendateien stehen, braucht eine Korrektur eine
   Umwandlung beim Laden.
2. **Die Kommentare sind weg.** Vor der Umbenennung hatte der Code rund
   2.000 Kommentarzeilen, heute sind es rund 230. Leere Zeilen in
   Typdefinitionen zeigen, wo sie standen. Genau die schwierigsten Stellen
   haben keinen Kommentar mehr: der Zuordnungs-Mechanismus in
   `relations.ts`, die festen Byte-Abstände in `core/data/dtkImport.ts`, die
   Klick-Zeitgeber im Editor.
3. **Deutsch steckt noch im Code:**
   - Klassennamen und Variablen im Stil;
   - Ereignisnamen (`ff-vormerkungen`, `ff-zeile-aktiviert`,
     `ff-dialog-groesse`, `ff-datencenter-oeffnen`);
   - gemischte Wertelisten (`'beginn' | 'runs' | 'end'`);
   - Bezeichner (`tun`, `klasse`, `writeBlockReferenzenTo`, `topologieProblems`);
   - Farbnamen in `tailwind.config.js`;
   - Kommentare in Großbuchstaben und mit Datum in den Stildateien und
     `src/design/editor.css`.

   Umgekehrt stehen Texte, die der Bediener sieht, auf Englisch da:
   `'missing'` in `PickerControl.tsx:44`, `'empty'` in
   `parameter/bindings.tsx:56`, `'from'` in der Vorschau.
4. **Dateien heißen anders als ihr Inhalt.** 19 Editor-Dateien, zum Beispiel:

   | Datei | Inhalt |
   |---|---|
   | `Badge.tsx` | `Mark` |
   | `Switch.tsx` | `Flag` |
   | `Select.tsx` | `Choice` |
   | `PickerDialog.tsx` | `SelectionWindow` |
   | `CanvasNode.tsx` | `NodeList` |
   | `FieldBinding.tsx` | `useFieldBinding` |
5. **`src/blocks/behavior/` ist ein Sammelordner unter anderem Namen.** Er
   hat 32 Dateien mit fast der Hälfte des Bausteincodes (4.816 von 10.430
   Zeilen). Darin liegt alles Mögliche:
   - ein Interpreter für Aktionsketten;
   - eine Ladesteuerung für Daten;
   - globale Zustände;
   - ein eigenes Element;
   - Browserspeicher, Stil, Datums- und Zahlenlesen.

   Etwa 16 Dateien davon sind in Wahrheit ein Bauteil, die Liste von Tabelle
   und Erfassung. `behavior/lookup.ts:22` bindet sogar den Baustein Tabelle
   ein, damit zeigt die Abhängigkeit falsch herum.
6. **Die Erfassung steckt in einer Klasse von rund 1.000 Zeilen**
   (`capture/ledger.ts:196-1206`). Sie hat 19 veränderliche Felder und fünf
   Abschnitte, und sie mischt Zustand mit Tastatur und DOM. Das
   „Einfügen an der Korrekturstelle oder anhängen“ steht dreimal darin
   (`:674-683`, `:713-723`, `:764-782`). Fachlich ist sie sorgfältig. Teilen
   ließe sie sich entlang ihrer eigenen Abschnitte, neu schreiben muss man
   sie nicht.
7. **Eigenschaften werden auf zwei Wegen gelesen.** Der Editor setzt die
   deklarierten Eigenschaften. Der Maskencode liest dagegen oft das rohe
   Attribut und baut dessen Namen selbst (`prop.toLowerCase()`), zum
   Beispiel in `behavior/source.ts`, `kanban/places.ts`, `kanban/board.ts`
   und `text/Text.ts`. Daher kommt der Fehler mit der Auffangspalte
   (Abschnitt 2, Punkt 2).
8. **Dasselbe steht mehrfach da, und die Kopien widersprechen sich schon.**
   - „Welcher Baustein nutzt welche Quelle“ wird an vier Stellen berechnet
     (`export/usedSources.ts`, `core/block/sourcesInReach.ts`,
     `core/block/treeQuery.ts`). Die Liste „benutzt von“ im Datencenter
     übersieht deshalb Quellen, die nur eine Berechnung nutzt; der Export
     nimmt sie mit.
   - Fenstergröße 520×380 und ihre Grenzen stehen an fünf Stellen:
     `capture/properties.ts`, `formfield/properties.ts`,
     `editor/inspector/LookupSection.tsx`, `editor/canvas/PopupPage.tsx`,
     `behavior/DialogFrame.ts`.
   - Datumslesen gibt es fünfmal, jedes Mal mit anderen erlaubten Formen.
   - Außerdem doppelt oder mehrfach:
     - Zahlenlesen: zweimal;
     - Baum-Durchläufe: fünf fast gleiche;
     - `PickerDialog` und `Popover`: fast gleich;
     - globale Tastenhorcher: sieben Stück;
     - Tabelle und Erfassung: reichen dieselben fünf Lebenszyklus-Aufrufe
       von Hand weiter.
9. **Toter Code:**
   - Drei Eigenschaftsarten werden nie benutzt: `longTextProperty`,
     `relationProperty`, `pageProperty`. Damit sind alle Zweige tot, die sie
     in Export, Baum, Seiten, Inspector und Duplizieren behandeln.
   - Weitere unbenutzte Stellen:
     - `valuesOf`, `calculationAsText`, `unitName`;
     - Rücksetz-Haken der gelöschten Tests;
     - `templateMarkFor`, `rowFilled`, `FileOnDisk.name`;
     - die Größengriffe im Fließlayout;
     - der Zweig `list` in `FieldBinding.tsx`.
   - Rund 23 Exporte benutzt nur ihre eigene Datei.
10. **Der Bau der Maskenlaufzeit ist aufwendig** (`tools/buildRuntime.mjs`):
    - Vor jedem `dev`, `build` und `test` laufen 65 einzelne Vite-Bauten.
    - Die Importe werden per Suchmuster gefunden.
    - Zur Laufzeit verbinden sich die Teile über ein globales `window.FF`.
    - `parts.json` und die 65 Einzeldateien werden geschrieben, aber nie
      gelesen.

    Ein Ladefehler in diesem System hat schon einmal jede Maske weiß gemacht
    (`8215b2d`). Außerdem sieht der Export Bausteinänderungen erst nach dem
    nächsten Neubau, der Editor sofort. Die Alternative wäre ein einziges
    Paket von rund 244 kB.
11. **`editor/state/maskSchema.ts`:** Die Umwandlung alter Masken hat 506
    Zeilen, rund 20 Umbenennungstabellen und vier Stufen statt eines Schritts
    je Version. Eine Datei in Version 9 geht Englisch → Deutsch → Englisch.
12. **Der Editor greift in die Innereien der Bausteine:**
    - `canvas/LookupColumns.tsx:54` liest die Stilklasse `.kopf` aus der
      Tabelle.
    - Ein Beobachter auf dem ganzen Dokument entscheidet, ob ein Fenster im
      Store offen ist.
    - Geschwisterteile sprechen über DOM-Ereignisse miteinander.
13. **Fenster haben verschiedene Besitzer:** manche den Store, manche
    React-Zustand, das Datencenter ein Dokument-Ereignis.
14. **Zu große Teile:**
    - `DataSourceForm.tsx` hat 17 Zustände in einer Komponente.
    - `useFieldBinding` hat 11 Eingaben und gibt Oberfläche zurück.
    - `EditorStore.ts` (541 Zeilen) mischt Baum, Verlauf, Ansicht,
      Speichern und Meldungen.
15. **Schlupflöcher im Typsystem** (wenige):
    - `seWindow(): any`.
    - `useLitElement.ts:97` setzt per `as unknown as` jeden gespeicherten
      Schlüssel auf das Element, nicht nur die deklarierten.
    - `updateProperty` (`EditorStore.ts:347-359`) prüft Name und Art des
      Werts nicht gegen die Deklaration.
    - `Record<string, unknown>` steht statt eines Typs in
      `core/block/listBinding.ts` (13-mal), `FieldBinding.tsx` und
      `lookupWindowState.ts`.
16. **Veränderliche Zustände auf Modulebene:** rund 20 Stück in
    `src/softengine/`, dazu mehrere in `behavior/` (zum Beispiel
    `selection.ts:20-27`, `chosenDay.ts`, `lookup.ts:232-234`).
17. **Schutzcode für Fälle, die im Browser nie eintreten**
    (`behavior/suggestionList.ts:49-133`). Das ist typisch für generierten
    Code.
18. **Feldcodes statt Klartext** stehen an einigen Stellen:
    `FieldBinding.tsx:306-308`, `LookupColumns.tsx:264`,
    `CalculationDialog.tsx:91`, `:159`. Außerdem steht `'START_TOOL'` in
    `wording.ts:93`.
19. **Fähigkeiten mit nur einem Nutzer.** Fünf Fähigkeiten (`capture`,
    `change`, `delete`, `holdsSent`, `compute`) hat nur die Erfassung. Gefunden
    werden sie per `member in el`, ohne `implements`. Eine Umbenennung
    übersteht die Typprüfung und scheitert erst zur Laufzeit.
20. **Kleinkram:**
    - `index.html` verweist auf ein fehlendes `favicon.svg`.
    - `lint` und `check` prüfen doppelt, jeweils etwas anderes.
    - `buildRuntime.mjs` wird weder typgeprüft noch gelintet.

---

## 5. Die Tests

Es gibt 2 Dateien mit 4 Fällen. Vor der Umbenennung waren es 43 Dateien.

- `src/export/referenceSnapshot.test.ts` exportiert die Referenzmaske und
  vergleicht sie byte-gleich. Dabei wird das Laufzeitskript herausgeschnitten.
- `src/export/runtimeStarts.test.ts` öffnet die Maske im Browser und prüft
  nach 800 ms, ob ein Fehler kam und ob jeder Baustein etwas gezeichnet hat.
  SoftEngine wird dabei nicht nachgestellt. Die rote Fehlerleiste der Maske
  sieht der Test nicht.

Keiner der Fehler aus Abschnitt 2 lässt die Tests rot werden.

---

## 6. Falsches in der Doku

- `CLAUDE.md`: Der Schalter heißt nicht `REFERENZ_ERNEUERN=1`, der Test liest
  `REFERENCE_REFRESH=1`.
- `CLAUDE.md`: Der Ordner heißt `src/export/reference/`, nicht `referenz/`.
- `CLAUDE.md`: `npm run check` schreibt nichts nach `src/export/generated/`.
  Das tut nur `build:runtime`, das vor `dev`, `build` und `test` läuft.
- `docs/softengine-wiki/kontrakte.md`: 12 der 17 Verweise „Gilt in:“ nennen
  Dateien von vor der Umbenennung.
- `src/core/block/newBlock.ts:10`: Die Fehlermeldung nennt die Funktion
  `meldeBausteinArt`, die es nicht gibt.
- `masken/mustermaske.json`: altes deutsches Format (Schema 10), kein Code
  und kein Test benutzt die Datei.
- `docs/chef-maske/`: echte Masken der Installation, mit einem Praxisnamen in
  einem Seitentitel. Wer das Repo weitergibt, sollte das wissen.

---

## 7. Zweige

- Die Kanban-Arbeit aus dem anderen Chat liegt schon auf `master`
  (`6b1aeb3`, `3d7ff3c`).
- `claude/brave-bardeen-w2i41u` (1 Commit) und `claude/modest-pascal-xrsgxm`
  (4 Commits zu Berechnungen) stammen vom 14.09., also von vor dem Umbau. Sie
  tragen noch deutsche Dateinamen und lassen sich nicht direkt übernehmen.
- `phase0-freeze-contracts` enthält nichts, was nicht schon auf `master` ist.

---

## 8. Vorschlag für die Reihenfolge

1. Sichtbare Fehler aus Abschnitt 2: klein und in der Maske gut zu prüfen.
2. Datenverlust: Kundendatei, stilles Speichern, alte Masken mit Berechnung.
3. SoftEngine: Fehler sichtbar machen, Schreiben mit fehlenden Parametern
   stoppen. Das geht nur zusammen mit Tests in SoftEngine.
4. Aufräumen:
   - Namen richtigstellen, mit Umwandlung für gespeicherte Dateien;
   - `behavior/` ordnen, Erfassung teilen;
   - Doppeltes und toten Code weg;
   - Laufzeitbau vereinfachen.
5. `CLAUDE.md` gemeinsam neu fassen.
