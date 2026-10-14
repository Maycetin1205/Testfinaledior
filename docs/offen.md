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
  nur Feinschliff je Baustein in der Durchsicht unten.
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
  danach etwas sieht; Ausnahmen sind Chat 7 und das doppelte Zeichnen in
  Chat 10, beide gewollt.
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
   nicht hat. Erledigt 14.10., geprüft 14.10. Rest für Chat 8: die
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
   Nutzer zeigt auf einen. Kein Code in diesem Chat. Erledigt 14.10.:
   `docs/design/editor-entwurf-{a,b,c}.html` mit PNG, A Werkbank, B
   Kompakt, C Leinwand. Die Wahl des Nutzers steht aus; sie kommt nach
   `entschieden.md`, dann Chat 6.
5b. Gesicht des Editors, Entwurf D. Urteil 14.10. (Fable, von außen):
   A, B und C sind dieselbe Einrichtung dreimal umgestellt, keiner hebt
   das Slop-Gefühl auf. Zwei Ursachen bleiben in allen dreien: Rahmen und
   Maske sind nicht zu unterscheiden (alles weiß und hellgrau), und die
   Eigenschaften stecken in einer Leiste mit Fensterchen, der Quelle der
   abgeschnittenen Texte. D: Dreiteilung mit linker Spalte (Bausteine,
   Masken), Leinwand auf grauem Grund, rechter Spalte „Eigenschaften“;
   der Rahmen in einem eigenen, kühleren Ton; ein schmaler Kopf. Ein Chat
   baut D als Bild wie A bis C; der Nutzer vergleicht und entscheidet.
   Kein Code in diesem Chat. Erledigt 14.10.:
   `docs/design/editor-entwurf-d.html` mit `editor-entwurf-d.png` (Text
   „Name“ markiert) und `editor-entwurf-d-erfassung.png` (Erfassung
   markiert, links der Reiter „Masken“); `#maske` hinter der Adresse der
   HTML zeigt die Spalte ohne Markierung. Die Wahl des Nutzers zwischen A
   bis D steht aus; sie kommt nach `entschieden.md`, dann Chat 6.
   Urteil 14.10. (Fable): D empfohlen, mit vier Auflagen für Chat 6a
   (echte Breite des Blatts, einklappbare Spalten, rechte Spalte 320 px,
   „Neue Maske“ als Knopf, Tipps an den Bausteinen).
5c. Tonprobe. Woran man „KI“ sieht (Nutzer, 14.10.): Schrift Manrope,
   Beschriftungen in gesperrten Versalien, Rundungen und Schatten. Drei
   Bilder derselben Belegerfassung mit Daten: wie heute; Segoe UI und
   normale Schreibweise; „Fachsoftware“: dazu kleinere Rundungen, Linien
   statt Schatten, dichtere Zeilen, eine Tinte statt fünf Grautöne,
   Abschnitte statt Karten, keine Striche in leeren Feldern, Kanban ohne
   getönte Flächen und Pillen (dafür ein viertes Bild, der Empfang). Je
   Probe auch die Editor-Hülle nach D. Kein Code. Der Nutzer wählt; die
   Wahl gilt für Maske und Editor, dann ein Chat für die Übernahme in
   `mask.css` und `editor.css` vor Chat 6a. Erledigt 14.10.:
   `docs/design/tonprobe-{1,2,3}.png` (Belegerfassung mit Probedaten,
   Position „Bravecto“ gewählt), `tonprobe-{1,3}-empfang.png`,
   `tonprobe-{1,2,3}-editor.png` (Hülle D, Leinwand im Ton der Probe);
   die Werte in `docs/design/tonprobe/`. Die Wahl des Nutzers steht aus;
   sie kommt nach `entschieden.md`.
6. Gesicht des Editors, Bau, in drei Chats: 6a Hülle und linke Spalte,
   6b rechte Spalte mit den Wahlen der heutigen Leiste, 6c die Gruppen aus
   „Einstellungen“ in die rechte Spalte, die Fensterchen an der Leiste
   verschwinden. Die Maske bleibt pixelgleich, Export und Referenzabzug
   unverändert. Setzt die Wahl des Nutzers nach 5b voraus.
