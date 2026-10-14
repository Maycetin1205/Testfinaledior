# Entschieden

Entscheidungen mit Datum, neueste oben, je ein Eintrag. Wer wissen will,
warum etwas so ist, liest hier. Was als Nächstes kommt, steht in
`offen.md`. Ältere Geschichte: Prüfbericht vom 23.09. (in Git bis 2f50216)
und `stand.md` bis 13.10. (in Git bis b98b23e).

## Oktober 2026

- 14.10. Umrisse (Chat 1): jeder Baustein hat auf der Leinwand eine leise
  Haarlinie, unter der Maus blau (nur der innerste Baustein, nicht der
  Bereich darum), markiert wie bisher kräftig blau. Schalter „Umrisse“ in
  der Toolbar, Vorgabe an; der Browser merkt ihn unter eigenem Schlüssel,
  er bleibt beim Laden einer anderen Maske. Aus heißt wie vorher, auch
  ohne Blau unter der Maus. Grund: ein leerer Bereich „Frei“ und ein
  leerer Text waren unsichtbar. Die Maske hat keinen Umriss.
- 14.10. Echttest in V7 bestanden (Nutzer): Band, Anschrift, Beleg-Nr.,
  Summen, „Artikel der Position“ nach Auswahl aus der Liste, F4 löscht
  die richtige Zeile. A, E und K sind damit erledigt, ohne Debug.
- 14.10. Design der Maske eingefroren (Fable als Projektleitung, Nutzer
  einverstanden): die Blatt-Sprache vom 13.10., festgehalten in
  `docs/design/2026-10-14-belegerfassung.png`, `-behandlung.png`,
  `-empfang.png`. Keine neue Designsprache mehr; Änderungen nur als
  Feinschliff je Baustein mit Bild vorher/nachher und Ja des Nutzers.
  Grund: drei Designsprachen in fünf Wochen (24.09., 08.10., 13.10.).
- 14.10. Masken in `masken/` werden committet. Hebt die Regel „bleiben
  uncommittet“ auf. Grund: die Masken sind das Arbeitsergebnis; der letzte
  gesicherte Stand war vom 09.10., im Arbeitsbaum lagen 2700 geänderte
  Zeilen.
- 14.10. Ein neuer Test ist erlaubt: jede Maske aus `masken/` lädt und
  exportiert (Plan Chat 3). Hebt „keine neuen Tests“ für diesen Fall auf.
  Grund: ein Schema-Heber, der bricht, verliert Masken lautlos.
- 14.10. Reihenfolge: zuerst „Kein Durchfall“ im Editor (Umrisse,
  Rückmeldungen, Masken sichern, Aktionsfenster, Revue je Baustein), dann
  die Bestellung als vierte Maske. Export abspecken, Schriftfrage und
  Kontrakte eindampfen liegen, bis sie stören. Schrift bleibt eingebettet.
- 14.10. Neue Bausteine nur aus Bedarf einer Maske, nicht auf Vorrat;
  Ausnahme Linie (waagerecht, senkrecht), die kommt mit der Revue des
  Bereichs. Hebt „Weg: Trennlinie“ vom 23.09. auf. Grund: Gruppen trennen,
  ohne einen Bereich zu zeichnen, braucht jede Maske irgendwann.
- 14.10. Fenster und Leisten zeigen weniger auf einmal: zuerst das
  Häufige, der Rest hinter „Mehr“. Keine Funktion fällt weg, die eine
  Maske in `masken/` nutzt; ungenutzte Wahlen nur mit Ja des Nutzers.
- 14.10. Fable plant und prüft, Opus 5.5 baut (Nutzer, wegen der Token).
- 14.10. Prüfbericht für den CTO: liegt, kommt erst auf Wunsch des
  Nutzers.
- 13.10. Der Text hat keine Anzeige-Wahlen mehr (Nutzer): Einzeilig, Unten
  ausrichten, Leer zeigt Strich, Null oder weniger rot, Zahl, Summenlinie
  und Ohne Auswahl sind aus dem Code; ein Text endet nie mehr in „…“.
  Fassung 34 nimmt die Werte aus gespeicherten Masken. Ersetzt die beiden
  Einträge vom selben Tag zu diesen Wahlen weiter unten.
