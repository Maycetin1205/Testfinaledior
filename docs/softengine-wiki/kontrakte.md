# SoftEngine-Kontrakte

Was hier steht, lässt sich **nur durch einen Echttest in SoftEngine**
herausfinden. Nur Fakten und wo sie im Code gelten, kein Bauverlauf. Was hier
fehlt, wird nicht geraten, sondern getestet.

---

## 1. Dateiform

- Export-Dateien heißen `index.basis.source.html` + `index.basis.SEvariablen.json`.
  Belegt an allen 124 Referenzmasken. Nicht von Hand umbenennen.
- LF-only, reines ASCII. Escaping macht der Export maschinell
  (`export/serializer.ts`). Schlägt `validateMaskHtml` an, lädt SoftEngine die
  Datei gar nicht erst.
- Bilder, Schriften und die Laufzeit werden in die Maske eingebettet, nie
  nachgeladen (siehe 13).
- Kein `JWHtml`-Marker. SoftEngine setzt `JWHtmlStart` in einen eigenen
  Maskenkopf um: 56 Skripte und 41 Stylesheets, zusammen 1,7 MB (gezählt an
  der ausgelieferten Maske `HtmlTemplates/STDERFASSUNG/BHVP00/951`). Die
  Maske braucht davon nur die Brücke und bindet sie mit einer Zeile ein, über
  denselben Pfad wie dieser Kopf:
  `<script src="<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js"></script>`
  (`export/validator.ts`). Handtest 2026-09-15 bestanden, WinUI, Layoutrahmen
  00001: SoftEngine setzt nur `EditorPfad` ein und hängt `SEID` und `SEPATH`
  als Kommentare ans Ende.

## 2. Anmeldung und Datenempfang

- `basisHTML_REGISTER(cb, document.title, '1.0')`, Retry 25 ms × 400.
  Jeder Push hydriert neu. Fallbacks: `message { MSG: { DATA } }`, SEDATA-Poll.
- Das offizielle `basisHTML_REGISTER` vereinheitlicht `BWMSG` (BüroWARE/WinUI)
  und `WWMSG` (WEBWARE) zu demselben Callback. **Nie direkt nur auf `BWMSG`
  lauschen.**
- Immer nur EINE GET-Anfrage in Flug (Warteschlange).
- GET-Antworten kommen über den REGISTER-Callback; `SEDATA.Message<N>` ist
  der Rückfallweg. Eine leere Antwort `{"RESULT":""}` ist eine Antwort (kein
  Treffer), kein Schweigen.
- SoftEngine ruft die Maske beim Neuaufbau ueber `Erstellen` (alias `initData`)
  und beim Nachschieben ueber `ReloadData`. Vor neuen Daten gehoert der
  Modul-Lebenszyklus `ResetDataBasis()` + `InitialisiereDatenBasis()`, angemeldet
  wird mit `InitialisiereSchnittstelle()` (aus dem SE-Wiki, nicht per Echttest).
- Gilt in: `softengine/bridge.ts`, `softengine/relations.ts`.

## 3. Feldcodes

- Die einzige belegte Form eines Feldcodes in einer SoftEngine-Liste ist
  **`Position_Länge`** (`2_8`, `3292_30`). Belegt an jeder Stamm-Quelle der
  Chef-Masken und am POS-Loop von `docs/chef-maske/JsonBeleg.json`.
- Zeilen-Properties tragen ein **Tabellen-Präfix**: `IDBID0001_253_30` für den
  Code `253_30`. Schlüssel-Scan: gleich / Präfix `code_` / Endung `_code` —
  für Lesen UND Schreiben.
- Eine ERP-Abfrage liefert Schlüssel mit festem Vorsatz: `LFA_pos_len`.
- Gilt in: `kern/daten/ladeRelation.ts` (`POS_LEN`), `softengine/data.ts`
  (`getField`/`setField`), `kern/daten/relationen.ts` (`feldCodeZerlegen`).

## 4. SEvariablen — Bestellung

- Quellen-Arten bestimmen die Form:
  - **IDB** → SEFILELOOP. Beide Chef-Masken führen `FELDER: '*'`.
  - **Stamm (ADR/ART/BEL/POS)** → explizite `pos_len`-Liste.
  - **ERP-Abfrage** → eigener `ERPAPICALL`-Block, nicht in der SEFILELOOP.
  - **MEMTAB** kommt in keiner echten Maske vor und wird nicht geschrieben.
