# EditorAufbauV3 – Finaler Refactoring- und Architekturplan

## 0. Ziel

Der bestehende Editor wird schrittweise zu einem **modularen Monolithen mit klaren, gerichteten Abhängigkeiten** umgebaut.

Ziel ist kein theoretisch perfektes Architekturschaubild, sondern ein System, das:

- verständlich ist,
- vorhersehbar funktioniert,
- leicht verändert werden kann,
- keine versteckten globalen Abhängigkeiten besitzt,
- bestehende Projekte und Exporte schützt,
- unter Node testbare Fach- und Exportlogik besitzt,
- React, Lit, Browser und SoftENGINE sauber voneinander trennt,
- und nach dem Umbau **weniger kompliziert** ist als vorher.

Grundsatz:

> Architektur dient dem Code. Der Code dient nicht dem Architekturdiagramm.

Es werden keine Abstraktionen eingeführt, nur damit die Architektur symmetrischer oder theoretisch sauberer aussieht.

---

# 1. Grundprinzipien

## 1.1 Klare Abhängigkeitsrichtung

Die grobe Struktur lautet:

```text
UI
↓
Application
↓
Core

Compiler / Export Preparation
↓
Core

SoftENGINE Target
↓
Compiler / Core

Browser- und SoftENGINE-Adapter
→ implementieren äußere Abhängigkeiten der Application

Bootstrap / Composition Root
→ darf alle Teile kennen und miteinander verbinden
```

Nicht erlaubt:

```text
Core → React
Core → Lit
Core → Browser
Core → SoftENGINE
Core → Editor UI
Core → localStorage

Compiler → React
Compiler → Lit
Compiler → DOM
Compiler → Browser-Datei-APIs

innere Module → Bootstrap
```

Import-Abhängigkeit und Runtime-Control-Flow sind nicht dasselbe. Äußere Adapter dürfen Interfaces oder Funktionen innerer Schichten implementieren beziehungsweise aufrufen. Innere Schichten kennen aber niemals konkrete äußere Implementierungen.

---

# 2. Kein Architekturtheater

Während des Refactors werden ausdrücklich nicht eingeführt:

```text
Redux-Ersatz
Event Sourcing
Command Bus
globaler Event Bus
DI-Framework
Service Locator
Microservices
Monorepo nur aus Architekturgründen
generisches Plugin-System
TargetRegistry
TargetFactory
TargetPlugin
universelles Formularsystem
vorsorgliche Template Engine
Coverage-Ziel
hunderte triviale Tests
tiefe OOP-Vererbungshierarchien
```

Neue Abstraktionen entstehen nur, wenn mindestens ein konkretes aktuelles Problem dadurch einfacher wird.

Composition wird gegenüber Vererbung bevorzugt. Normale Funktionen und kleine Datenstrukturen werden bevorzugt.

---

# 3. Eine Source of Truth

Für jede fachliche Information darf zu jedem Zeitpunkt **genau eine authoritative Source of Truth** existieren.

Nicht erlaubt:

```text
Project.dataSources
+
DataSourceStore.dataSources
+
lokaler React-State
```

wenn alle drei unabhängig verändert werden können.

Während Übergangsphasen dürfen alte Stores weiter existieren, aber eindeutig nur als Source of Truth oder Projektion / Subscription-Fassade. Nie beides gleichzeitig.

---

# 4. Project – persistierbares In-Memory-Fachmodell

Das zentrale fachliche Modell lautet sinngemäß:

```ts
interface Project {
  tree: BlockTree
  dataSources: DataSource[]
  relations: Relation[]
}
```

Das `Project` enthält ausschließlich fachliche Daten der bearbeiteten Maske.

Nicht hinein gehören:

```text
selectedId
activePageId
Undo/Redo-History
Dialogzustände
Hover-State
Autosave-Status
Browserzustand
SoftENGINE-Verbindung
React-State
Lit-State
Dateiformatversion
```

---

# 5. Project-Invarianten

Es muss eindeutig definiert werden, welche Regeln für ein gültiges `Project` gelten.

Beispiele:

```text
Block-IDs sind eindeutig.
Page-IDs sind eindeutig.
Tree enthält keine Zyklen.
Parent/Child-Regeln sind gültig.
Referenzen zeigen auf existierende Objekte.
Relationen sind strukturell konsistent.
Persistierte Block-Properties entsprechen ihrem fachlichen Modell.
```

Nicht jeder Consumer soll dieselben Schutzprüfungen erneut implementieren müssen.

---

# 6. EditorSession

Nichtpersistierbarer Editorzustand wird separat gehalten.

```ts
interface EditorSession {
  selectedId: string | null
  activePageId: string | null
}
```

Ob `activePageId` nullable ist, richtet sich nach der echten Project-Invariante.

Die Session besitzt klare Regeln:

```text
selectedId referenziert einen existierenden Block oder ist null.
activePageId referenziert eine existierende Page oder ist null.
```

