// Woran eine Vorlage gefunden wird, wenn der Bediener sie sucht.
import { artFuer, type QuellenArtKennung } from '../../kern/daten/datenquellen'
import { quellenWorte } from './beschriftungen'

// Gesucht wird ueber alles, was der Bediener im Kopf haben koennte: den Namen,
// den Satz darunter, die Suchworte und die Kennung der Tabelle. „Kunde" findet
// so den Adressstamm, „POS" die Belegpositionen.
export function passt(kind: QuellenArtKennung, suche: string): boolean {
  const s = suche.trim().toLowerCase()
  if (s === '') return true
  const worte = quellenWorte(kind)
  const art = artFuer(kind)
  return [worte.name, worte.beschreibung, art.tabellenId, worte.kennungBeispiel, ...worte.suchworte]
    .some((wort) => wort.toLowerCase().includes(s))
}