- Unser Export schreibt für IDB die explizite Liste der BENUTZTEN Felder statt
  `*`. Grund: SoftEngine macht für jeden gelieferten Wert einen Bild-Nachschlag
  (`GET_RELATION 1911` — Nutzer-Log 2026-08-11: 5 953 Aufrufe in 9,2 s beim
  Öffnen). Bestätigt 2026-08-12: die Maske liefert damit.
- **Sicherheitsventil:** sobald EIN Code sich nicht als `pos_len` ausdrücken
  lässt, fällt die ganze Bestellung auf `*` zurück.
- Was in einer expliziten Liste fehlt, liefert SoftEngine **nie** — die
  gebundene Stelle bleibt still leer.
- Gilt in: `kern/daten/datenquellen.ts` (`bestellteFelder`), `export/sevariablen.ts`.

## 4a. REFRESH — den Klartext zu einem Code-Feld bestellen

Ein Code-Feld (Adressgruppe `4`, Land `DE`, Lieferadresse `10024`) liefert nur
die Nummer. Der zugehörige TEXT kommt nur, wenn die Maske ihn EXTRA bestellt.

Belegt in `docs/chef-maske/JsonBeleg.json` — ein eigener Block neben VAR,
SEFILELOOP und ERPAPICALL:

```json
"REFRESH": [
  { "ID": 300700, "ALIAS": "RefreshAdresseLand",
    "PK": "ADR_1450_3", "PKLEN": 3, "TRENNER": " : ", "FILEID": "" },
  { "ID": 300055, "ALIAS": "RefreshLieferadresse",
    "PK": "BEL_747_8", "PKLEN": 8, "TRENNER": " : ", "FILEID": "" },
  { "ID": 300033, "ALIAS": "AnsprechpartnerRefresh",
    "PK": "BEL_197_8", "FORMAT": "R0", "PKLEN": 8, "TRENNER": " : ", "FILEID": "" }
]
```

SoftEngine liefert daraufhin einen ZWEITEN Wert je Feld, mit `REFRESH_`
davor — belegt in `docs/chef-maske/BeispielBeleg.html`:

```js
BelegInfo.BEL_552_2            // "01"
BelegInfo.REFRESH_BEL_552_2    // der Text dazu
```

**Die ID ist `300000 + RefreshId` des Felds.** `RefreshId` steht in der
Felddefinition der Installation (`RefreshArt: "3"` heißt: dieses Feld hat eine
Auswahltabelle). Zweimal gegengeprüft am Vorlagen-Bestand des Nutzers
(2026-08-17):

| Feld | RefreshId | REFRESH-ID |
|---|---|---|
| `BEL_197_8` Ansprechpartner | 33 | 300033 |
| `BEL_747_8` Lieferadresse | 55 | 300055 |
| `ADR_1988_2` Adressgruppe | 708 | 300708 (abgeleitet, nicht getestet) |

⚠ **Offen:** in JsonBeleg.json zeigen ALLE `PK` auf Felder des OFFENEN Satzes
(`BEL_…`, `ADR_…`). Ob REFRESH auch für die Zeilen einer SEFILELOOP-LISTE
liefert, ist NICHT belegt. Das entscheidet ein Echttest.

Ein vierter Block `MASKE` kommt in derselben Datei vor und trägt
`REFRESH_FELDER: "*"` — andere Mechanik, nicht abgelesen:

```json
"MASKE": [{ "ID": "1211S5OPT44", "BEREICH": "BEL",
            "FELDER": "*", "REFRESH_FELDER": "*", "ALIAS": "Rabatt" }]
```

- Unser Export schreibt **keinen** REFRESH-Block. Deshalb kommen Code-Felder
  ohne ihren Text an.

## 4b. Feldpositionen der Installation (2026-08-17)

Abgelesen an den Chef-Masken und am Vorlagen-Bestand des Nutzers. Alles
installations-individuell — steht hier als Notiz, gehört nie in den Code.

| Tabelle | Feld | Code | Anmerkung |
|---|---|---|---|
| ART | Warengruppe | `36_5` | in der FELDER-Liste der behandlung-Maske |
| ADR | Adressgruppe | `1988_2` | RefreshId 708; NICHT in der ADR-Liste der Masken |
| ADR | Adress-Typ | `3362_1` | `1` = Privat |
| ADR | Suchbegriff/Matchcode | `1881_30` | darüber läuft die Namenssuche |
| ADR | „Adressgruppe" 30 Zeichen | `769_30` | **leer geprüft 2026-08-17** — kein Name |
| ADR | (veraltet) Adressgruppe | `1219_2` | RefreshId 56 |
| BEL | Stat: Adressgruppe | `3521_2` | ohne Refresh |

