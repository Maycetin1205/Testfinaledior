const DISPLAY_MS = 8000

let bar: HTMLElement | null = null
let hide: ReturnType<typeof setTimeout> | null = null

function buildBar(): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-ff-message', '')
  el.setAttribute('role', 'alert')
  el.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
    'padding:7px 12px',
    'background:var(--se-red-soft,#fbe7e6)',
    'color:var(--se-red,#c0201a)',
    'border-bottom:1px solid var(--se-red,#c0201a)',
    'font:500 12px/1.4 system-ui,sans-serif',
    'cursor:pointer',
  ].join(';')
  el.title = 'Klicken zum Schließen'
  el.addEventListener('click', close)
  return el
}

function close(): void {
  if (hide) { clearTimeout(hide); hide = null }
  bar?.remove()
  bar = null
}

export function reportError(text: string): void {
  if (typeof document === 'undefined' || !document.body) return
  if (!bar) {
    bar = buildBar()
    document.body.appendChild(bar)
  }
  bar.textContent = text
  if (hide) clearTimeout(hide)
  hide = setTimeout(close, DISPLAY_MS)
}