Nach Operationen wie Delete, Undo, Redo, Load, Page Delete oder Project Replace wird die Session zentral reconciled, sinngemäß über `reconcileSession(project, session)`.

Die konkrete API ist zweitrangig. Wichtig ist, dass Session-Konsistenz nicht zufällig über UI-Komponenten verteilt wird.

---

# 7. History

Die bestehende Snapshot-History bleibt zunächst erhalten.

Kein Event Sourcing. Kein Command Bus nur für Undo.

Ein History-Eintrag entspricht aber **einer abgeschlossenen Benutzeraktion**, nicht automatisch einer einzelnen State-Mutation.

Beispiele:

```text
Slider von 100 → 200
Resize
Drag & Drop
Textbearbeitung
Mehrfachänderung im Inspector
```

sollen jeweils sinnvoll gruppiert werden.

Dafür erhält der Editor eine kleine Interaction-/Transaction-Grenze, z. B. sinngemäß:

```ts
beginInteraction()
update(...)
update(...)
commitInteraction()
```

Die konkrete Benennung ist zweitrangig.

Wichtig:

```text
100 Slider-Events ≠ 100 Undo-Schritte
```

Ein History-Snapshot enthält bewusst nur den Zustand, der für Undo/Redo notwendig ist.

```ts
interface HistorySnapshot {
  project: Project
  session: {
    selectedId: string | null
    activePageId: string | null
  }
}
```

Keine Notifications, Dialoge oder Autosave-Flags. History bleibt begrenzt.

---

# 8. Editor als Application-Facade

Die bestehende `Editor`-Klasse darf als zentrale Application-Facade bestehen bleiben.

Sie koordiniert:

```text
Project
EditorSession
History
Project-Operationen
Notifications
Autosave-Auslösung
Subscriptions für UI
```

Sie implementiert aber nicht selbst:

```text
Tree-Algorithmen
Persistenzformat
localStorage
Datei-I/O
SoftENGINE-Globals
Compilerlogik
HTML-Export
Block-Fachregeln
```

Der `Editor` darf echte Application-Logik enthalten. Er soll weder God Object noch leerer 800-Zeilen-Forwarder werden.

---

# 9. Pure Project Operations

Fachliche Änderungen werden möglichst als pure Funktionen modelliert.

Beispiele:

```ts
addBlock(...)
removeBlock(...)
moveBlock(...)
duplicateBlock(...)
updateBlockProperty(...)
resizeBlock(...)
addPage(...)
removePage(...)
```

Diese Operationen greifen nicht auf DOM zu, kennen kein React, kein Lit, kein localStorage, keine Toasts und kein SoftENGINE.

---

# 10. Strukturierte Operationsergebnisse

Keine fachlichen Warnungen als bloßes `warnings: string[]`.

Stattdessen kleine strukturierte Issues:

```ts
interface ProjectIssue {
  code: string
  message: string
  blockId?: string
  relationId?: string
  path?: string
}
```

Oder als kleine Discriminated Union.

Erwartbare ungültige Benutzeroperationen wie Block in eigenes Kind verschieben, Root löschen oder ungültigen Parent wählen dürfen als Resultat zurückgegeben werden. Verletzte interne Invarianten dürfen weiterhin Exceptions sein.

---

# 11. ID-Erzeugung

Interne technische IDs dürfen UUIDs bleiben. ERP-Fachcodes und interne IDs bleiben strikt getrennt.

`crypto.randomUUID()` wird nicht zwangsläufig tief in pure Core-Funktionen eingebrannt.

Bei einfacher Erstellung kann die ID bereits an der Creation Boundary erzeugt werden:

```ts
const id = crypto.randomUUID()
addBlock(project, { id, ... })
```

Bei Operationen, die mehrere IDs erzeugen müssen, darf ein kleiner Generator übergeben werden:

```ts
type CreateId = () => string

duplicateBlock(project, args, createId)
```

Das ist kein DI-Framework. Es dient Determinismus und Testbarkeit. Keine ID-Abhängigkeit wird unnötig durch Schichten weitergereicht, die keine IDs erzeugen.

---

# 12. Serialisiertes Format ist NICHT das Project

Das persistierte Dateiformat wird ausdrücklich vom In-Memory-Modell getrennt.

Nicht:

```ts
interface SerializedProject {
  version: 1
  project: Project
}
```

Stattdessen beispielsweise:

```ts
interface SerializedProjectV1 {
  format: 'aufbau-maske'
  version: 1
  project: SerializedProjectDataV1
}
```

Das V1-Schema wird als V1-Vertrag behandelt. Änderungen am internen `Project` verändern nicht stillschweigend das alte Dateiformat.

---

# 13. ProjectCodec

Der Codec besitzt reine Logik:

```text
string
↓
JSON parse
↓
SerializedProjectV1 validieren
↓
decode
↓
Project
```

und:

```text
Project
↓
encode
↓
SerializedProjectV1
↓
JSON stringify
```

Keine Browser-APIs, keine Datei-Dialoge, kein localStorage.

