import { Database, Download, FilePlus, FolderOpen, Redo2, Save, SquareDashed, Undo2 } from '@/editor/icons/icon'
import {
  DOCUMENT_FRAME_PROP,
  FRAME_SPOTS,
  documentFileNames,
  frameNumberOf,
} from '../../core/block/documentFrame'
import { exportTargetOf } from '../../core/block/exportTarget'
import { ROOT_ID } from '../../core/block/tree'
import { MASK_NAME_PROP, MASK_NAME_DEFAULT, maskNameOf } from '../../core/block/maskName'
import { failedChecks, validateMaskHtml } from '../../export/validator'
import { lostBindings } from '../../export/lostBindings'
import { downloadFile } from '../state/downloadFile'
import { exportFolder, writeExport } from '../state/exportTarget'
import { canPickFolder } from '../state/folderOnDisk'
import { saveMask } from '../state/maskFile'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { Field } from '@/editor/widgets/Field'
import { Button, PRESSED } from '@/editor/widgets/Button'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { Notice } from '@/editor/widgets/Notice'
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
  const masksOpen = view.masksWindow
  const outlines = view.outlines

  const nameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const frameSession = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  const maskName = String(ed.tree[ROOT_ID]?.values[MASK_NAME_PROP] ?? '')
  const frameRaw = String(ed.tree[ROOT_ID]?.values[DOCUMENT_FRAME_PROP] ?? '')
  const frame = frameNumberOf(ed.tree)
  const target = canPickFolder() ? exportTargetOf(ed.tree) : ''

  // With a frame number the mask leaves as a Belegerfassungs-Layoutrahmen.
  // Nothing leaves when a check fails; the notice names the check. With a
  // target folder known here, both files go into it, else they are
  // downloaded; one notice says what went wrong or stays empty.
  const handleExport = async () => {
    // Asked first, while the click still counts as the builder's: only then
    // may the browser ask again for a folder kept from an earlier start.
    const folder = target === '' ? null : await exportFolder(target)
    let exported: { html: string; sevariablen: string }
    try {
      // The export carries all parts of the mask runtime; the editor loads it on the first export only.
      const { exportMask } = await import('../../export/exportMask')
      exported = exportMask(ed.tree, maskNameOf(ed.tree), ed.dataSources.list, ed.relation.list)
    } catch (error) {
      ed.showNotice({
        title: 'Export abgebrochen',
        lead: 'Nichts exportiert. Beim Bauen der Maske ging etwas schief:',
        lines: [{ name: error instanceof Error ? error.message : String(error) }],
      })
      return
    }
    const { html, sevariablen } = exported
    const failed = failedChecks(validateMaskHtml(html))
    if (failed.length > 0) {
      ed.showNotice({
        title: 'Export abgebrochen',
        lead: failed.length === 1
          ? 'Nichts exportiert. Diese Prüfung der fertigen Maske ist nicht bestanden:'
          : 'Nichts exportiert. Diese Prüfungen der fertigen Maske sind nicht bestanden:',
        lines: failed.map((c) => ({ name: c.name, detail: c.detail })),
      })
      return
    }

    const names = frame === '' ? MASK_NAMES : documentFileNames(frame)
    const why = folder === null
      ? null
      : folder.ok
        ? await writeExport(folder.folder, [{ name: names.html, text: html }, { name: names.sevariablen, text: sevariablen }])
        : folder.why
    const written = folder !== null && why === null
    if (!written) {
      downloadFile(names.html, html, 'text/html')
      downloadFile(names.sevariablen, sevariablen, 'application/json')
    }

    const lost = lostBindings(ed.tree, ed.dataSources.list)
    const gaps = lost.length === 0 ? '' : lost.length === 1
      ? ' Diese Stelle bleibt in der Maske leer, weil ihre Quelle das Feld nicht hat:'
      : ' Diese Stellen bleiben in der Maske leer, weil ihre Quelle das Feld nicht hat:'
    const lines = lost.map((l) => ({
      name: l.blockName,
      detail: l.sourceName === '' ? `Feld ${l.code}, ohne Quelle` : `Feld ${l.code} fehlt in „${l.sourceName}“`,
    }))
    if (why !== null) {
      ed.showNotice({
        title: 'Heruntergeladen statt in den Zielordner',
        lead: `Der Zielordner „${target}“ ${why} Die Maske ist darum heruntergeladen.${gaps}`,
        lines,
      })
      return
    }
    if (lost.length > 0) {
      ed.showNotice({
        title: 'Exportiert, mit Lücken',
        lead: (written ? `Die Maske liegt im Ordner „${target}“.` : 'Die Maske ist heruntergeladen.') + gaps,
        lines,
      })
      return
    }
    ed.markDone('exported')
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
      <Button onClick={() => void saveMask(ed)} title="In die Datei der Maske im Ordner der Masken (Strg+S)">
        <DoneLabel done={view.done === 'saved'} icon={<Save size={14} />} label="Speichern" doneLabel="Gespeichert" />
      </Button>
      <Button
        aria-pressed={masksOpen}
        className={masksOpen ? PRESSED : undefined}
        title="Alle Masken des Ordners, Vorlagen und der Zielordner des Exports"
        onClick={() => ed.showMasks(!masksOpen)}
      >
        <FolderOpen size={14} /> Masken
      </Button>

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
        title={target === '' ? 'Lädt die Maske herunter' : `Schreibt die Maske in den Ordner „${target}“`}
      >
        <DoneLabel done={view.done === 'exported'} icon={<Download size={14} />} label="Exportieren" doneLabel="Exportiert" />
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

      {view.notice && <Notice notice={view.notice} onClose={() => ed.showNotice(null)} />}
    </div>
  )
}
