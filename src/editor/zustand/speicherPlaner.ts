// Wann der Editor den Stand von selbst sichert.
export class SpeicherPlaner {
  private readonly schreibe: () => void
  private readonly verzoegerungMs: number
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(schreibe: () => void, verzoegerungMs: number) {
    this.schreibe = schreibe
    this.verzoegerungMs = verzoegerungMs
  }

  plane(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.schreibe()
    }, this.verzoegerungMs)
  }

  sofort(): void {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
    this.schreibe()
  }
}
