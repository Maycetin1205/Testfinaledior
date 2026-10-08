# Stand

08.10.2026. Ersetzt den Prüfbericht vom 23.09. (in Git: bis 47c5892). Die
Regeln stehen in `CLAUDE.md`, was über SoftEngine belegt ist in
`docs/softengine-wiki/kontrakte.md`. Hier steht nur, was entschieden,
gebaut und offen ist.

## Ziel

Der Nutzer und seine Kollegen bauen Masken für Kunden, exportieren, der
Kunde benutzt sie in SoftEngine. Der Editor darf rau sein, aber bedienbar;
die Maske muss glänzen. Der Code muss so sein, dass ein eigener
Programmierer ihn übernehmen kann: jede Datei ein Thema, geteilte Teile
benannt, ein Datenweg, Editor greift nicht in Bausteine.

Das Gerüst bleibt (07.10.): Deklaration je Eigenschaft, daraus Leiste,
Export und Laden; eine Basisklasse; Lit-Bausteine, die im Editor und in der
Maske dasselbe sind; Raster mit 48 Spalten; ein Store; SoftEngine nur in
`src/softengine/`. Maßstab fürs Können ist die Chef-Maske Empfang
(`docs/chef-maske/empfang`), nicht für Farben oder Maße.

## Entschieden

Je eine Zeile, mit Datum. Was in `CLAUDE.md` steht, steht hier nicht.

- 08.10. Erst der Editor, dann Feintuning. Meldungen und Tests kommen vor
  der Abnahme durch die Programmierer, nicht vorher.
- 08.10. Brücke Editor–Baustein und Datenweg werden vor neuen Bausteinen
  sauber gemacht, als eigene Chats. Hebt „keine Aufräum-Chats“ vom 07.10.
  auf: Sonst würde jeder neue Baustein gegen die alte Brücke gebaut.
- 08.10. Die Lückenliste aus dem Nachbau der Chef-Maske streicht der Nutzer.
- 08.10. Doppeltes Buchen während eines Schreiblaufs: kein Bau.
- 08.10. SE-Module (SETabelle, SEFeldListe) werden nicht genutzt, aber
  gelesen: kann ein Modul etwas, das wir brauchen, schicken wir dieselbe
  Nachricht. So wurde der Fokus gelöst (`SEDataList.js`, 06.10.).
- 08.10. Plätze im Kanban (Zimmer 1 bis 4 einer Spalte) bleiben.
- 07.10. Kein Neubau. Chip-Farbe folgt einem Feld: gestrichen.
- 07.10. Ankreuzfeld bleibt, bis der Nutzer zeigt, was ein Haken an
  SoftEngine schickt. Zweiter Schreibmodus für vorhandene Positionen: kein
  Bau, bis er in kontrakte.md steht. Quellenarten nach Inhalt: liegen lassen.
- 07.10. Erfassung: ein Kopf; je Zelle der Hauptzeile höchstens eine graue
  Spalte, so breit wie die Zelle, Name klein und grau vor dem Wert;
  erfasste und gebuchte Zeilen nur mit Wert zweizeilig. Tab und Enter:
  Hauptzeile, graue Zeile, erfassen. Pfeil runter in die graue Zelle, von
  dort erfassen und weiter; Pfeil hoch zurück. Escape: Liste zu, Zelle
  leeren, in leerer Zelle Position abbrechen.
- 01.10. Lesen, Schreiben und Satznummer stehen nicht zur Wahl; ein Feld
  namens „Satznummer“ ist die Satznummer zum Schreiben.
- 01.10. Bereich: innen das Raster der Seite, kein Innenabstand, wächst
  nicht mit.
- 01.10. Schrittfenster in der Mitte; erst „Übernehmen“ schreibt in den
  Baustein.
- 29.09. Schreiben ins ERP: je Zeile ein PUT_RELATION.
- 24.09. Fensterbreite und -höhe nie als Zahlen, nur ziehen am Rand.
- 24.09. Klarname wird nicht getippt, er kommt aus der Quelle.
- 24.09. Tabelle hat immer einen Kopf; Zeilen ohne Kopf sind der Baustein
  Datenliste. Blättern bleibt.
- 24.09. Spaltenwahl zur Laufzeit per Rechtsklick auf den Spaltenkopf, wie
  in SoftEngine. Im Editor am Spaltenkopf.
- 24.09. Ein Export-Knopf; die Rahmen-Nummer entscheidet. Keine
  Notfallkopie. Keine Suche in der Palette, keine Statuszeile.
- 24.09. Die Maske trägt ihre Quellen mit; die Bibliothek ist der Katalog.
- 24.09. Kein Inspector. Leiste am Baustein für wenige Wahlen, der Rest im
  Fenster „Einstellungen“.
