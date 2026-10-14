# Offen

Stand 14.10.2026. Das hier ist der Plan: was als Nächstes gebaut wird, in
dieser Reihenfolge. Es gibt kein zweites Plan-Dokument. Entscheidungen mit
Datum stehen in `entschieden.md`, die Bedienung in `bedienung.md`, der Bau
des Codes in `architektur.md`, alles über SoftEngine in
`softengine-wiki/kontrakte.md`.

## Ziel

Der Nutzer und seine Kollegen bauen Masken für Kunden, exportieren, der
Kunde benutzt sie in SoftEngine. SoftEngine bleibt Daten und Logik, der
Editor macht die Oberfläche: Belegerfassung, Empfang, Behandlungszimmer,
Bestellung, und danach, was Kunden sonst brauchen. Die Masken liegen in
`masken/`.

Zwei Maßstäbe: der Editor erzeugt keinen Durchfall (man sieht, was man
tut, und wenn etwas schiefgeht, sagt er es), und die exportierte Maske
überzeugt. Der Code muss so sein, dass ein eigener Programmierer ihn
übernehmen kann.

## Stand 14.10.

- Echttest in V7 bestanden: die Belegerfassung aus dem Editor zeigt Band,
  Anschrift und Beleg-Nr., die Summen stimmen, „Artikel der Position“ zeigt
  nach der Auswahl aus der Liste, F4 löscht die richtige Zeile. Damit sind
  die alten Punkte A (F4), E (Artikelinfo) und K (Tippzeile nach F4)
  erledigt. Der Export liegt in `masken/belegerfassung/Rahmen10000.basis.*`
  und im V7-Ordner `VORLAGEN_INDIV\Belegerfassung\LAYOUTRAHMEN\10000`.
- Design der Maske eingefroren (Blatt-Sprache vom 13.10., Bilder
  `docs/design/2026-10-14-*.png`). Es gibt keine neue Designsprache mehr,
  nur Feinschliff je Baustein in der Revue unten.
- Code-Durchgang 14.10. (Fable): Schichten, Store, Registry, Doku in
  Ordnung. Schwach: vier Tests, 34 Schema-Stufen in sieben Wochen, sieben
  Stellen, die einen Fehler still verschlucken (`runEvent(...).catch(() => {})`),
  der Export bricht stumm ab. Das ist Phase 1.

## Arbeitsweise

- Fable plant und prüft, Opus 5.5 baut. Ein Schritt ist ein Chat. Der
  Nutzer schreibt nur: „Lies docs/offen.md, baue Chat N, halte dich an den
  Rahmen.“ Ein Prüf-Chat sieht danach nach (Prüfauftrag unten).
- Vor jedem Commit `npm run check` und `npm test` grün. Masken ab Schema 20
  und Kundendateien jeder Fassung laden weiter. Der Export ändert sich nur
  gewollt (`REFERENCE_REFRESH=1 npm test`, im Commit benannt).
- Masken in `masken/` werden committet, immer dann, wenn ein Chat sie
  ändert oder der Nutzer einen Stand gesichert haben will.
- Keine neuen Tests, außer dem Ladetest in Chat 3. Kein Thema
  Geschwindigkeit. Kein Chat, der nur aufräumt, ohne dass der Nutzer
  danach etwas sieht; Ausnahmen sind Chat 4 und Chat 15, beide gewollt.
- Jeder Chat endet mit einem Bild vorher und nachher. Der Nutzer sagt ja
  oder nein; bei nein wird zurückgebaut, nicht diskutiert.

## Plan: ein Chat je Zeile

### Phase 1: Kein Durchfall

1. Umrisse. Jeder Baustein ist auf der Leinwand zu sehen, auch leer: ein
   leiser Umriss um jeden Baustein, deutlicher beim Zeigen, kräftig beim
   Markieren. Ein Schalter „Umrisse“ in der Toolbar, Vorgabe an, gemerkt.
   In der Maske ändert sich nichts.
2. Rückmeldungen. Der Export sagt, welche Prüfung scheitert. Eine Datei,
   die nicht lädt, sagt warum. „Neu“ fragt nach. Die leere Leinwand zeigt,
   was zu tun ist.
3. Masken sichern. Ein Test lädt jede Maske aus `masken/` (Heber,
   Prüfung, Export) und schlägt an, wenn eine nicht mehr lädt. Die Masken
   werden committet.
4. Aktionsfenster. Jede Schrittart bringt ihr Fensterstück selbst mit;
   `StepWindow.tsx` und `ActionsSection.tsx` unterscheiden heute an 34
   Stellen einzeln. Verhalten bleibt gleich, Referenzabzug unverändert.
5. Revue Text.
6. Revue Feld.
7. Revue Bereich.
8. Revue Erfassung.
9. Revue Tabelle.
10. Revue Knopf.
11. Revue Datenliste.
12. Revue Kanban.
13. Revue Popup.
14. Revue Datum.
15. Doppeltes Zeichnen. Lit meldet, dass `ff-capture` und `ff-table` nach
    einem Update ein weiteres planen. Ursache finden, beheben. Nichts wird
    sichtbar, aber jede spätere Änderung an der Erfassung wird sicherer.