7. Aktionsfenster. Jede Schrittart bringt ihr Fensterstück selbst mit;
   `StepWindow.tsx` und `ActionsSection.tsx` unterscheiden heute an 34
   Stellen einzeln. Verhalten bleibt gleich, Referenzabzug unverändert.
7b. Probedaten im Editor. Heute zeigt die Leinwand Platzhalter
   („Tiername“, „Zahlungsbedingung 1“), darum sieht jede Maske im Editor
   aus wie ein Mockup. Der Editor-Host (`src/runtime/previewHost.ts`, der
   heute nichts liefert) liefert je Quelle ein paar plausible Zeilen aus
   einer festen Probedatei (`src/editor/probedaten/`: Tiere, Halter,
   Artikel, Positionen, Termine, mit deutschen Namen und Beträgen), nach
   Feldcode zugeordnet; unbekannte Felder bleiben Platzhalter. Nur im
   Editor, der Export kennt die Daten nicht. Später ersetzbar durch
   Daten aus einem SoftEngine-Log (Idee unten). Ein Chat.
Durchsicht heißt: jeder Baustein wird einmal durchgesehen und in Ordnung
gebracht, nach der Prüfliste unten. Ähnliche Bausteine teilen sich einen
Chat (14.10., der Nutzer will nicht 17 Chats takten).

8. Durchsicht der kleinen Bausteine: Text, Feld, Datum, Knopf.
9. Durchsicht Bereich und Popup, dazu der neue Baustein Linie: eine
   Haarlinie, waagerecht oder senkrecht, Farbe aus den Wahlen, eine
   Rasterzeile hoch oder eine Spalte breit. Für Masken, die Gruppen
   trennen wollen, ohne einen Bereich zu zeichnen.
10. Durchsicht Erfassung, Tabelle und Datenliste, dazu das doppelte
    Zeichnen: Lit meldet, dass `ff-capture` und `ff-table` nach einem
    Update ein weiteres planen; Ursache finden, beheben. Darf
    `masken/behandlung` anfassen (breitere Spalten).
11. Durchsicht Kanban.

### Phase 2: Vor dem ersten Kunden

12. Die Maske redet. Antwortet SoftEngine nicht oder lehnt es ein
    Schreiben ab, zeigt die Maske es leise an der Stelle, wo es passiert
    ist (die Zeile der Erfassung, der Knopf). Heute bleibt beides
    unsichtbar (23.09.). Für einen Kunden geht das nicht.
13. Pilotkunde mit der Belegerfassung, Standardmaske als Rückweg. Vorher
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

Übernahme der Tonprobe, nach der Wahl des Nutzers (Chat 5c erledigt
14.10.). Wird 2 oder 3 gewählt, ist der erste Bau-Chat danach die
Übernahme (ein Chat, `REFERENCE_REFRESH=1`, neue Bilder
`docs/design/<Datum>-*.png` als eingefrorener Stand); die Schrift fällt
dann aus dem Export, 37 KB weniger. Die Werte liegen in
`docs/design/tonprobe/`: `mask-N.css` ist `mask.css` mit markierten
Zeilen („Probe 2“, „Probe 3“), `huelle-N.css` das, was Entwurf D selbst
festschreibt. Befund der Probe: nicht alles steht in `mask.css`.
`bausteine-N.css` nennt je Regel die Datei, in der der Wert heute fest
steht: Versalien in `textStyle.ts`, `formFieldStyle.ts`,
`kanbanStyle.ts`, `suggestionList.ts`; Stärke der Beschriftung dort und
in `tableStyle.ts`; Zeilenhöhe `ROWS_HEIGHT` in
`src/blocks/list/pageSize.ts` (heute 32, gestreckt auf 34); Strich im
leeren Feld, Abschnitte statt Karten (`areaStyle.ts`), Spalten, Knopf
und Pille im Kanban (`kanbanStyle.ts`, `src/blocks/parts/chip.ts`). Die
Übernahme fasst diese Dateien an, nicht nur `mask.css` und `editor.css`;
wo es geht, wird der feste Wert ein Wert aus `mask.css`. Die
Probedaten der Bilder sind erfunden und nicht im Code.