- 13.10. Felder tragen standardmäßig eine Linie unter dem Wert, damit man
  sieht, wo man tippt (Nutzer); Art „Ohne“ nimmt sie weg. Texte bekommen
  nie eine Linie: die Linie heißt „hier tippen“.
- 13.10. Muss ein Baustein wachsen, den der Nutzer gerade ändert, rückt
  alles von seiner Unterkante abwärts im ganzen Bereich nach unten, die
  Zeilen bleiben in Linie; der Bereich wächst mit. Beim Laden und beim
  bloßen Wählen rückt nichts.
- 13.10. Die Beschriftung des Texts ist der Name des gebundenen Felds, bis
  der Nutzer sie überschreibt; der Wert zeigt im Editor dann „–“.
- 13.10. Ein Bereich schneidet nur in der Maske ab, was über seinen Rand
  ragt; auf der Leinwand nicht, damit Markierung und Griffe eines Bausteins
  am Rand des Bereichs ganz zu sehen sind. Die Maske bleibt, wie sie war.
- 13.10. Die Erfassung schreibt jede Zeile, sobald sie erfasst ist, wie
  SoftEngines eigene Erfassung beim Verlassen der Zeile: über die Kette am
  Ereignis „Zeile erfasst“, die der Ersteller anhängt. Keine Relation fest
  im Baustein; Speichern bleibt für das, was liegen blieb.
- 13.10. Zwischen zwei Schreibvorgängen wartet die Maske, bis SoftEngine den
  Beleg neu übergeben hat, höchstens 10 s. Gilt für jede Kette.
- 13.10. Nach einer gescheiterten Zeile schreibt die Erfassung nicht von
  selbst weiter; die Zeilen dahinter warten in ihrer Reihenfolge, bis der
  Bediener korrigiert, wegnimmt oder speichert.
- 13.10. Eine Lieferung wartet nicht mehr, solange in der Tippzeile der
  Erfassung getippt wird; in anderen Feldern weiter schon.
- 13.10. Ein Klick auf eine neue Position oder in den leeren Raum unter den
  Zeilen setzt den Cursor zurück in die Tippzeile.
- 13.10. Das Suchfenster einer Erfassungsspalte ist in der Maske so groß wie
  im Editor.
- 13.10. Bausteine überlappen nie: ein Zug, eine Größe oder ein neuer
  Baustein auf belegte Zellen wird abgelehnt (Rahmen rot statt blau, der
  Baustein bleibt). Die Regel, dass eine Liste sich kürzt, wenn ein Baustein
  auf ihre untere Hälfte fällt, ist weg. Der gezogene Baustein geht mit der
  Maus, der Zielrahmen liegt über allem. Pfeiltasten verschieben den
  markierten Baustein um eine Zelle, mit Umschalt ändern sie die Größe.
- 13.10. Das Blatt ist das ganze Fenster: kein grauer Grund drumherum, keine
  Rundung, kein Schatten, keine Höchstbreite (Nutzer: die Fläche wird
  genutzt). Der Innenrand 22/26/20 px bleibt. Das Band bleibt in seinem
  Rahmen, es ragt nicht mehr bis an die Blattkanten; so deckt sich im
  Editor der Rahmen mit dem Grau.
- 13.10. Blatt-Sprache freigegeben, Vorlage ist die von Hand verfeinerte
  Belegerfassung (Desktop, Rahmen10000.basis.source.html): die Maske ist ein
  weißes Blatt (Rundung 10, weicher Schatten, Innenrand 22/26/20 px) auf
  dem grauen Fenstergrund #E7E8EB, höchstens 1680 px breit, dann mittig.
  Tinte #12161D, Königsblau #2A45C8 als Akzent (Fokus, Auswahl,
  Speichern), Rundung 6/5/10, Fokusring 1,5 px innen mit 3 px Hof, überall
  derselbe. Ersetzt Blau #2F6BFF und Grund #F4F5F7 vom 08./09.10. Der
  Editor trägt dasselbe Blatt auf der Leinwand.
