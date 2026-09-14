# Testfinaledior – Gesamtplan für Architektur, Design und Bedienung

Stand: 14. September 2026

## 0. Welche Fassung und welches Repository?

Dies ist die zusammengeführte Übergabefassung. Sie vereint den ursprünglichen Plan „EditorAufbauV3“, den zuletzt eingefügten „maßgeblichen Gesamtplan nach Phase 0“ und die konkreten Anforderungen zu Tabelle, Kanban und Berechnungen. Frühere Fassungen dienen nur noch als Hintergrund; bei Widersprüchen gilt diese Fassung.

Bestätigtes Zielrepository: **Maycetin1205/Testfinaledior**, Defaultbranch `master`. Der laut übergebener Repository-Analyse damals untersuchte Stand lautet `a441d523db6633dc71f72d0c51c2278eb2909004`; diese frühere Codeprüfung wurde hier nicht wiederholt. Der umsetzende Agent bestätigt vor Beginn den aktuellen Commit und berücksichtigt zwischenzeitliche Änderungen.

**C:\Users\mu.aycetin\Desktop\finaleditor ist das Original. Es wird für diesen Umbau nicht verändert.** Die bisherigen lokalen Codebefunde stammen aus diesem Original. Abweichungen der Kopie müssen im Zielrepository geprüft werden.

**Phase 0 ist abgeschlossen.** Ihre Ergebnisse und Referenzen werden verwendet. Es gibt keine erneute Phase 0. Bereits vorhandene Fehlermeldungen und ungeprüfte Annahmen werden dem richtigen Repository-Stand zugeordnet.

Diese Datei erlaubt zunächst Analyse, Planung und isolierte Designentwürfe. **Anwendungscode wird erst nach ausdrücklicher Freigabe der Umsetzung geändert.** Der maßgebliche Ablageort im Zielrepository ist `docs/REFACTOR-PLAN.md`. Das Veröffentlichen dieses Plans ist keine Freigabe für den Architekturumbau.

## 1. Ziel und Prioritäten

Der Editor soll fachlich zuverlässig, verständlich zu bedienen, visuell zusammenhängend und gut wartbar werden. Bestehende Funktionen werden nicht allein deshalb erhalten, weil sie vorhanden sind. Jede Funktion braucht einen nachvollziehbaren Arbeitszweck.

Priorität bei Konflikten:

1. Daten und nachgewiesene SoftENGINE-Verträge schützen.
2. Tatsächliche Arbeitsabläufe vollständig und verständlich unterstützen.
3. Bedienung und Gestaltung vereinheitlichen und unnötige Optionen entfernen.
4. Architektur so schneiden, dass diese Abläufe einfach geändert und geprüft werden können.

Kein vollständiger Neubau. React bleibt Editoroberfläche, Lit bleibt gemeinsame Renderquelle für Canvas und exportierte Maske, TypeScript trägt Fachlogik. Der modulare Monolith und Snapshot-Undo bleiben.

Nicht eingeführt werden Redux-Ersatz, Event Sourcing, Command Bus, globaler Event Bus, DI-Framework, Service Locator, Microservices, ein architekturgetriebenes Monorepo, universelles Plugin-/Target-System, allgemeine Formularengine oder eine freie Skriptsprache. Keine zweite React-Implementierung der Maskenblocks. Keine Coverage-Quote oder Testzahl als Qualitätsziel.

## 2. Planung vor dem Architekturumbau

### 2.1 Tatsächlichen Bestand erfassen

Für Palette, Canvas, Inspector, Seiten, Tabelle, Erfassung, Kanban, Formfelder, Datenquellen, Relationen, Bindings, Actions, Berechnungen, Speichern und Export wird eine kompakte Entscheidungsliste erstellt:

| Funktion | Tatsächliches Verhalten und Beleg | Arbeitszweck | Entscheidung | Folgen/Abnahme |
|---|---|---|---|---|
| pro vorhandener Funktion | Code, praktisch beobachtet oder ungeprüft | konkrete Anwenderaufgabe | behalten, vereinfachen, zusammenführen, entfernen, reparieren | betroffene Daten und Abläufe |

Codebefunde, Browserbeobachtungen und echte SoftENGINE-Nachweise bleiben unterscheidbar. Fehlender Laufzeitzugriff wird benannt. Vorhandene Datenquellen oder fachliche Schutzmechanismen werden nicht aufgrund einer optischen Präferenz entfernt.

### 2.2 Vollständige Arbeitsabläufe entwerfen

Mindestens durchspielen und schriftlich festlegen:

- Maske laden, Block ändern, Undo/Redo, speichern, wieder laden und exportieren.
- Datenquelle und Relation zuordnen, verwendete Quelle ändern oder entfernen.
- Artikel/Verabreichungsart auswählen, Werte übernehmen, Menge berechnen, Zeile vormerken, senden, Rückmeldung behandeln.
- Bestehende Zeile ändern/löschen, während ERP-Daten eintreffen; Fehler und unklaren Ausgang behandeln.
- Kanban-Muster gestalten, Bindings zuordnen, Spalten/Unterteilungen konfigurieren und Laufzeitkarten prüfen.
- Seite löschen und wiederherstellen; referenzierte Spalte löschen und Undo ausführen.

Zu jedem Ablauf gehören Normalfall, unvollständige Eingabe, Abbruch, Fehler und Datenaktualisierung.

### 2.3 Visuelles Ziel vor Umsetzung festlegen

