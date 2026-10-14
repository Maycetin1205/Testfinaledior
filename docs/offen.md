# Offen

Stand 14.10.2026. Das hier ist der Plan: was als Nächstes gebaut wird, in
dieser Reihenfolge. Es gibt kein zweites Plan-Dokument. Entscheidungen mit
Datum stehen in `entschieden.md`, die Bedienung in `bedienung.md`, der Bau
des Codes in `architektur.md`, alles über SoftEngine in
`softengine-wiki/kontrakte.md`.

## Ziel

Der Nutzer und seine Kollegen bauen Masken für Kunden, exportieren, der
Kunde benutzt sie in SoftEngine. SoftEngine bleibt Daten und Logik, der
Editor macht die Oberfläche: Belegerfassung, Empfang, Behandlungszimmer
und danach, was Kunden sonst brauchen. Die Masken liegen in `masken/`.

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
  danach etwas sieht; Ausnahmen sind Chat 7 und Chat 18, beide gewollt.
- Rückmeldungen sind sparsam: eine Meldung je Vorfall, eine Zeile oder
  ein kleines Fenster mit „OK“, nie mehrere hintereinander, keine
  Browser-Dialoge außer der Rückfrage bei „Neu“ (Nutzer, 14.10.).
- Jeder Chat endet mit einem Bild vorher und nachher. Der Nutzer sagt ja
  oder nein; bei nein wird zurückgebaut, nicht diskutiert.

## Plan: ein Chat je Zeile

### Phase 1: Kein Durchfall

1. Umrisse. Jeder Baustein ist auf der Leinwand zu finden, auch leer:
   unter der Maus eine leise Linie in echter Größe, kräftig beim
   Markieren; der Schalter „Umrisse“ zeigt alle blass gestrichelt, Vorgabe
   aus, gemerkt. In der Maske ändert sich nichts. Erledigt 14.10.,
   nachgebessert 14.10.
2. Rückmeldungen. Der Export sagt, welche Prüfung scheitert. Eine Datei,
   die nicht lädt, sagt warum. „Neu“ fragt nach. Die leere Leinwand zeigt,
   was zu tun ist. Dazu: der Export nennt Stellen, deren Feld die Quelle
   nicht hat. Erledigt 14.10., geprüft 14.10. Rest für Revue Text: die
   Meldung „mit Lücken“ nennt den Baustein nur mit seiner Art („Text“);
   sie soll Beschriftung oder Text mitnennen, sonst findet man ihn unter
   48 Texten nicht.
3. Masken sichern. Ein Test lädt jede Maske aus `masken/` (Heber,
   Prüfung, Export) und schlägt an, wenn eine nicht mehr lädt oder dabei
   einen Baustein, eine Quelle oder eine Relation verliert. Die Masken
   werden committet. Erledigt 14.10.
4. Maskenordner und Vorlagen. Statt Laden und Speichern über Dateidialoge
   und einem Speicherplatz im Browser: der Nutzer wählt einmal einen
   Ordner, der Editor zeigt links alle Masken darin mit Name,
   Rahmen-Nummer und Datum, Unterordner als Ordner, „Vorlagen“ als
   eigener Ordner. Klick öffnet, Speichern schreibt dorthin, „Als Vorlage
   sichern“, „Neu aus Vorlage“. Je Maske ein Zielordner für den Export,
   dann ist der Weg nach V7 ein Klick. Erledigt 14.10. (Fenster
   „Masken“; Streifen oder Fenster entscheidet Chat 5). Geprüft 14.10.,
   zwei Reste für Chat 6: der erste Klick auf „Speichern“ ohne Ordner
   öffnet sofort den Ordnerdialog des Browsers, ohne zu sagen, wozu (der
   Nutzer stand davor und verstand es nicht); vorher das Fenster „Masken“
   mit seiner Erklärung zeigen, erst der Klick dort öffnet den Dialog. Und
   die Erklärung sagt, was Chrome verweigert: ein ganzes Laufwerk, den
   Benutzerordner, Windows, Programme („Systemdateien“); ein Unterordner
   wie `masken` geht. Der Export in den Zielordner ist nur beim Nutzer in
   V7 prüfbar, headless nicht (der Browser hält den Ordner, nicht der
   Test).
