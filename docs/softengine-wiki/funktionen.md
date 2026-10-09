# Was SoftEngines Masken können, abgelesen aus der Installation, nicht per Echttest

Gelesen am 09.10.2026 in der SoftEngine-Installation
`E:\DATA\VSES-Muhammed\TestVersion\Ressourcen\Standard`, nur gelesen. Pfade
ohne Vorsatz liegen unter `Ressourcen/Standard/HTMLTemplates/`, `selib` steht
für `HTMLTemplates/HTMLEditor/selib/2.0.0/`. Nichts hier ist in SoftEngine
geprüft; was ein Echttest bestätigt, wandert nach `kontrakte.md`.

Spalte **Editor**: kann der Aufbau-Editor das heute (ja, teils, nein).
`STDERFASSUNG/ID0001/990` ist ein Export dieses Editors und zählt nicht mit.

## a) Nachrichten an den Host

`selib/frontend_api.js` listet 18 Nachrichten, je eine Hülle
`function SEERP_COMMAND_ERPAPICALL(DATA) { basisHTML_SND_MSG("ERPAPICALL", DATA); }`.
Keine Maske ruft die Hüllen; alle rufen `basisHTML_SND_MSG` direkt.

| Nachricht | Wofür in echten Masken | Beleg | Editor |
|---|---|---|---|
| `BWLINK` | `{ bwlink: "ALLE_GESPRAECHE_LADEN" }`, nur in einem Modul. Alle anderen schicken BW-Befehle als `HTMLEVENT { art: "BWLINK", params }`. | `EinAusgangsgespraeche/js/main.js:832` | teils (HTMLEVENT-Weg) |
| `CONECT` | sendet die Brücke selbst bei jedem `basisHTML_REGISTER` im WebView2. Wer zweimal anmeldet (selib `InitializeERPConnection` und `InitialisiereSchnittstelle` tun es je einmal), sendet zweimal; mögliche Erklärung für „CONECT zweimal“ in `kontrakte.md` §13. | `selib/basis.html.interface.js:45` | ja |
| `DecodeBase64`, `EncodeBase64` | in keiner Maske gerufen | `selib/frontend_api.js` | nein |
| `ERPAPICALL` | selib `APICallToErp` (art `apicall`/`webservice`) baut `{ ID, …Schlüssel }` aus Paaren. Die meisten Masken bestellen die Abfrage stattdessen in der SEVariablen (b). | `selib/V2/JS/SEJSONProcessing.js:183-200` | teils |
| `GET_RELATION` | selib: `{ "NR": …, "PARAMS": …, "ALIAS": "SEGet", "ALS_ARRAY": AlsArray }`. DWld06: Klick auf Telefon, Fax, Mobil ruft NR `1351` mit `['503','20','L', <Nummer>]`; die Wirkung zeigt die Maske nicht. | `selib/V2/JS/SEJSONProcessing.js:176`, `STDERFASSUNG/DWld06/951/index.basis.source.html:286` | ja |
| `HTMLEVENT` | `art`: `RELOADHTML` (52 Stellen, F6), `ESCAPEHTML` (27, Esc), `BWLINK` (4), `DontShowAgain` (1, `STDERFASSUNG/DWTO27/951`) | `HTMLEditor/JS/SEEvent.js:409-497` | teils (ESCAPEHTML, BWLINK) |
| `HTMLKONFIG_LADEN` | in keiner Maske; die Konfiguration kommt mit jeder Lieferung als `SEDATA.HTMLKONFIG` | `HTMLEditor/V2/JS/SEConfiguration.js:3` | nein |
| `HTMLKONFIG_SPEICHERN` | speichert den Bedienzustand der Maske in SoftEngine: `{ "HTMLKONFIG": SEDATA.HTMLKONFIG, "KEINE_RUECKGABE": true }` (offene Blöcke, Menü, Einstellungen) | `selib/V2/JS/SEConfiguration.js:207`, `HTMLEditor/JS/SEAppKonfig.js:79` | nein: der Editor merkt Spaltenwahl und Sortierung im `localStorage` des WebView (`src/blocks/list/operatorState.ts`) |
| `MASKENEVENT` | selib DataList: Bearbeiten an/aus, Feld ändern, Auswahlliste öffnen, Speichern/Verwerfen (d) | `selib/V2/JS/SEDataList.js:2914-3448` | teils (nur Bearbeiten an/aus, `src/softengine/editing.ts`) |
| `PARSE_HTML`, `PARSE_SEVARIABLEN_JSON`, `ReadFile`, `ReloadInputJSON` | in keiner Maske gerufen | `selib/frontend_api.js` | nein |
| `PUT_RELATION` | selib `APICallToErp` art `put`: `{ "NR", "PARAMS" }` | `selib/V2/JS/SEJSONProcessing.js:180` | ja |
| `START_TOOL` | Werkzeug starten, `{ NR }`; mit 447 Aufrufen die häufigste Nachricht | z. B. `HTMLEditor/JS/Allgemein.js:25` | ja |
| `TABTOERP` | übergibt eine ganze Tabelle an SoftEngine (`exportTableToERPSuite`): `{ TFELD: [{ Name: "FELD00", Beschreibung, Format, Art }], Zeilen: [{ FELD00: … }], Tabid }`, `Tabid` ist `"VIEW"` oder eine Tabellennummer (`//tabid = 48,84,931....`) | `HTMLEditor/JS/SETable.js:2333-2340`, `selib/V2/JS/SETable.js:1680` | nein |
| `WechsleKK` | Alt+1 bis Alt+9 wechselt die Karteikarte des ERP-Fensters: `{ KK: event.key }` | `HTMLEditor/JS/SEEvent.js:453` | nein |