- 13.10. Schriftgrößen tragen ihren Namen: die Wahl 12 ist 12 px usw. Die
  größte bleibt 26 px (die Vorlage hatte 28 unter dem Namen 26).
- 13.10. Erfassung und Tabelle sind linierte Rechnungstabellen, keine
  Karte: Kopf in Versalien 11 px über einer 1,5-px-Tintenlinie, die beim
  Rollen stehen bleibt, durchscheinende Spaltenlinien, Haarlinie unten,
  Tippzeile getönt mit Linie darüber. Ersetzt „Tabelle, Liste und Kanban
  sind auf dem Seitengrund eine Karte“ (09.10.); auch die Datenliste liegt
  flach. Keine Kästchen und kein Ring in Zellen bleibt (09.10.).
- 13.10. Eine Regel für Zeilen: Zeigen #F7F8FA, gewählt hellblau mit 3 px
  Akzentstrich links, in Tabelle, Datenliste, Erfassung und an der
  Kanban-Karte. Der Grund einer Zeile läuft als ein Band unter den
  Spaltenlinien durch.
- 13.10. Was die Vorlage von Hand setzte, sind Wahlen im Editor, ohne
  eigenes CSS in der Maske: Text-Rollen Rubrik, Kopf, Hilfe, Betrag; am
  Text Einzeilig, Unten ausrichten, Leer zeigt Strich, Null oder weniger
  rot, Summenlinie, Ohne Auswahl (Leer lassen, Hinweis zeigen, Ausblenden),
  Zahl (Wie geliefert, Betrag, Betrag mit €); Bereich in der Form Band;
  Erfassung mit Hinweis in der Tippzeile; je Spalte Zahl, Betrag und €.
- 13.10. Unten ausrichten setzt die Grundlinie eine Rasterzeile (12 px) über
  die Unterkante; Texte jeder Größe, deren Rahmen auf derselben Zeile
  enden, stehen so auf einer Linie, ohne Feinschieben von Hand.
- 13.10. Die Mitte wächst schon: jede Liste direkt auf der Seite bekommt
  Zeilen, die mit dem Fenster wachsen (pageRowsTemplate). Keine eigene Wahl.
- 13.10. Fenster und Popups tragen das Blatt: Rundung 10, Schatten der
  Fenster, Kopf wie der einer Karte (52 px, 15 px fett).
- 13.10. Pfeil runter in einer leeren Zeile der Erfassung öffnet keine
  Vorschlagsliste; so macht es SoftEngine auch (vom Nutzer dort geprüft).
  Die Liste kommt beim Tippen oder mit F5. Bleibt so.
- 13.10. Eine Spalte ist eine Zahl, wenn sie eine Summe hat oder eine
  Berechnung sie nennt, nie nach dem Aussehen des Werts (so rutschten am
  05.10. Artikelnummern nach rechts). Zahlen zeigt die Maske de-DE mit
  Tausenderpunkt; Eingabefelder und PUT bleiben roh.
- 13.10. Refactoring des Editors ausdrücklich gewollt, Reihenfolge in
  `offen.md`. Urteil: Kern, Bausteine, Datenweg, Export, Laufzeit bleiben;
  umgebaut werden Editor-Oberfläche, Rückmeldungen, Aktionsfenster, das
  doppelte Zeichnen in Erfassung und Tabelle. Kein Neuschreiben.
- 13.10. Doku aufgeteilt: `offen.md` (Plan), `entschieden.md` (dieses),
  `bedienung.md` (Anleitung), `architektur.md` (Code). `stand.md` ist weg.
  Jede Art Information hat einen Ort; was Git weiß, steht nirgends nochmal.
- 13.10. Keine Agenten-Flotten in diesem Projekt: ein Lauf mit 14 Agenten
  hat in 15 Minuten die Hälfte des Kontingents gefressen.
- 12.10. Ziel ist der Tierarzt-Prototyp aus dem Editor; die Chef-Maske ist
  kein Maßstab mehr, `docs/chef-maske` nur Quelle für Schreibwege. Es gibt
  noch keinen Tierarzt-Kunden; Fachfragen beantwortet der Chat selbst.
- 12.10. Position löschen später per F4 wie in SoftEngine, eigener Schritt.
  Kein ✕ an den Zeilen der Erfassung.