Vor dem großen Architekturumbau werden konkrete visuelle Entwürfe für Hauptansicht, Erfassung mit Zuständen, Berechnungsdialog und Kanban-Musterbearbeitung gezeigt. Textskizzen allein sind keine Designabnahme. Interaktive Prototypen dürfen isoliert entstehen; sie verändern nicht die Anwendung und schaffen keine zweite produktive Renderquelle.

Die helle kompakte Gestaltung ist Ausgangspunkt, kein ungeprüftes Qualitätsurteil. Bestehende Tokens werden auf Lesbarkeit, Dichte, Kontrast, Fokus und konsistente Hierarchie geprüft. Maskendesign und Editor-Chrome bleiben getrennt. Keine erfundenen ERP-Daten in der produktiven Oberfläche; Entwürfe verwenden Feldbeschriftungen oder ausdrücklich gekennzeichnete Beispieldaten.

## 3. Verbindliche Bedien- und Designregeln

### 3.1 Hauptoberfläche und Inspector

Palette links, Canvas mittig und Inspector rechts bleiben Ausgangsstruktur. Änderungen werden anhand der vollständigen Abläufe begründet. Suche sowie Hinzufügen per Klick und Drag & Drop bleiben erreichbar.

Inspector nach Aufgaben ordnen: **Darstellung, Daten, Schreiben, Verhalten, Berechnungen, Erweitert**. Nur relevante Abschnitte anzeigen. Keine Gruppierung allein nach React-Controltyp. Allgemeine Controls nur für tatsächlich allgemeine Eingaben; komplexe Spalten-, Relations-, Binding- und Action-Editoren bleiben eigenständige Komponenten.

Direktbearbeitung und Inspector haben eindeutige Zuständigkeiten. Sichtbare Texte können direkt bearbeitet werden; die Konfiguration ihrer Datenbindung bleibt klar auffindbar. Keine zwei unabhängig veränderbaren Fassungen desselben Werts.

Speichern, Laden, Undo/Redo, Daten und Export bleiben gut erreichbar. Ein Exportmenü darf die vorhandenen Exportwege zusammenführen. Die Belegrahmen-Nummer gehört zum betreffenden Exportweg. Maskenname und Exportziel müssen erkennbar bleiben.

### 3.2 Visuelle Abnahme

- Lesbare Beschriftungen bei üblicher und schmaler Inspectorbreite, keine abgeschnittenen Primäraktionen.
- Konsistente Abstände, Kontrollhöhen, Typografie und wenige verständlich verwendete Akzentfarben.
- Tastaturfokus sichtbar; wichtige Aktionen mit Maus und Tastatur erreichbar.
- Leere, ladende, fehlerhafte und deaktivierte Zustände verständlich.
- Farbe, Kursivschrift und Tooltips tragen nie allein eine wesentliche Bedeutung.
- Modale Bearbeitung besitzt eindeutiges Übernehmen/Abbrechen und korrektes Fokusverhalten.
- Das Design wird auch mit vielen Spalten, langen Namen und wenig Platz geprüft.

## 4. Tabelle und Erfassung

### 4.1 Zwei unabhängige Bedeutungen

**Zellherkunft:** manuell eingegeben, aus Daten übernommen oder berechnet.

**Schreibstatus:** lokal vorgemerkt, wird gesendet, Bestätigung ausstehend, bestätigt oder nachweislich fehlgeschlagen. Ein unklarer Ausgang bleibt ausdrücklich unklar.

Die bisherige Klasse für automatische Zellwerte verwendet Kursivschrift und Akzentfarbe. Das ist kein allgemeiner Nachweis „noch nicht geschrieben“. Diese Mehrdeutigkeit wird beseitigt. Vorschlag für die Zielgestaltung: normale gut lesbare Schrift, gezielte Herkunftskennzeichnung und sichtbarer Klartext für relevante Zeilenzustände. Die konkrete Darstellung wird im Entwurf festgelegt.

### 4.2 Zustände und Übergänge

Neu, Änderung und Löschung verwenden dieselbe verständliche Statusfamilie, behalten aber ihre fachlich unterschiedlichen Daten. Ansichtszustand, persönliche Tabellenpräferenzen, lokale Eingaben, gesendete Werte, vorherige Werte und Fehler werden nicht vorschnell zu einem einzigen Speicher vereinigt.

Der bisherige interne Zustand `geschrieben` für bloß hinausgeschickte Daten wird zu einem eindeutigen Begriff wie `bestaetigungAusstehend`. Ein Versand ist noch keine bestätigte Übernahme.

**Eine Lieferung ohne den erwarteten Wert beweist nicht automatisch einen Fehler.** Vor einer Statusentscheidung muss geklärt sein, ob die Lieferung neu, relevant und für die betreffende Operation vollständig genug ist. Veraltete oder partielle Lieferungen dürfen weder Erfolg noch Ablehnung vortäuschen.

Für jede Art von Neu/Ändern/Löschen festlegen:

- Wie Zielzeile und gesendete Operation zugeordnet werden.
- Welcher konkrete Nachweis Erfolg oder Ablehnung belegt.
- Wie lange der Zustand ohne Nachweis offen bleibt und wie dies angezeigt wird.
- Wie neue Eingaben während eines laufenden Versands erhalten bleiben.
- Wann ein erneuter Versuch zulässig ist und wie Doppelausführung verhindert wird.

Kein automatischer Wiederholungsversuch nach unklarem Ausgang einer nicht idempotenten Aktion. Wenn SoftENGINE keine eindeutige Bestätigung oder sichere Wiederholung ermöglicht, bleibt diese Grenze sichtbar; sie wird nicht durch einen optimistischen Status kaschiert.

### 4.3 Spalten und Interaktion