---

# 14. Laden alter Projekte: kompatibel, aber nicht magisch

Es gilt weder:

```text
jedes fehlende Feld → kompletter Ladeabbruch
```

noch:

```text
alles Kaputte stillschweigend mit aktuellen Manifest-Defaults reparieren
```

Bekannte, bewusst optionale Felder einer bekannten Formatversion dürfen definierte Kompatibilitätsdefaults besitzen.

Beispiel:

```text
SerializedProjectV1.borderColor fehlt
→ V1-definierter Default
```

Nicht automatisch der jeweils heutige Manifest-Default.

Kaputte Daten wie unbekannter Blocktyp, falscher Datentyp, defekte Referenz oder inkonsistenter Tree werden nicht heimlich umgeschrieben.

Fehlerarten werden sinnvoll unterschieden:

```text
ungültiges JSON
unbekanntes Format
unbekannte Version
ungültige bekannte Version
inkonsistente Projektdaten
```

Keine automatische Speicherung reparierter Daten ohne klare Nutzeraktion.

---

# 15. Versionierung

Das In-Memory-`Project` enthält keine Dateiversion.

Formatversionierung existiert ausschließlich an Persistenzgrenzen.

Vorerst:

```text
format: 'aufbau-maske'
version: 1
```

Keine allgemeine Migration Engine, solange Version 2 nicht real existiert.

Wenn Version 2 tatsächlich entsteht, wird anhand der echten Änderung entschieden, wie V1 → V2 behandelt wird.

---

# 16. AutosaveStore

Der Browser-Autosave kennt ausschließlich rohe persistierte Daten.

Zum Beispiel:

```ts
loadRaw()
saveRaw(raw)
```

Er kennt `localStorage`, aber nicht Project, BlockManifest, fachliche Validierung, Migration oder Compiler.

---

# 17. ProjectFileIO

Datei-I/O behandelt nur Browser-Dateien.

Zum Beispiel:

```text
Datei auswählen
Text lesen
Datei herunterladen
```

Kein Wissen über das Project-Schema.

Der Fluss lautet:

```text
Project
↓
ProjectCodec
↓
raw string
↓
AutosaveStore / ProjectFileIO
```

und umgekehrt.

---

# 18. BlockManifest

Die fachliche Beschreibung eines Blocktyps wird von Lit und React entkoppelt.

```ts
interface BlockManifest<Props = unknown> {
  type: BlockType
  createDefaultProps(): Props

  properties: readonly BlockPropertySpec[]
  layout?: BlockLayoutSpec
  children?: BlockChildrenSpec
  binding?: BlockBindingSpec
  events?: readonly BlockEventSpec[]
}
```

Das Manifest kennt nicht Lit, React, DOM, `customElements`, SoftENGINE, `selib`, `SEDATA` oder Editor-Komponenten.

---

# 19. Default Props

Persistierte Default-Properties besitzen eine klare kanonische Quelle.

Keine gemeinsam mutierbaren Default-Objekte.

Gefährlich:

```ts
const defaultProps = {
  columns: [],
}
```

wenn dasselbe Objekt mehreren Blocks zugewiesen wird.

Bevorzugt `createDefaultProps()` oder eine andere eindeutig immutable Lösung.

Lit-interner Runtime-State bleibt davon getrennt.

---

# 20. Manifest ist kein God Object

Metadaten werden nur gruppiert, wenn sie semantisch zusammengehören.

Mögliche Typen:

```text
BlockLayoutSpec
BlockPropertySpec
BlockBindingSpec
BlockChildrenSpec
BlockEventSpec
```

Keine Interfaces nur zur optischen Verschönerung. Keine 40 Boolean-Capabilities.

Statt vieler `supportsX: true`-Flags können optionale Capability-Objekte verwendet werden, wenn mehrere zugehörige Daten zusammengehören.

---

# 21. Renderer- und Editor-Metadaten getrennt

Rendering-spezifische Informationen gehören nicht automatisch ins Core-Manifest.

Zum Beispiel:

```ts
interface LitBlockDefinition {
  type: BlockType
  tagName: string
}
```

Editor-only-Daten separat:

```ts
interface EditorBlockDefinition {
  type: BlockType
  label: string
  icon?: unknown
  showInPalette: boolean
  inspector?: unknown
}
```

`displayName`, Icons, Inspector-Komponenten usw. gehören nicht ins fachliche Manifest, wenn sie ausschließlich Editorzwecken dienen.

---

# 22. Lit kennt Manifest, nicht umgekehrt

Richtung:

```text
BlockManifest
    ↑
Lit Block
```

Nie umgekehrt. Diese Grenze wird möglichst mechanisch durch Importregeln abgesichert.

---

# 23. BlockCatalog

Die globale mutable Block-Registry wird schrittweise durch einen expliziten Catalog ersetzt.

```ts
const blockCatalog = createBlockCatalog([
  tableManifest,
  textManifest,
  buttonManifest,
])
```

