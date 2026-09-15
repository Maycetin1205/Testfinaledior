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

## Befehle

- `npm run dev`: Port 5300, fest, weil der Browserspeicher am Ursprung haengt.
- Pruefbuendel vor jedem Commit: `npm run check`, `npm run build:runtime`,
  `npm test`. `build:runtime` baut die Laufzeit in `src/export/generated/`;
  ohne den Lauf exportiert der Editor alten Code.
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

Stand 15.09.2026: Schritt 1 und 2 sind fertig (Commits 09dd63d bis b784f20).
Der Kern spricht Deutsch, Faehigkeiten stehen in einer Liste, SoftEngine
sitzt hinter der Tuer, die Ordner heissen kern, bausteine, editor. Wer neu
einsteigt: erst `npm run check` und `npm test` (muessen gruen sein), dann
`git log -12`, dann diese Datei ganz. Keine Datei anfassen, die nicht zum
laufenden Schritt gehoert.

1. Regeln. Erledigt.
2. Kern. Erledigt.
3. **Bausteine, die Tabelle zuerst als Muster.** Danach die uebrigen
   Bausteine genau so.
4. Editor: Flaeche, Palette, Inspector, Datencenter, Design.
5. Ausmisten: Tests und Dateien, die niemand mehr braucht.

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
- Die Erfassung erbt danach nicht mehr von der Tabelle. Sie wird ein eigener
  Baustein, der dieselben Faehigkeiten einsteckt und Erfassen dazu.
- Am Ende: Pruefbuendel gruen, Export, der Nutzer testet in SoftEngine.

Offen aus dem Echttest vom 15.09. (Belege in kontrakte.md ab Abschnitt 17),
jeder Punkt ein eigener Commit und ein SoftEngine-Test durch den Nutzer:

1. Export ohne `JWHtmlStart`/`JWHtmlEnde`. SoftEngine ersetzt den Marker
   durch 56 Skripte und 41 Stylesheets (1,7 MB), die Maske braucht nur
   `basis.html.interface.js`. Handtest in WinUI bestanden. Aendert den
   Festpunkt Export: `exportMask.ts`, `validator.ts`, Referenzabzug,
   kontrakte.md 1 und 13. Nur mit ausdruecklichem Ja des Nutzers.
2. `bridge.ts` `frischeDatenAnfordern`: `ReloadInputJSON` gibt es in
   SoftEngine nur als Nachricht (`basisHTML_SND_MSG`), nicht als Funktion.
   Der Ruf laeuft heute ins Leere. Echttest noetig.
3. `basisHTML_SetConsoleLog(true, true)` gehoert nicht in die fertige Maske.
4. Startpaket: GET_RELATION-, REFRESH- und TABELLE-Bloecke in den SEvariablen
   als neue Quellenarten; DATASET ist beim Hersteller unbelegt und faellt.
5. Nicht bauen: alle Artikel vorladen. ERPAPICALL deckelt bei 1000 Zeilen,
   SEFILELOOP dauert 7 s. Nachschlagen sucht beim Tippen.

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