Dauerhafte Spaltenkennung, Position in der vollständigen Spaltenliste und sichtbare Position sind verschieden. Ausblenden verändert keine ERP-Zuordnung. Verschieben und Löschen aktualisieren Referenzen nach festgelegten Regeln.

Tastaturverhalten wird in der laufenden Anwendung geprüft und dann vereinheitlicht: Tab, Enter, Pfeile, Escape, Insert, Vorschlagsauswahl und Fokus nach Datenlieferung. Eine nicht geprüfte Tastenbeschreibung gilt nicht als bereits zugesicherter Vertrag.

### 4.4 Abnahme

Neue/geänderte/gelöschte Zeile mit bestätigter Übernahme; ausdrücklicher Fehler; verspätete, doppelte und partielle Lieferung; unklarer Ausgang; zulässiger Wiederholungsversuch; neue Eingabe während Versand; Fokus während Push; ausgeblendete Spalte vor einer gebundenen Spalte. Keine Eingaben verschwinden unbemerkt, keine doppelte Ausführung durch wiederholten Klick.

## 5. Berechnungen: vollständiger konkreter Anwendungsfall

### 5.1 Zweck und Umfang

Der allgemeine Rechner verarbeitet Spaltenwerte derselben Zeile, Felder eines eindeutig zugeordneten Datensatzes und feste Zahlen. Keine Medikamentennamen oder installationsspezifischen Feldcodes fest im Rechenkern. Keine künstlichen Hilfsspalten und keine Verpackungs-/Packungsberechnung.

Für den aktuellen Bedarf gelten die vier Größen:

- T: Anzahl Tiere
- D: Tage
- K: Körpergewicht je Tier
- A: Abgabemenge

Zusätzlich aus dem passenden Datensatz von ID0001 / Verabreichungsart:

- B: Behandlungsmenge; vom Nutzer genannt `IDB_175_8`.
- Behandlungseinheit; vom Nutzer genannt `IDB_183_5`.
- S: Stammkörpergewicht; vom Nutzer genannt `IDB_313_5`.

Der Workflow liest die Behandlungseinheit an einigen Stellen mit Länge 4. Die tatsächlich gültige Feldzuordnung ist im Zielbestand zu prüfen; nicht stillschweigend ändern. Der Workflow enthält historische Bedingungen und wird nicht als unveränderliche Spezifikation kopiert. Insbesondere dürfen seine uneinheitlichen Leerfeldprüfungen nicht ungeprüft übernommen werden.

Nach Angleichung der Einheiten gelten die ausdrücklich konfigurierten Richtungen:

```text
A = T × D × K × B ÷ S
T = A × S ÷ D ÷ K ÷ B
D = A × S ÷ T ÷ K ÷ B
K = A × S ÷ T ÷ D ÷ B
```

Diese vier Richtungen bilden eine Berechnungsgruppe. Kein universeller Gleichungslöser. Die fachliche Zeitbasis von B muss zur Multiplikation mit Tagen passen; diese Bedeutung wird vor Umsetzung bestätigt und nicht aus einem Feldnamen geraten. Der Editor überprüft damit konfigurierte Rechenregeln, keine medizinische Eignung einer Dosierung.

### 5.2 So bedient der Maskenbauer die Konfiguration

1. Erfassungstabelle auswählen, Inspector **Berechnungen → + Berechnung**.
2. Namen vergeben und T/D/K/A den vorhandenen Spalten anhand ihrer stabilen Kennungen zuordnen.
3. Für jede Richtung das Ergebnis und die Formelglieder anzeigen; Spalte, Datenfeld oder feste Zahl auswählen.
4. Datenquelle, Feld und Datensatzbezug für B, S und die Einheit auswählen. Der Bezug muss sich auf das in dieser Erfassungszeile ausgewählte Medikament/die Verabreichungsart auflösen. Niemals blind den ersten Datensatz einer Liste verwenden.
5. Eingabe-, Daten- und Ausgabeeinheiten festlegen. Körpergewicht und Stammkörpergewicht müssen kompatibel sein.
6. Rundung je Ergebnis auswählen: Nachkommastellen, kaufmännisch/auf/ab. Für Tiere und Tage fachlich sinnvolle Vorschläge machen, ohne selbst zu entscheiden, ob Bruchteile zulässig sind.
7. Mit frei eingegebenen Prüfwerten alle vier Richtungen im Dialog prüfen und Konfiguration übernehmen. Änderungen der Konfiguration sind Undo-fähig.

### 5.3 So bedient der Anwender die fertige Maske

- Drei manuell vorgegebene Werte bestimmen den vierten; berechnete Werte bleiben als solche gekennzeichnet.
- Ändert sich eine Eingabe, aktualisiert sich das abgeleitete Ergebnis.
- Eine manuelle Überschreibung macht das betreffende Feld manuell. Kein anderer manueller Wert wird deshalb ungefragt ersetzt.
- Ein geleertes Feld kann wieder zum Ergebnis werden. Bei mehreren fehlenden unabhängigen Werten wird nicht geraten.
- Bei vier manuellen Werten wird nichts beliebig überschrieben. Eine inkonsistente Kombination wird anhand einer zur Präzision passenden Regel kenntlich gemacht.
- Leer, explizite Null, ungültige Zahl, noch ladender Wert und fehlendes Datenfeld sind verschiedene Zustände.
- Änderungen der Datensatzauswahl entwerten abgeleitete Werte des alten Bezugs. Verspätete Antworten zum alten Datensatz werden nicht übernommen. Manuelle Eingaben werden entsprechend einer sichtbaren, festgelegten Regel erhalten.
- Berechnete Werte werden nicht wieder als unabhängige Eingaben derselben Gruppe verwendet. Keine Rechenschleifen.