### Phase 2: Bestellung

16. Die Bestellung als vierte Maske, mit den heutigen Bausteinen, in
    `masken/bestellung`. Was dabei fehlt, wird danach als eigener Chat
    gebaut, nicht vorher auf Vorrat.

### Liegt, bis es stört

- B: Refresh nach dem Schreiben dauert Sekunden. Nur mit einem neuen Debug
  des Nutzers; der Verdacht „Belege Kunde“ trägt nicht (13.10. geprüft).
- G: Ereignisse der Erfassung „Zeile geändert“, „Zeile gelöscht“,
  „Positionen“ als Ganzes.
- Export abspecken (heute 330 KB je Maske, Laufzeit 255 KB mit allen
  Bausteinen). Erst, wenn Masken spürbar langsam öffnen. Schrift bleibt
  eingebettet, Manrope mit zwei Schnitten.
- `softengine-wiki/kontrakte.md` eindampfen: je Kontrakt drei Zeilen, nur
  Belegtes. Erst, wenn jemand darin nichts mehr findet.
- Rest-Refactoring: `maskState` ist ein Zustand je Seite, nicht je Maske
  (stört erst bei zwei Masken auf einer Seite); Tests für Kern, Store und
  Schreibwarteschlange (`hostQueue.ts`); die sieben verschluckten Fehler.
- Prüfbericht für den CTO: Gliederung liegt, Fassung folgt, wenn der
  Nutzer sie will.

## Einzelheiten zu den Chats

Chat 1, Umrisse. Heute: `src/editor/canvas/BlockHost.tsx` zeichnet den
Rahmen eines unmarkierten Bausteins mit `outline: 2px solid transparent`;
ein leerer Bereich der Form „Frei“ und ein leerer Text sind unsichtbar.
Bau: Umriss aus `editor.css` (Haarlinie, leise), beim Zeigen deutlicher,
nur im Editor (`preview`), Schalter in `src/editor/shell/Toolbar.tsx`,
Zustand in `src/editor/state/editorStore/viewState.ts`, gemerkt wie der
übrige Ansichtszustand. Maske pixelgleich, Export und Referenzabzug
unverändert.

Chat 2, Rückmeldungen. `src/editor/shell/Toolbar.tsx`: `return` ohne
Meldung, wenn `validateMaskHtml()` eine Prüfung nicht besteht; die
Prüfungen tragen schon Namen und Details (`src/export/validator.ts`).
`src/editor/state/maskFile.ts`: `loadMaskFromFile()` tut bei einer Datei,
die nicht lädt, nichts. „Neu“ löscht ohne Rückfrage. Eine Meldung in der
Maskensprache (kleines Fenster, `src/editor/widgets/`), keine
Browser-Dialoge außer der Rückfrage bei „Neu“.

Chat 3, Masken sichern. Ein Test `src/editor/state/masksLoad.test.ts`:
für jede `*.aufbau-maske.json` unter `masken/` `liftState()`,
`checkTreeState()`, `exportMask()`, `validateMaskHtml()` alle grün. Dazu
`CLAUDE.md` und dieser Plan: Masken werden committet. Im selben Commit die
drei Masken.

Chat 4, Aktionsfenster. `src/editor/actions/StepWindow.tsx` (22 Stellen)
und `ActionsSection.tsx` (12 Stellen) unterscheiden Schrittarten einzeln.
Die Schrittarten sind Adapter (`src/core/data/steps/stepAdapter.ts`); jeder
Adapter bekommt ein Fensterstück, das Fenster fragt den Adapter. Ein bis
zwei Chats; Referenzabzug unverändert.

Chats 5 bis 14, Revue. Je Baustein dieselbe Prüfliste, Befunde beheben,
nichts Neues erfinden:

- Im Editor: sichtbar auf der Leinwand, auch leer? Leiste verständlich,
  Wahlen mit Namen, die der Maskenbauer versteht? Einstellungsfenster
  vollständig, nichts abgeschnitten (heute bei der Erfassung: „Hinweis in
  der Tip…“ und der Knopf „Neue Positi“), nichts über den oberen Rand
  hinaus? Feld binden in zwei Klicks?
- In der Maske: mit Daten und ohne Daten richtig? Mit sehr langen Werten?
  Mit Beschriftung und ohne? Ein Baustein, der leer ist, zeigt einen Strich
  oder nichts, nie seinen Platzhalter aus dem Editor.
- Bekannte Reste: Text mit Beschriftung rechtsbündig setzt die Rubrik
  links (Belegerfassung, „Beleg-Nr.“); Name im Band 4 px höher als in der
  Vorlage; schmale Spaltenköpfe der Behandlung brauchen breitere Spalten
  (Maske, Chat 9 darf `masken/behandlung` anfassen); „Trenner“ in der
  Feldwahl des Texts klar benennen; „Pflicht“ am Feld ist als Wahl da und
  in der Maske nicht zu sehen.
- Jeder Revue-Chat endet mit zwei Bildern je Maske, in der die Art
  vorkommt: Editor und Export, vorher und nachher.

