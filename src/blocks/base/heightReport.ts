import type { ReactiveController, ReactiveControllerHost } from 'lit'

// In the editor a block as high as its content, like a text, reports that
// height: after each drawing and whenever the content changes size, like a
// text that wraps anew after its width was pulled. The editor sets the rows
// of the block from it and measures nothing itself. The event stays at the
// element.
export const HEIGHT_REPORTED = 'ff-height-reported'

export interface HeightReported {
  // In pixels, the content alone, without the frame.
  height: number
}

interface HeightHost extends ReactiveControllerHost, HTMLElement {
  readonly preview: boolean
}

class HeightReport implements ReactiveController {
  private readonly host: HeightHost

  // The element that holds the content; it is as high as the content, the
  // host is as high as the frame.
  private readonly content: () => HTMLElement | null

  private resized: ResizeObserver | null = null
  private watched: HTMLElement | null = null

  constructor(host: HeightHost, content: () => HTMLElement | null) {
    this.host = host
    this.content = content
    host.addController(this)
  }

  hostUpdated(): void {
    if (!this.host.preview) return
    const el = this.content()
    if (!el) return
    if (el !== this.watched) {
      this.resized?.disconnect()
      this.resized = new ResizeObserver(() => this.report(el))
      this.resized.observe(el)
      this.watched = el
    }
    this.report(el)
  }

  hostDisconnected(): void {
    this.resized?.disconnect()
    this.resized = null
    this.watched = null
  }

  private report(el: HTMLElement): void {
    const height = el.getBoundingClientRect().height
    this.host.dispatchEvent(new CustomEvent<HeightReported>(HEIGHT_REPORTED, { detail: { height } }))
  }
}

export function reportsHeight(host: HeightHost, content: () => HTMLElement | null): void {
  new HeightReport(host, content)
}
