import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FileText, FileUp, FolderOpen, Save } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { DoneLabel } from '@/editor/widgets/DoneLabel'
import { LINE_CHOSEN, LINE_HOVER } from '@/editor/widgets/lineLook'
import { Window } from '@/editor/widgets/Window'
import { EXPORT_TARGET_PROP, exportTargetOf } from '../../core/block/exportTarget'
import { maskNameOf } from '../../core/block/maskName'
import { ROOT_ID } from '../../core/block/tree'
import { knowsExportTarget, pickExportTarget } from '../state/exportTarget'
import { canPickFolder, reasonOf } from '../state/folderOnDisk'
import { loadMaskFromFile, newMaskFrom, openMaskFile, saveAsTemplate } from '../state/maskFile'
import { TEMPLATE_FOLDER, type MaskEntry } from '../state/maskFolder'
import { useEditor } from '../state/useEditor'
import { useMaskFolder } from '../state/useMaskFolder'
import { useView } from '../state/useView'

interface Group {
  key: string
  name: string
  template: boolean
  entries: MaskEntry[]
}

// The masks in the order of the folder, one group per folder; the templates
// always at the end, also while there is none, so one sees where they go.
function groupsOf(entries: readonly MaskEntry[], folderName: string): Group[] {
  const groups = new Map<string, Group>()
  for (const e of entries) {
    let g = groups.get(e.folder)
    if (!g) {
      g = { key: e.folder, name: e.folder === '' ? folderName : e.folder, template: e.template, entries: [] }
      groups.set(e.folder, g)
    }
    g.entries.push(e)
  }
  const all = [...groups.values()]
  if (!all.some((g) => g.template)) all.push({ key: '\0templates', name: TEMPLATE_FOLDER, template: true, entries: [] })
  return all
}

const DATE = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

// A line as in the lists of the editor (List.tsx), with the frame number and
// the date in columns of their own.
const ROW = 'flex w-full items-center gap-[10px] rounded-[var(--radius-small)] px-[9px] py-[6px] text-left text-ui font-semibold transition-colors'
  + ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent'