- 23.09. Berechnung als Satz am Spaltenkopf, kein Vollbild (neu gebaut
  04.10.). Datenfenster nicht als Vollbild. Abgelehntes Schreiben bleibt
  unsichtbar.
- 23.09. ERPAPICALL als Nachricht nach dem Öffnen ist die Bauweise: schlank
  bestellen, Listen nachladen, aus ihnen schreiben.
- 23.09. Weg: Trennlinie, Karte als eigener Baustein (Teil des Kanban).

## Bedienung

Nach dem Vorbild der Empfangsmaske (24.09., 01.10.):

- Oben eine Zeile: Name der Maske, Rahmen-Nummer, Speichern, Laden,
  Rückgängig, Wiederholen, Exportieren, Daten; rechts die Seitenreiter.
- Links der dunkle Streifen mit den Bausteinen: anklicken oder ziehen.
- Mitte die Maske in echter Größe auf neutralem Grau.
- Daten als Fenster über der Maske, nie modal: Quellen, Relationen,
  Import, Bibliothek. Quellen als Liste, rechts Einstellungen und Felder.
- Am markierten Baustein eine Leiste direkt über der Oberkante: Symbol und
  Name, die Wahlen, rechts Löschen. Mehr steht im Fenster „Einstellungen“
  mit Gruppen (Quelle, Hilfsquelle, Anzeige, Suchfenster, Folgt der
  Auswahl, Aktionen). Jedes Fenster an der Leiste schließt beim Klick
  daneben.
- Ein Weg je Ding: Was auf der Fläche steht (Beschriftung, Titel,
  Spaltenkopf, Kartenzeile, Text), wird nur dort geändert, per Doppelklick.
- Markieren durch Klick, Verschieben durch Ziehen, Größe an allen vier
  Kanten am Raster, Löschen mit Entf.
- Feld binden: Klick auf die Stelle, die Feldliste der Quelle erscheint
  dort. Gebundene Stellen gepunktet unterstrichen.
- Aktionen: je Ereignis die Schritte als Zeilen; das Schrittfenster in der
  Mitte, Reiter GET Relation, PUT Relation, Werkzeug, Popup; erst die
  Herkunft, dann das Feld; „Übernehmen“ schreibt.
- Folgt der Auswahl: in der Leiste anklicken, dann auf den Geber klicken.
- Tabelle und Erfassung: Spaltenkopf tippen, Breite am Spaltenrand,
  Reihenfolge durch Ziehen, Plus am Ende; Klick auf einen Kopf öffnet die
  Spaltenleiste. Erfassung dazu je Spalte: Eingabe, Füllfeld, Nachschlagen,
  Unterzeile; Berechnung am Kopf der Ergebnisspalte als Satz.
- Kanban: Spaltentitel tippen, Plus fügt an, die erste Karte ist das
  Muster; Klick auf einen Spaltenkopf: Ton, Wert im ERP, Auffangspalte,
  Plätze.

## Bausteine

Gebaut: Bereich (nur Lage und Größe), Schaltfläche, Datum (Tageswahl),
Formularfeld (Text, Zahl, Auswahl, Nachschlagen, Ankreuzfeld unfertig),
Tabelle, Erfassung, Kanban, Popup, Text (Rollen, Farbe, Größe).

Fehlt gegenüber der Chef-Maske, Vermutung vom 23.09. und 07.10.; die echte
Liste entsteht beim Nachbau und wird vom Nutzer gestrichen: Bereich mit
Aussehen (Frei, Kasten, Kopfzeile), Text als Chip mit Ton, Bild (fest oder
gebunden, Technik vom Kanban-Avatar), Datenliste Beschriftung/Wert
(Kartenteil des Kanban herausgelöst), Zähler (Anzahl Zeilen einer Quelle),
Kopfzeile mit Marke, Suche, Tageswahl, Uhr, Hauptknopf; Knopfleiste;
Seitenleiste rechts; Navigation mit Ansichten.

Je Baustein, bevor er gebaut wird, drei Sätze im Chat: Das teilt er mit X.
Das ist neu. Das wird dadurch überflüssig. Der Nutzer sagt ja oder nein.
Nach dem Bau: der Nutzer sieht ihn in SoftEngine.

## Offen, in dieser Reihenfolge

1. Chef-Maske Empfang im Editor nachbauen, so weit es geht. Bild und
   Lückenliste; dabei die Bedienung in Aktion: Was hakt, kommt mit auf die
   Liste. Der Nutzer streicht.
