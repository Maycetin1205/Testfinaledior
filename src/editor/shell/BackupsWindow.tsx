import { useState } from 'react'
import { Dialog } from '@/editor/widgets/Dialog'
import { Button } from '@/editor/widgets/PushButton'
import { List } from '@/editor/widgets/List'
import { contentText, copiesToChoice, spotCopyAgainFrom, timeText } from '../state/backupPick'
import { useEditor } from '../state/useEditor'

export function BackupsWindow({ onClose }: { onClose: () => void }) {
  const ed = useEditor()

  const [copies] = useState(copiesToChoice)
  const [chosen, setChosen] = useState('')

  return (
    <Dialog
      title="Notfallkopie wiederherstellen"
      besideTitle={copies.length === 0 ? undefined : `${copies.length} im Browser-Speicher`}
      narrow
      foot={(
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button
            kind="primary"
            disabled={chosen === ''}
            onClick={() => {
              spotCopyAgainFrom(ed, chosen)
              onClose()
            }}
          >
            Wiederherstellen
          </Button>
        </>
      )}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <div className="max-h-[50vh] overflow-y-auto">
          <List
            groups={[{
              key: 'copies',
              entries: copies.map((copy) => ({
                value: copy.key,
                name: contentText(copy),
                key: timeText(copy),
                disabled: !copy.readable,
              })),
            }]}
            value={chosen}
            onChoose={setChosen}
          />
        </div>
      </div>
    </Dialog>
  )
}