// The masks of the one folder: a click opens one, a template opens as a new
// mask. Below, where the export of the open mask goes.
export function MasksWindow({ onClose }: { onClose: () => void }) {
  const ed = useEditor()
  const view = useView()
  const folder = useMaskFolder()
  const fileRef = useRef<HTMLInputElement>(null)
  const canPick = canPickFolder()

  // Saved since the window was last open, a date has moved.
  useEffect(() => {
    void folder.list()
  }, [folder])

  const tell = (title: string, error: unknown) => ed.showNotice({ title, lead: `${reasonOf(error)}.` })

  const open = async (entry: MaskEntry) => {
    if (entry.template && ed.blockCount > 0 && !window.confirm(
      `Neue Maske aus der Vorlage „${entry.name}“ anfangen? „${maskNameOf(ed.tree)}“ verschwindet von der Leinwand; „Rückgängig“ holt sie zurück.`,
    )) return
    const why = entry.template ? await newMaskFrom(ed, entry) : await openMaskFile(ed, entry)
    if (why === null) onClose()
    else ed.showNotice({ title: 'Maske nicht geladen', lead: `„${entry.path}“ ${why}` })
  }

  const pickFolder = async () => {
    try {
      await ed.pickMaskFolder()
    } catch (error) {
      tell('Kein Ordner gewählt', error)
    }
  }

  const grant = async () => {
    try {
      await ed.folderReady()
    } catch (error) {
      tell('Ordner nicht freigegeben', error)
    }
  }

  const current = ed.maskOnDisk.attached ? ed.maskOnDisk.path : null

  return (
    <Window
      title="Masken"
      width={760}
      height={600}
      beside={folder.state !== 'none' && (
        <span className="truncate text-muted">Ordner „{folder.name}“</span>
      )}
      buttons={(
        <>
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
                    if (why === null) onClose()
                    else ed.showNotice({ title: 'Maske nicht geladen', lead: `„${file.name}“ ${why}` })
                  })
                }
              } finally {
                e.target.value = ''
              }
            }}
          />
          {canPick && (
            <Button
              onClick={() => void saveAsTemplate(ed)}
              disabled={ed.blockCount === 0}
              title="Legt eine Kopie der offenen Maske in den Ordner „Vorlagen“"
            >
              <DoneLabel done={view.done === 'template'} icon={<Save size={14} />} label="Als Vorlage sichern" doneLabel="Als Vorlage gesichert" />
            </Button>
          )}
          <Button onClick={() => fileRef.current?.click()} title="Eine einzelne Maske laden, die nicht im Ordner liegt">
            <FileUp size={14} /> Datei laden
          </Button>
          {canPick && folder.state !== 'none' && (
            <Button onClick={() => void pickFolder()}>
              <FolderOpen size={14} /> Ordner wählen
            </Button>
          )}
        </>
      )}
      foot={canPick && <ExportTarget />}
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-[13px] py-[10px]">
        {!canPick ? (
          <Empty>
            Dieser Browser kann keinen Ordner öffnen; Edge und Chrome können es.
            Eine einzelne Maske lädt „Datei laden“ oben.
          </Empty>
        ) : folder.state === 'none' ? (
          <Empty action={<Button kind="primary" onClick={() => void pickFolder()}><FolderOpen size={14} /> Ordner wählen</Button>}>
            Die Masken liegen als Dateien in einem Ordner, etwa „masken“. Einmal gewählt, zeigt der Editor
            hier alle Masken darin, auch in Unterordnern, und „Speichern“ legt neue dort ab.
          </Empty>
        ) : folder.state === 'ask' ? (
          <Empty action={<Button kind="primary" onClick={() => void grant()}><FolderOpen size={14} /> Ordner „{folder.name}“ freigeben</Button>}>
            Nach dem Neustart fragt der Browser noch einmal, ob der Editor den Ordner „{folder.name}“
            lesen und schreiben darf.
          </Empty>
        ) : folder.failure !== null ? (
          <Empty>Der Ordner „{folder.name}“ ließ sich nicht lesen: {folder.failure}.</Empty>
        ) : (
          <>
            {folder.entries.every((e) => e.template) && (
              <p className="px-[9px] pb-[4px] pt-[10px] text-muted">
                Im Ordner „{folder.name}“ liegt noch keine Maske. „Speichern“ legt die offene Maske dort ab.
              </p>
            )}
            {groupsOf(folder.entries, folder.name).map((g) => (
              <section key={g.key} className="flex flex-col">
                <p className="flex items-center gap-[6px] px-[9px] pb-[2px] pt-[10px] text-dense font-semibold text-muted">
                  <FolderOpen size={13} aria-hidden className="shrink-0" />
                  <span className="truncate">{g.name}</span>
                  {g.template && (
                    <span className="font-normal">
                      {g.entries.length > 0
                        ? '· Klick öffnet eine Kopie ohne Namen'
                        : '· Noch keine Vorlage. „Als Vorlage sichern“ legt die offene Maske hier ab.'}
                    </span>
                  )}
                </p>
                {g.entries.map((e) => (
                  <button
                    key={e.path}
                    type="button"
                    title={e.path}
                    onClick={() => void open(e)}
                    className={cn(ROW, 'text-ink', e.path === current ? LINE_CHOSEN : LINE_HOVER)}
                  >
                    <FileText size={14} aria-hidden className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="w-[100px] shrink-0 font-normal text-muted">{e.frame !== '' && `Rahmen ${e.frame}`}</span>
                    <span className="w-[124px] shrink-0 text-right font-normal tabular-nums text-muted">{DATE.format(e.modified)}</span>
                  </button>
                ))}
              </section>
            ))}
          </>
        )}
      </div>
    </Window>
  )
}

function Empty({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[14px] px-[40px] text-center text-ink-2">
      <p className="max-w-[460px]">{children}</p>
      {action}
    </div>
  )
}

// Where the export of the open mask goes: a folder this machine knows, or
// the downloads. The mask carries the name, the machine the folder.
function ExportTarget() {
  const ed = useEditor()
  const target = exportTargetOf(ed.tree)
  const [picks, setPicks] = useState(0)
  const [checked, setChecked] = useState<{ target: string; picks: number; known: boolean } | null>(null)

  useEffect(() => {
    if (target === '') return
    let live = true
    void knowsExportTarget(target).then((known) => {
      if (live) setChecked({ target, picks, known })
    })
    return () => {
      live = false
    }
  }, [target, picks])

  const known = checked !== null && checked.target === target && checked.picks === picks ? checked.known : null

  const choose = async () => {
    let name: string | null
    try {
      name = await pickExportTarget(target)
    } catch (error) {
      ed.showNotice({ title: 'Kein Zielordner gewählt', lead: `${reasonOf(error)}.` })
      return
    }
    if (name === null) return
    ed.updateProperty(ROOT_ID, EXPORT_TARGET_PROP, name)
    setPicks((n) => n + 1)
  }

  return (
    <>
      <p className="mr-auto min-w-0 self-center truncate text-ink-2">
        <span className="text-muted">Export der offenen Maske: </span>
        {target === ''
          ? 'wird heruntergeladen.'
          : known === false
            ? `in den Ordner „${target}“, auf diesem Rechner noch nicht gewählt; bis dahin wird heruntergeladen.`
            : `in den Ordner „${target}“.`}
      </p>
      {target !== '' && (
        <Button onClick={() => ed.updateProperty(ROOT_ID, EXPORT_TARGET_PROP, '')}>Kein Zielordner</Button>
      )}
      <Button onClick={() => void choose()}>
        <FolderOpen size={14} /> Zielordner wählen
      </Button>
    </>
  )
}
