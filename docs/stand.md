# Stand

08.10.2026. Ersetzt den Prüfbericht vom 23.09. (in Git: bis 2f50216). Die
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
- 08.10. Der Rahmen ist der Baustein. Was eine feste Höhe hat (Feld,
  Datum, Schaltfläche), lässt sich nur in der Breite ziehen; alles andere
  füllt seinen Rahmen ganz. Kein Rahmen ist größer oder kleiner als sein
  Baustein.
- 08.10. Aussehen aus drei Drehknöpfen, einmal deklariert, an jedem
  Baustein dieselben: Ton (Neutral, Hinweis, Erfolg, Warnung, Fehler),
  Stärke (Fläche voll, Fläche leicht, nur Rand, nur Schrift), Größe
  (Klein, Normal, Groß). Nur die Werte aus `mask.css`, keine freien
  Farben.
- 08.10. Datenliste: Wahl „Auswahl“ je Liste: Eine Zeile (Klick, andere
  folgen, wie die Tabelle), Mehrere (Haken) oder Keine. Vorgabe Eine Zeile.
  Die gewählte Zeile steht in den Aktionen als Herkunft, etwa als
  Parameter einer Relation, genau wie bei der Tabelle.
- 08.10. Das Plus der Datenliste und das Auf- und Zuklappen eines Bereichs
  (07.10.): ganz raus. Im Editor ist der Platz reserviert, in der Maske
  rückte alles nach; Editor und Maske wären verschieden. Zeigen, wenn
  gebraucht, macht das Popup. In der Empfang-Maske sind „Neuer Kunde“ und
  „Neues Tier“ immer sichtbar.
- 08.10. Bild kommt als Baustein mit der Technik des Kanban-Avatars,
  sobald der Nutzer zeigt, was SoftEngine für ein Tierfoto liefert.
- 08.10. Gestrichen: Navigation mit Ansichten (andere Ansicht heißt
  andere Maske), Chips aus einer zweiten Quelle auf der Karte, „wartet
  12 min“, Suchfeld filtert das Board, Symbole in Masken, Behandlung je
  Tier in der Datenliste. Die Kartei rechts braucht keinen Baustein:
  Popup oder Bereich mit „Folgt der Auswahl“.
- 08.10. Brücke Editor–Baustein und Datenweg werden vor neuen Bausteinen
  sauber gemacht, als eigene Chats. Hebt „keine Aufräum-Chats“ vom 07.10.
  auf: Sonst würde jeder neue Baustein gegen die alte Brücke gebaut.
- 08.10. Die Lückenliste aus dem Nachbau der Chef-Maske streicht der Nutzer.
- 08.10. Doppeltes Buchen während eines Schreiblaufs: kein Bau.
- 08.10. SE-Module (SETabelle, SEFeldListe) werden nicht genutzt, aber
  gelesen: kann ein Modul etwas, das wir brauchen, schicken wir dieselbe
  Nachricht. So wurde der Fokus gelöst (`SEDataList.js`, 06.10.).
- 08.10. Plätze im Kanban (Zimmer 1 bis 4 einer Spalte) bleiben.
- 07.10. Kein Neubau. Gestrichen: Chip-Farbe folgt einem Feld, Text als
  Chip, der Zähler (Statuszeile „0 Termine offen · 0 im Wartezimmer“).
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

Gebaut: Bereich (Frei, Kasten oder Kopfzeile mit Titel und Ton; das Auf-
und Zuklappen vom 07.10. kommt wieder raus), Schaltfläche, Datum
(Tageswahl), Formularfeld (Text, Zahl, Datum tippbar, Auswahl,
Nachschlagen; Ankreuzfeld unfertig), Tabelle, Erfassung, Kanban (Plätze je
Spalte, mehrere Felder je Platz mit Trenner, Knopf je Spalte Aus, Weiter
oder Aktion, Spalte nach Uhrzeit mit Stundenlinien und Jetzt-Linie),
Datenliste (je Zeile Haken, Symbol, Titel, Unterzeile; Plus oben), Popup,
Text (Rollen, Farbe, Größe).

Chef-Maske Empfang nachgebaut am 07.10.: `masken/empfang/
Empfang.aufbau-maske.json`, 38 Bausteine, zwei Quellen (Terminplaner
IDBID0021, Adressstamm), im Editor über „Laden“. Im Browser mit
Beispieldaten geprüft, nicht in SoftEngine.

Lücken, am Nachbau gemessen, vom Nutzer am 08.10. gestrichen oder behalten.
Was bleibt:

- Alle Bausteine: die drei Drehknöpfe Ton, Stärke, Größe. Heute hat die
  Schaltfläche vier Aussehen ohne Ton und Größe, der Text Rolle, Farbe,
  Größe, der Bereich drei Formen; die fünf Töne nutzen nur Kanban und
  Bereich.
- Bild: eigener Baustein, Technik vom Kanban-Avatar (festes Bild in der
  Datei, oder gebunden an ein Feld). Offen: Hat der Tierstamm im ERP ein
  Foto-Feld, und was liefert SoftEngine dafür? Der Nutzer schaut nach.
- Formularfeld: Beschriftung klein und grau über dem Feld wie in der
  Chef-Maske; der Pflichtstern ist im Nachbau nicht zu sehen.
- Datenliste: die Wahl „Auswahl“ (Eine Zeile wie die Tabelle, Mehrere,
  Keine); heute kann sie nur Haken, die Fähigkeit `recordPick` der Tabelle
  fehlt ihr. Das Plus und die Fähigkeit `opener` (`core/block/opening.ts`,
  `runtime/opening.ts`, `bar/AreaPick.tsx`, `canvas/useAreaPickStart.ts`)
  raus, samt dem Nachrücken in der Maske; die Empfang-Maske zeigt beide
  Bereiche offen. Damit erledigt sich auch der Leerraum im Popup.