- 12.10. IDB-Inhalte: XML und DTK sind nur Struktur; Zeilen kommen über das
  Importmodul von SoftEngine (dort kamen die Warengruppen her).
- 12.10. Export nur mit dem, was auf der Leinwand liegt; Laufzeit und
  Schrift aus der SoftEngine-Installation, nichts aus dem Internet.
- 12.10. „Wie würde das aussehen“ heißt: im Editor bauen und den Editor
  zeigen. Keine handgemalten HTML-Muster, nicht das alte Drei-Spalten-Layout.
- 12.10. Die eigenen Regeln des Nutzers aus `CLAUDE.md` entfernt (4b72ed2);
  dort stehen nur Befehle, Wächter und Git.
- 10.10. Belegerfassung als handgeschriebene Maske (WINDOW_VARIABLE) fertig.
  Offen: Warten zwischen den PUTs, Summen nachladen.
- 09.10. Tempo ist erledigt, die Masken sind schnell. Keine Messungen,
  keine Zeitspur, keine Vorschläge dazu, außer der Nutzer fragt.
- 09.10. Was SoftEngines eigene Masken können und der Editor nicht, steht
  in `softengine-wiki/funktionen.md`, mit drei Vorschlägen; nichts davon
  gebaut oder per Echttest belegt.
- 09.10. Der Export schreibt ein Attribut nur, solange das „when“ seiner
  Eigenschaft gilt; keine Eigenschaft ist dort mehr mit Namen bekannt.
  Quelle und Hilfsquellen tragen das „when“ der Fähigkeit „source“, „Folgt
  der Auswahl“ die Bedingung, dass die Quelle der gewählten Zeile gesetzt
  ist; dafür kennt eine Bedingung „otherwise“.
- 09.10. Namen von Eigenschaften sind geprüft: der Compiler gegen die
  Fähigkeiten, `defineBlock` beim Start gegen alles, was eine Eigenschaft
  nennt (`core/block/propertyNames.ts`). Ein fremder Name bricht ab.
- 09.10. Schrift Manrope steckt in der Maske (zwei Schnitte 600 und 700 als
  woff2 in `mask.css`, 28 KB, Lizenz OFL in `docs/design/`); nichts wird
  nachgeladen.
- 09.10. Feld: Beschriftung klein über dem Wert, je Feld abschaltbar; ohne
  sie eine Rasterzeile niedriger (2 statt 3). Kein Kasten, keine Wahl
  Kasten/Still. Leer zeigt einen Strich. Fläche beim Zeigen deutlich, Ring
  beim Tippen kräftig.
- 09.10. Behandlung lädt nach dem Öffnen per ERPAPICALL: Adresse
  (ADRESSE.GET, Vorsatz ADR_), frühere Belege (BELEG.GET, Vorsatz BEL_),
  beide nur für den Kunden des offenen Belegs; bestellt werden nur der
  offene Beleg (VAR BEL) und seine Positionen. Nicht in SoftEngine geprüft.
- 09.10. Empfang lädt den Adressstamm nach dem Öffnen mit eigener Quelle
  `src-adressen-alle` (ADRESSE.GET ohne Einschränkung), weil die Bibliothek
  je Nummer eine Fassung hält; Terminplaner per IDBID0021.GET. Beim Laden
  einer Maske gewinnt die Bibliothek.
- 09.10. Umlaute aus SoftEngine kommen als HTML-Entity (`H&#246;lscher`,
  Echttest); `fieldRead` löst sie beim Lesen auf. Der UTF-8-Salat (`Ã˜`)
  bleibt, bis die Herkunft bekannt ist.
- 09.10. Erfassung: keine Kästchen in Zeilen, auch nicht in der Tippzeile.
  Die Zelle beim Tippen sieht aus wie jede andere, nur mit Cursor. Ein Chat
  hatte graue Kästchen gebaut; verworfen, zurückgebaut.
- 09.10. Symbole als Wahl am Baustein, im Editor gesetzt, nie fest im Code:
  „Symbol“ (Phosphor dünn) am Feld links neben Beschriftung und Wert;
  Tiersymbole ebenso, mit Datenliste und Kanban.
