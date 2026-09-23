# Aufbau-Editor

Visueller Baukasten fuer HTML-Masken des ERP SoftEngine (WinUI, Edge
WebView2). Export: `index.basis.source.html` + `index.basis.SEvariablen.json`.
Dieselben Lit-Elemente laufen im Editor und in der Maske; was der Editor
zeigt, ist die Maske.

## Regeln des Nutzers

Nur diese gelten. Aeltere Regeln aus frueheren Fassungen dieser Datei sind
hinfaellig.

1. Der Nutzer programmiert nicht und liest am Handy. Berichte kurz, auf
   Deutsch, in Klartext, mit Klickanleitung. Kein Bericht endet mit einem
   Prompt fuer den naechsten Chat.
2. Keine Meldungen, Hilfetexte, Warnungen oder Platzhaltersaetze, weder im
   Editor noch in der Maske. Fehlt eine Quelle, ein Feld oder eine Antwort,
   bleibt die Stelle leer. Ein abgelehntes Schreiben bleibt unsichtbar.
3. Keine neuen Funktionen, keine Sicherheitsnetze, keine neuen Tests, bis
   der Nutzer es sagt. Die zwei Tests bleiben: Referenzabzug und Starttest.
4. Nichts erfinden. Farben, Schrift, Masse, Rundungen und Bauteile kommen
   aus `docs/chef-maske/empfang/index.basis.source.html`: dicht, Rundung
   4 px, keine Pillen, keine Luft. Das gilt fuer die Maske und fuer den
   Editor.
5. Bedienen statt eintippen: Text direkt auf der Flaeche, Groesse an allen
   vier Kanten ziehen, wenige Wahlmoeglichkeiten in einem kleinen Pop-up am
   Baustein, Feld binden durch Klick auf die Stelle. Kein Vollbild-Dialog.
6. Code auf Englisch: Bezeichner, Dateien, Attribute, CSS-Klassen, Ereignisse,
   Kommentare. Deutsch nur, was der Bediener sieht. Keine weitere
   Umbenennung der Sprache.
7. Ein Chat, eine Aufgabe. Ein Thema, ein Commit. Keine Plaene, keine neuen
   Markdown-Dateien. Vorhandenes wird ersetzt, nicht ergaenzt.
8. Technik: Lit fuer Bausteine mit genau einer Basisklasse, React fuer den
   Editor, ein Store als einzige Wahrheit, jede Eigenschaft einmal deklariert
   (daraus Inspector, Export, Laden). Installations-Individuelles (Feldcodes,
   Relations- und Werkzeugnummern) ist Daten, nie Code. Nur `src/softengine/`
   kennt `window`, `SEDATA`, `selib` und Host-Funktionen.
9. Ueber SoftEngine gilt nur, was der Nutzer selbst gesehen hat:
   `docs/softengine-wiki/kontrakte.md`. Belegt am 23.09.: Lesen und
   Schreiben laufen; ERPAPICALL als Nachricht nach dem Oeffnen ist deutlich
   schneller als die Bestellung im Zettel und ist die Bauweise.
10. Befunde, Bausteinliste und Reihenfolge: `docs/pruefbericht-2026-09-23.md`.

## Befehle

- `npm run dev`: Port 5300, fest. `build:runtime` laeuft vor `dev`, `build`
  und `test` und schreibt nach `src/export/generated/`.
- Vor jedem Commit: `npm run check` und `npm test`, beide gruen. Gespeicherte
  Masken und Kundendateien muessen danach weiter laden.
- Aendert sich der Export gewollt: `REFERENCE_REFRESH=1 npm test` und im
  Commit sagen, was sich aenderte.
- Git: kein force-push. `se-quelle/` ist fremd und bleibt draussen.
  Sicherungsstand vor dem Aufraeumen: Tag `stand-vor-aufraeumen` (c0c375a).
