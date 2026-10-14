# Aufbau-Editor

Visueller Baukasten fuer HTML-Masken des ERP SoftEngine (WinUI, Edge
WebView2). Export: `index.basis.source.html` + `index.basis.SEvariablen.json`.
Dieselben Lit-Elemente laufen im Editor und in der Maske; was der Editor
zeigt, ist die Maske.

## Befehle

- `npm run dev`: Port 5300, fest. `build:runtime` laeuft vor `dev`, `build`
  und `test` und schreibt nach `src/export/generated/`.
- Vor jedem Commit: `npm run check` und `npm test`, beide gruen. Masken ab
  Schema 20 (seit 24.09.) und Kundendateien jeder Fassung muessen danach
  weiter laden. Der Uebersetzer der Kundendatei
  (`src/editor/state/librarySchema.ts`) verliert nie eine Stufe.
- Aendert sich der Export gewollt: `REFERENCE_REFRESH=1 npm test` und im
  Commit sagen, was sich aenderte.
- Git: kein force-push. `se-quelle/` ist fremd und bleibt draussen.
  Sicherungsstand vor dem Aufraeumen: c0c375a (master bis 24.09.).

## Doku

- `docs/offen.md`: was als Naechstes kommt, der einzige Plan.
  `docs/entschieden.md`: Entscheidungen mit Datum. `docs/bedienung.md`:
  wie der Editor bedient wird. `docs/architektur.md`: wie der Code gebaut
  ist. `docs/softengine-wiki/`: alles ueber SoftEngine (`kontrakte.md`
  nur per Echttest belegt, `funktionen.md` nur abgelesen).
- Masken unter `masken/` werden committet (seit 14.10.), im selben
  Commit wie der Schritt, der sie aendert.
