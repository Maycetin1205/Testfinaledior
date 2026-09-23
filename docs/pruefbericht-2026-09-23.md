# Prüfbericht Aufbau-Editor, 23.09.2026

Stand: `master` c0c375a. Auftrag: Bestandsaufnahme in vier Teilen (Erfassung,
Datenquellen/Relationen/Aktionen, Bausteine/Bedienung, Technik), danach eine
Meinung: neu bauen oder weiterbauen.

Wie der Bericht entstand: vier Prüfer haben nur gelesen, jeder ein Thema,
jeder mit Datei und Zeile als Beleg. Dazu habe ich selbst den Editor gebaut
und im Browser bedient (Bibliothek und Maske geladen, Bausteine gewählt,
exportiert), die exportierte Maske und die handgebaute Empfangsmaske im
Browser geöffnet, `npm run check` und `npm test` laufen lassen und die
Git-Historie gelesen. Nichts am Code wurde geändert. „Belegt“ heißt am Code
oder im Browser nachgewiesen, „Vermutung“ heißt aus dem Code geschlossen.
Was SoftEngine wirklich tut, kann nur der Nutzer prüfen; das steht in
Abschnitt 7.

---

## 1. Kurzfassung

**Urteil: weiterbauen, aber nicht so wie bisher.** Der Kern (rund 40 Prozent
des Codes) ist gut und bleibt: die Bausteindeklaration, aus der Inspector,
Export und Laden entstehen; der eine Editor-Zustand mit Rückgängig; die
Export-Kette mit Byte-Regeln; die Erfassungslogik selbst (Vormerken,
Korrigieren, Nachschlagen, Ankunft prüfen). Die Mittelschicht wird neu
geschnitten: das Datenmodell der Quellen, der Sammelordner `behavior/`, die
Trennung Editor/Maske, der Laufzeit-Bau. Die Außenschicht wird neu gebaut, wo
du sie nicht magst: Kanban, Datencenter und Aktionen als Seitenleiste,
Inspector mit Reitern, Designsprache und die fehlenden Bausteine der
Empfangsmaske. Ein Neubau von null würde die guten 40 Prozent wegwerfen und
das eigentliche Problem der letzten vier Wochen wiederholen: sechs Pläne,
zwei Umbenennungen, 41 Tests in einem Commit gelöscht. Das Problem war der
Arbeitsprozess, nicht der Kern.

**Was heute den Hauptfall blockiert** (Erfassung von Belegen bis ins ERP):

1. Die Vorgabedatei `library/default.json` beschreibt die Belegposition
   mit Kopfsatz und Hol-Relation zugleich und ohne Satznummer. Damit kommen
   in der Belegerfassung nie Positionen an, und Ändern/Löschen sind aus.
2. „Satz anlegen“ holt die neue Satznummer einmal je Kette statt einmal je
   Zeile. Zwei erfasste Zeilen bekommen dieselbe Nummer, die zweite
   überschreibt die erste.
3. Nach einem Schreiben bestellt die Maske keine frischen Daten; ob das ERP
   den Wert angenommen hat, sieht niemand. Die Ankunftsprüfung läuft bei jeder
   Lieferung und kann Zeilen zurück in die Vormerkung werfen, also doppelt
   schreiben.
4. Die Statusfarben der Erfassung sind tot: der Code setzt englische
   Klassennamen, der Stil erwartet die deutschen. Kein Punkt, kein Rot, kein
   Pulsieren.
5. Die Kundendatei kann still verloren gehen: eine neu angelegte holende
   Quelle wird unvollständig gespeichert, beim nächsten Start gilt die ganze
   Datei als beschädigt, der Editor startet leer und überschreibt sie.
6. Maskendateien aus der deutschen Zeit (04. bis 15.09.) laden nicht mehr:
   „Das ist keine Maskendatei des Aufbau-Editors.“ Selbst ausprobiert mit
   `masken/mustermaske.json`.

Alle sechs sind eng begrenzt und einzeln behebbar.

**Umfang in Zahlen**

| | |
|---|---|
| Dateien in `src/` | 286, rund 32.000 Zeilen |
| Commits seit 25.08. | 345, davon 18 seit dem Sicherungsstand 7ebe69c |
| Umbenennung 4cd762f | 528 Dateien, 27.403 Zeilen neu, 33.579 weg |
| Tests | 2 Dateien mit 4 Fällen; 41 Testdateien in 4cd762f gelöscht, 79 über die Historie |
| Kommentarzeilen | 2.165 vor der Umbenennung, 240 heute |
| `behavior/` | 32 Dateien, 4.816 von 10.430 Bausteinzeilen |
| `Record<string, unknown>` als Typersatz | 81 Stellen in 31 Dateien |
| Editor-Bundle / Laufzeit je Maske | 950 kB / 251 kB |

---

## 2. Was läuft (selbst geprüft)

- `npm run check` (Typprüfung und Linter): grün.
- `npm test`: Referenzabzug grün. Starttest grün, sobald ein Browser da ist
  (der Container hatte Chromium in anderer Version; nach Umleitung lief er).
- Editor gebaut und bedient: Bibliothek laden, Referenzmaske laden, Bausteine
  wählen, exportieren. Keine Konsolenfehler.
- Export: 251 kB HTML, reines ASCII, SEvariablen wie erwartet (ART, dann POS
  als Kopfsatz-Art zuletzt). Die exportierte Maske startet, jeder Baustein
  zeichnet.
- Die beiden Tests beweisen: Exportstruktur stabil, Laufzeit startet,
  Attribute kommen an. Sie beweisen nichts von der Fachlogik, und keiner der
  Fehler in diesem Bericht macht sie rot.

Im Browser gesehen, was Editor und Export trennt:

- Editor zeigt in Tabelle und Erfassung Striche in acht Zeilen; der Export
  zeigt leere Zeilen und den Satz „Die Datenquelle ‚Belegpositionen‘ hat noch
  keine Daten geliefert.“
- Formularfeld im Export: Platzhalter „Die Datenquelle dieses Feldes hat noch
  keine Daten geliefert.“ Du willst keine Meldungen; die Stelle soll leer
  bleiben.
- Kanban im Editor zeigt eine Musterkarte mit Strichen in Spalte 1 und den
  Zähler „0“; der Export zeigt eine leere Spalte. Karten in Maskenform sieht
  man im Editor nie.
- Ohne SoftEngine erscheint nach zehn Sekunden oben eine rote Leiste
  „SoftEngine-Anschluss nicht gefunden“. In SoftEngine kommt sie nicht, aber
  der Mechanismus widerspricht deiner Regel.

---

## 3. Erfassung von Belegen

### 3.1 Aufbau und Können

`ff-capture` ist die Tabelle plus eine unten klebende Erfassungszeile,
darüber die erfassten, noch nicht geschriebenen Zeilen. Der gesamte Zustand
liegt in einer Klasse `CaptureLedger` (`src/blocks/capture/ledger.ts`,
1.206 Zeilen, vier Abschnitte: Stiftzeile mit Nachschlagen und Berechnung,
erfasste Zeilen, Änderungen gebuchter Zeilen, Schreibstand und Ankunft).

Sie kann heute (belegt):

- Zeilen anlegen: Tab geht zur nächsten Spalte und erfasst hinter der letzten;
  Enter geht zur nächsten leeren Zelle und erfasst, wenn keine mehr frei ist.
  Erfasste Zeilen stehen unter der Tabelle, lassen sich zurückholen
  („Korrigieren“) und entfernen; Insert springt in die Erfassungszeile.