5. Gesicht des Editors, Entwürfe. Der Editor sieht aus wie KI-Slop
   (Nutzer, 14.10.): generische Knöpfe, Palette mit Symbol und Wort,
   nichts, was nach Produkt aussieht. Ein Chat baut drei Entwürfe der
   Editor-Hülle als Bilder (Toolbar, Palette, Maskenliste aus Chat 4,
   Leiste am Baustein, ein Fenster), in der Blatt-Sprache, nur hell. Der
   Nutzer zeigt auf einen. Kein Code in diesem Chat.
6. Gesicht des Editors, Bau. Der gewählte Entwurf wird gebaut. Die Maske
   bleibt pixelgleich, Export und Referenzabzug unverändert.
7. Aktionsfenster. Jede Schrittart bringt ihr Fensterstück selbst mit;
   `StepWindow.tsx` und `ActionsSection.tsx` unterscheiden heute an 34
   Stellen einzeln. Verhalten bleibt gleich, Referenzabzug unverändert.
8. Revue Text.
9. Revue Feld.
10. Revue Bereich, dazu der neue Baustein Linie: eine Haarlinie,
    waagerecht oder senkrecht, Farbe aus den Wahlen, eine Rasterzeile hoch
    oder eine Spalte breit. Für Masken, die Gruppen trennen wollen, ohne
    einen Bereich zu zeichnen.
11. Revue Erfassung.
12. Revue Tabelle.
13. Revue Knopf.
14. Revue Datenliste.
15. Revue Kanban.
16. Revue Popup.
17. Revue Datum.
18. Doppeltes Zeichnen. Lit meldet, dass `ff-capture` und `ff-table` nach
    einem Update ein weiteres planen. Ursache finden, beheben. Nichts wird
    sichtbar, aber jede spätere Änderung an der Erfassung wird sicherer.

### Phase 2: Vor dem ersten Kunden

19. Die Maske redet. Antwortet SoftEngine nicht oder lehnt es ein
    Schreiben ab, zeigt die Maske es leise an der Stelle, wo es passiert
    ist (die Zeile der Erfassung, der Knopf). Heute bleibt beides
    unsichtbar (23.09.). Für einen Kunden geht das nicht.
20. Pilotkunde mit der Belegerfassung, Standardmaske als Rückweg. Vorher
    einmal mit einem dicken Beleg (hunderte Positionen) und einem großen
    Artikelstamm testen. Braucht den Nutzer und seinen CTO.

Was danach kommt, entscheidet der Nutzer. Die Bestellung als vierte Maske
war nur eine Idee und steht nicht im Plan (14.10.).

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

Chat 5, Gesicht des Editors, Entwürfe. Drei HTML-Bilder der Editor-Hülle
unter `docs/design/editor-entwurf-{a,b,c}.html` mit je einem PNG, 1680 px
breit, mit der Belegerfassung auf der Leinwand (Bild
`docs/design/2026-10-14-belegerfassung.png` als Inhalt). Alle drei in der
Blatt-Sprache (`src/design/mask.css`: Manrope, Tinte, Königsblau, Rundung
6/10), nur hell, ohne Chips und Badges. Unterschiede: Palette als
Streifen mit Symbolen und Namen, als schmale Leiste nur mit Symbolen und
Tooltip, oder als Fenster; Toolbar dicht oder luftig; Maskenliste aus
Chat 4 als Streifen oder Fenster. Kein Code im Editor in diesem Chat. Der
Nutzer wählt; die Wahl kommt nach `entschieden.md`.

Chat 6, Gesicht des Editors, Bau. Der gewählte Entwurf aus Chat 5 wird
gebaut: `src/design/editor.css`, `src/editor/shell/`, `src/editor/sidebar/`,
`src/editor/bar/`, `src/editor/widgets/`. Dieselben Farben und Maße wie
die Maske, aus `mask.css` übernommen. Was nicht im Entwurf ist, bleibt,
wie es ist. Maske pixelgleich, Export und Referenzabzug unverändert.

Chat 7, Aktionsfenster. `src/editor/actions/StepWindow.tsx` (22 Stellen)
und `ActionsSection.tsx` (12 Stellen) unterscheiden Schrittarten einzeln.
Die Schrittarten sind Adapter (`src/core/data/steps/stepAdapter.ts`); jeder
Adapter bekommt ein Fensterstück, das Fenster fragt den Adapter. Dabei
weniger auf einmal: leere Stellen einer Relation eingeklappt, die rohe
`PUT_RELATION[...]`-Zeile erst auf Klick, zuerst das, was fast jede Kette
braucht. Keine Funktion fällt weg, die eine Maske in `masken/` nutzt. Ein
bis zwei Chats; Referenzabzug unverändert.

