# Aufbau-Editor

Visueller Baukasten fuer SoftEngine-Masken: Bausteine auf die Flaeche ziehen,
an ERP-Daten binden, als `index.basis.source.html` + `index.basis.SEvariablen.json`
exportieren. Die Maske laeuft in SoftEngine ohne Nacharbeit. Was der Editor
zeigt, IST der Export: dieselben Lit-Elemente rendern im Editor (Attribut
`data-ff-editor`) und in der Maske.

## Zusammenarbeit

- Der Nutzer programmiert nicht. Er baut Masken und testet sie in Browser und
  SoftEngine. Was nur in SoftEngine sichtbar ist, kann nur er pruefen.
- Berichte in Klartext, kurz, mit Klickanleitung (was oeffnen, was tun, was zu
  sehen sein muss) und dem Satz, was nicht geprueft werden konnte.
- Keine neuen Markdown-Dateien. Keine Plaene, Protokolle oder Befund-Listen,
  weder als Datei noch als Kommentar. SoftEngine-Wissen steht in genau einer
  Datei: `docs/softengine-wiki/kontrakte.md`.
- Keine Rueckfragen, wo Strg+Z reicht. Keine Demo-Daten: Striche statt
  erfundener Werte.
- Wer beim Umbau auf etwas stoesst, das das Muster (Regel 2, 11) nicht
  abdeckt, erfindet nichts, sondern meldet dem Nutzer: "passt nicht ins
  Muster", mit Datei und Satz, was fehlt. Dann entscheidet der Nutzer.
- Ein Chat, eine Aufgabe. Kein Bericht endet mit einem Prompt fuer den
  naechsten Chat. Wer einen will, fragt danach.

## Befehle

- `npm run dev`: Port 5300, fest, weil der Browserspeicher am Ursprung haengt.
  Der Dev-Server beobachtet `src/export/generated/`; `build:runtime`, `npm
  test` und `npm run dev` schreiben dort 60 Dateien und laden damit jeden
  offenen Editor im Browser mehrfach neu, mitten im Bau mit leeren Dateien.
  Darum: Kein Chat baut oder testet, waehrend der Nutzer im Editor arbeitet,
  und kein Chat beendet oder startet den Dev-Server des Nutzers. Wer das
  Pruefbuendel laufen lassen will, sagt es vorher; der Nutzer drueckt danach
  F5. Am 15.09. sah das im Browser aus wie ein Absturz beim Ziehen.
- Pruefbuendel vor jedem Commit: `npm run check`, `npm run build:runtime`,
  `npm test`. `build:runtime` baut die Laufzeit in `src/export/generated/`;
  ohne den Lauf exportiert der Editor alten Code.
- Starttest: `src/export/laufzeitStartet.test.ts` oeffnet die exportierte
  Referenzmaske in einem Browser und verlangt: kein Fehler, jeder Baustein
  angemeldet und gezeichnet. Nur er sieht eine weisse Maske; gruene
  Bau-Tests allein sehen sie nicht. Braucht einmal `node
  node_modules/playwright-core/cli.js install chromium-headless-shell`.
- Referenzabzug: `src/export/referenzabzug.test.ts` vergleicht den Export einer
  festen Maske byte-gleich mit `src/export/referenz/`. Rot heisst: der Export
  hat sich geaendert. Gewollt: `REFERENZ_ERNEUERN=1 npx vitest run
  src/export/referenzabzug.test.ts` und im Commit sagen, was sich aenderte.
- Bilder des Editors: `node tools/sichtprobe.cjs standard` bei laufendem
  Dev-Server.
- Git: nur `master`, kein force-push, Dateien namentlich stagen, ein Thema =
  ein Commit. `se-quelle/` ist ein fremdes Repo und bleibt draussen.

## Umbau

Das Repo wird von innen nach aussen neu gebaut. Festpunkte: das Exportformat,
die SoftEngine-Kontrakte, die Regeln unten. Alles andere darf fallen.