Chat 15, Doppeltes Zeichnen. Konsole: „Element ff-capture scheduled an
update after an update completed“, dasselbe für `ff-table`. Eine
Eigenschaft wird während des Zeichnens gesetzt. Ursache in
`src/blocks/capture/Capture.ts`, `src/blocks/list/recordList.ts`,
`src/blocks/base/heightReport.ts` oder `headsReport.ts`. Beheben, Maske
pixelgleich.

Chat 16, Bestellung. Erst die drei Sätze je Baustein im Chat (das teilt
er mit X, das ist neu, das wird überflüssig), dann der Bau in `masken/`.
Quellen und Relationen nur aus `kontrakte.md`; was dort nicht steht, wird
nicht gebaut, sondern als Frage an den Nutzer notiert.

## Einzelpunkte, ohne Reihenfolge

- Empfang schreibt nichts: die Popups Termin, Kunde und Tier haben nur
  Öffnen und Schließen. Termin schreiben, neuer Kunde (155/01) und neues
  Tier (160/03) stehen nicht in den Kontrakten; erst der Kontrakt, dann
  der Bau.
- Bild-Baustein fürs Tier: erst, wenn SoftEngine ein Tierfoto liefert
  (Technik des Kanban-Avatars).
- Escape in der Spaltenwahl schließt das ganze Fenster
  (`src/blocks/list/columnPicker.ts`).
- Lieferung „per GET“ erzeugt eine Quelle, die die Maske ablehnt
  (`src/core/data/dataSources.ts`); berührt Relation 69, nur mit Ja des
  Nutzers.
- Eine Bindung, deren Feld die Quelle nicht mehr hat, ist im Export leer,
  ohne Warnung (`src/editor/canvas/useLitElement.ts`). Gehört zu Chat 2,
  wenn es dort billig ist.
- Suchfenster liest seine Spalten noch über die Schlüssel seiner
  Fähigkeit (`src/editor/canvas/lookupWindowState.ts`), der Rest vom
  Datenweg.
- `Desktop\SoftEngine-Lexikon`: ins `softengine-wiki` oder draußen
  lassen. Entscheidung des Nutzers.

## Ideen, nicht freigegeben

- Export direkt in den SoftEngine-Ordner, einmal gewählt, dann jeder
  Export dorthin. Macht den Test in SoftEngine zu zehn Sekunden.
- Probedaten aus einem SoftEngine-Debug-Log: der Editor zeigt die Maske
  mit den Daten, die SoftEngine wirklich geschickt hat.

## Rahmen für jeden Auftrag

Gilt für jeden Chat, der einen Schritt aus dieser Datei baut. Der Nutzer
sagt nur: „Lies docs/offen.md, baue Chat N, halte dich an den Rahmen.“

- Lies zuerst `docs/offen.md` (den Schritt, seine Einzelheiten und diesen
  Rahmen), `docs/architektur.md` und die im Schritt genannten Dateien
  vollständig.
- Fasse nur an, was der Schritt nennt. `masken/` nur, wenn der Schritt es
  sagt. Nie `src/design/mask.css`, nie eine Schicht, die der Linter
  verbietet. Keine neuen Abhängigkeiten. Kein neues Verhalten, das der
  Schritt nicht nennt. Keine neuen Tests außer Chat 3.
- Das Design der Maske ist eingefroren (`entschieden.md`, 14.10., Bilder
  in `docs/design/2026-10-14-*.png`). Werte für Aussehen nur aus
  `src/design/mask.css` und `editor.css`. Nur hell. Keine Chips, Pills,
  Badges als Deko. Keine Kästchen in Zeilen der Erfassung. Kein Vorschlag
  für eine neue Designsprache, in keinem Chat.
- `npm run check` und `npm test` grün. Ändert sich der Export gewollt:
  `REFERENCE_REFRESH=1 npm test` und im Commit sagen, was. Ändert er sich
  ungewollt: zurück.
- Ändert sich die Struktur, zieh `docs/architektur.md` nach. Ist etwas
  entschieden, eine Zeile in `docs/entschieden.md`. Ist der Schritt fertig,
  trag es hier beim Schritt ein („Erledigt TT.MM.“) und streich die
  Einzelheiten, die damit erledigt sind.
- Im Browser prüfen (http://localhost:5300, Maske aus `masken/` laden),
  Screenshot vorher und nachher, Pfade im Bericht.
- Ein Commit je Schritt, deutsch, nicht pushen. Bericht kurz, deutsch, für
  einen Nicht-Programmierer: was anders ist, was gleich blieb, wo er es
  sieht, Check und Test grün. Frag nicht nach, entscheide nach Muster.

## Prüfauftrag

Für einen zweiten Chat nach einem Schritt. Der Nutzer sagt: „Prüfe den
letzten Commit gegen docs/offen.md Chat N und den Rahmen.“ Der Prüfer
liest den Diff (`git show HEAD`), den Schritt und den Rahmen, führt
`npm run check` und `npm test` aus, lädt eine Maske aus `masken/` im
Browser und meldet nur Verstöße und Fehler, je einen Satz mit Datei und
Zeile. Nichts umbauen, nichts committen. Kein Befund heißt: abgenommen.