Chat 10, Linie. Neuer Baustein `src/blocks/line/` nach dem Muster von
Knopf (`architektur.md` §6): Wahl Richtung (waagerecht, senkrecht), Farbe
aus `look.ts`, Stärke Haarlinie oder 1,5 px wie die Kopflinie der
Erfassung. Raster: waagerecht eine Zeile hoch, senkrecht eine Spalte
breit. In den Referenzbaum aufnehmen, `REFERENCE_REFRESH=1 npm test`.
Nicht noch einmal: die Summenlinie am Text (13.10. entfernt) bleibt weg,
dafür ist die Linie da.

Chats 8 bis 17, Revue. Je Baustein dieselbe Prüfliste, Befunde beheben,
nichts Neues erfinden:

- Im Editor: sichtbar auf der Leinwand, auch leer? Leiste verständlich,
  Wahlen mit Namen, die der Maskenbauer versteht? Einstellungsfenster
  vollständig, nichts abgeschnitten (heute bei der Erfassung: „Hinweis in
  der Tip…“ und der Knopf „Neue Positi“), nichts über den oberen Rand
  hinaus? Feld binden in zwei Klicks? Weniger auf einmal: zuerst, was
  fast jeder braucht, der Rest hinter „Mehr“; eine Wahl, die keine Maske
  nutzt und niemand vermisst, fliegt raus (im Chat benennen, Nutzer sagt
  ja).
- In der Maske: mit Daten und ohne Daten richtig? Mit sehr langen Werten?
  Mit Beschriftung und ohne? Ein Baustein, der leer ist, zeigt einen Strich
  oder nichts, nie seinen Platzhalter aus dem Editor.
- Bekannte Reste: Text mit Beschriftung rechtsbündig setzt die Rubrik
  links (Belegerfassung, „Beleg-Nr.“); Name im Band 4 px höher als in der
  Vorlage; schmale Spaltenköpfe der Behandlung brauchen breitere Spalten
  (Maske, Chat 12 darf `masken/behandlung` anfassen); „Trenner“ in der
  Feldwahl des Texts klar benennen; „Pflicht“ am Feld ist als Wahl da und
  in der Maske nicht zu sehen; im Empfang bricht der Titel „Kleintierpraxis
  am Lindenhof“ bei 1440 px um und liegt über „Empfang heute“, sein Umriss
  ist zu niedrig (seit Chat 1 im Editor zu sehen).
- Jeder Revue-Chat endet mit zwei Bildern je Maske, in der die Art
  vorkommt: Editor und Export, vorher und nachher.

Chat 18, Doppeltes Zeichnen. Konsole: „Element ff-capture scheduled an
update after an update completed“, dasselbe für `ff-table`. Eine
Eigenschaft wird während des Zeichnens gesetzt. Ursache in
`src/blocks/capture/Capture.ts`, `src/blocks/list/recordList.ts`,
`src/blocks/base/heightReport.ts` oder `headsReport.ts`. Beheben, Maske
pixelgleich.

Chat 19, die Maske redet. Heute: `runEvent(...).catch(() => {})` an
sieben Stellen (`src/blocks/button/Button.ts`, `formfield/valueBinding.ts`,
`kanban/board.ts`, `list/rowActivation.ts`), die Schreibwarteschlange
(`src/softengine/relations/hostQueue.ts`) gibt nach 10 s auf, ohne dass
die Maske es zeigt; abgelehntes Schreiben bleibt unsichtbar (23.09.).
Bau: ein Zustand „gescheitert“ je Zeile der Erfassung und je Knopf, leise
in der Blatt-Sprache (Tinte rot aus `mask.css`, ein kurzer Text an der
Stelle, kein Fenster), verschwindet beim nächsten Erfolg. Die sieben
Stellen melden statt zu schlucken. Export ändert sich gewollt
(`REFERENCE_REFRESH=1`), Echttest beim Nutzer: SoftEngine geschlossen,
dann speichern.

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
- Suchfenster liest seine Spalten noch über die Schlüssel seiner
  Fähigkeit (`src/editor/canvas/lookupWindowState.ts`), der Rest vom
  Datenweg.
- `Desktop\SoftEngine-Lexikon`: ins `softengine-wiki` oder draußen
  lassen. Entscheidung des Nutzers.

## Ideen, nicht freigegeben

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