Warengruppen-Nummern der Installation (aus der behandlung-Maske): 1 Medikamente,
2 Artikel, 3 Leistungen, 4 Impfstoffe, 5 Futtermittel, 6 Koffer/Stücklisten,
7 Kleintier, 31 Allgemein, 32 Alpaka, 33 Kalb, 37 Labor. Verglichen wird
getrimmt und ohne führende Nullen (`007` = `7`).

Adressgruppen-Stamm (vom Nutzer in SoftEngine abgelesen): Nr `0_2`,
Bezeichnung `180_60`. **Seine SEFILELOOP-Kennung ist unbekannt** — in keiner
der 267 Vorlagen wird die Tabelle per SEFILELOOP geladen. Als Quelle im Editor
damit nicht anlegbar.

## 4c. GET_RELATION — Muster aus JsonBeleg.json

Alle mit `PARAMETER` als Liste und `RUECKGABE_ALS_ARRAY: false`:

| NR | Parameter | liefert |
|---|---|---|
| 43 | `BEL_516_3`, `3`, `30` | Name eines Bedieners |
| 208 | `EINGABE_116_2`, `180`, `60` | Name einer Adressgruppe |
| 230 | `CONCAT[BEL_2_1!BEL_1893_2]`, `180`, `60` | Belegart-Gruppe |
| 516 | Datum, Zeit, `DATUM_0_10`, `ZEIT_0_5`, `0`, `1` | Alter in Tagen |

Muster: `<Schlüssel>, <Position>, <Länge>` liest ein Feld des Zielsatzes.
`CONCAT[a!b]` setzt einen Schlüssel aus zwei Feldern zusammen.

## 5. ⚠ Die REIHENFOLGE der SEFILELOOP-Einträge ist ein Kontrakt

Belegt 2026-08-11 durch einen A/B-Echttest mit derselben Maske:

- Steht ein **Kopfsatz-Loop (POS/Belegpositionen) an ERSTER Stelle**, liefert
  SoftEngine aus **keiner** Quelle Daten — auch ADR/ART/IDB dahinter bleiben leer.
- Dieselbe Datei mit POS an letzter Stelle: alle Quellen liefern.
- Erklärung: ein Kopfsatz-Loop scheitert standalone, und SoftEngine bricht beim
  ersten gescheiterten Loop die ganze Liste ab.

Der Export schreibt Kopfsatz-Arten deshalb **zuletzt**
(`loopReihenfolge` in `kern/daten/datenquellen.ts`, Merkmal `kopfsatzMoeglich`).
Wer die Ausgabe-Reihenfolge anfasst, bricht das.

Der Kontrakt gilt nur INNERHALB der SEFILELOOP — eine `erpapicall`-Quelle fällt
aus der Liste heraus und kann sie nicht scheitern lassen.

## 6. Kopfsatz und VAR

- `KOPFSATZ_INDEX` in SoftEngine-Form `KÜRZEL_pos_len`: `'BEL_0_11'` heißt
  „der offene Beleg, ab Zeichen 0, 11 Zeichen lang".
- Belegt 2026-08-07 an der ausgelieferten Belegerfassung:
  `{ ID: 'POS', ALIAS: 'Belegpositionen', KOPFSATZ_INDEX: 'BEL_0_11', … }`
- ⚠ Der Kopfsatz zeigt in den **VAR-Abschnitt**. Fehlt dort die Variable, löst
  SoftEngine den Kopfsatz nicht auf und verwirft die ganze SEFILELOOP-Zeile
  **stillschweigend** — die Tabelle bleibt leer, ohne Fehler.
  Gemessen 2026-08-07, drei Echttests: ohne VAR jedes Mal leer.
- Bestellt wird nur das Feld, auf das der Kopfsatz zeigt.
- Der offene Satz kommt NICHT als Loop, sondern im VAR-Abschnitt unter der
  Tabellen-ID (`Daten.Var.BEL`). Wo der eigene Eintrag leer bleibt, gilt
  `WINDOW_VARIABLE` — die Handmaske liest `B.BEL_3_8 || W.BEL_3_8`. Aus dem
  Fenster zaehlt nur, was den Vorsatz dieser Tabelle traegt (`BEL_`).
- Gilt in: `kern/daten/datenquellen.ts` (`varAusKopfsaetzen`, `kopfsatzVon`).

## 7. Schreiben

- `basisHTML_SND_MSG('PUT_RELATION', { NR, PARAMS })`
- `PARAMS` = sechs Strings `[pos, len, art, pindex, relId, wert]`
- `art` = Feld-Art: `'L'` Text · `'D'` Datum · `'Z'` Uhrzeit (`15:00`, belegt
  im empfang-Log 2026-08-12)
