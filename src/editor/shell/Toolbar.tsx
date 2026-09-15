// Die Werkzeugleiste des Editors: Maskenname, Seiten, Datencenter, Export.
import {
  Download,
  FileText,
  FileUp,
  FolderOpen,
  MoreHorizontal,
  Redo2,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from '@/editor/zeichen/zeichen'
import { useRef, useState } from 'react'
import {
  BELEG_RAHMEN_PROP,
  RAHMEN_STELLEN,
  belegDateinamen,
  rahmenNummerVon,
} from '../../kern/maske/belegRahmen'
import { WURZEL_ID } from '../../kern/maske/baum'
import { MASKEN_NAME_PROP, MASKEN_NAME_STANDARD, maskenNameVon } from '../../kern/maske/maskenName'
import { exportMask } from '../../export/exportMask'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { downloadFile } from '../zustand/dateiDownload'
import { ladeMaskeAusDatei, speichereMaskeAlsDatei } from '../zustand/maskenDatei'
import { meldungen } from '../zustand/meldungen'
import { stelleLetzteKopieWiederHer } from '../zustand/persistence'
import { useEditor } from '../zustand/useEditor'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { MenueZeile } from '@/editor/werkbank/MenueZeile'
import { Popover } from '@/editor/werkbank/Popover'
import { Trenner } from '@/editor/werkbank/Trenner'
import { useEingabeSitzung } from '../inspector/controls/eingabeSitzung'

const MASKEN_NAMEN = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

const RAHMEN_TITEL = 'Nummer des Layoutrahmens — nur für den Beleg-Export.'
  + ' Leer heißt: diese Maske ist kein Belegrahmen.'

const RAHMEN_FEHLT = 'Beleg-Export — braucht die Nummer des Layoutrahmens im Feld davor'

function belegTitel(nummer: string): string {
  const namen = belegDateinamen(nummer)
  return `Beleg-Export — ${namen.html} und ${namen.sevariablen}`
}

export function Toolbar({ onDatencenter }: { onDatencenter: () => void }) {
  const ed = useEditor()

  // Der Maskenname wird wie jede Eigenschaft im Baum gefuehrt; eine Tipp-Sitzung
  // ist EIN Undo-Schritt.
  const nameSitzung = useEingabeSitzung(() => ed.beginTransaction(), () => ed.endTransaction())
  const rahmenSitzung = useEingabeSitzung(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskenName = String(ed.tree[WURZEL_ID]?.werte[MASKEN_NAME_PROP] ?? '')
  const rahmenRoh = String(ed.tree[WURZEL_ID]?.werte[BELEG_RAHMEN_PROP] ?? '')
  const rahmen = rahmenNummerVon(ed.tree)

  // Dieselbe Maske, nur unter anderem Dateinamen: ein Layoutrahmen der
  // Belegerfassung heisst Rahmen<Nummer>, jede andere Maske index.
  const handleExport = (namen: { html: string; sevariablen: string }) => {
    const sources = ed.datenquellen.list
    const relations = ed.relationen.list
    const { html, sevariablen } = exportMask(
      ed.tree, maskenNameVon(ed.tree), sources, relations,
    )
    const failed = failedChecks(validateMaskHtml(html))
    if (failed.length > 0) {
      meldungen.melde(
        'Export abgebrochen — die Datei hätte in SoftEngine nicht geladen:\n\n'
        + failed.map((f) => `• ${f.name}: ${f.detail}`).join('\n'),
      )
      return
    }

    downloadFile(namen.html, html, 'text/html')
    downloadFile(namen.sevariablen, sevariablen, 'application/json')
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <WeitereAktionen
        onClearAll={() => ed.clear()}
        clearDisabled={ed.blockCount === 0}
        onSpeichern={() => speichereMaskeAlsDatei(ed)}
        onDatei={(datei) => void ladeMaskeAusDatei(ed, datei)}
        onNotfallkopie={() => stelleLetzteKopieWiederHer(ed)}
      />

      <Trenner senkrecht className="mx-1" />

      <Feld
        value={maskenName}
        placeholder={MASKEN_NAME_STANDARD}
        aria-label="Name der Maske"
        title="Name der Maske — wird der Titel der exportierten Maske und ihr Anmeldename in SoftEngine"
        className="w-40"
        onChange={(e) => {
          nameSitzung.beginnen()
          ed.updateProperty(WURZEL_ID, MASKEN_NAME_PROP, e.currentTarget.value)
        }}
        onBlur={nameSitzung.beenden}
      />

      <Feld
        value={rahmenRoh}
        placeholder="Nr."
        inputMode="numeric"
        maxLength={RAHMEN_STELLEN}
        aria-label="Nummer des Belegerfassungs-Layoutrahmens"
        title={RAHMEN_TITEL}
        className="w-16"
        onChange={(e) => {
          rahmenSitzung.beginnen()
          ed.updateProperty(WURZEL_ID, BELEG_RAHMEN_PROP, e.currentTarget.value)
        }}
        onBlur={rahmenSitzung.beenden}
      />

      <Knopf
        onClick={onDatencenter}
        title="Datencenter — Datenquellen und Relationen der Maske"
      >
        <SlidersHorizontal size={14} /> Datencenter
      </Knopf>

      <Knopf
        aria-label="Als Belegerfassungs-Layoutrahmen exportieren"
        title={rahmen === '' ? RAHMEN_FEHLT : belegTitel(rahmen)}
        onClick={() => handleExport(belegDateinamen(rahmen))}
        disabled={ed.blockCount === 0 || rahmen === ''}
      >
        <FileText size={14} /> Beleg-Export
      </Knopf>

      <Knopf
        art="primaer"
        aria-label="Als SoftEngine-Maske exportieren"
        title="Export — Maskendatei und SEvariablen, beide in denselben Ordner"
        onClick={() => handleExport(MASKEN_NAMEN)}
        disabled={ed.blockCount === 0}
      >
        <Download size={14} /> Exportieren
      </Knopf>
    </div>
  )
}

export function VerlaufKnoepfe() {
  const ed = useEditor()
  return (
    <div className="flex items-center">
      <Knopf
        nurZeichen
        aria-label="Rückgängig (Ctrl+Z)"
        title="Rückgängig"
        onClick={() => ed.undo()}
        disabled={!ed.canUndo}
      >
        <Undo2 size={15} />
      </Knopf>
      <Knopf
        nurZeichen
        aria-label="Wiederholen (Ctrl+Shift+Z)"
        title="Wiederholen"
        onClick={() => ed.redo()}
        disabled={!ed.canRedo}
      >
        <Redo2 size={15} />
      </Knopf>
    </div>
  )
}

// Speichern, Laden und Leeren fragen nicht nach: Strg+Z nimmt jedes davon
// zurueck, auch eine geladene Maskendatei.
function WeitereAktionen({
  onClearAll,
  clearDisabled,
  onSpeichern,
  onDatei,
  onNotfallkopie,
}: {
  onClearAll: () => void
  clearDisabled: boolean
  onSpeichern: () => void
  onDatei: (datei: File) => void
  onNotfallkopie: () => void
}) {
  const [offen, setOffen] = useState(false)
  const knopf = useRef<HTMLButtonElement>(null)
  const dateiRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Knopf onClick={onSpeichern} title="Maskendatei speichern (Strg+S)">
        <Save size={14} /> Speichern
      </Knopf>
      <Knopf onClick={() => dateiRef.current?.click()} title="Gespeicherte Maske laden">
        <FolderOpen size={14} /> Laden
      </Knopf>
      <Knopf
        ref={knopf}
        nurZeichen
        aria-label="Weitere Aktionen"
        title="Weitere Aktionen"
        aria-haspopup="menu"
        aria-expanded={offen}
        onClick={() => setOffen((v) => !v)}
      >
        <MoreHorizontal size={15} />
      </Knopf>

      <input
        ref={dateiRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const datei = e.target.files?.[0]
          try {
            if (datei) onDatei(datei)
          } finally {
            e.target.value = ''
          }
        }}
      />

      {offen && (
        <Popover
          bezeichnung="Weitere Aktionen"
          anker={knopf}
          breite={200}
          onClose={() => setOffen(false)}
        >
          <div role="menu" className="flex flex-col">
            <MenueZeile
              role="menuitem"
              zeichen={<FileUp size={14} />}
              onClick={() => {
                setOffen(false)
                onNotfallkopie()
              }}
            >
              Notfallkopie wiederherstellen
            </MenueZeile>
            <MenueZeile
              role="menuitem"
              art="gefahr"
              zeichen={<Trash2 size={14} />}
              disabled={clearDisabled}
              onClick={() => {
                setOffen(false)
                onClearAll()
              }}
            >
              Alle Bausteine löschen
            </MenueZeile>
          </div>
        </Popover>
      )}
    </>
  )
}