Urteil zu Entwurf D (14.10., Fable): D ist der erste Entwurf, der wie
ein Werkzeug aussieht: Rahmen und Blatt sind unterscheidbar, die rechte
Spalte zeigt alle Wahlen ohne Abschneiden, die Aktionen liegen offen.
Empfohlen, mit vier Auflagen für den Bau, siehe Chat 6a. Die Wahl des
Nutzers steht aus.

Chat 6a, Hülle und linke Spalte. Nach dem gewählten Entwurf:
`src/design/editor.css`, `src/editor/shell/EditorShell.tsx`, `Toolbar.tsx`,
`src/editor/sidebar/`, `src/editor/masks/MasksWindow.tsx` wird der Reiter
„Masken“ der linken Spalte. Die Leiste bleibt vorerst, wo sie ist.
Maske pixelgleich, Export und Referenzabzug unverändert. Auflagen aus
dem Urteil zu D:

- Das Blatt bleibt in echter Größe. D zeigt die Belegerfassung bei
  1148 px, weil zwei Spalten 532 px nehmen; die Maske ist aber für die
  Breite des SoftEngine-Fensters gelegt (1680 und mehr), und bei 1148 px
  fallen unten „Bestand“ und „Gesamtbetrag“ übereinander. Darum: die
  Leinwand rollt waagerecht, die Breite des Blatts ist wählbar
  („Fensterbreite“, 1680, 1920; Vorgabe 1680, gemerkt wie die Umrisse),
  und beide Spalten lassen sich mit einem Klick auf ihren Kopf
  einklappen; eingeklappt bleibt ein 36-px-Streifen mit den Reitern.
- Die rechte Spalte ist 320 px breit, damit „Hinweis in der Tippzeile“
  in eine Zeile passt.
- „Neu“ steht als beschrifteter Knopf oben im Reiter „Masken“ („Neue
  Maske“), nicht nur als Symbol; der erste Klick auf Speichern ohne
  Ordner zeigt den Reiter „Masken“ mit seiner Erklärung (Rest aus
  Chat 4).
- Jeder Baustein im Reiter „Bausteine“ trägt die Erklärzeile aus C als
  Tipp; die Zeile des markierten Bausteins ist in der Liste markiert.

Chat 6b, rechte Spalte mit den Wahlen der Leiste. `src/editor/bar/`
(`BlockBar.tsx`, `BarControl.tsx`, `BarFrame.tsx`) zieht in eine Spalte
`src/editor/inspector/`; `propertiesFor()` (`src/core/block/propertyPlace.ts`)
verteilt weiter nach `place`, nur das Ziel ist die Spalte. Die
Spaltenleiste (`ColumnBar.tsx`) am Spaltenkopf bleibt, sie gehört zur
Stelle auf der Leinwand.