Der Catalog wird beim Bootstrap erzeugt, validiert doppelte Blocktypen, wird danach nicht mehr mutiert und besitzt keine `register()`-Methode für Laufzeitmutation.

Beispiel-API:

```ts
interface BlockCatalog {
  get(type: BlockType): BlockManifest | undefined
  has(type: BlockType): boolean
  all(): readonly BlockManifest[]
}
```

Während der Migration darf die bestehende Registry temporär adaptiert werden. Am Ende gibt es genau eine kanonische Quelle.

---

# 24. React und Lit

Die langfristige Rollenverteilung bleibt:

```text
React = Editor-Oberfläche
Lit = Maskenrenderer
Pure TypeScript = Fachlogik / Export
```

Keine doppelte React-Implementierung der Maskenblocks. Keine Lit-Version des Editors.

Wichtige zusätzliche Regel:

> React und Lit besitzen niemals denselben DOM-Subtree.

Kommunikation erfolgt über explizite Grenzen wie Properties, Plain Data, Custom Events oder kleine Adapter. Nicht durch gegenseitige DOM-Manipulation.

---

# 25. React-Reaktivität

Wenn `Editor` ein React-externer Store bleibt, wird eine explizite Subscription-Schnittstelle definiert.

`useSyncExternalStore` ist dafür ein bevorzugter Kandidat.

Die konkrete Implementierung soll aber granulare und stabile Snapshots ermöglichen. Nicht zwingend `useEntireEditor()` für jede Komponente.

Mögliche spezialisierte Hooks:

```text
useProject()
useSelection()
useActivePage()
useBlock(id)
```

Die genaue Granularität richtet sich nach realen Performance- und Wartbarkeitsanforderungen. Keine komplizierte Selector-Infrastruktur ohne Bedarf.

---

# 26. Komplexe Editor-UIs

Komplexe Editoren bleiben normale React-Komponenten.

Beispiele:

```text
Spalteneditor
Relationeneditor
Bindings
Actions
Suchfenster
```

Kein universelles Schema-Form-System.

Generische Property Controls nur dort, wo sie wirklich generisch sind, etwa Text, Number, Boolean, Enum oder Color.

Sonderfälle dürfen Sonderfälle bleiben.

---

# 27. SoftENGINE-Tabellen: Ordinalität und Sichtbarkeit

Die bestehende SoftENGINE-Regel für Tabellen wird als explizite Invariante dokumentiert und getestet.

Wenn die ERP-Zuordnung an der physischen Position einer Spalte hängt, gilt:

```text
Spalte existiert
≠
Spalte ist sichtbar
```

Eine Spalte auszublenden darf ihre ERP-Position nicht versehentlich verändern.

Beispiel:

```text
A B C D

B unsichtbar

→ C und D behalten ihre ursprüngliche ERP-Zuordnung
```

`hideColumn` und `deleteColumn` sind fachlich unterschiedliche Operationen.

Diese Regel erhält mindestens einen gezielten Regressionstest.

---

# 28. Actions

Das bestehende Action-System bleibt grundsätzlich erhalten.

Kein generisches Plugin-System.

Trennung:

```text
Action-Daten / Action-Semantik → Core
Action-Editor → React
SoftENGINE-Umsetzung → SoftENGINE Export/Target
```

Nur reale Action-Typen werden modelliert.

---

# 29. Layout

Pure fachliche Layoutregeln dürfen im Core liegen.

Beispiele:

```text
Grid
Flow
Resize-Regeln
Parent/Child-Regeln
erlaubte Größen
```

Nicht im Core:

```text
DOM-Messung
getBoundingClientRect()
Browser-Pointer-Events
Pixelmessung des gerenderten Elements
```

---

# 30. Export / Compiler – keine vorab erfundene Universal-IR

Es wird nicht vorab festgeschrieben, dass eine vollkommen target-neutrale `CompiledMask` existieren muss.

Aktuell existiert ein reales Exportziel: SoftENGINE.

Deshalb wird zunächst entlang des realen Problems geschnitten:

```text
Project
↓
Compile / Export Validation
↓
SoftENGINE Export Preparation
↓
PreparedSoftEngineExport
```

Danach:

```text
PreparedSoftEngineExport
├── HTML
├── CSS
├── SE-Variablen
└── Runtime-Artefakte
```

Falls sich später tatsächlich ein natürliches target-neutrales Zwischenmodell ergibt, kann dieses extrahiert werden. Nicht vorher.

---

# 31. Export Preparation

Gemeinsame semantische Berechnungen werden nicht mehrfach in verschiedenen Emittern implementiert.

Die Preparation darf beispielsweise berechnen:

```text
benutzte Datenquellen
aufgelöste Bindings
benutzte Felder
Relationen
Events
Layout
Runtime-Anforderungen
SoftENGINE-relevante Blockinformationen
```

Das Ergebnis darf ausdrücklich SoftENGINE-spezifisch heißen und strukturiert sein. Ehrliche konkrete Architektur ist besser als eine künstlich generische.