### 5.4 Einheiten und numerische Regeln

Zunächst nur der reale Bedarf: kg/g/mg, l/ml, Anzahl und Tage sowie einheitenlose Faktoren. Mengenwerte tragen ihre Einheit; Umrechnung benutzt eine kanonische Basis je kompatibler Größenart.

Masse wird nur in Masse, Volumen nur in Volumen umgerechnet. Keine automatische Umrechnung von mg in ml ohne eine zusätzlich ausdrücklich modellierte Beziehung. Die Größenart von Körpergewicht und Medikamentenmenge bleibt semantisch unterscheidbar, auch wenn beide Masse verwenden. Die Formelgruppe berücksichtigt die konfigurierte Zeit-/Anzahlbasis.

456 g bleiben 456 g, unabhängig von einer Packung zu 1 kg. Keine Erweiterung auf Fläche, Währungen, Temperatur oder andere hypothetische Anwendungsfälle in dieser Phase.

Erst das Endergebnis in seiner Ausgabeeinheit runden. Ungerundete Zwischenwerte bleiben für weitere Berechnung verfügbar. Dezimale Eingabe-, Daten- und Ausgabeformate explizit normalisieren; keine mehrdeutigen Tausender-/Dezimaltrennzeichen erraten. Rundungsgrenzen mit gezielten Beispielen prüfen und eine geeignete numerische Umsetzung wählen.

Fehlender Operand, unbekannte Einheit, ungültige Zahl oder Division durch null liefert einen strukturierten Grund, kein scheinbar gültiges Ergebnis.

**Wird eine referenzierte Spalte oder Datenquelle gelöscht, bleibt die Formel erkennbar unvollständig und rechnet nicht weiter. Niemals den Operanden still entfernen und eine andere Formel ausführen.** Undo stellt Referenz und Konfiguration wieder her.

### 5.5 Integration und Abnahme

Vorhandene Rechenlogik gezielt erweitern. Bestehende einheitenlose Formeln bleiben lesbar und behalten ihre bisherige Semantik, sofern keine konkrete Fehlerkorrektur ausdrücklich beschlossen wird. Neue Datenformen benötigen eine bewusste Schemaentscheidung.

Nur in Formeln benötigte Datenfelder werden ebenfalls für den Export gesammelt und geladen. Tabellenanzeige und ERP-Ausgabe verwenden dieselbe Berechnung und vereinbarte Rundung; Einheitenbeschriftungen dürfen keine numerischen ERP-Felder verunreinigen.

Prüfen: alle vier Richtungen; mg→g, g→kg, ml→l; Gewichtseinheiten; manuelle Überschreibung; Wechsel des Ergebnisses; mehrere fehlende Werte; widersprüchliche Vollbelegung; Quelle lädt/fehlt/wechselt; alte Antwort nach Wechsel; Nullnenner; Rundungsgrenzen; gelöschte Referenz und Undo; Speichern/Laden; tatsächlicher Export der berechneten Werte.

## 6. Kanban

Eine gemeinsame Kartenvorlage je Board bleibt die Ausgangsentscheidung. Die bisherige Erzeugung einer Vorlage ist noch kein Beweis, dass Laden, Löschen oder Duplizieren deren Anzahl immer korrekt erhalten; diese Invariante wird überprüft und abgesichert.

Der dauerhaft sichtbare Musterkasten oberhalb der Spalten entfällt im normalen Editor-Modus. **Kartenmuster bearbeiten** am Board öffnet einen klar bezeichneten Bearbeitungsmodus mit der tatsächlichen Card-Komponente. Dort sind sichtbare Stellen, deren Bindungen und Darstellung nachvollziehbar zugeordnet. Übernehmen/Abbrechen, Auswahl, Fokus und Undo sind definiert.

Die Laufzeitkarten verwenden dieselbe Vorlage. Keine kopierten Konfigurationen pro Spalte. Leere Boards bleiben bedienbar. Die Vorschau benötigt keine erfundenen ERP-Datensätze.

Der technische Typ `kanban-zimmer` bleibt aus Kompatibilitätsgründen erhalten. Seine sichtbare Bezeichnung wird erst nach Klärung des tatsächlichen Arbeitsbegriffs entschieden; weder „Zimmer“ noch „Untergruppe“ wird pauschal erzwungen.

Abnahme: genau eine gültige Vorlage, Bearbeitung aller vorhandenen Card-Stellen, korrekte Bindings, Wirkung auf Laufzeitkarten, Laden/Duplizieren/Löschen/Undo, leeres Board und verschachtelte Unterteilungen, unveränderte ERP-Einsortierung.

## 7. Architekturverträge

### 7.1 Abhängigkeiten und Composition

UI verwendet Application/Core-APIs. Application koordiniert fachliche Operationen und benötigt nur kleine Ports für äußere Fähigkeiten. Core importiert keine UI, Application, Adapter, Bootstrap oder Compiler.

**Core ist frei von SoftENGINE-Laufzeit-APIs und Transportmechanismen. ERP-Fachbegriffe, Datenkonfigurationen und Action-Semantik dürfen zur Fachdomäne gehören.** Emitter und Adapter enthalten konkrete SoftENGINE-Ausgabe, Globals, I/O und Verbindungstechnik.

Compiler/Preparation und Emitter laufen ohne React, Lit, DOM, localStorage oder Browser-Datei-APIs. Für CSS und gebaute Runtime werden plain Daten/Artefakte übergeben oder headless geeignete Eingänge vorgesehen; ein Vitest-Transform allein beweist noch keine eigenständige Node-Ausführbarkeit.

