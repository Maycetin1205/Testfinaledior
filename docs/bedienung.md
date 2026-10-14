# Bedienung

Wie der Editor bedient wird und was die Bausteine können. Stand 14.10.2026.
Was noch fehlt, steht in `offen.md`; warum etwas so ist, in
`entschieden.md`.

## Der Editor

- Oben eine Zeile: Name der Maske, Rahmen-Nummer, Neu, Speichern, Masken,
  Rückgängig, Wiederholen, Exportieren, Daten, Umrisse; rechts die
  Seitenreiter (Hauptseite, Popups).
- Umrisse: der Baustein unter der Maus zeigt eine leise blaue Linie in
  seiner echten Größe, auch wenn er leer ist; markiert ist er kräftig
  blau. Der Schalter „Umrisse“ zeigt zusätzlich alle Bausteine blass
  gestrichelt; Vorgabe aus, die Wahl bleibt auch nach dem Neuladen. In
  der Maske gibt es keine Umrisse.
- Neu: fragt nach, wenn Bausteine auf der Leinwand stehen; „Rückgängig“
  holt die Maske zurück. Eine leere Maske sagt in der Mitte, was zu tun
  ist: Baustein anklicken oder ziehen, oder eine Maske unter „Masken“.
- Masken: ein Fenster mit allen Masken des Ordners, den man einmal wählt
  (etwa `masken`), auch in Unterordnern, je Ordner eine Gruppe; je Maske
  Name, Rahmen-Nummer und Datum, die offene blau markiert. Klick öffnet
  sie. Unter „Vorlagen“ öffnet ein Klick eine Kopie ohne Namen, die beim
  ersten „Speichern“ eine eigene Datei bekommt. „Als Vorlage sichern“ legt
  die offene Maske nach `Vorlagen/`. „Datei laden“ lädt eine einzelne
  Maske von woanders. Lädt eine Datei nicht, sagt ein kleines Fenster
  warum (keine Maske, Kundendatei, zu alte oder neuere Fassung,
  beschädigt). Nach einem Neustart fragt der Browser meist einmal, ob der
  Editor den Ordner wieder benutzen darf: „Ordner freigeben“.
- Zielordner: unten im Fenster „Masken“ wählt man je Maske den Ordner, in
  den „Exportieren“ schreibt, etwa
  `VORLAGEN_INDIV\Belegerfassung\LAYOUTRAHMEN\10000` in V7. Ohne
  Zielordner wird heruntergeladen wie bisher. Die Maske merkt sich den
  Namen des Ordners; auf einem anderen Rechner wählt man ihn dort einmal
  neu.
- Links der Streifen mit den Bausteinen: anklicken oder ziehen.
- Mitte die Maske in echter Größe: ein weißes Blatt auf dem grauen Grund
  des Fensters, wie in SoftEngine.
- Daten als Fenster über der Maske, nie modal: Quellen, Relationen, Import,
  Bibliothek. Quellen als Liste, rechts Einstellungen und Felder.
- Am markierten Baustein eine Leiste direkt über der Oberkante: Symbol und
  Name, die Wahlen, rechts Löschen. Mehr steht im Fenster „Einstellungen“
  mit Gruppen (Quelle, Hilfsquelle, Anzeige, Suchfenster, Folgt der
  Auswahl, Aktionen). Jedes Fenster an der Leiste schließt beim Klick
  daneben oder mit Escape.
- Ein Weg je Ding: Was auf der Fläche steht (Beschriftung, Titel,
  Spaltenkopf, Kartenzeile, Text), wird nur dort geändert, per Doppelklick.
- Markieren durch Klick, Verschieben durch Ziehen, Größe an den Kanten am
  Raster, Löschen mit Entf, Duplizieren mit Strg+D. Ein markierter Bereich
  wird mit allem gezogen, was darin liegt, auch wenn man einen Baustein
  darin anfasst (13.10.). Beim Ziehen geht der Baustein mit der Maus, der
  Zielrahmen zeigt die Zellen: blau frei, rot belegt; auf belegten Zellen
  bleibt der Baustein, wo er war. Pfeiltasten verschieben den markierten
  Baustein um eine Zelle, Umschalt+Pfeil ändert die Größe.
- Feld binden: Klick auf die Stelle, die Feldliste der Quelle erscheint
  dort. Gebundene Stellen gepunktet unterstrichen.
