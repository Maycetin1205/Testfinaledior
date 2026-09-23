export function startRename(
  target: HTMLElement,
  adopt: (text: string, original: string) => boolean,
): void {
  const original = target.textContent ?? ''

  const originalNode = Array.from(target.childNodes)
  const originalTexts = originalNode.map((n) => n.textContent ?? '')
  target.setAttribute('contenteditable', 'plaintext-only')
  target.focus()
  const selection = window.getSelection()
  const area = document.createRange()
  area.selectNodeContents(target)
  selection?.removeAllRanges()
  selection?.addRange(area)

  const restore = (): void => {
    target.replaceChildren(...originalNode)
    originalNode.forEach((n, i) => {
      if (n.textContent !== originalTexts[i]) n.textContent = originalTexts[i]
    })
  }

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
    target.removeEventListener('blur', onBlur)
    target.removeEventListener('keydown', onKey)
    const adopted = commit && adopt((target.textContent ?? '').trim(), original)
    if (!adopted) restore()
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
