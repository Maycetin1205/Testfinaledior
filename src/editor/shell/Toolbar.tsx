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
} from '@/editor/icons/icon'
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
import { downloadFile } from '../state/downloadFile'
import { loadMaskFromFile, saveMaskAsFile } from '../state/maskFile'
import { useEditor } from '../state/useEditor'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { Popover } from '@/editor/widgets/Popover'
import { Separator } from '@/editor/widgets/Separator'
import { useInputSession } from '../inspector/controls/useInputSession'
import { BackupsWindow } from './BackupsWindow'

const MASK_NAMES = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

export function Toolbar({ onDataCenter }: { onDataCenter: () => void }) {
  const ed = useEditor()

  const nameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const frameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskName = String(ed.tree[ROOT_ID]?.values[MASK_NAME_PROP] ?? '')
  const frameRaw = String(ed.tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP] ?? '')
  const frame = frameNumberOf(ed.tree)

  const handleExport = async (names: { html: string; sevariablen: string }) => {
    // The export carries the whole mask runtime; the editor loads it on the first export only.
    const { exportMask } = await import('../../export/exportMask')
    const sources = ed.dataSources.list
    const relation = ed.relation.list
    const { html, sevariablen } = exportMask(
      ed.tree, maskNameOf(ed.tree), sources, relation,
    )
    if (failedChecks(validateMaskHtml(html)).length > 0) return

    downloadFile(names.html, html, 'text/html')
    downloadFile(names.sevariablen, sevariablen, 'application/json')
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ExtraActions
        onClearAll={() => ed.clear()}
        clearDisabled={ed.blockCount === 0}
        onSave={() => saveMaskAsFile(ed)}
        onFile={(file) => void loadMaskFromFile(ed, file)}
      />

      <Separator vertical className="mx-1" />

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
        className="w-16"
        onChange={(e) => {
          frameSession.begin()
          ed.updateProperty(ROOT_ID, DOCUMENT_FRAME_PROP, e.currentTarget.value)
        }}
        onBlur={frameSession.finish}
      />

      <Button onClick={onDataCenter}>
        <SlidersHorizontal size={14} /> Datencenter
      </Button>

      <Button
        aria-label="Als Belegerfassungs-Layoutrahmen exportieren"
        onClick={() => void handleExport(documentFileNames(frame))}
        disabled={ed.blockCount === 0 || frame === ''}
      >
        <FileText size={14} /> Beleg-Export
      </Button>

      <Button
        kind="primary"
        aria-label="Als SoftEngine-Maske exportieren"
        onClick={() => void handleExport(MASK_NAMES)}
        disabled={ed.blockCount === 0}
      >
        <Download size={14} /> Exportieren
      </Button>
    </div>
  )
}

export function HistoryButtons() {
  const ed = useEditor()
  return (
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
  )
}

function ExtraActions({
  onClearAll,
  clearDisabled,
  onSave,
  onFile,
}: {
  onClearAll: () => void
  clearDisabled: boolean
  onSave: () => void
  onFile: (file: File) => void
}) {
  const [open, setOpen] = useState(false)
  const [copiesOpen, setCopiesOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button onClick={onSave}>
        <Save size={14} /> Speichern
      </Button>
      <Button onClick={() => fileRef.current?.click()}>
        <FolderOpen size={14} /> Laden
      </Button>
      <Button
        ref={button}
        onlyIcon
        aria-label="Weitere Aktionen"
        title="Weitere Aktionen"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={15} />
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          try {
            if (file) onFile(file)
          } finally {
            e.target.value = ''
          }
        }}
      />

      {open && (
        <Popover
          name="Weitere Aktionen"
          anchor={button}
          width={200}
          onClose={() => setOpen(false)}
        >
          <div role="menu" className="flex flex-col">
            <MenuRow
              role="menuitem"
              icon={<FileUp size={14} />}
              onClick={() => {
                setOpen(false)
                setCopiesOpen(true)
              }}
            >
              Notfallkopie wiederherstellen…
            </MenuRow>
            <MenuRow
              role="menuitem"
              kind="risk"
              icon={<Trash2 size={14} />}
              disabled={clearDisabled}
              onClick={() => {
                setOpen(false)
                onClearAll()
              }}
            >
              Alle Bausteine löschen
            </MenuRow>
          </div>
        </Popover>
      )}

      {copiesOpen && <BackupsWindow onClose={() => setCopiesOpen(false)} />}
    </>
  )
}
