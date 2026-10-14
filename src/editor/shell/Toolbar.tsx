import { Database, Download, FilePlus, FolderOpen, Redo2, Save, SquareDashed, Undo2 } from '@/editor/icons/icon'
import { useRef, useState } from 'react'
import {
  DOCUMENT_FRAME_PROP,
  FRAME_SPOTS,
  documentFileNames,
  frameNumberOf,
} from '../../core/block/documentFrame'
import { ROOT_ID } from '../../core/block/tree'
import { MASK_NAME_PROP, MASK_NAME_DEFAULT, maskNameOf } from '../../core/block/maskName'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { lostBindings } from '../../export/lostBindings'
import { downloadFile } from '../state/downloadFile'
import { loadMaskFromFile, saveMaskAsFile } from '../state/maskFile'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { Field } from '@/editor/widgets/Field'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { Notice, type NoticeText } from '@/editor/widgets/Notice'
import { Separator } from '@/editor/widgets/Separator'
import { useInputSession } from '../controls/useInputSession'

const MASK_NAMES = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

export function Toolbar() {
  const ed = useEditor()
  const view = useView()
  const dataOpen = view.dataWindow
  const outlines = view.outlines
  const fileRef = useRef<HTMLInputElement>(null)
  // What the last export or load has to say, until it is read.
  const [notice, setNotice] = useState<NoticeText | null>(null)

  const nameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const frameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskName = String(ed.tree[ROOT_ID]?.values[MASK_NAME_PROP] ?? '')
  const frameRaw = String(ed.tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP] ?? '')
  const frame = frameNumberOf(ed.tree)

  // With a frame number the mask leaves as a Belegerfassungs-Layoutrahmen.
  // Nothing leaves when a check fails; the notice names the check.
  const handleExport = async () => {
    let exported: { html: string; sevariablen: string }
    try {
      // The export carries the whole mask runtime; the editor loads it on the first export only.
      const { exportMask } = await import('../../export/exportMask')
      exported = exportMask(ed.tree, maskNameOf(ed.tree), ed.dataSources.list, ed.relation.list)
    } catch (error) {
      setNotice({
        title: 'Export abgebrochen',
        lead: 'Nichts heruntergeladen. Beim Bauen der Maske ging etwas schief:',
        lines: [{ name: error instanceof Error ? error.message : String(error) }],
      })
      return
    }
    const { html, sevariablen } = exported
    const failed = failedChecks(validateMaskHtml(html))
    if (failed.length > 0) {
      setNotice({
        title: 'Export abgebrochen',
        lead: failed.length === 1
          ? 'Nichts heruntergeladen. Diese Prüfung der fertigen Maske ist nicht bestanden:'
          : 'Nichts heruntergeladen. Diese Prüfungen der fertigen Maske sind nicht bestanden:',
        lines: failed.map((c) => ({ name: c.name, detail: c.detail })),
      })
      return
    }

    const names = frame === '' ? MASK_NAMES : documentFileNames(frame)
    downloadFile(names.html, html, 'text/html')
    downloadFile(names.sevariablen, sevariablen, 'application/json')

    const lost = lostBindings(ed.tree, ed.dataSources.list)
    if (lost.length > 0) {
      setNotice({
        title: 'Exportiert, mit Lücken',
        lead: lost.length === 1
          ? 'Die Maske ist heruntergeladen. Diese Stelle bleibt in der Maske leer, weil ihre Quelle das Feld nicht hat:'
          : 'Die Maske ist heruntergeladen. Diese Stellen bleiben in der Maske leer, weil ihre Quelle das Feld nicht hat:',
        lines: lost.map((l) => ({
          name: l.blockName,
          detail: l.sourceName === '' ? `Feld ${l.code}, ohne Quelle` : `Feld ${l.code} fehlt in „${l.sourceName}“`,
        })),
      })
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-[8px]">
      <Field
        value={maskName}
        placeholder={MASK_NAME_DEFAULT}
        aria-label="Name der Maske"
        className="w-40"
        onChange={(e) => {
          nameSession.begin()
          ed.updateProperty(ROOT_ID, MASK_NAME_PROP, e.currentTarget.value)
        }}
        onBlur={nameSession.finish}
      />

      <Field
        value={frameRaw}
        placeholder="Nr."
        inputMode="numeric"
        maxLength={FRAME_SPOTS}
        aria-label="Nummer des Belegerfassungs-Layoutrahmens"
        className="w-[68px]"
        onChange={(e) => {
          frameSession.begin()
          ed.updateProperty(ROOT_ID, DOCUMENT_FRAME_PROP, e.currentTarget.value)
        }}
        onBlur={frameSession.finish}
      />

      <Separator vertical className="mx-1" />

      <Button
        onClick={() => {
          // Only a mask with blocks asks; Rückgängig brings it back.
          if (ed.blockCount === 0 || window.confirm(
            `Neue Maske anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
          )) ed.newMask()
        }}
      >
        <FilePlus size={14} /> Neu
      </Button>
      <Button onClick={() => saveMaskAsFile(ed)}>
        <Save size={14} /> Speichern
      </Button>
      <Button onClick={() => fileRef.current?.click()}>
        <FolderOpen size={14} /> Laden
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          try {
            if (file) {
              void loadMaskFromFile(ed, file).then((why) => {
                if (why !== null) setNotice({ title: 'Maske nicht geladen', lead: `„${file.name}“ ${why}` })
              })
            }
          } finally {
            e.target.value = ''
          }
        }}
      />

      <div className="flex items-center">
        <Button
          onlyIcon
          aria-label="Rückgängig (Ctrl+Z)"
          title="Rückgängig"
          onClick={() => ed.undo()}
          disabled={!ed.canUndo}
        >
          <Undo2 size={15} />
        </Button>
        <Button
          onlyIcon
          aria-label="Wiederholen (Ctrl+Shift+Z)"
          title="Wiederholen"
          onClick={() => ed.redo()}
          disabled={!ed.canRedo}
        >
          <Redo2 size={15} />
        </Button>
      </div>

      <Separator vertical className="mx-1" />

      <Button
        kind="primary"
        onClick={() => void handleExport()}
        disabled={ed.blockCount === 0}
      >
        <Download size={14} /> Exportieren
      </Button>
      <Button
        aria-pressed={dataOpen}
        className={dataOpen ? PRESSED : undefined}
        onClick={() => ed.showData(!dataOpen)}
      >
        <Database size={14} /> Daten
      </Button>
      <Button
        aria-pressed={outlines}
        className={outlines ? PRESSED : undefined}
        title="Umriss um jeden Baustein, nur im Editor"
        onClick={() => ed.showOutlines(!outlines)}
      >
        <SquareDashed size={14} /> Umrisse
      </Button>

      {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}
    </div>
  )
}
