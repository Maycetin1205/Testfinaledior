# Testfinaledior – Aufräumplan

Stand: 14. September 2026

Dieses Repository ist die Baustelle. `C:\Users\mu.aycetin\Desktop\finaleditor`
(GitHub: EditorAufbauV3) ist das Original und wird nicht verändert.

## 1. Ziel

Aus dem gewachsenen Haufen ein Gebilde, das ein Profi in fünf Minuten
versteht: jede Datei sagt in einer Zeile, wofür sie da ist, nichts ist doppelt,
und eine Sache steht an einem Ort. Erweiterbar, stabil, ohne Overengineering.

Kein Neubau. React bedient, Lit rendert (dieselben Elemente im Editor und in
der Maske), TypeScript trägt die Fachlogik. Undo bleibt Snapshot-Historie.
Die Vererbung bleibt: BasicBlock erbt von LitElement, jeder Baustein von
BasicBlock, Erfassung von Tabelle.

Nicht eingeführt werden: Redux-Ersatz, Event Sourcing, Command Bus, globaler
Event Bus, DI-Framework, Service Locator, Plugin- oder Target-System,
allgemeine Formularengine, Skriptsprache, zweite React-Fassung der Bausteine,
Test- oder Coverage-Quoten. Auch keine neuen Begriffe für Dinge, die es schon
gibt (Editor, Historie, Speichern, Registry, Export heißen weiter so).

## 2. Woran ein Profi den Haufen erkennt

1. Eine Sache, ein Ort. Wer „Spalte" sucht, findet eine Datei, nicht zwölf.
2. Dateien mit 200 bis 500 Zeilen, nicht dreißig mit achtzig. Eine Sache liest
   man am Stück.
3. Kein Sammelsack („shared", „utils", „helpers"). Dort landet, was niemand
   einordnen wollte.
4. Nichts doppelt: zwei Rechenwerke, zwei Bedienwege, alter und neuer Pfad
   nebeneinander.
5. Namen, die ein Mensch versteht: Erfassung, Zeile, Spalte, Schreiben, nicht
   Anschluss, Koerper, Lauf.
6. Wenig, aber sinnvolle Absicherung: ein Test, der beweist, dass der Export
   nach dem Umbau derselbe ist, ist Gold. Ein Test je Getter ist Ballast.
7. Kein Code „für später". Nur was heute eine Maske braucht.

Die Ordner erzählen die Geschichte schon richtig (Kern, Bausteine, Editor,
Export, SoftEngine-Brücke), die Vererbung stimmt, Abhängigkeiten sind sechs.
Der Haufen ist die Zersplitterung: 269 Quelldateien mit im Schnitt 115 Zeilen,
die Erfassung über 16 Dateien, die Tabelle über 22, der Zustand über 32,
`blocks/shared` mit 22.

## 3. Reihenfolge

Jeder Schritt läuft im Browser und exportiert, bevor der nächste beginnt.
Zusammenlegen, umbenennen, Doppeltes streichen. Kein Neuschreiben.

1. **Ein Rechenwerk** (erledigt 14.09.): Die Formel je Spalte ist in der
   Berechnung aufgegangen. Ein Kern (`core/data/berechnung.ts`), ein Bedienweg
   (Leiste am Baustein und Spaltenkopf, Fenster), kein Inspector-Abschnitt.
   Maskenformat 9; Schema 8 wird beim Laden angehoben.
2. **Tabelle und Erfassung zusammenziehen**: aus 38 Dateien etwa 8, je eine
   Datei pro Sache (Baustein, Spalten, Zeilen, Nachschlagen, Schreiben, Stil).
3. **`blocks/shared` auflösen**: jede Datei wandert zu dem Baustein, der sie
   braucht, oder in BasicBlock.
4. **Zustand**: 32 Dateien zu etwa 6 (Editor, Historie, Speichern, Quellen,
   Auswahl, Seiten).
5. **Editor-Oberfläche**: danach dasselbe.

Was dabei nicht kaputtgehen darf, steht in `PHASE-0-CONTRACTS.md`
(Dateiformat, Spaltenplätze, Undo, Export, SoftEngine-Namen).

## 4. Fachliche Festlegungen

### Tabelle und Erfassung

Zwei Bedeutungen, getrennt gehalten: **Zellherkunft** (getippt, aus Daten,
berechnet) und **Schreibstatus** (vorgemerkt, gesendet, bestätigt, gescheitert).
Ein abgeschickter Wert ist nicht bestätigt; erst die nächste Lieferung beweist
ihn. Ein unklarer Ausgang bleibt sichtbar unklar. Kein automatischer zweiter
Versuch nach unklarem Ausgang. Kursiv oder Farbe allein tragen keine Bedeutung.

Spaltenkennung, Platz in der vollen Liste und sichtbarer Platz sind drei
Dinge. Ausblenden ändert keine ERP-Zuordnung.

### Berechnung

Eine Produktgleichung über Spalten derselben Zeile, Felder des für diese
Zeile gewählten Datensatzes und feste Zahlen. Vier Größen im Anwendungsfall:
Tiere, Tage, Körpergewicht, Abgabemenge; dazu Behandlungsmenge und
Stammkörpergewicht aus dem Datensatz der Verabreichungsart. Drei Werte ergeben
den vierten. Kein Gleichungslöser, keine Hilfsspalten, keine Packungslogik.

Einheiten: kg, g, mg, l, ml, Anzahl, Tage. Masse nur in Masse, Volumen nur in
Volumen. Gerundet wird das Endergebnis in seiner Ausgabeeinheit. Fehlender
Wert, unbekannte Einheit, ungültige Zahl, Teilen durch null: strukturierter
Grund statt scheinbar gültiger Zahl. Gestrichene Spalte oder Quelle: die
Berechnung bleibt sichtbar unvollständig und rechnet nicht weiter.

Bedienung: Erfassung wählen, in der Leiste **Berechnungen** (oder im
Spaltenkopf **Berechnung…**), **+ Berechnung**, Größen den Spalten zuordnen,
Richtungen ankreuzen, Rundung je Größe, Vorschau mit Prüfwerten.

### Kanban

Eine Kartenvorlage je Board. Der dauernd sichtbare Musterkasten entfällt;
**Kartenmuster bearbeiten** öffnet einen Bearbeitungsmodus mit der echten
Karte. Laufzeitkarten nutzen dieselbe Vorlage. Der Typ `kanban-zimmer` bleibt;
sein sichtbarer Name wird erst mit dem Nutzer entschieden.

## 5. Offen, mit dem Nutzer zu klären

1. Feldlänge der Behandlungseinheit und Zeitbasis der Behandlungsmenge.
2. Zulässige Nachkommastellen für Tiere und Tage.
3. Was SoftEngine an Bestätigung für schreibende Aktionen wirklich liefert.
4. Sichtbarer Name der Kanban-Unterteilung.