- Nachschlagen: Vorschlagsliste beim Tippen (höchstens acht, Wortsuche ohne
  Umlautempfindlichkeit), Fenster per F5 oder Enter bei mehreren Treffern,
  Übernahme füllt alle Spalten derselben Hilfsquelle. Schlüsselpaare
  schränken die Hilfsquelle ein (Artikel gewählt, Dosier-Tabelle zeigt nur
  diesen Artikel), Ein-Treffer-Automatik, Ketten über Partnerquellen.
- Gebuchte Zeilen ändern (nur mit Satznummer): Zellen mit „In der Zeile
  änderbar“ werden Eingabefelder; Escape nimmt zurück; Pfeile bewegen in
  derselben Spalte, Enter unter der letzten Zeile führt in die Erfassungszeile
  (wie die Handmaske). Beim Schreiben gehen alle Spalten der Zeile hinaus,
  nicht nur die geänderte.
- Löschen vormerken (nur mit Satznummer), umkehrbar.
- Status je Zeile als Punkt und Tooltip (Optik tot, siehe F1), Zähler am
  Knopf „Schreiben (3)“.
- Summen über alle Treffer samt vorgemerkter Änderungen (erfasste Zeilen
  zählen nicht mit), Blättern oder Rollen, Sortierung, Suchzeile mit
  Markierung, Spalten ausblenden (Bauer und Bediener), Spaltenbreite ziehen,
  Tagesfilter, Auswahl folgen, Ereignisse Zeile gewählt / Doppelklick / F4.

Gegenüber der Handmaske (`docs/chef-maske/BeispielBeleg.html`,
kontrakte.md §16) fehlt: Doppelklick auf `TABELLEPOS_DETAILS`, Löschen und
Infosystem sind nicht verdrahtet (gehen nur als BW_LINK-Schritt von Hand);
kein Startfokus in die erste Zelle; kein Farbkennzeichen der Position, kein
Artikelbild, keine Zeilenart.

### 3.2 Lesen aus SoftEngine

| Weg | Im Code | Laut kontrakte.md |
|---|---|---|
| SEFILELOOP mit Feldliste, Kopfsatz zuletzt | ja | belegt (§4, §5) |
| Kopfsatz und VAR, offener Satz, WINDOW_VARIABLE | ja | belegt (§6) |
| ERPAPICALL als Nachricht nach dem Öffnen | ja, ohne Satznummer | belegt (§10) |
| ERPAPICALL als Bestellblock | nein, immer `[]` | in beiden Chef-Masken |
| Hol-Relation 69 je Position | ja, 12 Plätze fest im Code | belegt (§8) |
| MASKE-Block | bestellt, aber nie gelesen | belegt (§7a) |
| DATASET-Block | ja, Lieferform geraten | nicht belegt (§17) |
| REFRESH-Block | nein | Form an fremder Maske (§4a) |

Antwort und Anfrage werden über die Zeit zugeordnet: die nächste Nachricht,
die wie ein Ergebnis aussieht, gilt als Antwort; 13 Kandidatenschlüssel,
zuletzt „der erste einfache Wert irgendwo“; 20 Sekunden Wartezeit; parallel
ein Abfragen alle 100 ms. Ob SoftEngine eine Kennung anbietet, ist offen.

### 3.3 Schreiben

- PUT_RELATION mit sechs Parametern nach Vorlage 174, `relId` ohne IDB-Vorsatz:
  wie §7. Feld-Art fest `L`; Datum `D` und Zeit `Z` nur über eine eigene
  Vorlage.
- Ein PUT gilt sofort als „Hinausgeschickt“; eine Antwort wird nicht
  erwartet. Frische Daten bestellt die Maske danach nicht (der Aufruf sucht
  eine Funktion `ReloadInputJSON`, die es nicht gibt, und tut dann nichts).
  Die Ankunft wird erst geprüft, wenn SoftEngine von selbst liefert. Ob das
  nach einem PUT passiert, ist an keiner Maske belegt.
- Neue Satznummer: GET 640 als Schritt mit Ergebnisname `PINDEX`; der Editor
  verlangt genau das. Aber der GET läuft einmal je Kette, die PUT-Schritte je
  Zeile mit demselben Ergebnis (F2).
- Löschen: keine eigene Relation, nur `DROP_PINDEX` als Wert; welche Relation
  löscht, ist Kundendaten.
- MASKENEVENT (der am 18.09. belegte Schreibweg in den Beleg) kommt im Code
  nicht vor.
- Leere Werte gehen hinaus: fehlende Quelle, Zeile, Feld, Variable oder
  Baustein ergeben `''`, die Relation wird trotzdem geschickt. Nur eine leere
  Satznummer wird abgefangen.

### 3.4 Berechnung

Modell: eine Gleichung „Leitgröße mal Nenner gleich Zähler“, Faktoren sind
Spalte, Datenfeld oder Zahl, genau eine Lücke wird gelöst, sonst
Stimmigkeitsprüfung mit Toleranz. Einheiten kg, g, mg, l, ml, Anzahl, Tage
mit Dimensionsprüfung. Rundung je Ergebnis 0 bis 6 Stellen, auf/ab/kaufmännisch.
Der Rechenkern (`calculation.ts` ab Zeile 245) ist klein und sauber, aber ohne
Test.

Fachlich am Fall vorbei:

- Die Einheit steht fest je Faktor, nicht je Zeile aus den Daten
  (Behandlungseinheit ml, g, mg, Inj., Stab). Der Umrechner war am 01.09.
  ausgebaut worden („Nicht wieder einbauen“, alte Übergabe
  `RECHNUNG-BELEGERFASSUNG.md` §5) und ist wieder da.
- „Körpergewicht leer heißt Faktor 1“ (alte Übergabe §2) fehlt: eine leere
  Größe ist eine zweite Lücke, dann rechnet nichts. Zeilen mit Dosis pro Tier
  rechnen nie.
- Warnhinweise über der Erfassungszeile, obwohl die Übergabe „Zelle bleibt
  leer, keine Meldung“ verlangte.
- Gebuchte Zeilen zeigen berechnete Werte und schreiben sie bei einer
  Änderung mit („Gebuchte Zeilen rechnen nie“ verletzt).
- Zwei Zahlleser: die Maske liest tolerant („1.500“ ist 1500), die
  Editor-Vorschau streng.

Für „Menge mal Preis“ ist das Modell zu viel, für die Dosisrechnung fehlt das
Wesentliche.

### 3.5 Fehler der Erfassung

B = blockiert oder Datenverlust, S = sichtbar, K = Kleinkram.

