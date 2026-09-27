import { Database, Download, FilePlus, FolderOpen, Redo2, Save, Undo2 } from '@/editor/icons/icon'
import { useRef } from 'react'
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
import { Separator } from '@/editor/widgets/Separator'
import { useInputSession } from '../controls/useInputSession'

const MASK_NAMES = {
  html: 'index.basis.source.html',
  sevariablen: 'index.basis.SEvariablen.json',
}

export function Toolbar({ dataOpen, onData }: { dataOpen: boolean; onData: () => void }) {
  const ed = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)

  const nameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const frameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskName = String(ed.tree[ROOT_ID]?.values[MASK_NAME_PROP] ?? '')
  const frameRaw = String(ed.tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP] ?? '')
  const frame = frameNumberOf(ed.tree)

  // With a frame number the mask leaves as a Belegerfassungs-Layoutrahmen.
  const handleExport = async () => {
    // The export carries the whole mask runtime; the editor loads it on the first export only.
    const { exportMask } = await import('../../export/exportMask')
    const { html, sevariablen } = exportMask(
      ed.tree, maskNameOf(ed.tree), ed.dataSources.list, ed.relation.list,
    )
    if (failedChecks(validateMaskHtml(html)).length > 0) return

    const names = frame === '' ? MASK_NAMES : documentFileNames(frame)
    downloadFile(names.html, html, 'text/html')
    downloadFile(names.sevariablen, sevariablen, 'application/json')
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
        className="w-16"
        onChange={(e) => {
          frameSession.begin()
          ed.updateProperty(ROOT_ID, DOCUMENT_FRAME_PROP, e.currentTarget.value)
        }}
        onBlur={frameSession.finish}
      />

      <Separator vertical className="mx-1" />

      <Button onClick={() => ed.newMask()}>
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
            if (file) void loadMaskFromFile(ed, file)
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
        className={dataOpen ? 'border-accent bg-accent-soft' : undefined}
        onClick={onData}
      >
        <Database size={14} /> Daten
      </Button>
    </div>
  )
}