Nicht gebaut, weil nicht in den Kontrakten: Schreiben des Termins, neuer
Kunde (155/01), neues Tier (160/03), Zimmerwechsel per Ziehen, Rechnung
(712), Aktualisieren (3003).

Je Baustein, bevor er gebaut wird, drei Sätze im Chat: Das teilt er mit X.
Das ist neu. Das wird dadurch überflüssig. Der Nutzer sagt ja oder nein.
Nach dem Bau: der Nutzer sieht ihn in SoftEngine.

## Offen, in dieser Reihenfolge

1. Erledigt 08.10.: die Lückenliste ist gestrichen, siehe „Bausteine“.
2. Brücke Editor–Baustein, drei Chats: Der Baustein spricht, der Editor
   hört. (a) Erledigt 08.10.: Klicks auf bindbare Stellen und auf die Lupe
   meldet der Baustein (`ff-spot-click`); die Klick-Suche im Editor und das
   Suchmuster `.magnifier` sind weg. (b) Erledigt 08.10.: Die Lage der
   Spaltenköpfe meldet der Baustein nach jedem Zeichnen und bei jeder
   Größenänderung (`ff-heads-placed`, `blocks/base/headsReport.ts`);
   `ColumnControls.tsx` und `LookupColumns.tsx` messen nicht mehr im
   Shadow-DOM. (c) Die Suchmuster in den Deklarationen fallen weg
   (`entrySpots` ist nur noch ein Schalter). Die
   Teile vom 07.10. (`core/block/spotProperty.ts`, `useAreaPickStart.ts`,
   `bar/AreaPick.tsx`) gehen denselben Weg. Dazu
   `src/blocks/parts/` für Zelle, Spalte, Karte, Chip; Liste, Erfassung
   und Kanban nehmen nur von dort (heute holt die Erfassung elf Dinge
   direkt aus `blocks/list/`). (d) Der Rahmen ist der Baustein: Formularfeld,
   Datum und Schaltfläche haben eine feste Höhe (eine Eingabezeile) und
   keine Griffe oben und unten; Text, Bereich, Tabelle, Erfassung, Kanban,
   Datenliste und Bild füllen ihren Rahmen ganz; kleiner als die
   Mindestgröße der Deklaration lässt sich kein Rahmen ziehen. Heute
   füllen Text, Feld und Datum nicht, der blaue Rahmen ist größer als der
   Baustein. In der Grid-Deklaration fehlt nur „Höhe fest“, der Rest ist
   `fills` in der Basisklasse.
3. Datenweg, ein bis zwei Chats, auf einen Weg: „Quelle“ viermal von Hand
   deklariert (`blocks/*/properties.ts`); Listen-Eigenschaften siebenmal
   gleich gelesen (`core/data/extraSources.ts`); zwei Systeme „woher kommt
   ein Wert“ (`core/data/valueOrigin.ts`, `editor/actions/placeChoices.ts`);
   die Maske liest Eigenschaften per Namensregel statt aus der Deklaration
   (`runtime/source.ts`); Bindung zu Feldname an drei bis fünf Stellen.
   Dateien über 300 Zeilen werden dabei nach Thema geteilt.
4. Aussehen: die drei Drehknöpfe einmal deklarieren (ein Chat), dann
   Schaltfläche, Text, Bereich, Chip je ein kleiner Chat.
5. Dann die Liste unter „Bausteine“: Bild, Formularfeld, Datenliste; je
   einer ein Chat.

Einzelne Punkte, ohne Reihenfolge:

- Ankreuzfeld: der Nutzer klickt in SoftEngine ein Ankreuzfeld an und ab
  und schickt den Debug-Log mit dem Feldcode. Dann wird es fertig gebaut
  (Haken liegt heute in privatem Zustand, `blocks/formfield/FormField.ts`).
- Pfeil runter in der Erfassung öffnet keine Vorschlagsliste (von der KI
  am 07.10. festgelegt, Tippen oder F5). Der Nutzer prüft es in SoftEngine.
- Tag-Feld je Baustein: wie heute, nicht entschieden.
- Karte im Kanban (Nutzer 08.10.): die feste Anordnung der Chef-Maske
  bleibt, mit vier Regeln. Titel gewinnt, die Unterzeile gibt nach und
  wird zuerst abgeschnitten, bei Enge rutscht sie unter den Titel. Nichts
  schiebt etwas anderes: jeder Text endet in seiner Zeile mit „…“, die
  Zeit bleibt rechts, der Chip bleibt. Die Karte ist so hoch wie ihre
  gefüllten Zeilen (in der Maske heute so). Im Editor zeigt die Musterkarte
  ungebundene Stellen nur als Strich und nur, solange sie markiert ist;
  nicht markiert sieht sie aus wie beim Kunden (heute immer alle sieben).
  Die Größe der Karte kommt mit den Drehknöpfen (Klein, Normal, Groß).
  Plätze: Feintuning im selben Chat.
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

- 07.10. Chef-Maske Empfang nachgebaut (2b1180f); Bereich mit Aussehen
  (a49e82d); Karte mit mehreren Feldern je Platz und Knopf je Spalte
  (882ed53); Karte nach Uhrzeit (aa25848); Datenliste und Bereich auf und
  zu (a4af7b5); Feld: Datum tippen, Auswahl lesbar (b8238e1); Basisklasse
  mit einer Meldung (753d679).
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
