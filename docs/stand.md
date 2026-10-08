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
  Datum, Schaltfläche), lässt sich nur in der Breite ziehen; Text ist so
  hoch wie sein Text (Rolle und Größe geben die Zeilenhöhe, die Breite den
  Umbruch), auch nur in der Breite ziehbar; alles andere füllt seinen
  Rahmen ganz. Kein Rahmen ist größer oder kleiner als sein Baustein.
- 08.10. Aussehen aus drei Wahlen, einmal deklariert, an jedem Baustein
  dieselben: Farbe (Petrol, Neutral, Blau, Grün, Ocker, Rot), Art (Fläche
  voll, Fläche leicht, nur Rand, nur Schrift), Größe (Klein, Normal,
  Groß). Nur die Werte aus `mask.css`, keine freien Farben. Petrol ist der
  Akzent der Maske, als sechste Farbe vom Nutzer gewählt. Beim Text macht
  Fläche voll oder leicht einen Chip, Nur Schrift ist der normale Text; beim
  Bereich ergänzen Farbe und Art die Formen Frei, Kasten, Kopfzeile.
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
- 07.10. Kein Neubau. Gestrichen: Chip-Farbe folgt einem Feld, der Zähler
  (Statuszeile „0 Termine offen · 0 im Wartezimmer“).
- 08.10. Ankreuzfeld: ein Haken schreibt `J`, kein Haken `N` in das
  gebundene Feld (Debug-Log vom 08.10., kontrakte.md §3); die beiden
  Werte sind je Feld Daten, nicht Code, und lassen sich in den
  Einstellungen des Feldes ändern (etwa `1`/`0`). Der Haken löst „Wert
  geändert“ aus und steht in den Aktionen als Herkunft.
- 08.10. Die Beschriftung eines Formularfelds steht im leeren Feld selbst,
  als Platzhalter (Text, Zahl, Datum, Auswahl, Nachschlagen), beim
  Ankreuzfeld neben dem Haken. Nie über dem Feld, nie daneben. Vom Nutzer
  mehrfach gesagt; ein Chat, der sie über das Feld setzte, wurde
  abgebrochen und verworfen.
- 07.10. Zweiter Schreibmodus für vorhandene Positionen: kein Bau, bis er
  in kontrakte.md steht. Quellenarten nach Inhalt: liegen lassen.
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
  Muster; Klick auf einen Spaltenkopf: Farbe, Wert im ERP, Auffangspalte,
  Plätze.

## Bausteine

Gebaut: Bereich (Form Frei, Kasten oder Kopfzeile mit Titel; Farbe, Art),
Schaltfläche (Farbe, Art, Größe), Datum (Tageswahl), Formularfeld (Text,
Zahl, Datum tippbar, Auswahl, Nachschlagen, Ankreuzfeld mit J/N), Tabelle,
Erfassung, Kanban (Plätze je Spalte, mehrere Felder je Platz mit Trenner,
Knopf je Spalte Aus, Weiter oder Aktion, Spalte nach Uhrzeit mit
Stundenlinien und Jetzt-Linie), Datenliste (Auswahl Eine Zeile, Mehrere
oder Keine; je Zeile Symbol, Titel, Unterzeile), Popup, Text (Rolle, Farbe,
Art, Größe; Fläche oder Rand macht ihn zum Chip).

Chef-Maske Empfang nachgebaut am 07.10.: `masken/empfang/
Empfang.aufbau-maske.json`, 38 Bausteine, zwei Quellen (Terminplaner
IDBID0021, Adressstamm), im Editor über „Laden“. Im Browser mit
Beispieldaten geprüft, nicht in SoftEngine.

Lücken, am Nachbau gemessen, vom Nutzer am 08.10. gestrichen oder behalten.
Was bleibt:

- Alle Bausteine: die drei Wahlen fürs Aussehen. Schaltfläche, Text und
  Bereich haben sie (der Text seine eigene Größe, der Bereich keine);
  Kanban die Farbe je Spalte, am Chip Farbe und Art.
- Bild: eigener Baustein, Technik vom Kanban-Avatar (`blocks/parts/card.ts`;
  festes Bild in der Datei, oder gebunden an ein Feld). Offen: Hat der Tierstamm im ERP ein
  Foto-Feld, und was liefert SoftEngine dafür? Der Nutzer schaut nach.