- 09.10. Blau ist der Akzent der Maske (Ring, Haken, gewählte Zeile) und die
  Farbe „Blau“. Petrol bleibt als Farbe wählbar.
- 09.10. Jeder Baustein, der Text zeigt, hält ihn 10 px vom Rahmen; Karten
  haben 12 px Rand; so beginnt in einer Karte alles auf der Linie ihres
  Titels (22 px).
- 09.10. Kopf und Rand einer Karte nehmen ganze Rasterzeilen (Kopf 52 px,
  unten 12 px, beim Kasten oben und unten 6 px); kein Bereich verliert
  Zeilen, keine alte Maske schneidet ab.
- 09.10. Tabelle, Liste und Kanban sind auf dem Seitengrund eine Karte mit
  Schatten, in einer Karte flach. Tabellenzeilen 40 px.
- 09.10. Knopf: Klein und Normal 28 px, Groß 44 px wie ein Feld mit
  Beschriftung.
- 09.10. Textgrößen 12, 13, 14, 15, 17, 22 und 26 px; ein Text kann mehrere
  Felder in einer Zeile zeigen.
- 09.10. Neue Designsprache in allen Bausteinen gebaut (Commits „Neue
  Designsprache (1)“ bis „(9)“), Behandlung neu gelegt wie das Muster,
  Empfang und Belegerfassung auf Schema 33.
- 08.10. Neue Designsprache für die Maske, freigegeben am Muster
  `docs/design/behandlung-modern.html`: Daten stehen als Text, kein Feld
  trägt einen dauerhaften Rahmen (Fläche beim Zeigen, Ring beim Tippen),
  weiße Karten ohne Rand auf hellem Grund, Manrope, ein Blau als Akzent,
  Tiersymbole als dünne Umrisse im getönten Kreis. Nur hell. Verworfen:
  das alte Aussehen, ein weiches Karten-Aussehen („KI“), ein dichtes
  Windows-Aussehen („Excel“). Der Editor übernimmt dieselbe Sprache.
- 08.10. Erst der Editor, dann Feintuning. Meldungen und Tests kommen vor
  der Abnahme durch die Programmierer, nicht vorher.
- 08.10. Der Rahmen ist der Baustein. Feste Höhe (Feld, Datum, Knopf) nur
  in der Breite ziehbar; Text so hoch wie sein Text; alles andere füllt
  seinen Rahmen ganz.
- 08.10. Aussehen aus drei Wahlen, einmal deklariert, an jedem Baustein
  dieselben: Farbe (Petrol, Neutral, Blau, Grün, Ocker, Rot), Art (Fläche
  voll, Fläche leicht, nur Rand, nur Schrift), Größe (Klein, Normal, Groß).
  Nur Werte aus `mask.css`, keine freien Farben.
- 08.10. Datenliste: Wahl „Auswahl“ je Liste: Eine Zeile, Mehrere (Haken)
  oder Keine. Vorgabe Eine Zeile; die gewählte Zeile ist Herkunft in den
  Aktionen wie bei der Tabelle.
- 08.10. Das Plus der Datenliste und das Auf- und Zuklappen eines Bereichs
  sind raus; Editor und Maske wären sonst verschieden. Zeigen bei Bedarf
  macht das Popup.
- 08.10. Bild kommt als Baustein mit der Technik des Kanban-Avatars, sobald
  klar ist, was SoftEngine für ein Tierfoto liefert.
- 08.10. Gestrichen: Navigation mit Ansichten, Chips aus einer zweiten
  Quelle auf der Karte, „wartet 12 min“, Suchfeld filtert das Board,
  Behandlung je Tier in der Datenliste. Die Kartei rechts braucht keinen
  Baustein: Popup oder Bereich mit „Folgt der Auswahl“.
- 08.10. Brücke Editor–Baustein und Datenweg wurden vor neuen Bausteinen
  sauber gemacht (hebt „keine Aufräum-Chats“ vom 07.10. für diesen Fall
  auf). Beides erledigt am 08.10.