Allgemeine Nachrichten, die nicht in `frontend_api.js` stehen:

| Nachricht | Wofür | Beleg | Editor |
|---|---|---|---|
| `KEY_EVENT` | drückt eine Taste im ERP-Fenster: `{ key, ctrl, shift, alt }`, `key` als Tastencode. MPERH1 hat eine Leiste: 112 F1 Hilfe, 114 F3 Neu, 115 F4 Löschen, 116 F5 Auswahl, 117 F6 Aktualisieren, 119 F8 Duplizieren, 120 F9 Vorgang starten. | `selib/V2/JS/SEJSONProcessing.js:123-139`, `STDERFASSUNG/MPERH1/990/index.basis.source.html:640-668` | nein |
| `TABELLENEVENT` | setzt die aktuelle Zeile einer ERP-Tabelle: `{ ID: TABID, EVENT: "SET_AKTUELLE_ZEILE", PARAMS: { "ZEILENNUMMER": id } }`, dazu `ZEILE_AUSWAEHLEN` | `HTMLEditor/JS/Allgemein.js:40-58`, `PAN/LAYOUTRAHMEN/Rahmen00211.basis.source.html:433` | nein |
| `DATRECV` | Empfangsquittung bei jeder Lieferung: `{ INFO: "Daten angekommen", LAENGE: aStr.length }` (f) | `EinAusgangsgespraeche/Gespraeche.basis.source.html:765`, `STDERFASSUNG/MPM201/992/webui.maskendesigner.js:178` | nein |
| `DialogAbbrechen` | Rückfall zum Schließen, wenn selib fehlt; danach `window.close()` | `STDERFASSUNG/RGBP07/951/JS/Functions.js:15-21` | nein |

In die andere Richtung: kommt eine Nachricht mit `MSGID == "PRINTHTML"`, ruft
selib `window.print()` (`selib/V2/JS/SEJSONProcessing.js:276`). Wer sie
schickt, zeigt keine Maske. Editor: nein.

Nur für ihre Module, hier nicht verfolgt: `Mail…`, `KI_…`, `KANBAN`,
`Change_Feld`, `Edit_AufgabeProzess`, `StartApp`, `SelPool…`.

## b) ERPAPICALL-Einträge in den SEVariablen