Stand 16.09.2026: Schritt 1 und 2 sind fertig (Commits 09dd63d bis b784f20).
Der Kern spricht Deutsch, Faehigkeiten stehen in einer Liste, SoftEngine
sitzt hinter der Tuer, die Ordner heissen kern, bausteine, editor. Tabelle
(5465141), Erfassung und Formularfeld sind umgebaut: je hoechstens drei
Dateien, die gemeinsame Zeilenliste steckt als Faehigkeit `listenStand.ts` in
den ersten beiden, das Nachschlagen als `nachschlagFeld.ts` im dritten, jede
Faehigkeit ein eigener Laufzeitteil; der SoftEngine-Test des Nutzers steht
fuer alle drei aus. Wer neu
einsteigt: erst `npm run check` und `npm test` (muessen gruen sein), dann
`git log -12`, dann diese Datei ganz. Keine Datei anfassen, die nicht zum
laufenden Schritt gehoert.

1. Regeln. Erledigt.
2. Kern. Erledigt.
3. **Bausteine, die Tabelle zuerst als Muster.** Tabelle, Erfassung und
   Formularfeld erledigt. Danach die uebrigen Bausteine genau so,
   Reihenfolge: Text, Datum, Button, Popup, Kanban mit Card, Trenner,
   Anmeldung. Kein Baustein bleibt alt: die Palette ist das Produkt.
   „Kanban (neu)“ (`bausteine/tafel/`, ein Baustein ohne Kinder) steht zum
   Vergleich neben dem alten Kanban; er ersetzt ihn erst nach dem Test des
   Nutzers, dann mit Umwandlung alter Masken.
4. Editor: Flaeche, Palette, Inspector, Datencenter, Design. Das Datencenter
   wird gegen kontrakte.md neu gedacht, nicht aus dem heutigen Code
   abgeschrieben: Quellenarten nach Abschnitt 4, 4a, 4c (Bestellung,
   REFRESH, GET_RELATION), Schreiben nach 7, Positionen lesen nach 8,
   DataSet nach 17; dazu Punkt 4 der Liste "Offen" unten. Wuensche des
   Nutzers dazu: Datencenter und Berechnungen nicht als Vollbild, sondern
   neben der Flaeche, damit die Maske sichtbar bleibt. Eine Standardgroesse
   fuer alle Suchfenster gehoert zur Maske (Datencenter), das einzelne Feld
   erbt sie und darf abweichen; dazu "Fuer alle uebernehmen". Dazu:
   "Notfallkopie wiederherstellen" laesst die Kopie waehlen (Datum, Zahl der
   Bausteine und Datenquellen), statt blind die juengste zu nehmen. Am 15.09.
   war die juengste leer, die 20 Datenquellen lagen in einer aelteren.
5. Ausmisten: Tests und Dateien, die niemand mehr braucht.

Kleine Aufgaben vor den uebrigen Bausteinen, je ein Commit mit einem Test,
Punkte 1 bis 5 im Browser belegt am 15.09.:

1. Gebaut, Echttest des Nutzers steht aus: In SoftEngine landete ein Klick in
   keinem Feld, erst Oeffnen und Schliessen der Entwicklerkonsole half.
   Belegt am 15.09. im Layoutrahmen 00001 der Belegerfassung, eine Maske ohne
   Rahmen (STDERFASSUNG 990) war nie betroffen. Der Kopf war unschuldig: die
   Erfassung beantwortete SoftEngines Fokus-Ruf ungeprueft mit "erledigt",
   damit blieb `basis_HTML_DoSetAutoFocus()` aus, das dem WebView als
   einziges die Tastatur gibt (kontrakte.md 13). Der Ruf gehoert nicht in
   einen Baustein: die Bruecke antwortet jetzt selbst mit `fokusBeiUns()`,
   `SE_FOKUS_EVENT` und `nimmSeFokus` sind weg. Dafuer springt der Fokus aus
   dem ERP nicht mehr in die Erfassungszeile; Insert tut es weiter.