- 08.10. Die Lückenliste aus dem Nachbau der Chef-Maske ist gestrichen.
- 08.10. Doppeltes Buchen während eines Schreiblaufs: kein Bau.
- 08.10. SE-Module (SETabelle, SEFeldListe) werden nicht genutzt, aber
  gelesen: kann ein Modul etwas, das wir brauchen, schicken wir dieselbe
  Nachricht.
- 08.10. Plätze im Kanban (Zimmer 1 bis 4 einer Spalte) bleiben und teilen
  sich die Höhe der Spalte; ein leeres Zimmer ist ein Zimmer.
- 08.10. Zwei Masken: Empfang bleibt Empfang. Der Arzt bekommt die
  Belegerfassung (Layoutrahmen 10000) mit Tieren, Patient, Halter,
  Impfstatus und früheren Behandlungen; geschrieben werden nur Positionen
  (PUT 82, PUT 53), Tier und Halter werden gelesen.
- 08.10. Ankreuzfeld: Haken schreibt `J`, kein Haken `N`; beide Werte je
  Feld einstellbar. Der Haken löst „Wert geändert“ aus.
- 08.10. Karte im Kanban: feste Anordnung mit vier Regeln. Titel gewinnt,
  Unterzeile gibt nach; nichts schiebt etwas anderes; jeder Text endet mit
  „…“; die Karte ist so hoch wie ihre gefüllten Zeilen. Im Editor eine
  Musterkarte je Spalte.
- 07.10. Kein Neubau. Gestrichen: Chip-Farbe folgt einem Feld, der Zähler
  in der Statuszeile.
- 07.10. Das Gerüst bleibt: Deklaration je Eigenschaft, daraus Leiste,
  Export und Laden; eine Basisklasse; Lit-Bausteine, die im Editor und in
  der Maske dasselbe sind; Raster mit 48 Spalten; ein Store; SoftEngine
  nur in `src/softengine/`.
- 07.10. Zweiter Schreibmodus für vorhandene Positionen: kein Bau, bis er
  in `kontrakte.md` steht. Quellenarten nach Inhalt: liegen lassen.
- 07.10. Erfassung: ein Kopf; je Zelle der Hauptzeile höchstens eine graue
  Unterzeile; Tab und Enter: Hauptzeile, graue Zeile, erfassen; Pfeil
  runter in die graue Zelle, Pfeil hoch zurück; Escape: Liste zu, Zelle
  leeren, in leerer Zelle Position abbrechen.
- 01.10. Lesen, Schreiben und Satznummer stehen nicht zur Wahl; ein Feld
  namens „Satznummer“ ist die Satznummer zum Schreiben.
- 01.10. Bereich: innen das Raster der Seite, kein Innenabstand, wächst
  nicht mit.
- 01.10. Schrittfenster in der Mitte; erst „Übernehmen“ schreibt in den
  Baustein.

## September 2026

- 29.09. Schreiben ins ERP: je Zeile ein PUT_RELATION.
- 24.09. Fensterbreite und -höhe nie als Zahlen, nur ziehen am Rand.
- 24.09. Klarname wird nicht getippt, er kommt aus der Quelle.
- 24.09. Tabelle hat immer einen Kopf; Zeilen ohne Kopf sind die
  Datenliste. Blättern bleibt.
- 24.09. Spaltenwahl zur Laufzeit per Rechtsklick auf den Spaltenkopf, wie
  in SoftEngine; im Editor am Spaltenkopf.
- 24.09. Ein Export-Knopf; die Rahmen-Nummer entscheidet. Keine
  Notfallkopie, keine Suche in der Palette, keine Statuszeile.
- 24.09. Die Maske trägt ihre Quellen mit; die Bibliothek ist der Katalog.
- 24.09. Kein Inspector. Leiste am Baustein für wenige Wahlen, der Rest im
  Fenster „Einstellungen“.
- 23.09. Berechnung als Satz am Spaltenkopf, kein Vollbild. Datenfenster
  nicht als Vollbild. Abgelehntes Schreiben bleibt unsichtbar.
- 23.09. ERPAPICALL als Nachricht nach dem Öffnen ist die Bauweise: schlank
  bestellen, Listen nachladen, aus ihnen schreiben.
- 23.09. Weg: Trennlinie, Karte als eigener Baustein (Teil des Kanban).