---

# 32. Compiler / Export bleibt headless

Core und Exportlogik laufen ohne Browser.

Verboten:

```text
window
document
customElements
localStorage
Browser File API
React
Lit
selib
SEDATA
```

Node/Vitest muss ohne DOM-Polyfill funktionieren.

---

# 33. Export Diagnostics

Erwartbare Exportprobleme werden als Daten zurückgegeben.

```ts
interface CompileIssue {
  code: string
  message: string
  blockId?: string
  relationId?: string
  path?: string
}
```

Beispielresultat:

```ts
type PrepareResult =
  | {
      ok: true
      value: PreparedSoftEngineExport
      warnings: CompileIssue[]
    }
  | {
      ok: false
      errors: CompileIssue[]
      warnings: CompileIssue[]
    }
```

Programmierfehler und verletzte interne Invarianten dürfen Exceptions bleiben.

---

# 34. SoftENGINE Target / Emitter

SoftENGINE-spezifischer Output bleibt außerhalb des Core.

Emitter sollen möglichst pure Funktionen sein.

Nicht: Emitter erzeugt HTML und startet Browserdownload.

Sondern beispielsweise:

```ts
interface SoftEngineArtifactSet {
  html: string
  css: string
  runtime: string
  variables: readonly SoftEngineVariable[]
}
```

Sinngemäß:

```ts
const artifacts = emitSoftEngine(prepared)
```

Erst ein äußerer Adapter speichert, lädt herunter oder überträgt die Artefakte.

---

# 35. Kein generisches Target-System

Solange SoftENGINE das einzige Exportziel ist, reicht:

```ts
prepareSoftEngineExport(...)
emitSoftEngine(...)
```

Nicht eingeführt werden:

```text
AbstractTarget
TargetRegistry
TargetFactory
TargetProvider
TargetPlugin
TargetLifecycle
```

Ein zweites reales Target darf später zeigen, welche Abstraktion tatsächlich gemeinsam ist.

---

# 36. Golden Master

Vor größerer Exportumstellung werden repräsentative Exporte eingefroren.

Mindestens:

```text
einfache Maske
Datenquelle
Tabelle
Formfeld
Bindings
Events
Relation
komplexerer Container
```

Vergleich bytegenau, wenn sinnvoll; semantisch, wenn instabile irrelevante Details existieren.

Zufällige IDs, Timestamps oder instabile Sortierung werden nicht blind als Golden-Vertrag konserviert. Golden Fixtures werden bewusst reviewed.

---

# 37. SoftENGINE Live Adapter

Die Live-Bridge wird nach echten Verantwortlichkeiten zerlegt.

Mögliche Bereiche:

```text
Datenempfang
Commands / Refresh
Message-Verarbeitung
Fokusintegration
```

Nur trennen, wenn tatsächlich unabhängige Verantwortlichkeiten entstehen. Keine künstliche Layer-Aufteilung.

---

# 38. Kleine Ports statt SoftEngineGodInterface

Wo Application-Code äußere Fähigkeiten benötigt, dürfen kleine Ports entstehen.

Nicht ein `SoftEngineHost` mit 40 Methoden, sondern kleine APIs entlang echter Konsumenten.

Ports werden dort definiert, wo sie gebraucht werden. Keine zentrale Sammlung abstrakter Interfaces nur für Clean Architecture.

---

# 39. Runtime Lifecycle

Alles, was Listener, Polling oder Timer erzeugt, besitzt einen klaren Cleanup.

```ts
const runtime = connectSoftEngine(...)
runtime.dispose()
```

Wichtig für Tests, HMR, mehrfache Initialisierung und sauberes Unmounting.

---

# 40. Externe Daten validieren

Alles, was von SoftENGINE oder anderen äußeren Systemen kommt, wird an der Adaptergrenze geprüft.

Externe Systeme dürfen niemals automatisch als perfekte interne Datenquelle behandelt werden.

Einige echte anonymisierte Fixtures werden verwendet für Datenlieferungen, Antworten, Relationen und Fehlerfälle. Keine hundert erfundenen Mockfälle.

---

# 41. Runtime Builder ist Teil des Refactors ab Phase 0

`tools/laufzeitBauen.mjs` und vergleichbare Build-Werkzeuge gelten als bestehender Architekturvertrag.

Vor Änderungen an Ordnern, Block-Metadaten, statischen Properties, SoftENGINE Bridge oder globalen `FF.*`-Namen wird dokumentiert, was der Builder tatsächlich erwartet.

Falls er aktuell Sourcecode oder feste Pfade analysiert, wird dieses Verhalten durch Referenztests abgesichert.

Keine Ordnerstruktur wird für Architekturhygiene umgebaut, bevor der Runtime-Build abgesichert ist.

---

# 42. Langfristiges Builder-Ziel

Der Runtime Builder soll langfristig keine Regex über TypeScript-Quellcode benötigen, um Block-Metadaten zu verstehen.

Strukturierte Daten werden zur Quelle.

