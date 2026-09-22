# Aufbau-Editor

Visueller Baukasten fuer HTML-Masken des ERP SoftEngine. Bausteine auf die
Flaeche ziehen, an ERP-Daten binden, exportieren als `index.basis.source.html`
plus `index.basis.SEvariablen.json`. Dieselben Lit-Elemente rendern im Editor
und in der Maske; was der Editor zeigt, ist der Export.

## Zusammenarbeit

- Der Nutzer programmiert nicht. Er baut Masken und testet sie in SoftEngine.
  Nur er kann pruefen, was SoftEngine wirklich tut.
- Berichte kurz, auf Deutsch, in Klartext: was geaendert, was nicht, was
  nicht geprueft werden konnte. Dazu eine Klickanleitung, wenn er etwas
  testen soll.
- Keine neuen Markdown-Dateien, keine Plaene oder Protokolle als Datei oder
  Kommentar. Kein Bericht endet mit einem Prompt fuer den naechsten Chat.
- Keine erfundenen Daten in Masken oder Tests: Striche statt Beispielwerte.
- Keine Extras, keine Schalter "zur Sicherheit", keine Tests ausser den zwei
  unten. Was heute keine Maske braucht, wird nicht gebaut.
- Ein Chat, eine Aufgabe. Nichts anfassen, was nicht dazu gehoert.

## Befehle

- `npm run dev`: Port 5300, fest (Browserspeicher haengt am Ursprung). Nie den
  Dev-Server des Nutzers starten oder beenden. `build:runtime`, `check` und
  `test` schreiben nach `src/export/generated/` und laden einen offenen Editor
  neu: vorher dem Nutzer sagen, er drueckt danach F5.
- Vor jedem Commit: `npm run check` (tsc + eslint) und `npm test`.
- `npm test` hat genau zwei Tests: der Starttest oeffnet die exportierte
  Referenzmaske im Browser (kein Fehler, jeder Baustein gezeichnet), der
  Referenzabzug vergleicht den Export byte-gleich mit `src/export/referenz/`.
  Aendert sich der Export gewollt: `REFERENZ_ERNEUERN=1` und im Commit sagen,
  was sich aenderte.
- Git: nur `master`, kein force-push, Dateien namentlich stagen, ein Thema =
  ein Commit. `se-quelle/` ist fremd und bleibt draussen.

## SoftEngine

- Es gilt nur, was der Nutzer selbst in SoftEngine gesehen hat.
  `docs/softengine-wiki/kontrakte.md` sammelt das; alles darin ohne den
  Vermerk "vom Nutzer getestet" ist eine Vermutung.
- Belegt: Bestellzettel schlank (nur VAR und SEFILELOOP), Listen holt die
  Maske nach dem Oeffnen per ERPAPICALL-Nachricht. Das ist die Bauweise.
- Installations-Individuelles (Feldcodes, Relations- und Werkzeugnummern,
  Individualfelder) ist Daten, nie Code. Je Kunde hunderte Felder.
- Nur `src/softengine/` kennt `window`, `SEDATA`, `selib` und Host-Funktionen.

## Umbau (Stand 22.09.2026)

Der Stand vor dem Umbau ist Commit `7ebe69c`. Er laeuft in SoftEngine.
Reihenfolge, je Schritt ein Commit, danach testet der Nutzer:

1. Sichern. Erledigt.
2. Fundament. Erledigt (Commits 4cd762f bis ee35c03): Englisch, je Baustein
   eine `properties.ts`, Store als einziger Zustandsort, Maske und
   Kundendatei (Datenquellen, Relationen) getrennt, beide auf der Platte,
   Vorgaben in `library/default.json`. Pruefsteine des Nutzers:
   `C:/Users/mu.aycetin/Desktop/Aufbau-Pruefstein/maske.json` und
   `bibliothek.json` muessen nach jedem Commit laden. Export mit englischen
   Attributen laeuft in SoftEngine WinUI (22.09.).
3. Bausteine: jeder Baustein ein geschlossener Ordner; Erfassung,
   Formularfeld, Kanban neu geschnitten; Lesen scheitert nicht still.
4. Datencenter, Inspector, Aktionen: Bedienung neu als Seitenleiste neben
   der Flaeche; Datenmodell bleibt. Konzept vorher mit dem Nutzer.
5. Ausmisten.

## Regeln

1. Code auf Englisch: Bezeichner, Dateien, Ordner, Export-Attribute,
   Kommentare. Deutsch nur in Texten, die der Nutzer sieht.
2. Lit fuer Bausteine, React fuer den Editor. Ein Baustein erbt von der einen
   Basisklasse, sonst erbt nichts von nichts.
3. Ein Baustein deklariert seine Eigenschaften einmal, mit Typ und Vorgabe.
   Daraus folgen Lit-Property, Inspector, Export und Laden. Keine Kopien
   dieser Liste, keine Booleans als Text.
4. Ein Bausteinordner ist in sich geschlossen und hat so viele Dateien, wie
   er braucht. Gemeinsamer Code nur, wenn mindestens zwei Bausteine ihn
   nutzen, und dann unter einem Namen, der sagt, was er tut. Kein `shared`,
   `utils`, `helpers`.
5. Editor und Maske zeigen dasselbe Element. Kein zweiter Zeichenweg.
6. Ein Zustand hat einen Besitzer. Der Editor-Store ist die Wahrheit,
   Lit-Elemente spiegeln nur deklarierte Eigenschaften.
7. Nichts scheitert still. Fehlende Quelle, fehlendes Feld, Host-Fehler:
   sichtbarer Grund statt leerer Stelle.
8. Kommentare nur, wenn der Code das Warum nicht zeigt. Ein bis zwei Zeilen.
   Kein Datum, kein Messwert, keine Grossbuchstaben, kein Regelverweis.
9. Technikwert ist nicht Anzeigename: Feldcodes und Nummern arbeiten
   unsichtbar, der Bediener sieht Klartext.
10. `strict` bleibt an. Kein `any`, kein `as unknown as`, kein
    `Record<string, unknown>` als Ersatz fuer einen Typ.