- ⚠ **`relId` OHNE `IDB`-Präfix** (`ID0001`, nicht `IDBID0001`) — die
  SEvariablen derselben Maske sagen `IDBID0001`, der PUT nicht.
- Standard-PUT NR 174 ist nur die mitgelieferte Vorlage, keine Konstante.
- `pindex` ist die **Satznummer** des Zielsatzes. Für einen neuen Satz erst
  `GET_RELATION[640!<IDBID>]` (liefert die Satznummer), dann
  `PUT_RELATION[174!…!<Satznr>!…]`.
- Belegter Fehlerfall: schickt man Feldnamen statt Werte, landen sie als
  INHALTE in SoftEngine — `PUT_RELATION[82!0!L!…!STSPALTE!!TEXT!!EPREIS!…]`.
- ⚠ Frische Daten nach dem Schreiben: `ReloadInputJSON` gibt es nur als
  Nachricht, `basisHTML_SND_MSG('ReloadInputJSON', DATA)`
  (`selib/2.0.0/frontend_api.js`), nicht als Funktion. Das Programm
  (`SeErpWinUi.exe`) nennt beim Handler das Feld `ID` und die Meldung
  „ID ist leer“. Welche ID gemeint ist, zeigt keine Vorlage: in beiden
  Installationen ruft keine Maske den Befehl. Die Maske schickt ihn darum
  nicht; `frischeDatenAnfordern` (`softengine/bridge.ts`) ruft eine Funktion,
  die es nicht gibt, und bestellt nichts. Ob SoftEngine nach einem PUT von
  selbst neu liefert, ist an KEINER echten Maske belegt (die Handmaske schreibt
  gar nicht zurück). Aus Auslieferung und Programm gelesen, nicht per Echttest.
- Belegt ist ein anderer Weg: SoftEngines PAN-Layoutrahmen (z. B.
  `PAN/LAYOUTRAHMEN/Rahmen00221`) schicken nach einem Werkzeugstart
  `basisHTML_SND_MSG('HTMLEVENT', { art: 'RELOADHTML' })`. Nach seinem Namen
  lädt er die ganze Maske neu; der Schreibstatus der Zeilen ginge dabei
  verloren. Nicht per Echttest.
- Gilt in: `kern/daten/relationen.ts`, `bausteine/faehigkeiten/ereignisse.ts`.

## 7a. Schreiben über die ERP-Maske (MASKENEVENT, Echttest 2026-09-18)

Belegt: eine HTML-Maske kann in den offenen Beleg schreiben, OHNE
PUT_RELATION. Getestet mit SoftEngines eigenem Layoutrahmen 00006 (seine
Dateien lagen dafür im Ordner 00001, den die Belegerfassung öffnet): in der
Kachel „Abweichende Bankverbindung“ den Kontoinhaber geändert, übernommen,
Beleg geschlossen und neu geöffnet — der Wert stand drin.

Der Ablauf, gelesen in SoftEngines eigenem Modul (`HTMLEditor/V2/JS/
SEDataList.js`, `SEJSONProcessing.js` der Auslieferung), nicht selbst gebaut:

- Bestellt wird der Block `MASKE`: `{ID, BEREICH, FELDER, REFRESH_FELDER,
  ALIAS}`. `ID` ist die Maskennummer der Installation (hier `1211S5OPT26`
  Bankverbindung, `1211S5OPT01` Anschrift, `BEREICH: "BEL"`). Geliefert wird
  `Daten.Masken.<ALIAS>`, je Feld mit Name, Pos, Len, Format, Flag, RollNdx,
  Status (`A` = nur Anzeige) und HelpNr.
- Bearbeiten an: `MASKENEVENT {EVENT:'KARTEIKARTEN_DEAKTIVIEREN'}`, dann
  `{EVENT:'BEARBEITUNG_AKTIV'}` — beide ohne ID.
- Feld ändern: `{ID:<maskenid>, BEREICH, EVENT:'UPDATE_MASKE_FELD',
  PARAMS:{POS, LEN, VALUE, FIELDFORMAT}}`. `maskenid` ist der Feldname bis
  zum ersten Unterstrich.
- Auswahlliste des ERP öffnen: `{ID, BEREICH,
  EVENT:'OPEN_REFRESH_MASKE_FELD', PARAMS:{POS, LEN, REFRESH, REFRESHFLAG,
  HELPNR}}`.
- Speichern/verwerfen: `{ID:<Id der Liste>, EVENT:'SAVE_MASKE_FELD'}` bzw.
  `'ABORT_MASKE_FELD'`. ⚠ Hier ist `ID` die Element-Id der Liste, beim Ändern
  dagegen die Maskenkennung — zwei verschiedene Dinge unter demselben Namen.