2. Entfernen, Duplizieren und Rueckgaengig wirken bei offenem Datencenter
   auf den Baustein dahinter (`useKeyboardShortcuts.ts`). Sie halten sich wie
   Escape an `fensterOffen()`. Popup-Bausteine auf der Flaeche bleiben davon
   unberuehrt.
3. Die Feldwahl ueberschreibt einen von Hand gesetzten Spaltentitel
   (`FeldBindung.tsx`). Der Klarname kommt nur in einen leeren oder noch
   nie geaenderten Titel. Regel dazu: wer einen gespeicherten Schluessel
   umbenennt, laedt alte Masken weiter, und ein Test beweist es.
4. Erledigt: "Duplizieren" am Popup kopiert das Fenster samt Inhalt
   (`duplizieren.ts`, `Editor.ts`). Eine Seite liegt in keinem Raster: die
   Kopie bekommt statt einer Position den naechsten freien Namen, und der
   Editor wechselt auf sie. Beweis: `duplizieren.test.ts`.
5. Erledigt, Echttest des Nutzers steht aus: Das Suchfenster stand nur hinter
   der Lupe auf der Flaeche. Die Faehigkeit Nachschlagen bringt jetzt ihre
   Inspector-Bedienung mit (Regel 2): der Abschnitt „Suchfenster" zeigt seine
   Spalten, stellt Breite und Hoehe und macht das Fenster auf — an jedem
   Baustein mit der Faehigkeit, heute Formularfeld und Erfassung. Die Tabelle
   hat kein Suchfenster; bekommt sie eines, steht es ohne Zutun am selben Ort.
6. Gebaut, Echttest des Nutzers steht aus: Kern und Bruecke sind
   Laufzeitteile wie die Faehigkeiten (`tools/laufzeitBauen.mjs`). Die Basis
   traegt nur noch, was jede Maske braucht (Fehlerwache, Grundbaustein und
   was die beiden holen), und faellt von 57 auf 26 kB; jede andere Datei aus
   `kern/` und `softengine/` reist als eigener Teil mit dem Baustein, der sie
   importiert. Beweis: `exportGepaeck.test.ts`, eine Maske aus einem Trenner
   bleibt unter 40 kB. Was kein Baustein erreicht, wird nicht mehr gebaut.

Was die Tabelle als Muster heisst:

- `bausteine/tabelle/` hat am Ende hoechstens drei Dateien: Verhalten
  (`Tabelle.ts`), Stil, Test. Was heute in zwanzig Dateien steht, wird Teil
  der Tabelle oder eine Faehigkeit in `bausteine/faehigkeiten/` (Spalten,
  Nachschlagen, Datenanschluss, Auswahl), die auch Formularfeld und Erfassung
  einstecken. Eine Faehigkeit ist eine Datei mit Zustand und Verhalten, die
  der Baustein im Konstruktor anlegt; kein Mixin, keine Vererbung.
- Die Eigenschaften der Tabelle heissen deutsch (`quelle` statt `source`,
  `breite` statt `width`). Damit aendern sich Export-Attribute: Referenzabzug
  erneuern und im Commit sagen, welche.
- Das Formularfeld importiert keinen Baustein mehr (erledigt): die Faehigkeit
  Nachschlagen holt die Tabelle des Suchfensters selbst, denn sie zeichnet es.
  Jede Maske mit Nachschlagen traegt damit den Teil `tabelle`.
- Die Erfassung erbt nicht mehr von der Tabelle (erledigt): ein eigener
  Baustein, der dieselben Faehigkeiten einsteckt und Erfassen dazu. Was beide
  gleich brauchen, steckt in `faehigkeiten/listenStand.ts`; der Baustein
  haelt nur noch seine Eigenschaften und seine eigenen Naehte.