| Nr | Schwere | Befund | Wo |
|---|---|---|---|
| F1 | S | Statusfarben, Durchstreichen, Zellenlayout, Zahlen rechts, Vorschlagsstil tot (englische Klassen gegen deutschen Stil) | `ledger.ts:49-57` gegen `captureStyle.ts:74-83`; `body.ts:152`, `:20`, `:108`; `row.ts:72`; `tableBody.ts:178`; `suggestionList.ts:137` |
| F2 | B | Neue Satznummer einmal je Kette statt je Zeile | `actions.ts:423-440`, `events.ts:266-311` |
| F3 | B (Vermutung) | Ankunftsprüfung bei jeder Lieferung ohne Bezug zum Schreiben; Zeilen fallen zurück und gehen doppelt hinaus | `sourceRows.ts:96-99`, `arrival.ts:11-39`, `ledger.ts:1126-1130` |
| F4 | B (bei Spaltenwahl) | Enter/Tab bleiben an einer vom Bediener ausgeblendeten Spalte hängen | `ledger.ts:351-358`, `row.ts:155-164` |
| F5 | S | Klick in eine Änderungszelle schaltet die Zeilenauswahl um, Kette „Zeile gewählt“ läuft bei jedem Klick | `tableBody.ts:145-147` |
| F6 | S | „Hinausgeschickt“ ohne Antwort, keine Frischdaten | `relations.ts:323-338`, `bridge.ts:117-125` |
| F7 | S | Leere Parameter gehen ins ERP | `relations.ts:434-475`, `events.ts:213-214` |
| F8 | S | Alles hinter dem ersten Zellbezug läuft je Zeile, auch START_TOOL und Popup öffnen | `actions.ts:428-431` |
| F9 | S | „Leer = 1“ fehlt | `calculation.ts:264-265` |
| F10 | S | Zwei Zahlleser | `sorting.ts:6-20`, `ledger.ts:133-138` |
| F11 | S (Vermutung) | Gebuchte Zeilen rechnen und schreiben Gerechnetes mit | `sourceRows.ts:63-78`, `ledger.ts:795-810` |
| F12 | B | Vorgabedatei: Belegposition mit Kopfsatz und Hol-Relation, ohne Satznummer | `library/default.json:21-51`, `dataSources.ts:77-79`, `fetchingSources.ts:95-104` |
| F13 | S | erpMask bestellt, nie gelesen | `sevariablen.ts:58-64` gegen `data.ts:237-295` |
| F17 | S | Kein Startfokus in der ersten Zelle | `bridge.ts:197-199` |
| F18 | Hinweis | Halb ausgefüllte Stiftzeile wird mitgeschrieben | `ledger.ts:667-684` |

### 3.6 Bewertung

Ledger, Nachschlagen, Vormerken und Ankunft sind fachlich sorgfältig gedacht
und tragen. Die Klasse ist entlang ihrer vier Abschnitte teilbar; das
dreifache „einfügen an der Korrekturstelle oder anhängen“ gehört einmal
hinein. Unbrauchbar ist der Weg ins ERP (F2, F6, F3, F1): vier begrenzte
Stellen, keine Neubau-Gründe. Die Erfassung hängt an zwölf Modulen aus
`behavior/`, darunter der Import des Bausteins Tabelle aus dem Nachschlagen
heraus (Abhängigkeit falsch herum).

---

## 4. Datenquellen, Relationen, Aktionen

### 4.1 Inventar

Zehn Quellenarten (`sourceKinds.ts`): idb, addressMaster, itemMaster,
document, documentItem, file, erpQuery, dataset, relationValue, erpMask.
Jede Art ist eine Zeile in einer Tabelle aus zwölf Ja/Nein-Merkmalen. Die
Bedeutung der Merkmale ist in zehn Dateien verstreut.

Relationen: Katalog in der Kundendatei (`verb`, `nr`, Parameter als rohe
Syntax mit Platzhaltern `{FELD_POS} {FELD_LEN} {PINDEX} {RELID} {VALUE}
{NOW_DATE} {DROP_PINDEX}`, `{SELKEY}` tot). Die Hol-Relation für Positionen
ist kein Katalogeintrag: ihre zwölf Parameterplätze und der 255er-Schnitt
stehen im Code (`relationLoader.ts:32-49`, doppelt in `fetchRelation.ts:18`).

Aktionen: fünf Schrittarten (START_TOOL, BW_LINK, RELATION, POPUP_OPEN,
POPUP_CLOSE), elf Parameterquellen (fest, Ereigniswert, Feld der Quelle,
Bausteinwert, gewählte Zeile, Zelle der erfassten/geänderten/gelöschten
Zeile, voriges Ergebnis, Ergebnis von Schritt N, SE-Variable). Ketten laufen
in Abschnitten: „einmal“ oder „je vorgemerkte Zeile“; nach dem ersten Fehler
bricht alles ab. Ereignisse: Schaltfläche Klick; Formularfeld Änderung;
Tabelle/Erfassung Zeile gewählt, Doppelklick, F4; Kanban Karte geklickt,
Karte verschoben.

### 4.2 Was SoftEngine kann und der Editor nicht

| Fähigkeit | Belegt? | Im Editor | Aufwand |
|---|---|---|---|
| ERPAPICALL-Zeilen mit Satznummer, also nachgeladene Liste, aus der man schreibt | §10 nennt es nicht belegt | nein, die Merkmalstabelle verbietet die Kombination | mittel, nach deinem Echttest |
| ERPAPICALL als Bestellblock | beide Chef-Masken | nein | klein |
| REFRESH-Block (Klartext zum Code-Feld) | Form in JsonBeleg | nein | mittel |
| MASKE-Block lesen | §7a, 18.09. | bestellt, nie gelesen | klein |
| Schreiben über MASKENEVENT | §7a, 18.09. | nein | mittel bis groß |
| DATASET-Block | Definition ja, Block nein | ja, Lieferform geraten | dein Echttest |
| GET_RELATION-Block in den SEvariablen | Form in JsonBeleg | nein | mittel |
| CONCAT-Schlüssel, Feldreferenzen als Parameter | Form in JsonBeleg | nur als fester Text | klein, Bedienung fehlt |
| Satz anlegen (GET 640, ein PUT je Feld, Querverweis) | ja | von Hand als Kette, keine Vorlage; F2 | klein nach F2 |
| RELOADHTML, ESCAPEHTML | aus dem Programm gelesen | nein | klein |
| FREISELEKT-Filter | ja, langsamer | nein | klein |
| Parser-Direktiven (Weg 1, nur Anzeige) | Wiki | nein, bewusst | anderer Mechanismus |
| SE-Module (SETabelle, SEFeldListe) | Wiki | nein, entschieden 17.07. | – |

Wichtig: CLAUDE.md nennt als belegte Bauweise „Bestellzettel schlank, Listen
per ERPAPICALL-Nachricht“. Der Code erreicht das nur mit der Art `erpQuery`,
und die kann weder schreiben noch Kopfsatz noch Positionen holen. Die
dokumentierte Bauweise und das Schreiben schließen sich im heutigen Modell aus.

### 4.3 Erweiterbarkeit, gemessen

| Neu ist … | Dateien | Ordner | Registrierung |
|---|---|---|---|
| eine Eigenschaft an einem Baustein | 1 | 1 | ja, Deklaration |
| ein Baustein | 3 neue + 3 Einträge | 2 | ja, Palette/Inspector/Export/Laden folgen |
| eine Relation | 0, Daten in der Kundendatei | – | ja |
| eine Quellenart (nur Deklaration) | 2 bis 3 | 2 | Tabelle erzwingt Vollständigkeit |
| eine Quellenart mit eigenem Bestellblock und eigener Lieferform | 7 bis 10 | 4 | nein |
| eine Schrittart (Aktion) | 8 bis 10 | 5 | nein, sechs if/switch-Ketten |
| eine Parameterquelle | 6 bis 9 | 5 | halb, `bindingRegistry.ts` |
| ein SEvariablen-Block | 5 | 4 | nein |
| eine Fähigkeit | 19 Konsumenten | 6 | nein |

Deine Angabe „8 Dateien in 4 Ordnern“ für eine Aktion stimmt in der
Größenordnung.