Beispielsweise eine explizite Liste:

```ts
export const blockManifests = [
  buttonManifest,
  tableManifest,
  textManifest,
]
```

Keine neue Regex schreiben, die nur `manifest.ts` statt alter statischer Properties analysiert.

---

# 43. Ordnerstruktur

Ordnernamen sind zweitrangig.

Mögliche Zielstruktur:

```text
src/
  core/
    project/
    blocks/
    layout/
    dataSources/
    relations/

  application/
    editor/
    history/

  compiler/

  targets/
    softengine/

  adapters/
    browser/
    softengine/

  ui/
    react/
    lit/

  bootstrap/
```

Es werden keine Ordner nur deshalb verschoben, damit das Repository schöner aussieht. Bestehende Runtime-/Build-Verträge haben Vorrang.

Ein Ordner wie `blocks/` darf nicht zur neuen Misch-Müllhalde werden.

---

# 44. Composition Root

Es gibt einen klaren Bootstrap-Ort, beispielsweise `createApplication(...)`.

Dort werden zusammengesteckt:

```text
BlockCatalog
ProjectCodec
AutosaveStore
ProjectFileIO
Editor
SoftENGINE Live Adapter
Exportfunktionen
React-Anbindung
```

Nur der Composition Root darf bewusst mehrere Architekturschichten kennen. Innere Module importieren niemals Bootstrap-Code.

---

# 45. Architekturregeln mechanisch absichern

Wichtige Importgrenzen werden durch ESLint beziehungsweise vorhandene Architekturregeln abgesichert.

Insbesondere:

```text
core → kein editor
core → keine adapters
core → kein compiler
core → kein SoftENGINE
core → kein React/Lit

compiler → keine UI
compiler → keine Browseradapter

UI → Application/Core APIs
```

Keine hunderten kosmetischen Regeln. Architekturregeln haben Vorrang.

---

# 46. Keine Zyklen

Zwischen den Hauptmodulen existieren keine zyklischen Abhängigkeiten.

Zyklen werden nicht durch Barrel-Files oder indirekte Re-Exports versteckt.

---

# 47. Barrel Files

Kein `index.ts` in jedem Ordner aus Prinzip.

Direkte Imports sind erlaubt. Barrels nur an echten stabilen Modulgrenzen.

---

# 48. Typisierung

An heterogenen Systemgrenzen dürfen Typen generischer sein. Nach Validierung werden konkrete Typen verwendet.

Nicht dauerhaft überall `Record<string, unknown>`, aber auch keine TypeScript-Akrobatik, die nur noch ein Mensch versteht.

```text
Boundary → unknown/generic
Featureintern → TableProps / ButtonProps / RelationConfig
```

---

# 49. Tests – Grundphilosophie

Keine Testzahl als Qualitätsmetrik. Kein Coverage-Ziel.

Keine Tests für triviale Getter, einfache Konstruktoren, Frameworkverhalten, 1:1-Mapping ohne Logik oder jede einzelne Manifest-Property.

Tests schützen wichtige Verträge.

---

# 50. Block Contract Tests

Eine generische Suite prüft alle Manifeste auf relevante Konsistenz.

Zum Beispiel:

```text
Blocktyp eindeutig
Defaults gültig
referenzierte Properties vorhanden
Parent/Child-Regeln konsistent
Capability-Daten valide
```

Keine fast identischen Testdateien pro Block. Keine tautologischen Tests für Dinge, die der Catalog bereits garantiert.

---

# 51. Core Tests

Gezielte Tests für echte Fachlogik:

```text
Delete
Duplicate
Move
Grid
Pages
Property-Updates mit Cleanup
Parent/Child-Regeln
kritische Relationen
```

---

# 52. Export Tests

Wenige semantische Tests für:

```text
benutzte Quellen
Felder
Relationen
Bindings
Events
Runtime-Anforderungen
Layout
SoftENGINE-spezifische Preparation
```

Interne Hilfsfunktionen müssen nicht einzeln getestet werden.

---

# 53. SoftENGINE Golden Tests

Final erzeugter SoftENGINE-Output wird über repräsentative Golden Fixtures geschützt. Diese Tests haben hohe Priorität.

---

# 54. Persistenztests

Der Codec erhält fokussierte Tests für:

```text
gültiges SerializedProjectV1
V1 → Project
Project → V1
Roundtrip
kaputtes JSON
falsches Format
unbekannte Version
fehlende Pflichtdaten
ungültige Struktur
bekannte optionale V1-Felder
```

Keine Migrationstests, solange keine Migration existiert.

---

# 55. Wenige Integration-Smoke-Tests

Zusätzlich wenige echte Lebensadern testen.

Beispiele:

```text
Projekt laden → Block ändern → Undo → speichern
Block hinzufügen → Property ändern → exportieren
Page löschen → Undo
Datenquelle → Relation → Export
SoftENGINE Bridge connect → Message → dispose
```

Keine riesige End-to-End-Suite.

---

