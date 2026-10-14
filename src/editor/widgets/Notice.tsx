import { Button } from './Button'
import { Window } from './Window'

export interface NoticeLine {
  name: string
  detail?: string
}

// What a notice says: a sentence, and below it the things it names, each
// with what is known about it.
export interface NoticeText {
  title: string
  lead: string
  lines?: readonly NoticeLine[]
}

// A short message in a small window over everything else: what went wrong
// and why, in the words of the mask maker. "OK", the cross or Escape closes it.
export function Notice({ notice, onClose }: { notice: NoticeText; onClose: () => void }) {
  return (
    <Window
      title={notice.title}
      width={460}
      level={60}
      foot={<Button kind="primary" autoFocus onClick={onClose}>OK</Button>}
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[16px] text-ui text-ink-2">
        <p>{notice.lead}</p>
        {notice.lines && notice.lines.length > 0 && (
          <ul className="mt-[10px] flex flex-col gap-[6px]">
            {notice.lines.map((line, i) => (
              <li key={i}>
                <span className="font-semibold text-ink">{line.name}</span>
                {line.detail && <span className="text-muted">: {line.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Window>
  )
}