### 4.4 Trennung SoftEngine

Die Globals (`window`, `SEDATA`, `selib`, `basisHTML_*`) stehen wirklich nur
in `src/softengine/`. Aber das SoftEngine-Vokabular steht überall:
Feldcode-Form pos_len, IDB-Vorsätze, ADR/ART/BEL/POS, Kopfsatzform `BEL_0_11`,
255er-Schnitt, PINDEX, START_TOOL in `core/data`; 19 Bausteindateien
importieren `softengine/*`; der Editor-Baustein trägt den Maskenanschluss
immer mit und schaltet ihn an 45 Stellen per `inEditor` ab. „SoftEngine
kommt erst beim Export dazu“ trifft nicht zu: `core/data` ist das
SoftEngine-Modell, der Export formt es nur um. Installations-Individuelles
(Relationsnummern, Werkzeugnummern, Feldcodes) ist dagegen sauber Daten.

### 4.5 Ladbarkeit

- Maske: Datei `kind`/`fileVersion 3`/`schemaVersion 18`, Migration der
  Stufen 9 bis 17 (eine Datei in Stufe 9 geht Englisch, Deutsch, Englisch).
  Prüfung ist alles oder nichts: eine unbekannte Angabe lehnt die ganze Datei
  ab, mit Meldung. Das ist das Gegenteil von „die Stelle bleibt leer“.
- Kundendatei: keine Schema-Version. Jede Formänderung an einer Quelle hat
  keine Stufe.
- Dateien aus der deutschen Zeit (`art`, `dateiVersion` im Kopf) werden nicht
  erkannt (belegt im Browser mit `masken/mustermaske.json`).
- Kundendatei-Verlust (Kette belegt, nicht ausprobiert): Quellenformular
  „Die Maske holt sie“ hat nur ein Feld für die Relationsnummer, die fünf
  Feldcodes haben kein Eingabefeld (`DataSourceForm.tsx:71-77, 258-265,
  394-414`); gespeichert wird eine leere Hol-Relation; beim nächsten Laden
  gilt die ganze Kundendatei als beschädigt (`libraryFile.ts:41`); der Editor
  startet leer (`maskStorage.ts:47-55`); der erste Klick plant das Speichern
  und schreibt die leere Datei in Browser und auf die Platte
  (`EditorStore.ts:186-193, 523-536`); die Notfallkopie zeigt das
  Wiederherstellen-Fenster nicht an (`backupPick.ts:50-52`).
- Speicherfehler der Kundendatei im Browser werden verschluckt
  (`maskStorage.ts:169-173`); scheitert das Schreiben auf die Platte, hört es
  still auf (`fileOnDisk.ts:39-49`).

### 4.6 Weitere Fehler dieses Bereichs

- Antwortschlüssel geraten: acht Namen für eine Zeilenliste, sechs für den
  Satz, 13 Ergebniskandidaten samt Feldcode `'0_10'` (`data.ts:133, 160,
  187-190`, `relations.ts:50-91`).
- ERPAPICALL-Listen bleiben nach jedem Schreiben veraltet, bis die Maske neu
  lädt (`queryLoader.ts:11-16`, `fetched` wird nie geleert).
- Passt die Parameterzahl eines Schritts nicht mehr zur Vorlage, werden alle
  Belegungen stumm zurückgesetzt (`stepDraft.ts:58-68`).
- Ein einziger Feldcode, der nicht pos_len ist, stellt eine IDB-Bestellung
  stumm auf `*` zurück, das 9-Sekunden-Problem aus §4 (`dataSources.ts:162`).
- Die Ladeprüfung vergleicht keine Parameterwerte mehr (`actions.ts:266`,
  Bedingung immer wahr).
- „Verwendung in dieser Maske“ im Datencenter übersieht Quellen, die nur eine
  Berechnung nutzt; der Export nimmt sie mit.
- `resultName` eines Schritts ist im Editor nicht setzbar, eine Prüfregel
  hängt daran. `seVariable` liest `SEDATA.Daten.VARArrays`, nirgends belegt.

### 4.7 Bedienung des Datencenters

Neue Quelle: Datencenter (Vollbild, die Maske verschwindet), „Neue
Datenquelle“, Formular mit bis zu zwölf Eingaben, jedes Feld als Klarname
plus Position plus Länge tippen. Import nur für IDB per DTK-Datei und für
ERP-Masken per Konsolen-JSON („In SoftEngine F12, SEDATA.Daten.Masken.NAME
kopieren und hier einfügen“). Für ADR, ART, BEL, POS gibt es keinen Import.
Bis zur gebundenen Stelle am Baustein: zehn Klicks.

Neue Relation: Anzeigename plus rohe Syntax `GET_RELATION[640!{IDBID}!{DATUM}]`.
Neue Aktion: Inspector, Aktionen, Ereignis, Schrittdialog (Vollbild),
Relation suchen, je Parameter Herkunft aus elf Möglichkeiten plus Wert; ein
Standard-PUT hat sechs Parameter, also rund 14 Bedienschritte je Feld; „Satz
anlegen“ mit zehn Feldern sind elf Schritte von Hand. Drei ineinander
liegende Dialoge.

### 4.8 Bewertung

Richtig gedacht: Bindung als `quelle::feld`, Fähigkeiten statt Typnamen,
Ketten als Daten am Baustein, Export aus dem Baum, Relationen als Daten.
Falsch geschnitten: die Quellenart als Ja/Nein-Matrix, deren Bedeutung über
zehn Dateien und deren Ausführung über vier Ordner verteilt ist; Schrittarten
als if-Ketten; Hol-Relation und Antwortpuffer als Code neben dem Katalog;
Kundendatei ohne Version. Das Modell kennt genau die Kombination nicht, die
SoftEngine laut deinen Echttests braucht: nachgeladene Liste plus Satznummer
plus Schreiben.

---

## 5. Bausteine und Bedienung

### 5.1 Je Baustein

| Baustein | Zustand | Empfehlung |
|---|---|---|
| Bereich | keine Eigenschaft (kein Titel, keine Farbe); Unterraster startet wieder bei 48 Spalten auf halber Breite, Kinder werden halb so breit; voller Bereich: Klick tut still nichts | **Neu als „Kachel“** mit Titelzeile; Unterraster übernimmt die Zellbreite des Elternrasters |
| Schaltfläche | nur Beschriftung, ein Stil (gefüllt); der Empfang hat fünf Arten, die Standardschaltfläche dort ist weiß mit Rand | **Behalten**, Eigenschaft „Art“ und Symbol; dazu eine Knopfleiste |
| Erfassung | siehe Abschnitt 3 | **Behalten**, teilen, Fehler beheben |
| Karte | nur als Kanban-Kind; im Editor alle sieben Stellen als Strich, in der Maske verschwinden ungebundene, also andere Form; kein Avatar (gestrichen 9b313ce) | **In das Kanban auflösen**, kein eigener Baustein |
| Datum | keine Eigenschaften; ist die Tagesnavigation (‹ Datum › Heute), nach der Listen und Kanban filtern | **Behalten**, „Tageswahl“ nennen; entspricht 1:1 der Kopfzeile des Empfangs |
| Trennlinie | senkrecht wird waagerecht gezeichnet; der Empfang trennt über Kacheln und Kopfzeilen, nie über eine freie Linie | **Streichen** |
| Formularfeld | acht Feldtypen, Nachschlagen, Beschriftung als Platzhalter im Feld statt darüber; Ankreuzfeld-Wert erreicht keine Aktion | **Behalten**, Beschriftung über dem Feld, Ankreuz-Fehler beheben |
| Kanban | Karten werden im Editor nie gezeichnet, Musterkarte in Spalte 1, Zähler „0“; Auffangspalte tot (`'ja'` gegen `true`); Spaltenpunkt eckig | **Neu** nach dem Modell des Zweigs (5.7) |
| Popup | gut; der Rahmen `ff-dialog` ist ein zweites Element ohne Basisklasse | **Behalten**, dazu Variante „Seitenleiste rechts“ (Kartei des Empfangs) |
| Tabelle | Zahlen nicht rechtsbündig, versteckte Spalten im Editor nicht abgeblendet, Text-Baustein bleibt leer ohne Grund | **Behalten** |
| Text | Pixelgröße statt Rollen | **Behalten**, Rollen: Titel, Zwischentitel, Fließtext, Nebentext (die Schriftskala des Empfangs) |