# 56. CI

Mindestens:

```text
TypeScript
ESLint
Tests
Runtime Build
Application Build
Block Contracts
Golden Export
```

Contract- und Golden-Tests können Teil der normalen Testsuite sein. Keine unnötige CI-Matrix.

---

# 57. Refactoring-Strategie: vertikale Scheiben

Der Umbau erfolgt nicht als erst alle Manifeste, dann alle Catalogs, dann alle Renderer und irgendwann Export.

Stattdessen wird möglichst eine **vollständige vertikale Scheibe** migriert.

Pilot: ein möglichst einfacher, repräsentativer Block, bevorzugt `ButtonBlock`, sofern die reale Codebasis das bestätigt.

Für diesen einen Block wird der komplette neue Weg geprüft:

```text
Manifest
Catalog
Defaults
Project Operation
React Inspector
Lit Rendering
Export Preparation
SoftENGINE Output
Runtime Builder
Golden Test
```

Erst wenn dieser Block vollständig funktioniert, wird das Muster auf weitere Blocktypen übertragen.

---

# 58. Übergangscode

Alte und neue Architektur dürfen während der Migration temporär parallel existieren.

Aber nur wenn der Übergang bewusst ist, klar dokumentiert ist, ein Löschzeitpunkt existiert und eine eindeutige Source of Truth besteht.

Nicht erlaubt ist dauerhaftes:

```ts
newCatalog ?? legacyRegistry ?? fallbackRegistry
```

ohne klares Ende.

Nach erfolgreicher Migration wird Übergangscode gelöscht.

---

# 59. Refactoring-Phasen

## Phase 0 – Verhalten und bestehende Verträge einfrieren

Vor größeren Änderungen:

```text
bestehende Tests grün
repräsentative Golden Exports erzeugen
referenzabzug.test.ts prüfen
History-Verhalten dokumentieren
Loader-Verträge dokumentieren
SoftENGINE-Verträge dokumentieren
laufzeitBauen.mjs analysieren
feste globale FF.*-Namen dokumentieren
Tabellen-Spalten-Invariante dokumentieren
keine neuen Features parallel
```

Zusätzlich alle Annahmen des Plans gegen die reale Codebasis verifizieren. Der reale Code ist maßgeblich.

## Phase 1 – Project & Session

Einführen beziehungsweise schärfen:

```text
Project
EditorSession
Session-Reconciliation
eindeutige Source of Truth
```

Bestehendes Verhalten erhalten. Noch kein großflächiger Block-/Compiler-Umbau.

## Phase 2 – History-Transaktionen

Interaction-Grenzen für Slider, Resize, Drag & Drop und weitere hochfrequente Änderungen einführen.

Snapshot-History bleibt bestehen.

## Phase 3 – Persistenz trennen

Einführen:

```text
SerializedProjectV1
ProjectCodec
AutosaveStore
ProjectFileIO
```

`Project` und persistiertes Format bewusst trennen. Kompatibilitätsregeln explizit definieren.

## Phase 4 – Pilotblock vollständig migrieren

Einen einfachen Block auswählen, bevorzugt `ButtonBlock`, falls die reale Codebasis ihn als geeigneten Pilot bestätigt.

Komplette vertikale Migration durchführen. Alle relevanten Pfade müssen weiterhin funktionieren.

## Phase 5 – BlockManifest / Catalog Muster stabilisieren

Nach dem Pilot prüfen:

```text
Ist das Manifest wirklich frameworkfrei?
Sind Renderer-Metadaten sauber getrennt?
Ist der Catalog verständlich?
Entsteht unnötige Boilerplate?
```

Erst danach weitere Blocks migrieren.

## Phase 6 – Blocks schrittweise migrieren

Block für Block beziehungsweise in kleinen natürlichen Gruppen.

Nicht zehn halbfertige Blöcke gleichzeitig.

Bei jedem Block Editor, Lit, Persistenz, Export, Runtime und Tests prüfen.

## Phase 7 – Pure Project Operations ausbauen

Weitere fachliche Operationen aus `Editor` extrahieren. Globale UI-Side-Effects entfernen. ID-Erzeugung nur dort abstrahieren, wo Determinismus echten Nutzen bringt.

## Phase 8 – Exportlogik headless machen

Bestehenden Export schrittweise aus Browser-/UI-Abhängigkeiten lösen.

Einführen:

```text
Export Validation
SoftENGINE Export Preparation
strukturierte Diagnostics
```

Noch keine künstliche Multi-Target-Architektur.

## Phase 9 – SoftENGINE Emitter klar isolieren

SoftENGINE-Ausgabe in pure Funktionen zerlegen:

```text
HTML
CSS
SE-Variablen
Runtime-Artefakte
```

Gemeinsame Preparation nicht duplizieren. Golden Master bleibt grün.

## Phase 10 – Live SoftENGINE Adapter

Bridge nach realen Verantwortlichkeiten entwirren. Globale SoftENGINE APIs an den Rand verschieben. Lifecycle und `dispose()` einführen. Echte Contract Fixtures verwenden.