Es gibt getrennte Startpunkte für **Editor** und **exportierte Maskenlaufzeit**. Die exportierte Maske darf nicht vom Editor-Bootstrap abhängen. Gemeinsame fachliche Definitionen bleiben kanonisch; die Maskenlaufzeit erhält die tatsächlich benötigten Definitionen und Renderer.

Importregeln gelten mit Einführung neuer Grenzen. Keine Zyklen zwischen Hauptmodulen, auch nicht über Re-Exports. Barrels nur an stabilen Modulgrenzen. Ordner werden nur bei einem konkreten Nutzen verschoben.

### 7.2 Project, Session und Operationen

Project enthält Baum, Datenquellen und Relationen als einzige fachliche Wahrheit. Alte Stores dürfen nur klar zugeordnete Subscription-Fassaden sein. Neue und alte Pfade besitzen dokumentierte Ablösebedingungen.

Session enthält Auswahl und aktive Seite; Reconciliation nach Delete, Page Delete, Load, Replace, Undo und Redo erfolgt zentral. Die Root-/Page-Regel wird am tatsächlichen Modell festgelegt.

Project-Invarianten betreffen eindeutige IDs, erreichbaren zyklusfreien Baum, konsistente Parent-/Child-Beziehungen, Block-Properties und Referenzen. Strukturell gültiger Entwurf und exportfähiges Projekt sind verschieden: explizit ungelöste Bindungen/Formeln können speicherbar sein, blockieren aber den betroffenen Export. Strukturelle Beschädigung wird nicht als Entwurf akzeptiert.

Delete, Duplicate, Move, Pages, Resize und Property-Updates erhalten klare Referenzregeln. Interne Referenzen einer Kopie werden auf die Kopie umgebogen, externe bleiben nur nach festgelegter Semantik erhalten. Schutzregeln und fachliches Cleanup liegen in puren Operationen. Erwartbare Benutzerfehler liefern kleine strukturierte Issues mit Code und Ort; interne Programmierfehler dürfen Exceptions sein.

Öffentlich gelieferte Project-Daten und Snapshots werden nicht außerhalb der Operationen mutiert. Unveränderte Teilstrukturen behalten stabile Referenzen, wo sinnvoll. Keine vollständige Tiefenkopie bei jedem Pointer-Event aus Architekturprinzip.

IDs werden an Erstellungsgrenzen erzeugt; mehrfache Erzeugung kann einen kleinen Generator erhalten. Technische IDs bleiben von ERP-Fachcodes getrennt.

### 7.3 History und Reaktivität

Vorhandene Snapshot-History, Transaktionen, Gestenklammern und `useSyncExternalStore` weiterverwenden. Keine erneute Einführung derselben Infrastruktur.

History enthält Project und die benötigte Session, keine Dialoge, Notifications oder Laufzeit-Schreibstände. Sie bleibt begrenzt.

Transaktionen brauchen neben Gruppierung klare Regeln: keine leeren Undo-Schritte; unveränderte Gesten löschen Redo nicht; expliziter Abbruch stellt den Ausgangszustand wieder her; Ende/Unmount schließt eine offene Geste genau einmal. Unabhängige Befehle dürfen nicht unbemerkt in eine laufende Geste fallen. Fehler veröffentlichen keine teilweise konsistente fachliche Mehrfachänderung. Undo während einer offenen Geste erhält eine definierte Behandlung.

Fachliche Mehrfachänderungen werden konsistent veröffentlicht. UI-Subscriptions sehen keinen Baum mit schon entfernten Quellen bei noch unveränderten Referenzen. Granularere Hooks nur bei gemessenem Nutzen und mit stabilen Snapshots.

### 7.4 Persistenz

Bestehende Dateikennung `aufbau-editor-maske`, Dateiversion 2 und die tatsächlich im Zielrepository unterstützte Schemaversion bleiben zunächst Vertrag. Im Original war Schemaversion 8 vorhanden. Kein Neustart als V1 und kein automatisches Versprechen, sämtliche historischen Versionen lesen zu können.

Versionierte DTOs sind vom In-Memory-Project getrennt. Reiner ProjectCodec: parse, Schema prüfen, decode/encode, stringify. Historische optionale Felder erhalten versionsfeste Defaults, nicht wechselnde Manifest-Defaults. Aktuelle Neuerstellungsdefaults, historische Decode-Defaults und Lit-Laufzeitinitialwerte werden unterschieden.

Neue Einheiten-/Formelkonfiguration benötigt eine explizite Format-/Schemaentscheidung mit Tests für bisher unterstützte Projekte. Keine allgemeine Migrationsengine ohne konkrete Migration.

AutosaveStore und FileIO behandeln rohe Daten und I/O; Validierung gehört zum Codec/Application-Fluss. Der Browser-Wiederherstellungsstand darf zusätzlich die Session enthalten. Projektdatei und Autosave müssen nicht dieselbe äußere Hülle besitzen; beide verwenden denselben fachlichen Project-Codec.

Fehlgeschlagenes Laden ersetzt das aktuelle Projekt nicht. Ein unlesbarer Browserstand wird nicht durch einen nachfolgenden Autosave überschrieben, solange sein Erhalt oder eine bewusste Verwerfung nicht geklärt ist. Notfallkopien und Speicherfehler bleiben ehrlich sichtbar. Autosave unterscheidet fachliche Änderungen von UI-Änderungen; Timer besitzen Flush/Cleanup und speichern keinen abgebrochenen Zwischenstand als endgültiges Projekt.

### 7.5 Blocks, Catalog und DOM