Was die Empfangsmaske und der BeispielBeleg brauchen und der Editor nicht hat:

- Navigation links (72 px dunkel, aufklappbar, Einträge mit Symbol, Nutzer
  unten). Es gab sie bis 5b986ee; gestrichen in 1360976 mit dem Vermerk „Der
  Nutzer will den Baustein nicht mehr“. Der Baustein „Ansicht“ (Seitenwechsel)
  ist ebenfalls weg (34920d1).
- Kopfzeile 64 px: Marke, Suchfeld, Tagesnavigation, Uhr, primärer Knopf.
- Statuszeile mit Zählern (Zahl aus Quelle, Punkt, Text).
- Kachel mit Titelzeile (selibBlockHeader), Datenliste Beschriftung/Wert aus
  einer Quelle (selibDataList), Knopfleiste (SEFunktionsBox), Bild/Avatar
  (Baustein „Bild“ entfernt in b05415f), Badge/Flag, Symbol.
- Kartei als Seitenleiste rechts mit änderbaren Zeilen; Toast; Refresh-Knopf.

### 5.2 Layout

Raster 48 Spalten je 1fr, Zeilen fest 12 px, Abstand 4 px; Wurzel, Popups und
Bereich sind Rasterflächen, Kanban-Kinder liegen im Fluss (zwei Layoutmodelle).
Editor und Export schreiben dasselbe CSS, insofern ist es WYSIWYG. Aber: die
Höhe füllt nie das Fenster (der Empfang füllt es), die Fläche im Editor ist
schmaler als das SoftEngine-Fenster (keine Vorschau in Zielbreite, kein Zoom),
ein fester 72-px-Streifen ist mit 1fr-Spalten nicht baubar, das Unterraster
zählt wieder 48 Spalten. Drei Zieh-Mechaniken, kein Escape beim Ziehen,
Griffe dreimal gezeichnet. Für Formularmasken taugt das Raster; für den
Empfang fehlen feste Pixel-Spalten neben 1fr und „füllt den Rest“.

### 5.3 Inspector

Er entsteht aus den Deklarationen (Steuerart, Bedingung, Zeile, Einheit,
Grenzen); das ist generisch und gut. Umständlich: Schalter stehen über der
Quelle, von der sie abhängen, und das Panel springt beim Binden; Hilfe nur als
Tooltip; Ja/Nein in drei Formen (Kachel, Schalter, Ankreuzfeld); Feldwahl mit
zwei Bedienelementen (Fenster auf der Fläche, Liste im Inspector),
Spaltenfelder nur über die Fläche; Aktionen als Vollbild-Dialog in der Sprache
der Relation (`START_TOOL`, `{PINDEX}`); Berechnung als Dialog mit vier
nummerierten Schritten und langen Absätzen; Suchfenster-Spalten per
MutationObserver ins Shadow DOM gemessen (die fragilste Stelle); der Knopf
„Gestalten“ enthält nicht die Gestaltung. Platz rechts, 300 bis 600 px: gut.

### 5.4 Shell und Fenster

Fensterzustand hat vier Besitzer: Store, React-State, Dokument-Ereignis,
localStorage; das Nachschlagefenster hat drei zugleich. Tastaturkürzel sind
blockiert, sobald irgendein Dialog offen ist, auch ein Popover. Rückgängig
kopiert je Änderung den ganzen Baum (50 Stufen): korrekt, aber schwer.
Doppelt: Popover und Auswahlfenster, drei Dialoge, zwei Knopfpaare
„Speichern/Laden“ (Maske und Bibliothek), Namenskollisionen (Editor-`Button`
und Baustein `Button`, Editor-`Divider` und Baustein `Divider`), 40
Editor-Dateien heißen anders als ihr Inhalt.

### 5.5 Designsprache

Der Empfang als System: Akzent `#0E7C86`, Grund `#EDF1F4`, Tinte `#16242C`,
Grau `#7C8A92`, Linien `#E7ECEF/#DCE3E8`, rot/amber/grün je mit weichem Ton,
Radius 4 bis 5 px, Schrift Segoe UI Variable 14 px / 1.45, Consolas für Zahlen.
Fünf Spaltentöne mit je vier Werten (Farbe, Schrift, Tönung, Schale/Rand).
Bauteile: Navi dunkel `#0E2A30`, Kopfzeile 64 px, KPI-Zeile, Board mit vier
Spalten (Schale, 1,5 px Rand, getönter Kopf 13/600, runder Punkt 9 px,
Zählpille), Räume als Kasten im Kasten, Karte weiß Radius 4 Polster 8 mit
Avatar 36×36, Name 15/600, Zeit rechts, Flags 11/600, Aktionsknopf 28 px in
Zielfarbe, Kartei 420 px rechts, Modal mit Feldern 40 px, Toast dunkel.

`src/design/mask.css` ist dieselbe Familie, aber jeder Wert ein wenig
daneben: Grund `#f3f8fa`, Akzent `#00778f`, Schrift 13 px, Radien 4/6/10,
zweistufiger Schatten, „IBM Plex Mono“ (nicht installiert), Tahoma als letzter
Rückfall (die Schrift, gegen die der Empfang kämpft). Die Bausteine nutzen
die Token für Farben, aber nicht für Abstände. Kanban-Spalte vollflächig mit
Radius 10 statt Schale und getöntem Kopf; Schaltfläche immer gefüllt;
Formularfeld ohne Beschriftung darüber; Tabelle mit Schatten. Strukturell
weit weg: keine Navi, keine Kopfzeile, keine Statuszeile, Karte ohne Avatar.
Wer beide Masken nebeneinander sieht, erkennt die Verwandtschaft, nicht
dieselbe Hand.

Der Zweig `claude/neuer-kanban-b3gnka` trägt in `src/design/maske.css`
(Commit ec7624e) bereits die Werte des Empfangs als Token-Satz mit fünf Tönen
je Farbwelt, Neutral und Tierfarben. Diese Fassung gehört auf `master`, mit
englischen Namen.

### 5.6 Atomic Design

`src/editor/widgets/` hat 20 Teile, die Ebenen Atom/Molekül/Organismus sind
erkennbar, aber nicht benannt. Farbwelt, Bedienhöhe 28 px und Radius 2 px sind
konsistent: ein brauchbares Fundament. Wildwuchs: dreimal Ja/Nein, dreimal
Auswahl, zweimal Schwebefenster, dreimal Dialog; sechs Dateien heißen anders
als ihr Export.

