# Offen

Stand 13.10.2026. Das hier ist der Plan: was als Nächstes gebaut wird, in
dieser Reihenfolge. Es gibt kein zweites Plan-Dokument. Entscheidungen mit
Datum stehen in `entschieden.md`, die Bedienung in `bedienung.md`, der Bau
des Codes in `architektur.md`, alles über SoftEngine in
`softengine-wiki/kontrakte.md`.

## Ziel

Der Nutzer und seine Kollegen bauen Masken für Kunden, exportieren, der
Kunde benutzt sie in SoftEngine. Aktuelles Ziel (12.10.): ein vollständiger
Tierarzt-Prototyp, gebaut mit dem Editor. Empfang als Kanban (Termin
anlegen, ins Behandlungszimmer, zur Kasse), Behandlung (der Arzt sieht alle
Patientendaten und füllt den Beleg: Leistungen, Medikamente, Artikel),
Belegerfassung. Die Masken liegen in `masken/`. Die Chef-Maske ist kein
Maßstab mehr; `docs/chef-maske` ist nur noch Quelle für Schreibwege.

Der Editor darf rau sein, aber bedienbar; die Maske muss glänzen. Der Code
muss so sein, dass ein eigener Programmierer ihn übernehmen kann.

## Arbeitsweise

- Ein Schritt ist ein Chat. Der Auftrag ist knapp, nennt die Dateien und
  sagt, was nicht angefasst wird. Ein Chat baut, ein Prüf-Chat sieht nach.
- Vor jedem Commit `npm run check` und `npm test` grün. Masken ab Schema 20
  und Kundendateien jeder Fassung laden weiter. Der Export ändert sich nur
  gewollt (`REFERENCE_REFRESH=1 npm test`, im Commit benannt).
- Keine neuen Tests. Kein Thema Geschwindigkeit. Kein Chat, der nur
  aufräumt, ohne dass der Nutzer danach etwas sieht; Ausnahme ist das
  Refactoring unten, am 13.10. ausdrücklich gewollt.
- Je Baustein, bevor er gebaut wird, drei Sätze im Chat: Das teilt er mit X.
  Das ist neu. Das wird dadurch überflüssig. Der Nutzer sagt ja oder nein.
  Nach dem Bau sieht er ihn in SoftEngine.
- Änderungen unter `masken/` bleiben uncommittet.

## Refactoring, zuerst

Urteil vom 13.10.: Kern, Bausteine, Datenweg, Export, Laufzeit und
`architektur.md` sind in Ordnung und bleiben. Weh tut der Editor selbst.
Jeder Schritt lässt das Verhalten der Maske gleich; der Referenzabzug
ändert sich nur, wo es gesagt ist.

1. Editor-Oberfläche in der Maskensprache (`docs/design/behandlung-modern.html`):
   Toolbar, Palette, Leiste am Baustein, Fenster, Datenfenster. Heute
   (gemessen 13.10.): Segoe 13 px, Rundung 4 px, Petrol als Akzent, dunkle
   Palette. Die Maske: Manrope, Rundung 8 px, Blau `#2F6BFF`, Grund
   `#F4F5F7`, weiße Karten ohne Rand. Dateien: `src/design/editor.css`,
   `src/editor/widgets/`, `src/editor/shell/`, `src/editor/sidebar/`,
   `src/editor/bar/`, `src/editor/data/`. Drei Chats: Toolbar und Palette;
   Leiste und ihre Fenster; Datenfenster.
2. Rückmeldungen. Der Export bricht heute ohne Meldung ab, wenn eine
   Prüfung scheitert (`return` in `src/editor/shell/Toolbar.tsx`); er soll
   sagen, welche. Eine Datei, die nicht lädt, tut heute nichts; sie soll
   sagen, warum. „Neu“ löscht heute die ganze Maske ohne Rückfrage; es
   fragt nach. Die leere Leinwand zeigt einen Hinweis, was zu tun ist. Ein
   Chat, kann in Schritt 1 mitlaufen.
3. Aktionsfenster. Die Schrittarten sind Adapter (`StepAdapter`), für
   Export und Laufzeit generisch; `src/editor/actions/StepWindow.tsx` und
   `ActionsSection.tsx` unterscheiden sie heute einzeln, an 24 Stellen.
   Jede Schrittart bringt ihr Fensterstück selbst mit. Verhalten bleibt
   gleich, Referenzabzug ändert sich nicht. Ein bis zwei Chats.
4. Erfassung und Tabelle zeichnen doppelt: Lit meldet in der Konsole, dass
   `ff-capture` und `ff-table` nach einem Update ein weiteres planen (eine
   Eigenschaft wird während des Zeichnens gesetzt). Ursache finden,
   beheben. Ein Chat. Sichtbar wird nichts, aber jede spätere Änderung an
   der Erfassung wird ungefährlicher.