Fachliche Manifeste enthalten Typ, sichere Neuerstellungsdefaults, Property-Regeln, Layout/Children, Bindings, Events und tatsächliche Fähigkeiten. React/Lit/DOM/Icons/Inspector-Komponenten gehören nicht hinein. Keine Sammlung vorsorglicher Boolean-Capabilities.

Renderer-Metadaten und Editor-Metadaten sind getrennt, über Blocktyp zugeordnet. Ein Catalog wird explizit erzeugt, prüft doppelte Typen und wird anschließend nicht mutiert. Seine Manifeste und Defaults dürfen ebenfalls nicht gemeinsam veränderbar sein.

Lit kennt das Manifest. Das Manifest entsteht nicht aus der Lit-Klasse. Registrierung fachlicher Metadaten wird von `customElements.define` getrennt.

Manifeste, Exportdefaults und Lit-Initialwerte müssen zusammenpassen. Wenn der Export Defaultwerte weglässt, muss die Runtime exakt dieselbe Bedeutung herstellen.

React und Lit dürfen verschachtelt sein, aber niemals dieselben DOM-Knoten gegeneinander verwalten. React-Portale/Light DOM und Lit-Shadow-DOM brauchen ausdrückliche Eigentümerschaft. Kommunikation über Daten, Properties und definierte Events.

Generische Boundary-Typen werden nach Validierung konkret. Kein dauerhaftes `Record<string, unknown>` im gesamten Feature, keine unnötige Typakrobatik. Bestehende Vererbung wird nur bei nachgewiesenem Vorteil durch Composition ersetzt.

### 7.6 Export und Runtime-Builder

`prepareSoftEngineExport` berechnet gemeinsam verwendete Quellen, Felder, Relationen, Bindings, Events, Layout und Runtime-Anforderungen. Keine vorab erfundene Universal-IR. Strukturierte Fehler/Warnungen nennen betroffene Objekte. Der bestehende Dateiformvalidator bleibt für Dateiform zuständig; fachliche Prüfung wird nicht damit verwechselt.

Pure Emitter erzeugen Artefakte; Browserdownload/Übertragung liegt außen. Bestehende Verpackung, Dateinamen, Einbettung, ASCII/LF-Regeln und SoftENGINE-Marker bleiben geschützt. Interne Teilung in CSS/Runtime darf nicht versehentlich zusätzliche externe Dateien oder Nachladeabhängigkeiten erzeugen.

Der Buildervertrag umfasst Ordner, `blockType`, Imports/Re-Exports, Teilabhängigkeiten, Ladereihenfolge und `FF.*`-Namen. Vor jedem betroffenen Schritt wird dessen Auswirkung geprüft. Eine Manifest-Liste allein ersetzt keine Abhängigkeitsanalyse.

Ziel: explizite Runtime-Einstiege und strukturierte Block-/Teilzuordnung; Modulabhängigkeiten möglichst aus dem aufgelösten Bundlergraphen, andernfalls bewusst aus geeigneter strukturierter Analyse. Keine neue Regex über verschobene TS-Dateien. Externe globale Verträge von internen Verbindungen gemeinsam ausgelieferter Teile unterscheiden.

Übergangsadapter dürfen den bisherigen Builder bedienen, besitzen aber eine eindeutige Quelle und konkrete Löschbedingung. Kein Catalog zieht versehentlich alle Renderer in jeden Export.

### 7.7 Live-Adapter

SoftENGINE-Anbindung nur entlang realer Verantwortungen schneiden: Empfang, Commands/Refresh, Antworten/Meldungen, Fokus. Kleine konsumentenbezogene Ports. Externe Daten an der Grenze prüfen, echte anonymisierte Fixtures verwenden.

Verbindung, Listener, Timer, Subscriptions und Polling besitzen einen klaren Besitzer und `dispose`. Reconnect, HMR und Unmount erzeugen keine Doppelanmeldung. Späte Antworten nach Dispose oder Kontextwechsel werden nicht auf einen neuen Zustand angewendet. Fokus und lokale Eingaben überleben passende ERP-Pushes.

## 8. Ausführbare Reihenfolge nach Phase 0

**Planungsschritt P – Produkt- und Designvertrag:** Bestand/Entscheidungen, konkrete Berechnungsgruppe, Tabellenübergänge und visuelle Entwürfe aus Kapitel 2–6 fertigstellen. Offene Produktfragen gebündelt entscheiden. Erst danach Freigabe der Umsetzung.

**1 – Project/Session/History:** Eine Wahrheit, zentrale Reconciliation, Mutationsschutz und konsistente Mehrfachänderungen. Vorhandene Transaktionen auf echte Lücken prüfen. Abnahme: Load/Edit/Undo/Save, Pages, Quellen/Relationen, unveränderte und abgebrochene Gesten.

**2 – Persistenz:** Bestehenden Vertrag hinter Codec, Autosave und FileIO abtrennen. Session-Wiederherstellung und Notfallkopien bewahren. Abnahme: Roundtrip, unterstützte alte Dateien, kaputte/unbekannte Daten, gescheiterter Speicher und Abbruch.

**3 – Vertikaler Button-Pilot:** Nur die benötigten puren Operationen und Grenzen extrahieren. Manifest, Catalog, Lit, Editor-Metadaten, Inspector, Codec, Export und Runtime-Builder als vollständigen Weg prüfen. Nötige Headless-/Builder-Grundlagen gehören hierher; sie werden nicht auf eine spätere Phase vertagt.