- Optik: Kopf folgt der Zeilenhoehe, Fuss nur mit Inhalt (erledigt in
  5465141). Bei eingeschalteter Kopfzeile stehen die Spaltentitel nicht noch
  einmal in den Zellen der Erfassung; der Platzhalter dort gilt nur ohne
  Kopfzeile. Eine Berechnung ohne gewaehlte Spalten wird nicht exportiert.
  Beides erledigt.
- Jede Faehigkeit ist ein eigener Laufzeitteil (erledigt in 5465141); eine
  Maske traegt nur, was ihre Bausteine einstecken. Beweis:
  `src/export/exportGepaeck.test.ts` exportiert drei Masken und nennt je
  Laufzeitteil die Groesse im Testbericht. Rot mit Ansage (`test.fails`): das
  Textfeld zieht ueber die Faehigkeit Quelle sieben Faehigkeiten nach; wer
  das Textfeld umbaut, macht daraus einen gewoehnlichen `test`.
- Am Ende: Pruefbuendel gruen, Export, der Nutzer testet in SoftEngine.

Offen aus dem Echttest vom 15.09. (Belege in kontrakte.md ab Abschnitt 17),
jeder Punkt ein eigener Commit und ein SoftEngine-Test durch den Nutzer:

1. Erledigt: Export ohne `JWHtmlStart`/`JWHtmlEnde`, die Bruecke per
   Skriptzeile (kontrakte.md 1 und 13).
2. Wartet auf SoftEngine: `bridge.ts` `frischeDatenAnfordern` bestellt nach
   dem Schreiben nichts. `ReloadInputJSON` ist eine Nachricht und verlangt
   ein Feld `ID` (kontrakte.md 7); welche ID, zeigt kein Aufruf in den
   Vorlagen. Nicht raten. Erst entscheidet der Echttest des Nutzers, ob
   SoftEngine nach einem PUT von selbst neu liefert; wenn nicht, die Antwort
   von SoftEngine, was `ID` ist.
3. Erledigt: kein `basisHTML_SetConsoleLog(true, true)` mehr in der Maske.
4. Startpaket: GET_RELATION-, REFRESH- und TABELLE-Bloecke in den SEvariablen
   als neue Quellenarten. DATASET bleibt: ob der Block traegt, ist nicht per
   Echttest belegt (kontrakte.md 17); erst der Test des Nutzers entscheidet.
5. Nicht bauen: alle Artikel vorladen. Nachschlagen sucht beim Tippen.
6. Gebaut, Echttest steht aus: ein BW_LINK-Schritt geht wie SoftEngines
   `sendBWLinkIntern` als `HTMLEVENT { art: 'BWLINK', params }` hinaus, ein
   Befehl mit START_TOOL als START_TOOL-Nachricht (kontrakte.md 13). Erst
   nach dem Test des Nutzers "Erledigt" und in kontrakte.md 13 der Vermerk
   "nicht per Echttest" weg.
7. Nicht anfassen, bis ein Echttest es zeigt: die drei Zeitschleifen in
   `bridge.ts` und `relations.ts` (Datenankunft, Nachlauf bei Fokus,
   Antwort auf GET). Neben jeder laeuft ein Rueckruf; die Schleife ist das
   Netz darunter. Ob SoftEngine den Rueckruf immer liefert, weiss niemand
   ohne Test (Regel 7). Erst dann faellt die Schleife.

So laeuft jeder Baustein in Schritt 3, ohne Ausnahme:

1. `npm run check` und `npm test` gruen, `git status` leer. Sonst anhalten.
2. Nur diesen einen Baustein und die Faehigkeiten, die er braucht. Andere
   Bausteine bleiben, wie sie sind, auch wenn sie haesslich sind.
3. Nach dem Umbau: Pruefbuendel gruen, Referenzabzug erneuern, wenn er rot
   ist, und im Commit jede geaenderte Attribut- oder Schluesseländerung
   nennen. Die Verhaltensdatei heisst wie der Baustein (`Tabelle.ts`, nicht
   `TabelleBlock.ts`); ab dann prueft `tools/bausteinPruefen.mjs` (Teil von
   `npm run check`) die Bauweise: Dateizahl, keine shared-Importe, kein Erben,
   deutsche Eigenschaften, gemeldete Faehigkeiten, Kommentardichte. Ein
   Baustein ist erst fertig, wenn er dort ohne Beanstandung steht. Gruene
   Tests allein beweisen nur, dass er laeuft, nicht, dass er gut gebaut ist.