- Formularfeld: Die Beschriftung steht im Feld und bleibt dort. „Pflicht“
  ist als Wahl da und in der Maske nicht zu sehen; wenn je, dann im Feld,
  nie darüber.

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
   Shadow-DOM. (c) Erledigt 08.10.: Kein Suchmuster mehr in den
   Deklarationen (`entryHeads` ist ein Schalter). `src/blocks/parts/` hält
   Zelle, Spalte, Karte (Stellen und Avatar) und Chip; Liste, Erfassung
   und Kanban nehmen sie nur von dort, die Erfassung die Liste selbst nur
   über `blocks/list/index.ts`.
   (d) Erledigt 08.10.: Der Rahmen ist der Baustein. Formularfeld, Datum
   und Schaltfläche stehen zwei Rasterzeilen hoch (`heightFixed` in der
   Grid-Deklaration), nur links und rechts ein Griff; ältere Masken
   kommen beim Laden auf diese Höhe (Maskenschema 27), das zweizeilige
   Textfeld ist weg. Text füllt seinen Rahmen wie Bereich, Tabelle,
   Erfassung, Kanban und Datenliste; ein Text in einer einzigen
   Rasterzeile bleibt ganz und ragt darum unten heraus. Kein Griff zieht
   unter die Mindestgröße, ein Bereich nicht schmaler oder niedriger als
   sein Inhalt, auch nicht per Doppelklick auf den Griff.
   (e) Erledigt 08.10.: Text ist so hoch wie sein Text. Der Text meldet
   die Höhe seines Inhalts (`ff-height-reported`,
   `blocks/base/heightReport.ts`), der Editor setzt die Rasterzeilen
   (`heightFromContent` in der Grid-Deklaration, `fitNodeHeight` im Store,
   ohne eigenen Schritt im Rückgängig); Griffe nur links und rechts. Im
   Editor geprüft: eine Zeile 2 Rasterzeilen, sechs Zeilen 8, breiter
   gezogen 3, Rückgängig zieht die Höhe mit.
3. Datenweg, zwei Chats, auf einen Weg. Teil 1 erledigt 08.10.: Ein Weg
   für „woher kommt ein Wert“. `core/data/valueOrigin.ts` nennt jede
   Herkunft und liest Parameter und Feldpaar als eine; `editor/origin/`
   hält, was eine Stelle erreicht (`reach.ts`), die Herkünfte mit Namen und
   Einträgen (`origins.ts`), die Liste in einem Schritt (`OriginPicker.tsx`)
   und die Zelle der Zeilen (`ChoiceCell.tsx`). Aktionen, Wert einer
   Quelle, Hilfsquelle, Folgt der Auswahl und Berechnung nehmen sie nur von
   dort. Die Maske liest Quelle und Tagesfeld aus der Deklaration des
   Bausteins (`readDeclared` in `core/block/registry.ts`, Tagesfeld in
   `core/block/dayFieldProperty.ts`). Teil 2 erledigt 08.10.: Die
   Quelle kommt mit der Fähigkeit `source` (`blocks/base/BlockElement.ts`,
   `after` hält ihren Platz im Export), kein Baustein listet sie mehr.
   Quelle, Hilfsquellen, Folgt der Auswahl und Berechnungen liest der
   Editor nur über ihre Deklaration (`declaredValue` in
   `core/block/registry.ts`); die Bausteine lesen ihre Listen nicht noch
   einmal. Von einer Bindung zum Feld, seinem Namen und seiner Länge führt
   nur `core/data/boundField.ts`. Die Spalte nach Uhrzeit steht in
   `blocks/kanban/clock.ts`. Bleibt: das Suchfenster liest seine Spalten
   über die Schlüssel seiner Fähigkeit (`editor/canvas/lookupWindowState.ts`).