2. Brücke Editor–Baustein, drei Chats: Der Baustein spricht, der Editor
   hört. (a) Ein Ereignis des Bausteins für Klicks auf bindbare Stellen,
   ersetzt die Klick-Suche in `useFieldBinding.tsx` und `BlockHost.tsx`.
   (b) Der Baustein meldet die Lage seiner Spalten, ersetzt das Nachmessen
   in `ColumnControls.tsx` und `LookupColumns.tsx` (14 der 23 Griffe ins
   Shadow-DOM). (c) Die Suchmuster in den Deklarationen fallen weg. Dazu
   `src/blocks/parts/` für Zelle, Spalte, Karte, Chip; Liste, Erfassung
   und Kanban nehmen nur von dort (heute holt die Erfassung elf Dinge
   direkt aus `blocks/list/`).
3. Datenweg, ein bis zwei Chats, auf einen Weg: „Quelle“ viermal von Hand
   deklariert (`blocks/*/properties.ts`); Listen-Eigenschaften siebenmal
   gleich gelesen (`core/data/extraSources.ts`); zwei Systeme „woher kommt
   ein Wert“ (`core/data/valueOrigin.ts`, `editor/actions/placeChoices.ts`);
   die Maske liest Eigenschaften per Namensregel statt aus der Deklaration
   (`runtime/source.ts`); Bindung zu Feldname an drei bis fünf Stellen.
   Dateien über 300 Zeilen werden dabei nach Thema geteilt.
4. Neue Bausteine nach der gestrichenen Liste, je einer ein Chat.

Einzelne Punkte, ohne Reihenfolge:

- Ankreuzfeld: der Nutzer klickt in SoftEngine ein Ankreuzfeld an und ab
  und schickt den Debug-Log mit dem Feldcode. Dann wird es fertig gebaut
  (Haken liegt heute in privatem Zustand, `blocks/formfield/FormField.ts`).
- Pfeil runter in der Erfassung öffnet keine Vorschlagsliste (von der KI
  am 07.10. festgelegt, Tippen oder F5). Der Nutzer prüft es in SoftEngine.
- Tag-Feld je Baustein: wie heute, nicht entschieden.
- Plätze im Kanban: Feintuning, wenn der Kanban dran ist.
- Datenquellen: eigenes Gespräch. Der Nutzer hat eine Analyse der
  SoftEngine-Vorlagen, die noch nicht im Projekt ist.
- Escape in der Spaltenwahl schließt das ganze Fenster
  (`blocks/list/columnPicker.ts`).
- Lieferung „per GET“ erzeugt eine Quelle, die die Maske ablehnt
  (`core/data/dataSources.ts`); berührt Relation 69, nur mit Ja des Nutzers.
- Eine Bindung, deren Feld die Quelle nicht mehr hat, ist im Export leer
  (`editor/canvas/useLitElement.ts`).
- Lücken der Erfassung gegenüber der Handmaske: Doppelklick auf
  `TABELLEPOS_DETAILS`, Löschen und Infosystem nur als BW_LINK-Schritt von
  Hand, kein Farbkennzeichen der Position, kein Artikelbild, keine
  Zeilenart.

Ideen, nicht freigegeben (Regel 3):

- Export direkt in den SoftEngine-Ordner (`…\HtmlTemplates\BELEGERFASSUNG\
  LAYOUTRAHMEN\<Nr>`), einmal gewählt, dann jeder Export dorthin. Macht den
  Test in SoftEngine zu zehn Sekunden.
- Probedaten aus einem SoftEngine-Debug-Log: der Editor zeigt die Maske mit
  den Daten, die SoftEngine wirklich geschickt hat.

## Gebaut, vom Nutzer gesehen, nicht in SoftEngine geprüft

- 07.10. Erfassung mit Unterzeile und Tastatur (4b408a0), vom Nutzer
  abgenommen.
- 06.10. Aufräumen (`claude/aufraeumen-06-10`): Dialog weg, 38 Exporte
  ohne Abnehmer, „fehlt“-Hinweis und Platzhaltersatz der Auswahl weg,
  Datenfenster im Store.
- 04.10. Berechnung als Satz am Spaltenkopf (`core/data/calculation.ts`,
  `editor/canvas/CalculationWindow.tsx`), Maskenschema 25.
- 01.10. Bedienfehler (Datenverlust, Nachschlagen, Kanban-Karte, Bereich,
  Quelle wechseln) und die Bedienung in 18 Commits (PR #1, 1d8437a).
- 29.09. Schreiben je Zeile ein PUT_RELATION, vom Nutzer bestätigt.
- 28.09. Kanban Schritt 1 bis 3; Übersetzer der Kundendatei
  (`editor/state/librarySchema.ts`), Masken ab Schema 20.

Sicherungen mit Quellen, die in `Desktop/bibliothek.json` fehlen:
`masken/bibliothek-wiederherstellung.json` (14.09., 15 Quellen),
`Desktop/aufbau-bibliothek-rettung-2026-09-15-0952.json` (22 Quellen).
Liegen lassen, bis der Nutzer sie über „Bibliothek laden“ einliest.