17 von 320 SEVariablen-Dateien tragen einen gefüllten `ERPAPICALL`-Block. Bestellt
landen die Zeilen unter `SEDATA.Daten.ErpApiCall.<ALIAS>.Zeilen[]`, gelesen z. B.
`SEDATA.Daten.ErpApiCall.Kunde.Zeilen[0].ADR_2_8`
(`STDERFASSUNG/DWld04/951/index.basis.source.html:100`). DWld06/951–955 sind
gleich bestellt wie DWld04/951–955.

| ID | Schlüssel außer ID, ALIAS, FELDER | Masken | Bewirkt, soweit erkennbar |
|---|---|---|---|
| `BELEG.GET` | `BELART` (`N` Angebote, `b` Bestellungen, `L` Lieferscheine), `VON_ADRNR`, `BIS_ADRNR` (Feldverweis `EINGABE_785_8`), in 954 `REFRESH_FELDER: "19_10:300500"` | `STDERFASSUNG/DWld04/951–954` | Belege einer Belegart einer Adresse |
| `ADRESSE.GET` | `ADRNR` (Feldverweis), `REFRESH_FELDER: "2_8:300018"`; in PGEACT `VON_ADRNR: "10000"`, `BIS_ADRNR: "69999"` | `DWld04/951–953`, `STDERFASSUNG/PGEACT/951` | eine Adresse bzw. ein Nummernbereich; `REFRESH_2_8` steht als Text neben der Nummer (DWld04/951:99) |
| `LIEFERADRESSE.GET` | `ADRNR`, `REFRESH_FELDER: "2_8:300018"` | `DWld04/954` | Lieferadressen einer Adresse |
| `PROZESSE_AUFGABEN.GET` | `DATENVERKNUEPFUNG_BEREICH: "ADR"`, `DATENVERKNUEPFUNG_ID` (Feldverweis), `ERLEDIGT` (`"0"` oder `false`) | `DWld04/951–955` | PAN-Aufgaben und Prozesse, die an der Adresse hängen; die Maske trennt nach `PROZAUFG_119_1` = `P`/`A` |
| `WIEDERVORLAGE.GET` | `ADRNR`, `REFRESH_FELDER: "10_3:300026,33_8:300033,924_10:304960,934_10:304961"` | `DWld04/951–953` | Wiedervorlagen einer Adresse, je Zeile mit Klartexten `REFRESH_10_3` usw. (DWld04/951:211) |
| `VERTRETER.GET` | `ADRNR` | `DWld04/955` | Vertreter einer Adresse |
| `ARTIKEL.GET` | `MIT_LANGTEXT: "LT,00"`, `LANGTEXT_FORMAT: "PLAIN"` | `STDERFASSUNG/PGCP47/951` | Artikelstamm mit Langtext |
| `STUECKLISTEN.GET` | `SLNR: "ART_1_25"`, `ART` (`H`, `K`, `S`), `SONDERWERTE: "J"`, kein `FELDER` | `MIS_V3/LANDINGPAGES/ART/HTML/07–10` | Kopf der Stückliste des Artikels |
| `KOMPONENTEN.GET` | `SLNR`, `SONDERWERTE` | dieselben | Komponenten dieser Stückliste |
| `IDBSE0881.GET` | `PARAMETER`, `MIT_LANGTEXT: "NT1"`, `REFRESHFELDER: "*"`, `LANGTEXT_FORMAT: "HTML"`, kein `ALIAS` | `STDERFASSUNG/MPERH1/990` | IDB-Datei mit Langtext als HTML |
| `JSDPGKA01.GET` | `MIT_LANGTEXT: "MEMO00"`, `REFRESHFELDER: "*"`, `LANGTEXT_FORMAT: "HTML"` | `MPERH1/990` | JSD-Datei mit Memo |

- Werte in den Schlüsseln sind Feldverweise (`EINGABE_785_8`, `ART_1_25`), die
  SoftEngine beim Bestellen auflöst, oder feste Werte. Der Editor schickt die
  Abfrage als Nachricht nach dem Öffnen mit dem Wert selbst (`kontrakte.md`
  §10).
