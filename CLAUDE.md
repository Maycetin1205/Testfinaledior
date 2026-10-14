# Aufbau-Editor

Visueller Baukasten fuer HTML-Masken des ERP SoftEngine (WinUI, Edge
WebView2). Export: `Rahmen<Nr>.basis.source.html` + `.SEvariablen.json`.
Dieselben Lit-Elemente laufen im Editor und in der Maske.

- `npm run dev`, Port 5300. Vor jedem Commit `npm run check` und `npm test`
  gruen. Aendert sich der Export gewollt: `REFERENCE_REFRESH=1 npm test`,
  im Commit sagen, was.
- Nichts Neues ohne Maske, die es braucht: keine neue Einstellung, kein
  Schalter, kein Fenster, keine Zusatzidee. Die Decke steht in
  `src/editor/state/settingsInventory.test.ts`.
- Das Aussehen wird nicht nebenbei geaendert: erst ein Bild, dann das Ja
  des Nutzers, dann der Bau. Keine erfundenen Daten im Editor.
- `masken/` gehoert dem Nutzer und liegt nicht im Projekt.
- Was SoftEngine wirklich tut, steht in `docs/softengine-wiki/kontrakte.md`,
  nur per Echttest belegt. Git: kein force-push, `se-quelle/` bleibt draussen.
