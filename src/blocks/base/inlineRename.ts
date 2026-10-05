export function startRename(
  target: HTMLElement,
  adopt: (text: string, original: string) => void,
): void {
  const original = target.textContent ?? ''

  // The browser types into a copy. The element's own nodes wait aside as lit
  // left them and come back afterwards, so lit writes the adopted text into
  // them; typed into directly, lit loses track of them and a text shows twice
  // or not at all.
  const own = Array.from(target.childNodes)
  target.replaceChildren(...own.map((n) => n.cloneNode(true)))
  target.setAttribute('contenteditable', 'plaintext-only')
  // Typed in place, the text looks as before, only with the cursor: no frame
  // of the browser around it.
  const outline = target.style.outline
  target.style.outline = 'none'
  target.focus()
  const selection = window.getSelection()
  const area = document.createRange()
  area.selectNodeContents(target)
  selection?.removeAllRanges()
  selection?.addRange(area)

  const restore = (): void => target.replaceChildren(...own)

  const inButton = target.closest('button') !== null

  const typeSpace = (): void => {
    const root = target.getRootNode() as Node & { getSelection?: () => Selection | null }
    const marker = root.getSelection?.() ?? window.getSelection()
    const spot = marker?.rangeCount ? marker.getRangeAt(0) : null
    if (!marker || !spot || !target.contains(spot.startContainer)) return
    if (!spot.collapsed) spot.deleteContents()
    const node = spot.startContainer
    if (node instanceof Text) {
      const offset = spot.startOffset
      node.insertData(offset, ' ')
      marker.collapse(node, offset + 1)
    } else {
      const space = document.createTextNode(' ')
      spot.insertNode(space)
      marker.collapse(space, 1)
    }
  }

  let done = false
  const finish = (commit: boolean): void => {
    if (done) return
    done = true
    target.removeAttribute('contenteditable')
    target.style.outline = outline
    target.removeEventListener('blur', onBlur)
    target.removeEventListener('keydown', onKey)
    if (commit) adopt((target.textContent ?? '').trim(), original)
    restore()
  }
  const onBlur = (): void => finish(true)
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      target.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
    } else if (e.key === ' ' && inButton) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return

      e.preventDefault()
      typeSpace()
    }
  }
  target.addEventListener('blur', onBlur)
  target.addEventListener('keydown', onKey)
}