**4 – Komplexe Gegenprobe:** Tabelle/Erfassung einschließlich Spalten- und Quellenfähigkeiten über denselben Weg führen. Erst danach das Manifestmuster für ausreichend erklären. Keine neue allgemeine Abstraktion allein aus dem einfachen Button ableiten.

**5 – Tabelle und Berechnung vollständig:** Nach dem freigegebenen Bedienentwurf Schreibzustände und konkrete Berechnungsgruppe umsetzen. Datenauflösung, Einheiten, Config-UI, Persistenz, Vorbereitung/Export und Laufzeit gemeinsam abschließen. Bestätigungsregeln nur im Rahmen nachgewiesener Hostfähigkeiten umsetzen. Neue Schemaänderung ausdrücklich behandeln.

**6 – Kanban vollständig:** Board/Muster/Spalten/Unterteilungen und Card migrieren und den festgelegten Bearbeitungsmodus umsetzen. Eine Vorlage, korrekte Zuordnung, reale Laufzeitkarten und Undo prüfen.

**7 – Übrige Blocks:** Kleine vollständige Scheiben für Text/Trenner/Datum, Formfeld, Navigation/Ansicht/Popup und verbleibende Layoutblocks. Jeweils Editor, Codec, Export und Runtime fertigstellen, bevor der nächste zusammenhängende Bereich beginnt.

**8 – Gemeinsame Infrastruktur abschließen:** Noch verbliebene Export- und Adapterkopplungen entfernen, Runtime-Builder-Übergang vollständig ablösen, beide Composition Roots abschließen. Diese Phase vervollständigt die bereits funktionierenden Pfade; sie ist kein später Reparaturtermin für unvollständige Piloten.

**9 – Oberfläche konsolidieren:** Den bereits vorab festgelegten Shell-/Inspector-Entwurf über alle migrierten Funktionen vollständig anwenden. Responsivität, Fokus, Tastatur und Fehlerdarstellung prüfen. Keine grundlegende Bedienentscheidung erst jetzt erfinden.

**10 – Abschluss:** Verbleibende Übergangswege löschen, Architekturgrenzen und CI vervollständigen, Dokumentation und Abnahmen abschließen. Cleanup erfolgt zusätzlich laufend in jeder Phase.

Jedes Paket nennt Zielverhalten, betroffene Dateien/Verträge, Abhängigkeiten, konkrete Prüfung und Löschbedingungen für Übergangscode. Ein fertig migrierter Bereich muss nutzbar sein. Kein Paket heißt nur „Dateien verschieben“.

## 9. Tests, visuelle Prüfung und CI

Die abgeschlossenen Phase-0-Referenzen schützen Ausgangsverhalten. Bewusste UX-/Fachänderungen erhalten überprüfte neue Erwartungen; Golden-Dateien werden nicht pauschal erneuert, nur damit Tests grün werden.

Gezielte Prüfungen:

- Core: Delete/Duplicate/Move, Raster, Pages, Property-Cleanup, Referenzen, History-Grenzen.
- Block Contracts: gültige Defaults, Fähigkeiten, Property-Bezüge, Parent-/Child-Regeln und Zuordnung zu Runtime/Renderer. Keine tautologischen Tests pro Getter oder Property.
- Codec: unterstützte Versionen, Roundtrip, versionsfeste Defaults, defekte Struktur, ungelöste zulässige Entwürfe, unbekannte Version.
- Export: Quellen-/Feldsammlung einschließlich Formel-only-Felder, Bindings, Relationen, Events, Layout, Runtime-Auswahl, Dateiform.
- Live: echte Contract-Fixtures, relevante Lieferungen, Fehler, späte Antworten und Dispose.
- Integration: Load/Edit/Undo/Save; Add/Edit/Export; Page Delete/Undo; Quelle/Relation/Export; Rechnung mit Datensatzwechsel; Kanban-Muster.

Der vorhandene HTML-Golden-Test entfernt das Runtime-Skript. Der vorhandene Runtime-Test prüft Reproduzierbarkeit. **Beides zusammen beweist nicht unverändertes Runtime-Verhalten.** Deshalb wenige Browser-Smokes mit dem tatsächlich exportierten HTML: Custom-Element-Registrierung, verschachtelte Container, Bindings, Actions und Datenlieferungen. Echte Hostsemantik weiterhin getrennt in SoftENGINE prüfen.

Sichtproben erweitern: Hauptansicht, normal/geändert/ausstehend/fehlerhaft, Zellherkunft, Berechnungsdialog mit allen vier Richtungen und Fehler, Kanban normal/Muster, Inspector schmal/breit, Exportmenü, leere und umfangreiche Maske.

Performance mit repräsentativem Projekt und langen Tabellen messen: flüssige Eingabe, keine unnötigen Gesamtrenders, keine wiederholte vollständige Formel-/Quellenauswertung pro Zelle, keine Listener- oder Timerlecks. Grenzwerte aus realen Ausgangsmessungen festlegen.

CI mindestens TypeScript, ESLint, Tests einschließlich Contracts/Golden, Runtime-Build und Application-Build. Keine unnötige Matrix. Grüne lokale Scripts sind kein Nachweis, dass CI bereits eingerichtet ist.

## 10. Abschlusskriterien