- Probedaten (14.10.): gebundene Stellen zeigen einen erfundenen Wert
  („Sabine Krüger“, „Bello“), Erfassung und Tabelle Probezeilen, jede
  Kanban-Spalte eine andere Karte. Hat die Probedatei für ein Feld keinen
  Wert, steht dort sein Name. Die Zeilen lassen sich im Editor nicht
  wählen; der Export enthält keine Probedaten.
- Aktionen: je Ereignis die Schritte als Zeilen; das Schrittfenster in der
  Mitte, Reiter GET Relation, PUT Relation, Werkzeug, Popup; erst die
  Herkunft, dann das Feld; „Übernehmen“ schreibt.
- Folgt der Auswahl: in der Leiste anklicken, dann auf den Geber klicken.
- Tabelle und Erfassung: Spaltenkopf tippen, Breite am Spaltenrand,
  Reihenfolge durch Ziehen, Plus rechts neben dem letzten Kopf; Klick auf
  einen Kopf öffnet die Spaltenleiste. Erfassung dazu je Spalte: Eingabe,
  Füllfeld, Nachschlagen, Unterzeile; Berechnung am Kopf der Ergebnisspalte
  als Satz. Unter „Anzeige“ in der Spaltenleiste: Zahl (rechts, mit
  Tausenderpunkt), Betrag (zwei Stellen nach dem Komma), € (Zeichen
  dahinter).
- Kanban: Spaltentitel tippen, Plus fügt an, die erste Karte ist das
  Muster; Klick auf einen Spaltenkopf: Farbe, Wert im ERP, Auffangspalte,
  Plätze.
- Speichern (auch Strg+S): schreibt die Maske in ihre Datei im Ordner der
  Masken; eine Maske ohne Datei landet oben im Ordner unter ihrem Namen,
  nie über eine andere; beim ersten Mal wird der Ordner gewählt. Danach
  geht jede Änderung 500 ms später von selbst in die Datei und in den
  Browser; eine nur geöffnete Maske bleibt unangetastet, bis man etwas
  ändert. Der Knopf zeigt kurz „Gespeichert“. Der Port 5300 ist fest,
  weil der Browserspeicher am Origin hängt.
- Export: ein Knopf, die Rahmen-Nummer entscheidet die Dateinamen
  (`Rahmen<Nr>.basis.source.html`, `Rahmen<Nr>.basis.SEvariablen.json`).
  Mit Zielordner landen beide dort, sonst werden sie heruntergeladen; der
  Knopf zeigt kurz „Exportiert“. Besteht die fertige Maske eine Prüfung
  nicht, geht nichts hinaus, und ein kleines Fenster nennt die Prüfung.
  Hat eine Quelle ein gebundenes Feld nicht, geht die Maske hinaus, und
  das Fenster nennt Baustein, Feld und Quelle: die Stelle bleibt in der
  Maske leer. Ist der Zielordner hier nicht gewählt oder gesperrt, wird
  heruntergeladen, und das Fenster sagt es.

## Die Bausteine

Alle im Aussehen „Fachsoftware“ (14.10., `entschieden.md`): Segoe UI,
Beschriftungen normal geschrieben in der zweiten Tinte, Werte halbfett,
Linien statt Schatten. Die blaue Hausfarbe nur am Hauptknopf, an der
gewählten Zeile und am Fokusring. Zeile und Karte unter der Maus heben sich.

- Bereich: Form Frei, Kasten (hellgrau, ohne Rand), Kopfzeile (ein
  Abschnitt: Titel über einer Haarlinie, kein Kasten) oder Band (der Kopf
  des Blatts, oben über die ganze Breite, flach auf hellgrauem Grund mit
  Haarlinie darunter); Farbe, Art. Innen das Raster der Seite.
- Knopf: Farbe, Art, Größe (Klein und Normal 28 px, Groß 44 px). Der
  Hauptknopf ist „Fläche voll“ in Blau; ein Knopf zweiter Ordnung ist
  „Fläche leicht“ in Neutral: grau wie „Heute“, ohne Rand, halbfett.
- Datum: Tageswahl.
- Feld: Text, Zahl, Datum tippbar, Auswahl, Nachschlagen, Ankreuzfeld
  (Haken `J`, kein Haken `N`, je Feld einstellbar). Beschriftung als
  Rubrik über dem Wert, abschaltbar; Symbol links. Leer zeigt nur die
  Beschriftung, keinen Strich.
  Art: Linie (Standard, Haarlinie unter dem Wert, blau beim Tippen) oder
  Ohne; das Ankreuzfeld hat keine.