5. Später, nur wenn es stört: `maskState` (`src/runtime/maskState.ts`) ist
   ein Zustand für die ganze Seite, nicht je Maske. Stört erst, wenn zwei
   Masken auf einer Seite sollen.

Stand 13.10.: Schritt 1 Teil 1 (Toolbar, Palette, Reiter) gebaut und
abgenommen (9c90662). Teil 2 (Leiste und ihre Fenster) gebaut 13.10.,
Abnahme offen: kleine Fenster ohne Rand mit Schatten, Gruppen als fette
Überschrift mit Haarlinie, Ankreuzkästchen der Maske (`TickBox`), Feldcodes
als leiser Text statt grauer Pille, Fenster in der Mitte mit Rundung 12 px,
Tabellen in Fenstern ohne senkrechte Linien. Das Datenfenster trägt Rahmen,
Reiter und Linien damit schon. Für Teil 3 bleibt sein Inneres (Zeile Art und
Liefert, Import mit `Checkbox`) und die markierte Zeile einer Liste: sie
bleibt voll blau, weil `ActionsSection.tsx` und `TermLine.tsx` das Blau
selbst schreiben. Dazugekommen am 13.10., aus einer fremden Prüfung
der exportierten Belegerfassung mit echten Daten, im Code bestätigt:

6. Zahlen in Tabelle und Erfassung. Gebaut 13.10., Abnahme offen. Eine
   Spalte ist eine Zahl, wenn sie eine Summe hat oder eine Berechnung des
   Bausteins sie nennt (`figureOf` in `src/blocks/parts/column.ts`); sie
   steht rechts und zeigt de-DE mit Tausenderpunkt (`shownFigure` in
   `src/core/data/number.ts`). Die Spalte, aus der die Berechnung erzählt
   wird, zeigt deren Nachkommastellen (Gesamtpreis 2, 0 wird „0,00“), jede
   andere so viele, wie der Wert mitbringt. Getipptes und PUT unverändert
   (`numberText`). Offen: der Feldcode sagt nichts über die Art, darum
   bleibt eine Tabellenspalte ohne Summe und Berechnung links (Menge,
   Einzelpreis in der Behandlung), und Einzelpreis zeigt die
   Nachkommastellen, die SoftEngine liefert („12,5“). Beides braucht eine
   Wahl je Spalte im Editor, eigener Schritt. Die Tippzeile zeigt ihre
   Werte roh („5124,84“), erst die erfasste Zeile formatiert.
7. Export abspecken, in der Datei (Laden aus der Installation ist
   verworfen, 13.10.). Gemessen an der Belegerfassung: Maske 14 KB,
   Quellen 1 KB, Stil 4 KB, Schrift 37 KB, Laufzeit 245 KB. Zuerst die
   Laufzeit je Baustein vermessen und Fett finden (die Erfassung allein
   wiegt fast 100 KB). Dann entscheiden, ob nur genutzte Bausteine
   eingebettet werden; das braucht die Laufzeit in Teilen, die zusammen
   passen, und bringt bei einer Maske mit Erfassung etwa 40 KB. Schrift:
   Manrope bleibt (Entscheidung des Nutzers offen: zwei Schnitte 37 KB,
   ein Schnitt etwa 19 KB, Segoe 0 KB).

## Bausteine und Masken, danach

1. Aussehen-Wahlen (Farbe, Art, Größe aus `src/blocks/look/look.ts`) an
   Tabelle, Erfassung, Datenliste, Datum, Feld und Popup. Knopf, Text und
   Bereich haben sie (der Text seine eigene Größe, der Bereich keine);
   Kanban hat die Farbe je Spalte, der Chip Farbe und Art.
2. Feld: „Pflicht“ ist als Wahl da und in der Maske nicht zu sehen.
3. Empfang schreibt nichts: die Popups Termin, Kunde und Tier haben nur
   Öffnen und Schließen. Termin schreiben, neuer Kunde (155/01) und neues
   Tier (160/03) stehen nicht in den Kontrakten; erst der Kontrakt, dann
   der Bau.
4. Belegerfassung (10.10.): zwischen den PUTs warten; Summen nach dem
   Schreiben nachladen.
5. Position löschen per F4 wie in SoftEngine, eigener Schritt. Kein ✕ an
   den Zeilen (12.10.).
6. IDB-Inhalte: XML und DTK liefern nur die Struktur; die Zeilen kommen
   über das Importmodul von SoftEngine (12.10.).
7. Export nur mit dem, was auf der Leinwand liegt; Laufzeit und Schrift
   aus der SoftEngine-Installation, nicht aus dem Internet (12.10.).