### 5.7 Kanban: master gegen Zweig

master: drei Bausteine (Tafel, Spalte, Karte als Kartenmuster). Die Laufzeit
klont das Muster je Zeile; das läuft im Editor nie. Unterteilung (Zimmer),
Zielwahl und Satznummer-Sperre wurden in 3d7ff3c gestrichen.

Zweig (7 Commits auf Basis 45167b4, deutsche Ordner, 16 Konflikte mit master):
ein einziger Baustein `ff-tafel` ohne Kind-Bausteine. Spalten und Plätze als
strukturierte Eigenschaft (Zimmer 1 bis 4 sind Plätze einer Spalte,
„Erledigt“ ein versteckter Platz), im Inspector über eine Einträge-Bedienung.
Karte mit neun Stellen einschließlich Avatar (Bild oder Tiersymbol, sieben
Umrisse und Artfarben aus dem Empfang), Markierungen mit Farbe und Sortierung,
Knopf je Spalte „weiter“ auf den ersten freien Platz der nächsten Spalte. Der
Editor zeigt je Platz eine Karte in Maskenform, nur gebundene Stellen als
Strich, Zähler als Strich. Stil am Empfang abgelesen. Test mit 267 Zeilen.
Inspector mit vier Reitern Daten / Inhalt / Aussehen / Aktionen. Was master
besser macht: Verschieben sofort mit Rücknahme statt 20 Sekunden warten.

Empfehlung: das Zweigmodell nach `src/blocks/kanban/` portieren (nicht
mergen), englische Bezeichner, Umwandlung alter Masken, Avatar „Bild /
Tiersymbol / Initialen“, Verschieben wie master, Karte kein eigener Baustein.

### 5.8 Bewertung

Tragfähig: Eigenschaftsmodell, Raster als Exportgrundlage, Store mit
Rückgängig, Tageswahl, Formularfeld, Tabelle, Erfassung, Popup. Nicht:
Trennlinie und freistehende Karte; Bereich erst mit Titel; Kanban neu. Die
Bedienung leidet weniger an fehlenden Funktionen als an ihrer Verteilung:
Eigenschaften an drei Orten, zwei Feldwähler, drei Ja/Nein-Formen, Vollbild-
Dialoge, die die Maske verdecken und die Sprache der Relation sprechen.

---

## 6. Technik

### 6.1 Gut

- `defineBlock`: eine Deklaration wird zur Lit-Property, zum Element, zum
  Registry-Eintrag, zum Inspector, zum Export und zur Ladeprüfung. Neue
  Eigenschaft: eine Datei. Neuer Baustein: drei neue Dateien plus drei
  Einträge, alles andere folgt.
- Alle elf Bausteine erben nur von `BlockElement`; Verhalten wird
  komponiert, nicht vererbt. Konstruktoren tun nichts außer Startwerte
  setzen.
- Store: `Subject` plus `useSyncExternalStore`, unveränderliche Mutationen,
  Rückgängig per Schnappschuss mit geklammerten Gesten, Ansicht getrennt.
- Fähigkeiten als diskriminierte Union mit Typ-Wächtern.
- Ereignishorcher: 47 angemeldet, 47 abgemeldet; alle React-Effekte und alle
  Zieh-Vorgänge räumen auf.
- Inspector-Mechanik deklarativ; neue Steuerart: drei Dateien.
- Editor-Chrome (`--wb-*`, Tailwind) und Masken-Design (`--se-*`) sauber
  getrennt; kein Tailwind in den Bausteinen.
- Export-Kette: Nicht-ASCII wird maskiert, `</script`-Schutz, Validator (LF,
  ASCII, ein `<style>`, Brücke, keine Fremdskripte).
- Typprüfung und Linter sauber; `any` zweimal (Brücke), `as unknown as`
  dreimal.
- Neue Relation: reine Daten. Neue Parameterquelle: Registrierung, die der
  Typ erzwingt.

### 6.2 Schlecht

- Keine Lebenszyklus-Logik in der Basisklasse: jeder Baustein macht
  Datenanschluss selbst; Tabelle und Erfassung reichen fünf Aufrufe von Hand
  durch. Lits `ReactiveController` wird nirgends benutzt; stattdessen ein
  selbstgebautes Controller-Muster mit `host`-Rückrufen.
- Laufzeitverträge per `member in el` statt `implements`: eine Umbenennung
  überlebt die Typprüfung und fällt erst zur Laufzeit.
- Zwei Datenwege: der Editor setzt Properties, der Maskencode liest an zehn
  Stellen rohe Attribute mit `toLowerCase()`. Daher die tote Auffangspalte.
- Klassennamen im Template englisch, im Stil deutsch: sieben Stellen (F1,
  Trennlinie, Zahlen rechts, versteckte Spalten, Vorschlagsliste).
- Die Weiche Editor/Maske sind 45 `inEditor`-Abfragen über den ganzen
  Bausteincode, keine Schicht. 19 Bausteindateien importieren `softengine/*`.
- `behavior/`: 32 Dateien, davon 16 in Wahrheit der Baustein „Liste“, fünf
  „Nachschlagen“, sieben „Aktionen und Laden“. `lookup.ts` importiert den
  Baustein Tabelle.
- `DialogFrame.ts:37-44`: ein Parameter heißt `window` und verdeckt das
  Fenster; der Escape-Horcher hängt am ersten Dialog. Leck und Fehler.
- Zwölf Tastenhorcher auf Fenster oder Dokument, Escape dreimal kopiert.
- Rund 36 veränderliche Zustände auf Modulebene (`softengine/` etwa 20,
  `behavior/` etwa 16): Auswahl, Tag, offenes Nachschlagefenster, Ladecaches
  sind Singletons ohne Besitzer.
- `updateProperty` prüft weder den Namen noch den Typ gegen die Deklaration;
  `useLitElement` schreibt jeden gespeicherten Schlüssel auf das Element;
  `BlockHost` schreibt eine Eigenschaft `height`, die kein Baustein
  deklariert.
- 81 `Record<string, unknown>`: Spalten, Berechnungen und Parameter sind im
  Kern untypisiert.
- Tote Steuerarten `longText`, `relation`, `page` mit toten Zweigen in fünf
  Dateien; tote Funktionen; Testhaken ohne Tests; Griffe fürs Fließlayout
  ohne Nutzer.
- Laufzeit-Bau (`tools/buildRuntime.mjs`, 341 Zeilen, ungetypt, ungelintet):
  Import-Graph per Suchmuster, 65 einzelne Vite-Bauten, eigener Modul-Linker
  über `window.FF`, `runtime.json` (257 kB) als Text in den Editor-Bundle
  eingebettet, `parts.json` und die 65 Einzeldateien liest niemand. Ein
  Fehler in der Teilbildung macht jede Maske weiß (schon passiert, 8215b2d).
  Ein einziges Vite-Bundle von rund 250 kB täte es; bei lokalen WinUI-Dateien
  spielt die Größe keine Rolle.
- Übersetzungsfehler in gespeicherten Formaten: `icon` heißt Zeichenzahl,
  `spots` Nachkommastellen, `on`/`off` auf/ab, `from` „weggelassen“, `sizes`
  Masse, `'null'` Division durch null, `catchall === 'ja'`. Eine Korrektur
  braucht eine Schema-Stufe. Deutsche Bezeichner: `isObjekt` 97-mal, `tun`
  37-mal, `klasse` 29-mal, `marke` 23-mal.
