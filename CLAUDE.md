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

Das Repo wird von innen nach aussen neu gebaut. Festpunkte, die sich nicht
aendern: das Exportformat, die SoftEngine-Kontrakte, die Regeln unten. Alles
andere darf fallen, auch das gespeicherte Maskenformat. Reihenfolge:

1. Regeln (diese Datei). Erledigt.
2. Kern: Maskenmodell, Faehigkeitsmodell, Laufzeitvertrag, SoftEngine-Tuer.
3. Bausteine, einer nach dem anderen. Die Tabelle ist das Muster; wer danach
   einen Baustein umbaut, baut ihn wie die Tabelle.
4. Editor: Flaeche, Palette, Inspector, Datencenter, Design.
5. Ausmisten: Tests und Dateien, die niemand mehr braucht.

Jeder Schritt endet gruen (Pruefbuendel) und mit einem Export, den der Nutzer
in SoftEngine oeffnet. Alt und neu duerfen waehrend eines Schritts nebeneinander
stehen, nie ueber einen Schritt hinaus.

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