4. Aussehen. Teil 1 erledigt 08.10.: Farbe, Art und Größe stehen einmal
   in `blocks/look/look.ts`, als Eigenschaftsarten mit den Tokens aus
   `mask.css` und den Klassen dazu (`lookClass`, `lookStyle`); Bereich,
   Kanban-Spalte und Chip holen die Farbe von dort. Die Schaltfläche hat
   alle drei; ihre vier alten Aussehen werden beim Laden (Maskenschema 28)
   Neutral/nur Rand (Standard), Petrol/Fläche voll (Hervorgehoben),
   Petrol/Fläche leicht (Leise), Neutral/nur Schrift (Ohne Rahmen).
   Teil 2 erledigt 08.10.: Text und Bereich. Beim Text ersetzt die Farbe
   die alte Farbwahl, Neutral lässt ihm die Farbe seiner Rolle; Art „Nur
   Schrift“ ist der Text, die anderen drei machen ihn zum Chip (Form aus
   `blocks/parts/chip.ts`); die Größe bleibt seine (11 bis 19). Der
   Bereich trägt Farbe und Art bei der Kopfzeile im Kopf, bei Frei und
   Kasten auf Fläche und Rand; „Nur Schrift“ lässt Frei und Kasten wie
   bisher. Maskenschema 29: eine Textfarbe wird die Farbe gleichen Namens,
   Dunkel, Grau und Hell werden Neutral; eine Kopfzeile behält ihre Farbe
   (sonst Blau) und wird Fläche leicht. Teil 3 erledigt 08.10.: Der Chip
   der Kanban-Karte nimmt zur Farbe die Art (Vorgabe Fläche leicht, wie
   vorher), beide in den Einstellungen unter Anzeige. Form, Fläche, Schrift
   und Rand kommen für ihn und den Text-Chip aus `blocks/parts/chip.ts`;
   „Nur Schrift“ ist das Wort in seiner Farbe, ohne Fläche und Abstand.
5. Dann die Liste unter „Bausteine“: Bild, ein Chat. Ankreuzfeld erledigt
   08.10.: Der Haken steht im Wert des Felds, wie der Text eines
   Textfelds; Haken schreibt „Wert mit Haken“ (Vorgabe `J`), kein Haken
   „Wert ohne Haken“ (Vorgabe `N`), beide je Feld in den Einstellungen
   unter Quelle. Ein leerer oder fremder Wert gilt als kein Haken. Das
   Ankreuzfeld wird gebunden wie die anderen Felder, Klick auf Haken und
   Beschriftung; gebunden steht dort der Name des Felds. Der Haken löst
   „Wert geändert“ aus, die Aktionen lesen `J`/`N` als Herkunft. Im
   Browser mit exportierter Maske geprüft (Lieferung `J` hakt an, Klick
   schickt `N` im PUT_RELATION), nicht in SoftEngine. Datenliste erledigt
   08.10.: die Wahl „Auswahl“ in der Leiste. Eine
   Zeile gibt die angeklickte Zeile weiter wie Tabelle und Kanban
   (`recordPick`, nur solange sie gewählt ist: `gives`); Mehrere sind die
   Haken; Keine nur lesen. Plus und Auf- und Zuklappen sind raus, mit ihnen
   die Fähigkeit `opener` und das Nachrücken in der Maske. Maskenschema
   30: eine Datenliste von vorher wird Mehrere. Die Empfang-Maske zeigt
   „Neuer Kunde“ und „Neues Tier“ offen; „+ Kunde“ hat keine Aktion mehr.

Einzelne Punkte, ohne Reihenfolge:

- Pfeil runter in der Erfassung öffnet keine Vorschlagsliste (von der KI
  am 07.10. festgelegt, Tippen oder F5). Der Nutzer prüft es in SoftEngine.
- Tag-Feld je Baustein: wie heute, nicht entschieden.
- Karte im Kanban (Nutzer 08.10.): die feste Anordnung der Chef-Maske
  bleibt, mit vier Regeln. Titel gewinnt, die Unterzeile gibt nach und
  wird zuerst abgeschnitten, bei Enge rutscht sie unter den Titel. Nichts
  schiebt etwas anderes: jeder Text endet in seiner Zeile mit „…“, die
  Zeit bleibt rechts, der Chip bleibt. Die Karte ist so hoch wie ihre
  gefüllten Zeilen (in der Maske heute so). Erledigt 08.10.: Im Editor
  steht eine Musterkarte je Spalte, im ersten Platz, nicht in jedem
  Zimmer; ungebundene Stellen zeigt sie als Strich nur, solange das Board
  markiert ist, nicht markiert nur die getippten und gebundenen, und ist
  nichts davon da, alle, damit sie nie leer steht. Die Größe der Karte
  kommt mit der Wahl Größe (Klein, Normal, Groß). Plätze: Feintuning im
  selben Chat.
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
  (882ed53); Karte nach Uhrzeit (aa25848); Datenliste (a4af7b5); Feld:
  Datum tippen, Auswahl lesbar (b8238e1); Basisklasse mit einer Meldung
  (753d679).
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