- Tests: 41 Dateien in einem Commit gelöscht, darunter Erfassung, Ledger,
  Ankunft, Relationen, Brücke, Berechnung, Laden und Sichern, Rückgängig.

### 6.3 Bewertung

1:1 übernehmbar: `core/block/*` (Deklaration, Fähigkeiten, Registry, Baum,
Raster, Seiten), das Datenmodell in `core/data/*` als Typen,
`state/{Subject, history, LibraryStore, messages, savePlanner, loadCheck,
topology, duplicate, columnCleanup}` und `EditorStore` ohne Ansichtsteil,
`export/*`, `widgets/*` nach Umbenennung, Inspector-Mechanik, die Hooks
`useEditor/useView/useDataSources`, Palette, Ziehen im Raster, beide
CSS-Dateien als Grundlage. Neu schneiden: `behavior/` in `blocks/list`,
`blocks/lookup` und eine Schicht `runtime/` (Aktions-Interpreter); ein
`MaskState`-Objekt je Dokument statt Modul-Variablen. Neu bauen: der
Laufzeit-Bau als ein Bundle, ein Popover statt drei, `useFieldBinding` und
`BlockHost` aufteilen, `DataSourceForm` als Formular je Quellenart.

---

## 7. SoftEngine-Wissen und deine Echttests

Belegt (Echttest von dir, kontrakte.md): Dateiform mit Brücken-Skriptzeile;
Anmeldung `basisHTML_REGISTER`; Feldcodes pos_len mit Tabellenvorsatz;
SEFILELOOP mit expliziter Feldliste; Reihenfolge Kopfsatz zuletzt; Kopfsatz
braucht VAR; PUT_RELATION mit sechs Parametern, relId ohne IDB; Satznummer
per GET 640 und Satz anlegen mit einem PUT je Feld; Hol-Relation 69 seriell
mit 255er-Schnitt; ERPAPICALL als Nachricht nach dem Öffnen (21.09.);
MASKENEVENT-Schreiben in den Beleg, nicht in Positionen (18.09.);
Fokus-Handschlag; DataSet-Definition; Edge WebView2.

Nur gelesen, nicht getestet: `ReloadInputJSON` (braucht eine ID, die keine
Vorlage zeigt), RELOADHTML, BW_LINK-Weg über HTMLEVENT, START_TOOL mit
Parametern, DATASET-Block in den SEvariablen, GET_RELATION-Block, REFRESH
für Loop-Zeilen, `seVariable`, Parser-Direktiven, SE-Module.

Was nur du in SoftEngine klären kannst, bevor gebaut wird:

1. Liefert SoftEngine nach einem PUT_RELATION von selbst neue Daten? Wenn
   nicht: welche ID verlangt `ReloadInputJSON`? Davon hängen Ankunftsprüfung
   und Frischdaten ab (F3, F6).
2. Ergeben zwei erfasste Zeilen zwei Sätze, sobald F2 behoben ist?
3. Tragen ERPAPICALL-Zeilen eine Satznummer (etwa `POS_645_10`), sodass man
   aus einer nachgeladenen Liste schreiben kann? Davon hängt die Bauweise
   „schlank bestellen, nachladen, schreiben“ ab.
4. Liefert der DATASET-Block unter `Daten.Tabellen`?
5. Kommt REFRESH auch für Zeilen einer SEFILELOOP-Liste?
6. Läuft statisches Markup im `body` auch im Web-Client? Der Empfang setzt
   sein Markup per `innerHTML`, weil der Web-Client statisches Markup zerlegt
   (Zeile 557 der Empfangsmaske); der Export schreibt statisches Markup. In
   WinUI läuft es.

---

## 8. Die alte CLAUDE.md (45167b4): was mit dir zu klären ist

Dort stehen „fachliche Festlegungen“ und Wünsche als deine Entscheidungen.
Der Code widerspricht mehreren davon, und die aktuelle Kritik widerspricht
anderen. Bitte je Punkt: gilt, gilt nicht, oder anders.

1. **Berechnung.** Alte CLAUDE.md: „Rechnung bleibt, ist dem Nutzer wichtig“
   (02.09.), Produktgleichung, Einheiten kg/g/mg/l/ml/Anzahl/Tage, benannter
   Grund statt scheinbar gültiger Zahl. Alte Übergabe vom 31.08./01.09.:
   Einheiten-Umrechner ausgebaut, „Nicht wieder einbauen“; Tiergewicht und
   „je kg“ raus, Dosis gilt pro Tier; keine Warnanzeigen, Zelle bleibt leer.
   Heute: Umrechner wieder drin, Warnungen drin, „leer = 1“ fehlt. Du sagst:
   „Berechnung gefällt mir nicht.“ Frage: Brauchst du sie überhaupt, und wenn
   ja, nur Menge mal Preis oder die Dosisrechnung nach der alten Übergabe?
2. **Meldungen.** Alte Regel 6: „Nichts scheitert still“, Fehler in den
   Balken, benannter Grund statt leerer Stelle. Du heute: keine Meldungen,
   die Stelle bleibt leer. Frage: gilt „leer“ auch für Fehler beim
   Schreiben ins ERP, oder nur für fehlende Daten?
3. **Kanban.** Alte CLAUDE.md: eine Kartenvorlage je Board, am echten
   Kartenplatz bearbeitet; Name der Unterteilung („Zimmer“) mit dir zu
   klären. Die Zimmer wurden in 3d7ff3c gestrichen; der Zweig hat sie als
   „Plätze“. Frage: Zimmer 1 bis 4 wie im Empfang, ja oder nein? Avatar aus
   einem Bildfeld, als Tiersymbol nach Art, oder beides?
4. **Beispieldaten.** „Keine Beispieldaten im Editor, auch nicht als
   Schalter“ (02.09.). Du heute: im Editor sieht man keine echten Karten.
   Frage: reichen Karten in exakter Maskenform mit Strichen an den gebundenen
   Stellen, oder willst du einen Schalter für Probedaten?
5. **Navigation und Ansichten.** Der Baustein Navi wurde am 15.09. mit dem
   Vermerk „Der Nutzer will den Baustein nicht mehr“ gestrichen, ebenso
   „Ansicht“. Der Empfang hat beides. Frage: brauchst du Navigation und
   Ansichtswechsel als Bausteine?
6. **Datencenter neben der Fläche statt Vollbild, eine Suchfenstergröße für
   die Maske, Notfallkopie wählbar.** Als deine Wünsche vom 15.09. notiert.
   Frage: stimmt das so?
7. **Sprache im Code.** Erst Englisch, dann Deutsch (15.09.), dann wieder
   Englisch (21.09.). Eine dritte Umbenennung kostet wieder alles. Vorschlag:
   Code Englisch, alles Sichtbare Deutsch, und das bleibt so. Einverstanden?
8. **Kleine Festlegungen, vermutlich richtig, bitte kurz bestätigen:**
   Satznummer der Belegposition ist `645_10`; Tab ist immer die Weiter-Taste,
   nur Enter und F4 öffnen das Fenster; Enter nimmt den einzigen Treffer;
   Rechtsklick auf den Spaltenkopf ist die Spaltenwahl; Zellherkunft
   (getippt, aus Daten, gerechnet) und Schreibstatus (vorgemerkt, gesendet,
   bestätigt, gescheitert) bleiben getrennt; Ausblenden ändert keine
   ERP-Zuordnung; eigene Tabelle statt SETabelle (17.07.).