8. Suchfenster: liest seine Spalten noch über die Schlüssel seiner
   Fähigkeit (`src/editor/canvas/lookupWindowState.ts`), der Rest vom
   Datenweg.
9. Bild-Baustein fürs Tier: erst, wenn SoftEngine ein Tierfoto liefert
   (Technik des Kanban-Avatars).

## Einzelpunkte, ohne Reihenfolge

- Pfeil runter in der Erfassung öffnet keine Vorschlagsliste (Tippen oder
  F5). Der Nutzer prüft in SoftEngine, ob das stimmt.
- Tag-Feld je Baustein: wie heute, nicht entschieden.
- Datenquellen: eigenes Gespräch. Die Analyse der SoftEngine-Vorlagen des
  Nutzers ist noch nicht im Projekt.
- Escape in der Spaltenwahl schließt das ganze Fenster
  (`src/blocks/list/columnPicker.ts`).
- Lieferung „per GET“ erzeugt eine Quelle, die die Maske ablehnt
  (`src/core/data/dataSources.ts`); berührt Relation 69, nur mit Ja des
  Nutzers.
- Eine Bindung, deren Feld die Quelle nicht mehr hat, ist im Export leer,
  ohne Warnung (`src/editor/canvas/useLitElement.ts`).
- Erfassung gegenüber der Handmaske: kein Doppelklick auf
  `TABELLEPOS_DETAILS`, Löschen und Infosystem nur als BW_LINK-Schritt von
  Hand, kein Farbkennzeichen der Position, kein Artikelbild, keine
  Zeilenart.
- Nicht in den Kontrakten, darum nicht gebaut: Zimmerwechsel per Ziehen,
  Rechnung (712), Aktualisieren (3003).
- `Desktop\SoftEngine-Lexikon` (alle Aktionen der SoftEngine-Vorlagen,
  Ordner für Ordner): entweder ins `softengine-wiki` oder draußen lassen.
  Entscheidung des Nutzers.

## Ideen, nicht freigegeben

- Export direkt in den SoftEngine-Ordner
  (`…\HtmlTemplates\BELEGERFASSUNG\LAYOUTRAHMEN\<Nr>`), einmal gewählt,
  dann jeder Export dorthin. Macht den Test in SoftEngine zu zehn Sekunden.
- Probedaten aus einem SoftEngine-Debug-Log: der Editor zeigt die Maske
  mit den Daten, die SoftEngine wirklich geschickt hat.

## Rahmen für jeden Auftrag

Gilt für jeden Chat, der einen Schritt aus dieser Datei baut. Der Nutzer
sagt nur: „Lies docs/offen.md und baue Schritt N. Halte dich an den Rahmen.“

- Lies zuerst `docs/offen.md` (den Schritt und diesen Rahmen),
  `docs/architektur.md` und die im Schritt genannten Dateien vollständig.
- Fasse nur an, was der Schritt nennt. Nie `masken/`, nie `src/design/mask.css`,
  nie eine Schicht, die der Linter verbietet. Keine neuen Abhängigkeiten.
  Kein neues Verhalten, das der Schritt nicht nennt. Keine neuen Tests.
- Werte für Aussehen nur aus `src/design/mask.css` und `editor.css`, Muster
  ist `docs/design/behandlung-modern.html`. Nur hell. Keine Chips, Pills,
  Badges als Deko. Keine Kästchen in Zeilen der Erfassung.
- `npm run check` und `npm test` grün. Ändert sich der Export gewollt:
  `REFERENCE_REFRESH=1 npm test` und im Commit sagen, was. Ändert er sich
  ungewollt: zurück.
- Ändert sich die Struktur, zieh `docs/architektur.md` nach. Ist etwas
  entschieden, eine Zeile in `docs/entschieden.md`. Ist der Schritt fertig,
  trag es hier beim Schritt ein.
- Im Browser prüfen (http://localhost:5300, Maske aus `masken/` laden),
  Screenshot vorher und nachher, Pfade im Bericht.
- Ein Commit je Schritt, deutsch, ohne `masken/`, nicht pushen. Bericht
  kurz, deutsch, für einen Nicht-Programmierer: was anders ist, was gleich
  blieb, Check und Test grün. Frag nicht nach, entscheide nach Muster.

## Prüfauftrag

Für einen zweiten Chat nach einem Schritt. Der Nutzer sagt: „Prüfe den
letzten Commit gegen docs/offen.md Schritt N und den Rahmen.“ Der Prüfer
liest den Diff (`git show HEAD`), den Schritt und den Rahmen, führt
`npm run check` und `npm test` aus, lädt eine Maske aus `masken/` im
Browser und meldet nur Verstöße und Fehler, je einen Satz mit Datei und
Zeile. Nichts umbauen, nichts committen. Kein Befund heißt: abgenommen.