## Phase 11 – Runtime Builder modernisieren

Sourcecode-Regex und harte Architekturannahmen schrittweise entfernen. Strukturierte Blockinformationen als Quelle verwenden. Bestehende globale Namen und Runtime-Verträge bewusst bewahren beziehungsweise kontrolliert ändern.

## Phase 12 – Architekturgrenzen härten

ESLint-Regeln ergänzen, Zyklen entfernen, alte Registries löschen, Übergangsadapter entfernen, toten Code und veraltete Pfade entfernen.

---

# 60. Definition of Done

Der Refactor ist abgeschlossen, wenn:

### Project
Es existiert genau ein klares persistierbares In-Memory-Fachmodell.

### Source of Truth
Jede fachliche Information besitzt genau einen authoritative State.

### Session
Editor-only-State ist vom Project getrennt und enthält keine ungültigen Referenzen.

### History
Undo/Redo arbeitet entlang sinnvoller Benutzeraktionen und erzeugt keine Event-Lawinen.

### Editor
Der Editor koordiniert, enthält aber keine Persistenz-, Export- oder SoftENGINE-Infrastruktur.

### Core
Frameworkfrei, browserfrei und SoftENGINE-frei.

### Blocks
Fachliche Blockbeschreibung funktioniert ohne Lit, React und DOM.

### Catalog
Kein versteckter global mutierbarer Registry-State.

### React / Lit
Beide besitzen klar getrennte DOM-Bereiche.

### Persistenz
Serialized DTOs sind vom In-Memory-Project getrennt.

### Versionierung
Formatversionierung existiert ausschließlich an Persistenzgrenzen.

### Loading
Bekannte Kompatibilitätsfälle werden kontrolliert unterstützt; beschädigte Daten werden nicht stillschweigend gesundgelogen.

### Export
Export Preparation und SoftENGINE Emitter sind headless.

### SoftENGINE
SoftENGINE ist äußeres Zielsystem beziehungsweise Adapter.

### Tabellen
Sichtbarkeit und physikalische ERP-Spaltenposition können nicht versehentlich verwechselt werden.

### Runtime
Builder benötigt keine Regex über TypeScript-Quellcode, um Architekturinformationen zu entdecken.

### Tests
Wenige hochwertige Core-, Contract-, Persistenz-, Integration- und Golden-Tests schützen die relevanten Verträge.

### Architektur
Keine zyklischen Hauptmodul-Abhängigkeiten.

### Cleanup
Alte Registries, Übergangspfade, tote Adapter und Doppelimplementierungen sind entfernt.

---

# 61. Entscheidungsregel während der Umsetzung

Wenn während des Refactors festgestellt wird, dass eine geplante Abstraktion mehr Dateien erzeugt, mehr Weiterleitungen benötigt, schwerer zu verstehen ist oder nur für hypothetische Zukunftsfälle existiert und kein aktuelles Problem löst, wird sie nicht umgesetzt.

Wenn die reale Codebasis eine bessere natürliche Grenze zeigt als dieser Plan, wird der Plan angepasst.

Dieser Plan ist eine Architekturleitlinie, kein religiöser Text.

---

# 62. Zielbild für einen neuen Entwickler

Nach dem Umbau soll sich das System ungefähr so erklären lassen:

```text
Project enthält die Maske.

Editor verwaltet Project, Session und History.

Pure Core-Funktionen verändern das Project.

BlockManifest beschreibt fachliche Eigenschaften der Bausteine.

BlockCatalog kennt die verfügbaren Bausteintypen.

React baut die Editoroberfläche.

Lit rendert die Maskenbausteine.

ProjectCodec übersetzt zwischen Dateiformat und Project.

Export Preparation berechnet die für SoftENGINE benötigte Semantik.

SoftENGINE Emitter erzeugen daraus die Exportartefakte.

Adapter kümmern sich um Browser und das laufende ERP-System.

Bootstrap steckt alles zusammen.
```

Wenn man für diese Erklärung ein Architekturdiagramm mit 27 Kästen benötigt, ist der Refactor zu kompliziert geworden.

---

# 63. Arbeitsregel für Codex-Chats

Jeder Refactoring-Chat liest diesen Plan vollständig, bearbeitet aber **nur seine ausdrücklich zugewiesene Phase**.

Jeder Chat muss:

1. den tatsächlichen Repository-Zustand selbst verifizieren,
2. sich nicht blind auf Ergebnisse früherer Chats verlassen,
3. vor Änderungen relevante Konsumenten und bestehende Verträge finden,
4. keine spätere Phase eigenmächtig beginnen,
5. relevante Tests, Typechecks und Builds ausführen,
6. am Ende offen dokumentieren, was geändert wurde und was absichtlich noch nicht migriert ist.

Der reale Code ist maßgeblich. Dieser Plan setzt Leitplanken, ersetzt aber keine Prüfung der tatsächlichen Implementierung.