Chat 6c, Einstellungen in die Spalte. `SettingsWindow.tsx` und
`ActionsSection.tsx` werden Abschnitte der Spalte; die Fensterchen an der
Leiste und der Streifen `BarStrip.tsx` verschwinden. Was ein Fenster
bleibt: Schritt (`StepWindow.tsx`), Daten, Suchfenster, Berechnung.
Die Entwürfe zeigen nur die Hülle; die Leinwand darin ist ein Bild des
heutigen Editors. Neu je Entwurf: A die Seiten als Reiter über dem Blatt,
jede Wahl der Leiste mit ihrem Namen als Rubrik darüber, die Masken als
Tabelle im Fenster; B die Masken als Streifen mit „Export nach“ unten,
„Masken“ blendet ihn ein und aus, die Bausteine nur als Symbol mit Tipp;
C das Fenster „Bausteine“ mit einer Zeile je Baustein, kein Streifen an
der Seite. In A bis C steht die Leiste weiter im festen Streifen unter
der Toolbar (seit 06.10.). D: ein Kopf von 44 px mit Name und Rahmen
links, den Seiten als Reitern in der Mitte, „Gespeichert 11:05“ statt
eines Knopfs (Strg+S bleibt) und Exportieren als einzigem blauen Knopf;
„Neu“ steht als Zeichen im Reiter „Masken“ neben „Ordner wählen“ und
„Datei laden“. Linke Spalte 232 px mit den Reitern „Bausteine“ (Tipp mit
der Erklärzeile aus C) und „Masken“ (wie B). Rechte Spalte 300 px
„Eigenschaften“: Kopf mit Symbol, Art, Text des Bausteins und Papierkorb,
die Wahlen der Leiste als Zeilen (Beschriftung links, Wahl rechts, lange
Beschriftungen brechen um statt abgeschnitten zu werden), darunter die
Gruppen aus „Einstellungen“ zum Auf- und Zuklappen; eine zugeklappte
nennt rechts kurz, was darin steht („2 Quellen“, „nichts“). Ein Ereignis
ohne Schritt zeigt nur seinen Namen und ein Plus. Ohne Markierung zeigt
die Spalte Name, Rahmen und Zielordner der Maske. Kopf und Spalten auf
`--se-panel-2` mit Haarlinien `--se-line`, das Blatt ist der einzige
weiße Fleck. Fenster bleiben nur für Aufgaben: Daten, Schritt,
Suchfenster, Spalten. Jedes Symbol gibt es schon
(`src/editor/icons/iconData.ts`).

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

Chats 8 bis 11, Durchsicht. Je Baustein dieselbe Prüfliste, Befunde beheben,
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
- Hausfarbe je Maske (Chat 8 oder 9, wo es billig ist): ein Wert an
  der Wurzel der Maske wählt den Akzent aus den Farben in `look.ts`
  (Blau, Petrol, Grün, Ocker), der Export setzt `--se-accent` und seine
  Abstufungen in der Maske um; Vorgabe Blau. Kunde A grün, Kunde B
  petrol, ohne eigenes CSS. Keine freien Farben.
- Bekannte Reste: Text mit Beschriftung rechtsbündig setzt die Rubrik
  links (Belegerfassung, „Beleg-Nr.“); Name im Band 4 px höher als in der
  Vorlage; schmale Spaltenköpfe der Behandlung brauchen breitere Spalten
  (Maske, Chat 10 darf `masken/behandlung` anfassen); „Trenner“ in der
  Feldwahl des Texts klar benennen; „Pflicht“ am Feld ist als Wahl da und
  in der Maske nicht zu sehen; im Empfang bricht der Titel „Kleintierpraxis
  am Lindenhof“ bei 1440 px um und liegt über „Empfang heute“, sein Umriss
  ist zu niedrig (seit Chat 1 im Editor zu sehen); bei einer Leinwand von
  1148 px (Entwurf D) zeigt die Belegerfassung „Besta“ statt „Bestand“,
  und der Betrag „Gesamtbetrag“ liegt über seiner Beschriftung.
- Jeder Durchsicht-Chat endet mit zwei Bildern je Maske, in der die Art
  vorkommt: Editor und Export, vorher und nachher.

Teil von Chat 10, doppeltes Zeichnen. Konsole: „Element ff-capture scheduled an
update after an update completed“, dasselbe für `ff-table`. Eine
Eigenschaft wird während des Zeichnens gesetzt. Ursache in
`src/blocks/capture/Capture.ts`, `src/blocks/list/recordList.ts`,
`src/blocks/base/heightReport.ts` oder `headsReport.ts`. Beheben, Maske
pixelgleich.

Chat 12, die Maske redet. Heute: `runEvent(...).catch(() => {})` an
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