- Bearbeiten aus: `{EVENT:'BEARBEITUNG_BEENDET'}` und
  `{EVENT:'KARTEIKARTEN_AKTIVIEREN '}` — mit Leerzeichen am Ende, so steht es
  im Quelltext.
- Antwort: keine eigene Nachricht. Es kommt eine normale Datenlieferung mit
  `Daten.Var.DATEN_AENDERUNG_AKTIV = "true"`, die geänderten Werte stecken
  darin. Bei der Auswahlliste `REFRESH_MASKE_FELD_ANTWORT` und
  `REFRESH_MASKE_FELD_INHALT`.

**Zweiter Echttest, 2026-09-18, aus der Maske des Aufbau-Editors** (Rahmen
00001 der Belegerfassung, Konsole, ohne `selib`):

- Der `MASKE`-Block wirkt auch in einer Editor-Maske. `1211S5OPT01`/`BEL` kam
  an als `Daten.Masken.<ALIAS>` mit den Werten (`1211S5OPT01_107_30`:
  Name, `_6331_46`: Strasse …), den Klartexten (`REFRESH_…_1789_3`:
  „Deutschland“) und der Feldbeschreibung als Array `MASKE` mit 20 Einträgen.
- Geschrieben wurde mit genau vier Nachrichten, von Hand in der Konsole:
  `BEARBEITUNG_AKTIV` → `UPDATE_MASKE_FELD` (`ID:'1211S5OPT01'`,
  `BEREICH:'BEL'`, `PARAMS:{POS:'137', LEN:'30', VALUE:'PROBE1',
  FIELDFORMAT:'L'}`) → `SAVE_MASKE_FELD` → `BEARBEITUNG_BEENDET`.
  Nach Schliessen und Neuöffnen des Belegs lieferte SoftEngine `PROBE1`.
- ⚠ Damit ist die ID-Frage entschieden: `SAVE_MASKE_FELD` nimmt die
  **Maskenkennung** (`1211S5OPT01`). Die Element-Id aus `SEDataList.js` ist
  nur selibs eigene Buchführung, keine Vorschrift.
- `basisHTML_SND_MSG` gibt bei allen vier Rufen `undefined` zurück; ein
  Erfolg ist daran nicht zu erkennen, nur an der nächsten Lieferung.
- ❌ Positionsmasken kommen in der Belegerfassung NICHT: `POSDETOPT50`/`POS`
  bestellt → `Daten.Masken.<ALIAS>` blieb `undefined`. Passt dazu, dass die
  Auslieferung diese Masken nur in den Rahmen 00007 und 00017 verwendet
  (Positionsdetail), und dort ohne `maskedit`. Für Positionen bleibt es
  vorerst bei PUT_RELATION.

Nicht belegt: ob eine Zelle der Erfassung auf diesem Weg beschrieben werden
kann (dazu müsste die Positionsmaske ankommen), und ob das ERP einen
abgelehnten Wert meldet.

## 8. Positionen zur Laufzeit lesen (Hol-Relation)

Belegt 2026-08-10/11, Echttests:

- Relation 69 liefert je Frage EIN Feld einer Position:
  `PARAMS: [BELART, POS, LEN, BELNR, JAHR, ARCHIV, '', POSNR, '', '', '', '']`
  → `{"RESULT":"…"}` über den REGISTER-Callback, 2–19 ms.
- `JAHR`/`ARCHIV` = BEL-Felder `0_1`/`1_1` der gewählten Zeile.
  **Leer findet nur den aktuellen Nummernkreis** (Echttest 2026-08-12:
  261er-Belege lieferten nichts, 262er schon).
- Breiter Schnitt `POS=0/LEN=255` holt die vordere Positionszeile in EINEM
  Aufruf — der Antwortpuffer fasst 255 Zeichen (SE-Log `zlen=255`).
  Nur Felder, die darüber hinausragen, kosten je eine eigene Frage.
- Ende der Liste: `11_6` UND `18_25` beide leer. `645_10` (Positionsident) ist
  hier LEER und **kein** Ende-Marker.
- Immer seriell. `ALS_ARRAY`/`ALIAS` machen die Antwort nur zur 10er-Liste mit
  trotzdem EINEM Wert.
- Eine holende Quelle bestellt bei SoftEngine NICHTS — ihr SEFILELOOP-Eintrag
  entfällt.
- Gilt in: `kern/daten/ladeRelation.ts`, `softengine/relationLader.ts`.

## 9. START_TOOL