- Editor: `ID`, `ALIAS`, `FELDER`, `BELART`, `VON_ADRNR`/`BIS_ADRNR` ja
  (`src/softengine/relations/hostQueue.ts`). `ADRNR`, `REFRESH_FELDER`,
  `DATENVERKNUEPFUNG_*`, `ERLEDIGT`, `SLNR`/`ART`/`SONDERWERTE`,
  `MIT_LANGTEXT`/`LANGTEXT_FORMAT`, `PARAMETER`: nein.

## c) REFRESH_FELDER

Bestellt den Klartext zu Code-Feldern mit. Es heißt **nicht** „SoftEngine
liefert nach, wenn sich ein Feld ändert“. Zwei Formen:

- In `VAR`, `SEFILELOOP`, `TABELLE`, `MASKE`, `WINDOWLOOP`: `"*"` oder eine
  Liste `pos_len`. Beispiel `STDERFASSUNG/DWZE22/951/index.basis.SEVariablen.json`:
  `{ "FELDER": "*", "ID": "EINGABE", "REFRESH_FELDER":"3_1,7_1,11_2,59_8" }`.
  Der Text kommt als eigener Schlüssel neben dem Feld,
  `REFRESH_<Vorsatz>_<pos>_<len>`: `REFRESH_EINGABE_59_8`
  (`STDERFASSUNG/DWZE22/951/index.basis.source.html:133`), in Listenzeilen
  `REFRESH_DWZE07_20_8` (`PAN/LAYOUTRAHMEN/Rahmen00048.basis.source.html:13`,
  SEFILELOOP `"REFRESH_FELDER": "20_8,98_1,99_1"`).
- In `ERPAPICALL`: `pos_len:<ID>`, die ID wie im REFRESH-Block
  `300000 + RefreshId` (`kontrakte.md` §4a). Der Text kommt ohne Vorsatz als
  `REFRESH_<pos>_<len>` in jeder Zeile (`DWld04/951:211-216`).
  `MPERH1/990` schreibt `REFRESHFELDER` ohne Unterstrich; ob das wirkt, ist
  nicht erkennbar.
- Wer es nutzt: 65 VAR-, 13 SEFILELOOP-, 41 TABELLE-, 42 MASKE-, 72 WINDOWLOOP-
  und 16 ERPAPICALL-Einträge.
- Damit wäre die offene Frage aus `kontrakte.md` §4a (Klartext auch für Zeilen
  einer Liste) nach dem Ablesen mit ja beantwortet, für SEFILELOOP und
  ERPAPICALL. Nicht getestet.
- Editor: nein. Nur der MASKE-Eintrag trägt `REFRESH_FELDER: '*'`
  (`src/core/data/orders/mask.ts`).