- Genau eine fachliche Project-Wahrheit, separate konsistente Session und zuverlässige Snapshot-History.
- Pure Operationen und headless Export; klare kleine Adapter und getrennte Startpunkte für Editor/Maskenruntime.
- Frameworkfreie Manifeste, unveränderlicher Catalog, keine konkurrierenden Defaultquellen oder Legacy-Registries.
- Unterstützte Projekte bleiben ladbar; neue Schemaänderungen sind ausdrücklich behandelt; Autosave verliert keine unlesbaren Daten stillschweigend.
- Der Anwender versteht Zellherkunft und Schreibstatus. Unbekannter Ausgang wird nicht als Fehler oder Erfolg ausgegeben.
- Die konkrete Vier-Wege-Berechnung funktioniert mit Datenfeldern, passender Zeile, Einheiten, Rundung und exportierter Ausgabe ohne Hilfsspalten/Verpackungslogik.
- Kanban-Muster ist verständlich bearbeitbar; genau eine Vorlage versorgt die Laufzeitkarten.
- Hauptoberfläche und komplexe Dialoge besitzen visuell und praktisch geprüfte Gestaltung.
- Runtime-Builder benötigt keine TS-Quelltext-Regex zur Architekturentdeckung; externe Verträge bleiben geschützt.
- Gezielte Tests, Browser-Smokes, notwendige SoftENGINE-Echttests und CI sind nachweisbar abgeschlossen.
- Übergangscode, tote Adapter und alte maßgebliche Planverweise sind entfernt.

## 11. Offene Entscheidungen und Grenzen

Vor Umsetzung zu klären, ohne den Nutzer mit technischen Detailfragen zu belasten:

1. Eindeutiger Datensatzbezug und gültige Feldlänge der Behandlungseinheit; passende fachliche Zeitbasis der Behandlungsmenge.
2. Zulässige Ergebnispräzision für Tiere/Tage und gewünschtes Verhalten manueller Werte beim Datensatzwechsel.
3. Tatsächliche Nachweis-/Wiederholungsmöglichkeiten der schreibenden SoftENGINE-Aktionen.
4. Sichtbare Bezeichnung der Kanban-Unterteilung und Freigabe der konkreten Designentwürfe.

Der Agent liefert jeweils einen begründeten Vorschlag und stellt gebündelte, verständliche Produktfragen. Fehlende echte ERP-Nachweise werden nicht geraten. Architekturentscheidungen mit überschaubarem, reversiblem Einfluss trifft der Agent innerhalb dieses Plans selbst.

Die bisherige Remote-Analyse hat weder Build/Tests ausgeführt noch die Oberfläche praktisch gesehen. Lokale Prüfungen des Originals sind kein Nachweis für den genannten Remote-Commit. Diese Grenzen bleiben bei der Übergabe sichtbar.

## 12. Übernahme des ursprünglichen EditorAufbauV3

| Ursprüngliche Abschnitte | In dieser Fassung |
|---|---|
| 0–3 Ziel, Abhängigkeiten, keine Großabstraktionen, eine Wahrheit | 1, 7.1, 7.2 |
| 4–11 Project, Invarianten, Session, History, Fassade, pure Operationen, Issues, IDs | 7.2–7.3 |
| 12–17 DTO, Codec, kompatibles Laden, Versionen, Autosave, FileIO | 7.4 |
| 18–23 Manifest, Defaults, Metadatentrennung, Catalog | 7.5 |
| 24–26 React/Lit, Reaktivität, komplexe Editor-UIs | 3, 7.3, 7.5 |
| 27–29 Spaltenordinalität, Actions, Layout | 4.3, 7.1–7.2, 7.6 |
| 30–36 konkrete Preparation/Emitter, headless, Diagnostics, Golden | 7.6, 9 |
| 37–42 Live-Adapter, Ports, Lifecycle, Datenprüfung, Builder | 4.2, 7.6–7.7 |
| 43–48 Struktur, Bootstrap, Importregeln, Zyklen, Barrels, Typen | 7.1, 7.5 |
| 49–56 Testphilosophie, Contracts, Core/Export/Persistenz/Integration, CI | 9 |
| 57–59 vertikale Migration, Übergangscode, Phasen | 8 |
| 60–62 DoD, Nutzen statt Architekturtheater, verständliches Zielbild | 1, 10–11 |
| 63 Arbeitsregel für Refactoring-Chats im bisherigen Repo-Plan | 13 |

Die ursprüngliche eigenständige Einführung von History-Transaktionen und `useSyncExternalStore` entfällt, weil diese Grundlagen bereits existieren. Die Beispiel-Dateiversion V1 wird durch den tatsächlichen bestehenden Vertrag ersetzt. „SoftENGINE-frei“ wird auf Infrastrukturabhängigkeiten präzisiert. Die Phasenfolge wird durch Kapitel 8 ersetzt. Design- und Fachentscheidungen werden vorgezogen; ihre Implementierung erfolgt in vollständigen vertikalen Paketen.

Das Endsystem soll kurz erklärbar bleiben: Project enthält die Maske. Editor koordiniert Project, Session und History. Pure Funktionen ändern fachliche Daten. Manifeste beschreiben Blocks. React bedient, Lit rendert. Codec übersetzt Dateien. Preparation und Emitter erzeugen SoftENGINE-Artefakte. Adapter verbinden Browser und ERP. Klare Startpunkte setzen die Teile zusammen.

## 13. Arbeitsregel für umsetzende Chats

Jeder umsetzende Chat liest diese Fassung vollständig und bearbeitet nur das ausdrücklich zugewiesene Paket. Er bestätigt den aktuellen Repository-Stand, prüft betroffene Konsumenten und Verträge, führt passende Checks aus und beginnt keine spätere Phase eigenmächtig. Abschließend nennt er Änderungen, Prüfergebnisse, verbleibende Grenzen und absichtlich noch vorhandene Übergangspfade. Vorherige Chatberichte ersetzen keine Prüfung des aktuellen Codes. Maßgeblich sind dieser Plan und ausdrücklich nachfolgende Nutzerentscheidungen.
