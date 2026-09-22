import { X } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Button } from '@/editor/widgets/PushButton'
import { useMessages } from '../state/useMessages'

export function Messages() {
  const spot = useMessages()
  const list = spot.list
  if (list.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-8 right-3 z-50 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2">
      {list.length > 1 && (
        <div className="pointer-events-auto flex justify-end">
          <Button onClick={() => spot.empty()}>Alle schließen</Button>
        </div>
      )}
      {list.map((m) => (
        <div
          key={m.id}
          role="alert"
          className={cn(
            'pointer-events-auto flex items-start gap-1 rounded border border-linie border-l-2',
            'bg-panel p-2 pl-3 shadow-overlay',
            m.kind === 'error' ? 'border-l-fehler' : 'border-l-akzent',
          )}
        >
          <p className="min-w-0 flex-1 whitespace-pre-line text-ui leading-relaxed text-tinte">
            {m.text}
          </p>
          <Button
            onlyIcon
            aria-label="Meldung schließen"
            title="Schließen"
            onClick={() => spot.close(m.id)}
          >
            <X size={13} />
          </Button>
        </div>
      ))}
    </div>
  )
}