Was es wirklich zum Nachliefern gibt, steht im Satz des Layoutrahmens der
Belegerfassung, `Ressourcen/Standard/Dateidefinitionen/DWBE01.fdef`
(„Belegerfassung-Layoutrahmen“, Datei `BELEGERFASSUNG_LAYOUTRAHMEN_DWBE01.DAT`
unter `%BWROOT%\BLAYOUT\`). Je Rahmen ein Schalter:

```
Refresh: Bei Neuer Position,72,1,AJN,a009,,,4,,,,
Refresh: Beim Zeilenwechsel,73,1,AJN,a010,,,4,,,,
Refresh: Nach Positionslangtext Speicherung,74,1,ANJ,a011,,,4,,,,
Refresh: Nach Beleglangtext Speicherung,75,1,AJN,a012,,,4,,,,
Refresh: Nach Belegkopf Änderung,76,1,AJN,a013,,,4,,,,
Pan Aufgaben und Prozesse laden,77,1,ANJ,a014,,,4,,,,
Teilzahlungsvorangsbelege laden,78,1,ANJ,a015,,,4,,,,
Produktionsstücklisten Daten laden,79,1,ANJ,a016,,,4,,,,
Datenbereich laden: Positionen,80,1,AJN,a017,,,4,,,,
Datenbereich laden: Adresse,81,1,AJN,a018,,,4,,,,
Datenbereich laden: Lieferadresse,82,1,AJN,a019,,,4,,,,
Datenbereich laden: Vertreter,83,1,AJN,a020,,,4,,,,
Datenbereich laden: Projekt,84,1,AJN,a021,,,4,,,,
```

Gepflegt wird der Satz im Fenster `Ressourcen/Standard/FensterDefinitionen/PGBELERF.xml`,
Karte `DWBE01` (Menü „Neuen Layoutrahmen anlegen (F3)“). `AJN` und `ANJ`
lesen sich wie Ja/Nein mit anderer Vorgabe; welche, ist nicht abgelesen.
Was „Datenbereich laden“ genau abschaltet, zeigt keine Datei. Editor: nein,
und braucht es nicht: das ist eine Einstellung in SoftEngine.

## d) Zurückschreiben außer PUT_RELATION

- **Offener Satz über die ERP-Maske** (`kontrakte.md` §7a, dort per Echttest
  belegt): selib schickt beim Ändern
  `basisHTML_SND_MSG("MASKENEVENT", { ID: MyData.maskenid, BEREICH: MyData.name, EVENT: "UPDATE_MASKE_FELD", PARAMS: { "POS", "LEN", "VALUE": Value, "FIELDFORMAT": MyData.art } })`
  (`selib/V2/JS/SEDataList.js:3448`). `FIELDFORMAT` ist das `Format` aus der
  Feldbeschreibung, die mit `Daten.Masken.<ALIAS>.MASKE` kommt: `Name`, `Pos`,
  `Len`, `Format`, `Beschreibung`, `dy` (Zeile), `Status` (`G` wird
  übersprungen, `A` nur Anzeige), `Refresh`, `RollNdx`, `Flag`, `HelpNr`
  (`selib/V2/JS/SEJSONProcessing.js:15-80`). Editor: teils (bestellen ja,
  schreiben nein).
- **Ankreuzfelder**: kein eigener Weg. selib behandelt sie wie jedes
  Maskenfeld und schreibt den Wert als Text mit dem Format des Felds; nach
  `kontrakte.md` §3 sind das `J`/`N`. `HTMLEditor/JS/SECheckbox.js` schreibt
  nichts zurück. Editor: nein.
- **Auswahlliste des ERP für ein Feld**: `EVENT: "OPEN_REFRESH_MASKE_FELD"`
  (`SEDataList.js:3391`), die Wahl kommt als `Daten.Var.REFRESH_MASKE_FELD_ANTWORT`
  = `"true"` mit `REFRESH_MASKE_FELD_INHALT` (`SEJSONProcessing.js:288-290`).
  Editor: nein.
- **Freifelder**: in HTMLTemplates kein Treffer für „Freifeld“. Liegen sie auf
  einer ERP-Maske, gilt vermutlich der Maskenweg; abgelesen ist das nicht.
- **Aktuelle Zeile einer ERP-Tabelle setzen**: `TABELLENEVENT` (a). Editor: nein.
- **Tabelle an SoftEngine übergeben**: `TABTOERP` (a). Kein Schreiben in
  Sätze, eine Übergabe der Liste. Editor: nein.
- **Bedienzustand der Maske**: `HTMLKONFIG_SPEICHERN` (a). Editor: nein.
- **PAN-Aufgaben und Prozesse**: eigene Nachricht
  `basisHTML_SND_MSG('Change_Feld', { 'AufgabenID': id, "Pos": "30", "Len": "8", "NewValue": … })`
  (`STDERFASSUNG/RGAV00/951/index.basis.source.html:483`). Nur dieses Modul.

## e) Fokus, Tastatur, Escape, Fenstergröße, Schließen

- **Fokus**: Der Host schickt `WWFOC`; die Brücke fragt
  `basisHTML_DoSetFocusToHTML()` und setzt bei `false` den Fokus selbst über
  ein unsichtbares Eingabefeld `AFELM` (`selib/basis.html.interface.js:109-132, 194-199`).
  `WWFOC` kam in keinem Echttest (`kontrakte.md` §13). Editor: ja, folgenlos.
- **Bearbeiten anmelden**: `MASKENEVENT` `KARTEIKARTEN_DEAKTIVIEREN`,
  `BEARBEITUNG_AKTIV`, zurück `BEARBEITUNG_BEENDET`,
  `KARTEIKARTEN_AKTIVIEREN ` (`selib/V2/JS/SEDataList.js:2914-2915, 3041-3042`).
  Editor: ja (`src/softengine/editing.ts`, belegt §13).
- **Escape**: Die Taste Esc schickt `HTMLEVENT { art: "ESCAPEHTML" }`, außer
  ein eigener Dialog oder eine Bearbeitung ist offen (`NotCloseOnEscape`,
  `HTMLEditor/JS/SEEvent.js:464-497`); selib `CloseHTML` tut dasselbe
  (`selib/V2/JS/SEFunctions.js:1628-1629`). Editor: teils (Schritt „Maske
  schließen“ am Knopf, belegt §13; die Taste Esc schließt die Maske nicht).
- **Esc dem Host überlassen oder nicht**: `sendBWLink("LINKID,HANDLE_ESCAPE_KEY,OFF")`,
  solange ein eigener Dialog offen ist, danach `…,ON`
  (`EinAusgangsgespraeche/Themen.html:1295, 1988`). Editor: teils (von Hand
  als BW-Befehl im Schritt).
- **Tasten** in `HTMLEditor/JS/SEEvent.js:409-512`: F6 `HTMLEVENT { art: "RELOADHTML" }`
  (Maske neu laden), F9 speichert eine offene DataList-Bearbeitung,
  Alt+1–9 `WechsleKK`, Strg+S und Strg+A abgefangen. Strg+Umschalt+Klick
  schickt `sendBWLink("HTMLEDITOR")` (`SEEvent.js:54`). selib V2 führt Tab und
  Umschalt+Tab selbst durch seine Eingaben (`selib/V2/JS/SETastaturhaendler.js:252-280`).
  F-Tasten des ERP aus der Maske: `KEY_EVENT` (a). Editor: nein.
- **Fenstergröße**: `sendBWLink("MaximizeWindow")`
  (`Stuecklisten/Strukturansicht/Ansicht/index.basis.html:385`). Startbreite
  und -höhe gibt es nur in WEBWARE (`WWREG`, `width`/`height`,
  `selib/basis.html.interface.js:178-179`). Eine Nachricht für eine bestimmte
  Größe gibt es nicht. Editor: teils (von Hand als BW-Befehl).
- **Schließen**: `ESCAPEHTML`; Rückfall `DialogAbbrechen`, dann
  `window.close()` (a). Editor: ja (`ESCAPEHTML`).
- **Im ERP springen**, alles BW-Befehle (Editor: teils, von Hand als
  BW-Befehl im Schritt):
  - Feld der ERP-Maske anspringen: `link: "sendBWLink('0,JUMPTOPOS,60')"` an
    einem angezeigten Wert (`DBKERFASSUNG/DBK30/index01.basis.html:295`),
    298 Stellen.
  - Karteikarte setzen: `sendBWLink('LINK5,SET_KARTEIKARTE,100,101000')`
    (`MIS_V3/LANDINGPAGES/ADA/HTML/01/index.basis.source.html:314`).
  - Beleg öffnen: `sendBWLink("LINKWAR,START_MIS,BEL," + Filter + ",-1,1,1")`
    (`MIS_V3/LANDINGPAGES/ART/HTML/01/index.basis.source.html:916`), in der
    alten Fassung mit `<!--SOFTENGINE-VAR!BEL_0_11-->` als Filter.

## f) Loggen

- SoftEngines Masken loggen in die Konsole des WebView, sonst nirgends.
  Die Brücke schreibt jede gesendete und empfangene Nachricht als
  `DATA SEND: …` und `DATA RECV: …`, wenn `basisHTML_SetConsoleLog(aSend=true, aRecv=true)`
  gerufen ist (`selib/basis.html.interface.js:60-64, 89, 161`). selib schaltet
  das bei jedem Start ein (`InitializeERPConnection`:
  `basisHTML_SetConsoleLog(); basisHTML_REGISTER(…)`,
  `selib/V2/JS/SEJSONProcessing.js:85-88`), ebenso die Gesprächsmasken und
  Stücklisten.
- Die einzige reine Mitteilung an den Host ist `DATRECV { INFO, LAENGE }` (a).
  Ob SoftEngine sie ins Debug-Log schreibt, zeigt keine Datei.
- Ist das Debug in SoftEngine an, liefert SoftEngine `"__DEBUG_AKTIV__": "1"`
  oben in `SEDATA` und legt die Lieferung als Datei neben die Maske:
  ausgeliefert z. B. `STDERFASSUNG/DWTO08/951/index.basis.sevariablen_DebugOut.json`
  (Stand 18.10.2022, mit `__DEBUG_AKTIV__`, `Einstellungen`, `Daten`), ähnlich
  `Buttonbar/Temp/sedata_SCBB01_1_951.js`. Aus den ausgelieferten Dateien
  geschlossen, nicht beobachtet.
- Einen Weg, auf dem eine Maske eine eigene Zeile in SoftEngines Debug-Log
  schreibt, gibt es in der Installation nicht. Editor: Konsole ja.

## g) Was sonst Arbeit spart

- **Bestellblöcke, die der Editor nicht schreibt.** In 320 SEVariablen stehen
  13 Blockarten; der Editor schreibt `VAR`, `SEFILELOOP`, `ERPAPICALL`,
  `DATASET`, `MASKE`.
  - `GET_RELATION` (1960 Einträge in 92 Masken): `{ "ID": "4625", "PARAMETER": ["POS_18_25"], "RUECKGABE_ALS_ARRAY": false }`,
    dazu `ALIAS`, `FORMAT`, `SUCHEN_UND_ERSETZEN`. Der Wert kommt mit dem
    Dokument unter `Daten.Var.<ALIAS>` (`SEDATA.Daten.Var.GetRelation_4625`,
    `Belegerfassung/INTERNEOPTIONSMASKEN/PGBED1/index.basis.source.html:140`).
  - `LANGTEXT` `{ DATEI_TYP, DATEI_ID, IDX_PRAEFIX, PK, ALIAS, TEXTFORMAT }`
    und `WINDOW_LANGTEXT`: Beleg- und Positionstexte unter `Daten.Var.<ALIAS>`
    (`Belegerfassung/LAYOUTRAHMEN/00003`, `00008`). Bisher kommt der Editor an
    keinen Langtext.
  - `ZGR` `{ BEREICH, NUMMER, ALIAS }`: ein Schalter der Installation, Antwort
    `SEDATA.Einstellungen.ZGR.<ALIAS>` = `"true"`/`"false"`
    (`Belegerfassung/LAYOUTRAHMEN/00004/Rahmen00004.basis.source.html:70`).
    Was das Kürzel heißt, steht nirgends.
  - `TABELLE` `{ ID, FELDER, ALIAS, REFRESH_FELDER, NUR_AKTUELLE_ZEILE, MIT_GESPERRTEN_SPALTEN, NUR_EINGEBUNDENE_SPALTEN }`
    mit Tabellennummern wie 931 Aufgaben bis 935 Aufgabenkategorien
    (`Bde_Desktop/Login`), unter `Daten.Tabellen`.
  - `WINDOWLOOP` mit `LOOPFUNC` (`ARTBEWEGUNGEN[N!ADA_9_25]`), `FREISELEKT`,
    `MAX_DURCHLAEUFE` und `GET_RELATION[…]` mitten in `FELDER`, unter
    `Daten.WindowLoop`. `KENNZAHL` und `BERICHT` für Kennzahlen im MIS.
- **SEFILELOOP einschränken.** Schlüssel `INDEX_NR`, `VON_INDEX`/`BIS_INDEX`
  mit `NUMFORMAT[…]`/`CONCAT[…]`, `FREISELEKT` (`BEL_3_8<99990000`),
  `SORTIERUNG: "ABSTEIGEND"`. Belege eines Kunden je Belegart über Index 8:
  `{"ID":"BEL","VON_INDEX":"CONCAT[NUMFORMAT[ADR_2_8!R0!8]!AN]","BIS_INDEX":"CONCAT[NUMFORMAT[ADR_2_8!R0!8]!AN]","INDEX_NR":"8",…}`
  (`MIS_V3/LANDINGPAGES/KDE/HTML/01`). Der Editor schreibt nur `INDEX_NR: 0`
  und `KOPFSATZ_INDEX`.
- **`EINGABE`** ist der allgemeine Name des offenen Satzes eines Fensters:
  als VAR-ID (DWZE22) und in Feldverweisen (`EINGABE_785_8`).
- **ERPAPICALL ausprobieren ohne Maske.** SoftEngine hat ein Fenster dafür,
  `Ressourcen/Standard/FensterDefinitionen/ERPAPICALLTESTEN.xml` (Knopf
  „Laden (F9)“). Es zeigt die Maske `STDERFASSUNG/PGEACT/951`, die die ganze
  Antwort als Baum ausgibt: `function Erstellen() { var DatenToShow = SEDATA.Daten.ErpApiCall;`.
  Damit lassen sich IDs und Schlüssel in SoftEngine prüfen, bevor eine Quelle
  im Editor entsteht. Wo es im Menü sitzt, steht nicht in der Datei.
- **Dateidefinitionen** beschreiben nur Zusatzdateien (`DW…`, `PG…`, `RG…`,
  267 Stück), nicht ADR, BEL, ART, POS. Feldnamen der Hauptdateien gibt es
  dort nicht; nützlich ist `DWBE01` (c).

## Die Funde, die am meisten bringen

1. **In den offenen Beleg schreiben über die ERP-Maske** (d, belegt in
   `kontrakte.md` §7a). Im Editor zu bauen: ein Schreibweg „Maskenfeld“ neben
   PUT_RELATION, der für ein Feld einer MASKE-Quelle die vier Nachrichten
   schickt, mit dem Format aus der Feldbeschreibung, Ankreuzfelder als J/N.
2. **`REFRESH_FELDER`** (c). Code-Felder bekommen ihren Klartext ohne eigene
   Relation, auch in Listen. Im Editor zu bauen: je Feld einer Quelle ein
   Schalter „Klartext mitliefern“; der Export schreibt `REFRESH_FELDER` in den
   VAR- bzw. SEFILELOOP-Eintrag (bei ERPAPICALL mit `:<ID>`), das Lesen nimmt
   `REFRESH_<Feldcode>`.
3. **Fertige Schritte für BW-Befehle und Tasten** (a, e): Beleg öffnen
   (`START_MIS,BEL,<Index>`), Feld im ERP anspringen (`JUMPTOPOS`),
   F-Taste des ERP drücken (`KEY_EVENT`). Im Editor zu bauen: drei Schrittarten
   mit je einer Wahl (Feld für den Belegindex, Position, Taste) statt eines
   frei getippten BW-Befehls.

## Offen

- Ob `DATRECV` oder die Konsole in SoftEngines Debug-Log landen.
- Was `ZGR` heißt, was Relation `1351` tut, wer `PRINTHTML` schickt, wofür
  REFRESH-ID `300500` steht.
- Freifelder: nichts gefunden.
- Das Programm `SeErpWinUi.exe` liegt nicht unter `Ressourcen/Standard` und
  ist für diese Datei nicht gelesen.
