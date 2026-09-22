export class SavePlanner {
  private readonly write: () => void
  private readonly delayMs: number
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(write: () => void, delayMs: number) {
    this.write = write
    this.delayMs = delayMs
  }

  plan(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.write()
    }, this.delayMs)
  }

  now(): void {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
    this.write()
  }
}
