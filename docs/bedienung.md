# Bedienung

Wie der Editor bedient wird und was die Bausteine können. Stand 13.10.2026.
Was noch fehlt, steht in `offen.md`; warum etwas so ist, in
`entschieden.md`.

## Der Editor

- Oben eine Zeile: Name der Maske, Rahmen-Nummer, Neu, Speichern, Laden,
  Rückgängig, Wiederholen, Exportieren, Daten; rechts die Seitenreiter
  (Hauptseite, Popups).
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
  darin anfasst (13.10.).
- Feld binden: Klick auf die Stelle, die Feldliste der Quelle erscheint
  dort. Gebundene Stellen gepunktet unterstrichen.
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
- Speichern: 500 ms nach der letzten Änderung in den Browser und in die
  zwei Dateien, die einmal gewählt wurden. Der Port 5300 ist fest, weil der
  Browserspeicher am Origin hängt.
- Export: ein Knopf, die Rahmen-Nummer entscheidet die Dateinamen
  (`Rahmen<Nr>.basis.source.html`, `Rahmen<Nr>.basis.SEvariablen.json`).

## Die Bausteine

Alle in der Blatt-Sprache (13.10., `entschieden.md`):

- Bereich: Form Frei, Kasten, Kopfzeile mit Titel oder Band (der Kopf des
  Blatts, oben über die ganze Breite bis an die Kanten, grauer Grund);
  Farbe, Art. Innen das Raster der Seite.
- Knopf: Farbe, Art, Größe (Klein und Normal 28 px, Groß 44 px).
- Datum: Tageswahl.
- Feld: Text, Zahl, Datum tippbar, Auswahl, Nachschlagen, Ankreuzfeld
  (Haken `J`, kein Haken `N`, je Feld einstellbar). Beschriftung als
  Rubrik über dem Wert, abschaltbar; Symbol links. Leer zeigt einen Strich.
- Tabelle: liniert wie eine Rechnung, immer mit Kopf, der beim Rollen
  stehen bleibt; Blättern, Sortieren per Klick, Spaltenwahl per Rechtsklick
  auf den Kopf.
- Erfassung: ein Kopf, Hauptzeile und graue Unterzeile je Zelle; Tab und
  Enter erfassen, Pfeile wechseln Haupt- und Unterzeile, Escape bricht ab.
  Klick auf eine neue Position zeigt sie, Doppelklick korrigiert. Die
  Liste blättert nie; neue Positionen bleiben unten sichtbar. Keine
  Kästchen in Zeilen. Die Tippzeile ist getönt; Pflichtspalten zeigen ihren
  Titel leise, die erste andere Spalte den „Hinweis in der Tippzeile“
  (Einstellungen, Anzeige). Auf der Seite wächst sie mit dem Fenster.
- Kanban: Plätze je Spalte, mehrere Felder je Platz mit Trenner, Knopf je
  Spalte (Aus, Weiter oder Aktion), Spalte nach Uhrzeit mit Stundenlinien
  und Jetzt-Linie.
- Datenliste: Auswahl Eine Zeile, Mehrere oder Keine; je Zeile Tiersymbol
  oder Symbol, Titel, Unterzeile, Rechts.
- Popup: eigene Seite, geöffnet und geschlossen über Aktionen.
- Text: Rolle (Titel, Überschrift, Beschriftung, Text, Nebentext, Zahl,
  Rubrik, Kopf, Hilfe, Betrag), Farbe, Art, Größe, Symbol, ein oder mehrere
  Felder in einer Zeile; Fläche oder Rand macht ihn zum Chip. Unter
  Einstellungen, Anzeige: Einzeilig, Unten ausrichten, Leer zeigt Strich,
  Null oder weniger rot, Summenlinie, Zahl (Wie geliefert, Betrag, Betrag
  mit €); mit Quelle dazu „Ohne Auswahl“: Leer lassen, Hinweis zeigen (mit
  „Hinweis“) oder Ausblenden.

## Die Masken

In `masken/`, im Editor über „Laden“; im Browser mit Beispieldaten geprüft,
nicht alle in SoftEngine.

- `empfang/Empfang.aufbau-maske.json`: Kanban mit Terminplaner (IDBID0021)
  und Adressstamm, Popups Termin, Kunde, Tier.
- `behandlung/Behandlung.aufbau-maske.json`: Layoutrahmen 10000, Tiere des
  Kunden, Patient, Halter, Impfungen, frühere Behandlungen, Erfassung;
  schreibt Positionen (PUT 82, PUT 53).
- `belegerfassung/Belegerfassung.aufbau-maske.json`: Layoutrahmen 10000
  in der Blatt-Sprache (13.10.), gebaut wie die Vorlage: Band mit Name,
  Beleg-Nr., Anschrift und Daten (Quellen Belegfenster und Adresse),
  Erfassung, Artikel der Position, Zahlungsbedingung mit Speichern (PUT 82),
  Summen mit Gesamtbetrag. Daneben noch der alte handgeschriebene Export
  vom 06.10. (`Rahmen10000.basis.*`).