9. **„Kein Vorrat“** (alte Regel 14: kein Plugin-System, keine Registrierung
   auf Vorrat) gegen deine Vorgabe „erweiterbar für neue Quellen, Relationen,
   Aktionen“. Ein Adapter-Register je Quellenart und Schrittart ist genau das,
   was heute fehlt; ein Plugin-System braucht niemand. Einverstanden?

---

## 9. Empfehlung: Reihenfolge

Grundsätze für alle Schritte: keine Umbenennung mehr; ein Schritt ist erst
fertig, wenn du ihn in SoftEngine geprüft hast; jeder Schritt bringt seine
Tests für Kern, Export, Store und Brücke zurück; gespeicherte Dateien laden
nach jedem Schritt (deine Prüfsteine `maske.json` und `bibliothek.json`);
Unbekanntes in einer Datei bleibt liegen und wird nicht gemeldet.

**Schritt 0: Datenverlust stoppen (klein).** Kundendatei-Kette (4.5),
Hol-Relation vollständig eingebbar, Schema-Version für die Kundendatei,
Dateien mit `art`/`dateiVersion` erkennen, Speicherfehler nicht verschlucken,
Notfallkopie auch für die Kundendatei wählbar. Danach lädt jede Datei seit
dem 04.09. wieder.

**Schritt 1: Erfassung bis ins ERP (mittel, dein wichtigster Fall).**
F2 (Satznummer je Zeile), F1 (Klassennamen), F12 (`default.json`:
Belegposition mit Kopfsatz und Satznummer, ohne Hol-Relation in der
Belegerfassung), F7 (kein PUT mit leerem Pflichtwert), F8 (Kettenabschnitt
beendbar), F4, F5, F17. Dann dein Echttest 1 und 2 aus Abschnitt 7; danach
F3 und F6 nach dem Ergebnis: Ankunftsprüfung an den Schreibvorgang binden,
Frischdaten so bestellen, wie SoftEngine es wirklich erlaubt.

**Schritt 2: Datenmodell neu schneiden (groß).** Eine Quelle wird ein
Deskriptor aus drei unabhängig wählbaren Teilen: Bestellung (kein Block,
SEFILELOOP, VAR, ERPAPICALL, DATASET, MASKE, REFRESH, GET_RELATION-Block),
Lieferung (Push unter SEFileLoop / Var / Tabellen / Masken / ErpApiCall,
Nachricht ERPAPICALL, Hol-Relation als Katalogrelation, Wert-Relation) und
Schreiben (PUT mit Satznummer, MASKENEVENT, keins); jeder Teil ein
registrierter Adapter in einer Datei. Relationen samt Hol-Relation
vollständig im Katalog der Kundendatei, mit Parameterbedeutung und
Antwortform, damit nichts mehr geraten wird. Schrittarten als Register
(Lesen, Export, Ausführen, Formular) nach dem Muster von
`bindingRegistry.ts`. Laden ohne Alles-oder-nichts. Damit werden MASKE lesen,
REFRESH, ERPAPICALL-Block und Schreiben aus nachgeladenen Listen zu Daten
statt zu Code. Voraussetzung: Echttest 3.

**Schritt 3: Technik (groß).** `behavior/` in `blocks/list`,
`blocks/lookup`, `runtime/`; Listen und Nachschlagen als
`ReactiveController` an der Basisklasse; `MaskState` statt Modul-Variablen;
ein `MaskHost`-Interface, das der Export mit SoftEngine und der Editor mit
einer stummen Vorschau füllt, damit die 45 `inEditor`-Weichen und die 19
`softengine`-Importe aus den Bausteinen verschwinden; Werte nur noch als
Property lesen; `implements` statt `contractOf`; typisierte Spalten,
Berechnungen, Parameter; `updateProperty` prüft gegen die Deklaration; ein
Laufzeit-Bundle; ein Popover; Schema-Stufe 19 für die Übersetzungsfehler.

**Schritt 4: Design und Bausteine (groß).** Token aus dem Empfang (Zweig
ec7624e, englisch) als `mask.css`; Kanban nach dem Zweigmodell portiert,
Karte aufgelöst; Trennlinie weg; Bereich wird Kachel mit Titel; neu:
Kopfzeile, Datenliste, Statuszähler, Knopfleiste, Bild/Avatar, Badge,
Seitenleiste rechts, dazu Navigation und Ansichten, wenn du sie willst (8.5);
feste Pixel-Spalten und „füllt den Rest“ im Raster; Vorschau in Zielbreite.
Ziel: die Empfangsmaske ist mit dem Editor nachbaubar und sieht aus wie das
Original.

**Schritt 5: Bedienung (mittel).** Inspector mit vier Reitern Daten / Inhalt
/ Aussehen / Aktionen (im Zweig vorhanden); Datencenter und Aktionen als
Seitenleiste neben der sichtbaren Fläche; ein Feldwähler, eine Ja/Nein-Form;
Hilfetexte sichtbar; Quellen in Klartext anlegen (Felder aus Import oder
Auswahl, nicht Position und Länge tippen); Relationen aus Vorlagen (Feld
schreiben, Satz anlegen, Werkzeug starten) statt roher Syntax; Berechnung
nach deiner Antwort auf 8.1.

Die Schritte 0 und 1 sind klein und sofort nützlich. Schritt 2 und 3 sind
der Umbau der Mitte, den man einmal macht. Schritt 4 und 5 sind das, was du
am Ende siehst. Jeder Schritt lässt den Editor benutzbar und exportfähig.

---

## 10. Nicht geprüft

- Nichts in SoftEngine selbst. Alle Aussagen zum Schreiben und zur
  Antwortzuordnung sind Codelesung.
- Deine Prüfsteine auf dem Desktop (`maske.json`, `bibliothek.json`) liegen
  nicht im Repo; ob sie laden, weiß nur dein Editor.
- Die 267 Vorlagen (`se-quelle/`) liegen nur auf deinem PC.
- Verhalten unter WebUI/WEBWARE.
- Leistung bei tausenden Zeilen (Vermutung: die Erfassung prüft je Zelle je
  Zeichnen die ganze Quellenliste, `data.ts:32-75`, `sourceRows.ts:80-83`).

---

## Anhang: Nachprüfung von docs/bestandsaufnahme.md

Abschnitt 2 (Fehler): alle zwölf Punkte stimmen. Punkt 9 (alte Masken mit
Berechnung) stimmt am Code, ohne echte Datei ausprobiert. Punkt 7
(Kundendatei-Verlust) ist gravierender als beschrieben: jede neu angelegte
holende Quelle löst die Kette aus.

Abschnitt 3 (SoftEngine): alle zehn Punkte stimmen. Punkt 6 ist ungenau: die
Maske ruft `ReloadInputJSON` nicht ins Leere, sie sucht die Funktion, findet
sie nicht und bestellt dann nichts.

Abschnitt 4 (Programmierersicht): 19 von 20 stimmen, mehrere sind untertrieben
(40 statt 19 Dateien mit falschem Namen, 12 statt 7 Tastenhorcher). Punkt 1
ist in einem Eintrag falsch: `numerator`/`denominator` sind echte Bruchteile,
keine Übersetzungsfehler.

Abschnitt 5 (Tests): stimmt. Abschnitt 6 (Doku): stimmt, der Schalter heißt
`REFERENCE_REFRESH=1`. Abschnitt 7 (Zweige): stimmt.