- `basisHTML_SND_MSG('START_TOOL', { NR, PARAMS })`
- Fallback `sendBWLinkIntern('0,START_TOOL,<nr>[,<params URL-kodiert>]')` — dieser
  Weg verwirft die Parameter (aus SoftEngines eigener Maskenbibliothek gelesen,
  nicht per Echttest).
- Werkzeug-Nummern sind je Installation individuell → Daten, nie Code.
- Gilt in: `bausteine/faehigkeiten/ereignisse.ts`.

## 10. ERPAPICALL

- Zweiter belegter Weg an Daten. Aus dem Quelltext der empfang-Referenzmaske:
  > „Kommen NICHT per SEFILELOOP, sondern per ERPAPICALL LIEFERADRESSE.GET
  > (ohne ADRNR = alle Sätze; verifiziert 2026-06-11).
  > Antwort: `SEDATA.Daten.ErpApiCall.Haustiere.Zeilen[]` mit Schlüsseln
  > `LFA_pos_len`."
- **Nach dem Oeffnen gefragt, nicht bestellt.** Echttest des Nutzers
  2026-09-21, WinUI, Belegerfassung Layoutrahmen 00001: dieselben fuenf Listen
  im Bestellzettel -> „Maske hat ihre Daten" nach 2666 ms, Fokus hakt; als
  Nachricht nach dem Oeffnen -> Maske nach 445 ms, danach ARTIKEL.GET 5953
  Zeilen in 652 ms, IDBID0001.GET 670 in 104 ms, IDBID0010.GET 631 in 116 ms,
  CHARGE.GET 1759 in 172 ms, dazu BELEG.GET. Nichts fror ein.
- Nachricht: `basisHTML_SND_MSG('ERPAPICALL', { ID, ALIAS, FELDER })`, Felder
  mit Vorsatz. Die Antwort kommt ueber den REGISTER-Rueckruf, ohne `Daten`-Block
  und ohne Absender: `{ ARTIKELLISTE: { ARTIKEL: [...] } }`,
  `{ ELEMENTNAME, IDBID0001LISTE: { IDBID0001: [...] } }`,
  `{ CHARGENLISTE: { CHARGE: [...] } }`. Die Zeilen tragen die bestellten
  Schluessel. Darum immer nur eine Frage zugleich, dieselbe Schlange wie GET.
- Mit `FREISELEKT` (`GET_RELATION[992!ART_51_60!<Begriff>!0]=1`, wie SoftEngines
  Vorlage RGBP07) kommen nur Treffer, aber je Suche rund 1,25 s: alle Artikel
  auf einmal sind schneller (Echttest 2026-09-21).
- Nicht belegt und darum nicht angeboten: Kopfsatz, offener Satz (VAR),
  Hol-Relation, Schreibweg. WebUI nicht getestet.
- Gilt in: `kern/daten/datenquellen.ts` (`holtNachOeffnen`),
  `softengine/abfrageLader.ts`, `softengine/relations.ts` (`abfrageAusfuehren`),
  `softengine/data.ts` (`zeilenAusAbfrageAntwort`).

## 11. Anlegen (SE-Wissen, wird NICHT gebaut)

Belegt im empfang-Log 2026-08-12, WinUI. Der Nutzer hat die Etappe gestrichen —
steht hier nur als Wissen:

- Neuer IDB-Satz: `GET_RELATION[640!<IDBID>]` → Antwort = die NEUE Satznummer.
- Neuer Beleg: `GET_RELATION[1020!<BELART>!!<ADRNR>!!!!]` → Beleg-INDEX
  (`0NL26105743`: Byte 3 = Belegart, ab Byte 4 = Belegnummer).
- Neue Belegposition: `PUT_RELATION[82!0!L!26105745!!ART03045!!1]` —
  `[0, Belegart, Belegnummer, '', Artikelnummer, '', Menge]`. Was die `0` und
  die Leerstellen bedeuten, ist **ungedeutet**.
- Bediener-Name: `GET_RELATION[43!_BNR_!3!30]`.
- Beim Anlegen werden auch LEERE Felder geschrieben
  (`docs/softengine-wiki/muster-satz-anlegen.md`).

## 12. DTK-Import

- „IDB exportieren" der SoftEngine-GUI schreibt `.DTK`.
- `@DSATZ`-Zeilen, zwei belegte Formen:
  `IDBID0001_0_55,,0,55,TierArtID,L` und
  `IDBID0002_0_30,1002,0,30,Tierart,L,a001,000000`
- Die Datei enthält auch ALTE Seitenstände.
- Steuerzeichen werden abgestreift (belegt: ein `0x80` vor `' von'`).
- Gilt in: `kern/daten/dtkImport.ts`.