4. Dem Nutzer eine Klickanleitung geben: Baustein anlegen, Quelle binden,
   exportieren, in SoftEngine oeffnen. Erst nach seinem "laeuft" der
   naechste Baustein.
5. Anhalten und fragen, wenn: eine Faehigkeit fehlt, die zwei Bausteine
   verschieden brauchen; ein Kontrakt in kontrakte.md nicht zu dem passt, was
   der Code tut; eine Aenderung den Export anders aendert als erwartet.

## Fachliche Festlegungen

Was der Nutzer entschieden hat und kein Code von sich aus wuesste.

- **Tabelle und Erfassung.** Zwei Bedeutungen, getrennt gehalten:
  Zellherkunft (getippt, aus Daten, berechnet) und Schreibstatus (vorgemerkt,
  gesendet, bestaetigt, gescheitert). Ein abgeschickter Wert ist nicht
  bestaetigt; erst die naechste Lieferung beweist ihn. Ein unklarer Ausgang
  bleibt sichtbar unklar, kein automatischer zweiter Versuch. Farbe oder
  Kursiv allein tragen keine Bedeutung. Spaltenkennung, Platz in der vollen
  Liste und sichtbarer Platz sind drei Dinge; Ausblenden aendert keine
  ERP-Zuordnung.
- **Berechnung.** Eine Produktgleichung ueber Spalten derselben Zeile, Felder
  des gewaehlten Datensatzes und feste Zahlen; drei Werte ergeben den vierten.
  Kein Gleichungsloeser, keine Hilfsspalten, keine Packungslogik. Einheiten
  kg, g, mg, l, ml, Anzahl, Tage; Masse nur in Masse, Volumen nur in Volumen.
  Gerundet wird das Endergebnis. Fehlender Wert, unbekannte Einheit,
  ungueltige Zahl, Teilen durch null: ein benannter Grund statt einer
  scheinbar gueltigen Zahl. Gestrichene Spalte oder Quelle: die Berechnung
  bleibt sichtbar unvollstaendig.
- **Kanban.** Eine Kartenvorlage je Board, bearbeitet an der echten Karte
  statt in einem dauernd sichtbaren Musterkasten. Laufzeitkarten nutzen
  dieselbe Vorlage. Der sichtbare Name der Unterteilung (`kanban-zimmer`) ist
  mit dem Nutzer zu entscheiden.
- **Offen, nur der Nutzer kann es sagen:** Feldlaenge der Behandlungseinheit
  und Zeitbasis der Behandlungsmenge; Nachkommastellen fuer Tiere und Tage;
  was SoftEngine an Bestaetigung fuer schreibende Aktionen wirklich liefert.

## Aufbau (Ziel)

- `src/kern/`: fachlicher Kern ohne Framework, der Lint erzwingt das.
  Maskenmodell (Baum, Baustein, Faehigkeit), Quellen, Relationen, Ketten,
  Berechnung. Kennt weder Browser noch SoftEngine noch Editor.
- `src/bausteine/`: je Baustein ein Ordner mit hoechstens Verhalten, Stil und
  Test. `bausteine/grund/` ist der Grundbaustein. `bausteine/faehigkeiten/`
  haelt, was mehrere Bausteine einstecken (Spalten, Nachschlagen, Erfassen).
- `src/softengine/`: die einzige Stelle, die SoftEngine kennt (Anmeldung,
  Daten, Relationen, Aktionen). Kennt keinen Baustein.
- `src/export/`: schreibt die Maske. `validator.ts` prueft nur die Dateiform.
- `src/editor/`: Zustand und Bedienung (React). Editor-Hilfen leben im Wirt um
  den Baustein, nie im Baustein.