- Tabelle: liniert wie eine Rechnung, immer mit Kopf, der beim Rollen
  stehen bleibt; nur die Zeilen, die es gibt, darunter leeres Blatt bis zur
  Haarlinie am unteren Rand (im Editor nur Kopf und diese Linie); Blättern,
  Sortieren per Klick, Spaltenwahl per Rechtsklick auf den Kopf.
- Erfassung: ein Kopf, Hauptzeile und graue Unterzeile je Zelle; Tab und
  Enter erfassen, Pfeile wechseln Haupt- und Unterzeile, Escape bricht ab.
  Klick auf eine neue Position zeigt sie, der Cursor bleibt in der
  Tippzeile; Doppelklick korrigiert. Ereignis „Zeile erfasst“
  (Einstellungen, Aktionen): die Kette daran läuft für jede erfasste Zeile
  sofort, eine nach der anderen, z. B. PUT 82. Die Liste blättert nie; neue
  Positionen bleiben unten sichtbar. Keine
  Kästchen in Zeilen, keine leeren Zeilen: unter den Positionen die
  Tippzeile, darunter leeres Blatt. Die Tippzeile liegt auf leisem Grau; Pflichtspalten zeigen ihren
  Titel leise, die erste andere Spalte den „Hinweis in der Tippzeile“
  (Einstellungen, Anzeige). Auf der Seite wächst sie mit dem Fenster.
- Kanban: Plätze je Spalte, mehrere Felder je Platz mit Trenner, Knopf je
  Spalte (Aus, Weiter oder Aktion; grau wie „Heute“, ohne Rand, halbfett),
  Spalte nach Uhrzeit mit Stundenlinien und Jetzt-Linie. Die Karten sind
  weiß mit Haarlinie. Der Chip ist ein Wort mit Punkt; eine Karte mit Chip
  trägt links einen Streifen in seiner Farbe. Beim Ziehen hebt sich die
  Karte mit Schatten.
- Datenliste: Auswahl Eine Zeile, Mehrere oder Keine; je Zeile Tiersymbol
  oder Symbol, Titel, Unterzeile, Rechts.
- Popup: eigene Seite, geöffnet und geschlossen über Aktionen.
- Text: Rolle (Titel, Überschrift, Beschriftung, Text, Nebentext, Zahl,
  Rubrik, Kopf, Hilfe, Betrag), Farbe, Art, Größe, Symbol, ein oder mehrere
  Felder in einer Zeile; Fläche oder Rand macht ihn zum Chip. Haken
  „Beschriftung“: kleine Rubrik über dem Text, auf einer Linie mit der des
  Felds; sie trägt den Namen des gebundenen Felds, bis man sie überschreibt
  (leer gemacht, kommt der Name zurück); der Wert zeigt im Editor dann „–“.
  Wächst ein Baustein, den man gerade ändert, rücken die Bausteine darunter
  nach unten, der Bereich wächst mit. Ein Text bricht um, wenn er zu lang
  ist; Anzeige-Wahlen hat er keine.

## Die Masken

In `masken/`, im Editor unter „Masken“ (Ordner `masken` wählen); im Browser mit Beispieldaten geprüft,
nicht alle in SoftEngine.

- `empfang/Empfang.aufbau-maske.json`: Kanban mit Terminplaner (IDBID0021)
  und Adressstamm, Popups Termin, Kunde, Tier.
- `behandlung/Behandlung.aufbau-maske.json`: Layoutrahmen 10000, Tiere des
  Kunden, Patient, Halter, Impfungen, frühere Behandlungen, Erfassung;
  schreibt Positionen (PUT 82, PUT 53).
- `belegerfassung/Belegerfassung.aufbau-maske.json`: Layoutrahmen 10000
  in der Blatt-Sprache (13.10.), gebaut wie die Vorlage: Band mit Name,
  Beleg-Nr., Anschrift und Daten (Quellen Belegfenster und Adresse),
  Erfassung, die jede Zeile beim Erfassen schreibt (PUT 82 an „Zeile
  erfasst“), Artikel der Position, Zahlungsbedingung mit Speichern (PUT 82,
  für das, was liegen blieb), Summen mit Gesamtbetrag. Daneben ihr Export
  vom 14.10. (`Rahmen10000.basis.*`), in V7 bestanden.