## 13. Plattform-Unterschiede

- Die Maske läuft in **WinUI/BüroWARE** (`__WEBWARE__: "0"`,
  `__WINUI_MAJORVERSION__: "7"`) und in **WebUI/WEBWARE**.
- Altes WinUI hat **keinen `ResizeObserver`** — Rückfall ist Pflicht
  (`bausteine/tabelle/seitengroesse.ts`).
- HTML5-Drag ändert in SoftEngine nur den Mauszeiger.
- Die Brücke `basis.html.interface.js` bindet der Export selbst ein (siehe 1).
  `EditorPfad` wird zu `<Installation>/Ressourcen/Standard/HtmlTemplates/HTMLEditor`,
  dort liegt sie unter `JS/JS/` (belegt 2026-07-28 und 2026-09-15, WinUI); die
  Kopie unter `selib/2.0.0/` ist byte-gleich. Fehlt die Brücke, meldet die
  Maske „SoftEngine-Anschluss nicht gefunden".
- **Den Tastaturfokus gibt dem WebView nur SoftEngine selbst.** Bei der
  Nachricht `WWFOC` ruft `basis.html.interface.js` `basisHTML_DoSetFocusToHTML()`;
  antwortet die Maske `true` („erledigt"), überspringt die Brücke
  `basis_HTML_DoSetAutoFocus()` — die Funktion, die ein unsichtbares
  `<input id="AFELM">` anlegt und zweimal fokussiert. Ohne diesen Griff hat der
  WebView keine Tastatur: ein Klick landet in keinem Feld, in keinem Baustein,
  und erst Öffnen und Schließen der Entwicklerkonsole holt ihn nach. Die Maske
  antwortet darum nur `true`, wenn die Schreibmarke schon auf ihr steht
  (`softengine/bridge.ts` `fokusBeiUns`, durch alle Schatten-Wurzeln). Echttest
  2026-09-15, Layoutrahmen 00001 in der Belegerfassung: mit der Antwort `false`
  klickt es, mit `true` nicht. Eine Maske ohne Layoutrahmen (STDERFASSUNG 990)
  war nie betroffen — dort fragt niemand nach dem Fokus.
- Ohne `JWHtmlStart` fehlen SoftEngines Helfer aus `HTMLEditor/JS/Allgemein.js`
  (`sendBWLink`, `sendBWLinkIntern`, `ResetDataBasis`, `InitialisiereDatenBasis`)
  und aus `jsonWandlung.js` (`InitialisiereSchnittstelle`). Die Maske ruft sie
  nur, wenn es sie gibt. WebUI/WEBWARE ohne `JWHtmlStart`: nicht getestet.
- Einen BW-Befehl schickt die Maske darum selbst, so wie `sendBWLinkIntern`:
  `basisHTML_SND_MSG('HTMLEVENT', { art: 'BWLINK', params: '<Befehl>' })`.
  `0,START_TOOL,<nr>` geht als `START_TOOL`-Nachricht nur mit `NR`, Parameter
  dahinter fallen weg wie bei SoftEngine. Das Programm (`SeErpWinUi.exe`) nennt
  beim HTMLEVENT-Handler die Felder `art` und `params` und die Arten
  `ESCAPEHTML`, `RELOADHTML`, `BWLINK`. SoftEngine wählt den Weg an
  `SEDATA.BW_PFAD` und fällt ohne es auf die alte `bw-link:`-Adresse zurück; die
  Maske fragt nach der Brücke und meldet ohne sie, dass nichts hinausging
  (`softengine/befehle.ts`). Aus Auslieferung und Programm gelesen, nicht per
  Echttest.
- Ein Skript im Maskenordner (`<script src="fftest.js">`) wird ebenfalls
  geladen (belegt 2026-08-28, als zwoelf Laufzeitdateien belegt 2026-09-08).
  Die Laufzeit steht trotzdem in der Maske selbst: eine HTML plus eine JSON,
  weil der Kunde einen festen Stand bekommt und nichts nachgeladen wird.
- Der Browser der WinUI-Belegerfassung ist Edge WebView2, Kennung
  `Chrome/152.0.0.0 ... Edg/152.0.0.0` (gemessen 2026-09-09). Er aktualisiert
  sich selbst; die von Vite 8 gebaute Laufzeit laeuft, alle Bausteine
  erscheinen, Artikel-Nachschlagen geht (belegt 2026-09-08).
- Nebenbeobachtung: `CONECT` wird ZWEIMAL gesendet, Empfang trotzdem nur
  1 Paket. Ungeklärt.

## 14. Ansichten/Flächen

- Echttest 2026-08-12: ohne das Sicht-Attribut lagen zwei
  Flächen **übereinander** — im Editor unsichtbar, in SoftEngine kaputt.
  Wer es entfernt, bricht die Ansichten.
- Gilt in: `bausteine/grund/Grundbaustein.ts`.

## 15. Optik-Belege aus den echten Masken

- Senkrechte Navi `.vnav`: 72 px schmal
  (`docs/chef-maske/empfang/index.basis.source.html`).
- Die echte empfang-Maske benutzt `color-mix` — lauffähig belegt.
- Maskenwurzel: `width:100%`, Spalten als `1fr`/flex — die Maske füllt das
  SoftEngine-Fenster wie die echten Chef-Masken.

## 16. Bedienung der ausgelieferten Handmaske (Rahmen00001 V11)

Am Quelltext der Maske abgelesen, nicht per Echttest. Unsere Tabelle haelt sich
daran, damit die Bedienung beider Masken dieselbe ist.

- Doppelklick auf eine Positionszeile: BW-Befehl `TABELLEPOS_DETAILS` mit der
  Satznummer (auch in `docs/chef-maske/BeispielBeleg.html`).
- `basisHTML_DoSetFocusToHTML` setzt den Fokus in die erste Erfassungszelle.
- Enter unter der letzten Zeile fuehrt in die Erfassungszeile (`enterModus`).
- Der Editier-Start markiert den Zellinhalt (`selectNodeContents`).
- Die vorgemerkte Aenderung zaehlt in die Summe; gezaehlt wird ueber ALLE
  Treffer, nicht ueber die sichtbare Seite.
- Aenderbare Zelle im Ruhezustand ohne Rahmen (`.zi.still`), Suchtreffer als
  `<mark>` mit `#ffedb0`.
- Senkrecht bewegt sich der Cursor durch DIESELBE Spalte (dort der "Anker"
  ueber der Mengen-Spalte).
- Ein Push wird erst angewandt, wenn kein Feld mehr den Fokus hat (dort mit
  800 ms Nachlauf) — sonst springt dem Bediener die Schreibmarke aus der Zelle.
- Jeder Push traegt den GANZEN Datenstand, auch unveraendert; die Handmaske
  vergleicht darum eine Signatur und zeichnet nur bei echter Aenderung neu.

## 17. DataSet-Definition (Echttest 2026-09-15, Revision 130288)

Ein DataSet wird in SoftEngine im DataSet-Fenster als JSON erfasst (keine
Datei). Erst nach Speichern und Aktualisieren liegt die Datendatei unter
`Datenbank\Mandanten\<Mandant>\DATASETS\<ID>_00.dss`; ihr Zeitstempel ist die
letzte Aktualisierung. Die Vorlage in der Hilfe ist an drei Stellen
irrefuehrend:

- `"ID"` (die eigene DataSet-ID) MUSS im Text stehen. Fehlt sie, meldet das
  Laden `ERR_INVALID_PARAMETER_VALUE / KEY:-1`.
- `"MAX_ZEILEN_NACH_SORT"` ist Pflicht und muss > 0 sein (0 gilt als fehlend:
  `ERR_PARAM_MISSING / MAX_ZEILEN_NACH_SORT`). Das `MAX_ZEILEN` der Vorlage
  allein reicht nicht; beide Zeilen zusammen laufen.
- `"INDEX_NR": 0` ist der Primaerindex einer ERP-Tabelle. Die -1 der Vorlage
  ist ungueltig.

Gelaufen ist mit ART=ERPTabelle, ID=ART, Spalten `ART_<pos>_<len>` als QUELLE,
FORMAT L, AKTUALISIERUNGSZEITPUNKT Manuell, AKTUALISIERUNGSART Komplett, ohne
CACHING (laut Campus-Kurs derzeit weglassen). Spalten spricht die Maske mit
ihrer BEZEICHNUNG an.

Offen: Der `DATASET`-Block in den SEvariablen (`ID`, `ALIAS`, `FELDER`, laut
SoftEngine-Auskunft ab Revision 127025, Zeilen unter `Daten.Tabellen.<ALIAS>`)
ist noch NICHT im Echttest belegt. Gilt in: `kern/daten/quellenArten.ts`
(`dataset`), `export/sevariablen.ts`.

---

## Was hier NICHT steht

- Bauverlauf, Umbau-Etappen, wer wann was entschieden hat → `git log`.
- Arbeitsweise und Aufbau des Editors → `CLAUDE.md`.
- Die echten Masken selbst → `docs/chef-maske/`.