- Design: `src/design/maske.css` (`--se-*`) fuer die Maske, `src/design/editor.css`
  fuer den Editor. Nie mischen; die Maske laeuft ohne Editor.

## Regeln

1. **Eine Render-Quelle.** Editor und Maske zeigen dasselbe Element. Kein
   zweiter Zeichenweg, keine React-Fassung eines Bausteins.
2. **Stecken statt erben.** Genau eine Erbstufe: Baustein erbt vom
   Grundbaustein, der von LitElement. Nie Baustein von Baustein. Was mehrere
   Bausteine koennen, ist eine Faehigkeit, die der Baustein einsteckt. Eine
   Faehigkeit bringt ihre Eigenschaften, ihre Inspector-Bedienung, ihren
   Export-Anteil und ihr Laufzeitverhalten selbst mit. Editor, Export und
   Laufzeit fragen die Faehigkeiten; nie `if typ === 'tabelle'`.
3. **Eine Sprache: Deutsch.** Bezeichner, Dateien, Ordner, Kommentare.
   Ausnahmen: Namen aus Lit, React, DOM und Node; SoftEngine-Namen wie
   `START_TOOL`, `GET_RELATION`, `SEDATA`; eingefuehrte Fachbegriffe wie
   Inspector. Bestehende englische Namen werden beim Umbau umbenannt, nicht
   geschont.
4. **SoftEngine hinter einer Tuer.** Nur `src/softengine/` fasst `window`,
   `SEDATA`, `selib` und die Host-Funktionen an. Bausteine bekommen Daten
   gereicht und rufen benannte Funktionen; sie kennen die Form der Globals
   nicht.
5. **Technikwert ist nicht Anzeigename.** Feldcodes, Relations- und
   Werkzeugnummern arbeiten unsichtbar. `START_TOOL`, `GET_RELATION`,
   `PUT_RELATION` bleiben als Fachworte sichtbar.
6. **Nichts scheitert still.** Laufzeitfehler gehen ueber `meldeFehler` in den
   Balken, eine Kette bricht mit Klartext ab, vor Datenverlust gibt es eine
   Notfallkopie.
7. **Kontrakte nur aus Echttests**, festgehalten in `kontrakte.md`.
   Installations-Individuelles (Relations-Nummern, Werkzeug-Nummern, Felder)
   sind Daten, nie Code.
8. **Der SoftEngine-Browser ist Edge WebView2** und aktuell. Was der
   Editor-Browser kann, kann die Maske.
9. **Tabellen-Spalten:** Zustand und ERP-Kontrakt haengen am Platz in der
   vollen Spaltenliste; gefiltert wird nur beim Zeichnen.
10. **Ein Test pro Vertrag.** Tests beweisen: Export byte-gleich, Dateiform,
    SoftEngine-Antworten, Berechnung, Laden und Sichern. Kein Test je Getter,
    kein Test fuer Innereien, die morgen anders heissen.
11. **Eine Datei, eine Sache.** Kein Ordner `shared`, `utils`, `helpers`. Eine
    Datei sagt in ihrer ersten Zeile, wofuer sie da ist, und hat keine zweite
    Aufgabe. Ein Bausteinordner mit mehr als drei Dateien ist ein Fehler.
12. **Kommentare sagen, warum**, in ein bis zwei Zeilen. Kein Kommentar
    beschreibt, was der Code tut, keiner erzaehlt Geschichte.
13. **Eine Einstellung, ein Ort.** Gehoert sie zum Baustein: Inspector.
    Gehoert sie zur Maske: Datencenter. Die Flaeche zeigt, sie bedient nicht.
14. **Kein Vorrat.** Nichts wird gebaut, was heute keine Maske braucht. Kein
    Plugin-System, keine Dependency Injection, kein Event-Bus, keine
    Skriptsprache.

Echte SoftEngine-Masken zum Vergleich: `docs/chef-maske/`.
