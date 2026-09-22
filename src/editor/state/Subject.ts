type Listener<T> = (data: T) => void

export class Subject<T = void> {
  private listeners = new Set<Listener<T>>()

  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  notify(data: T): void {
    for (const fn of [...this.listeners]) {
      try {
        fn(data)
      } catch (error) {
        console.error('Subject: ein Horcher hat beim Melden geworfen.', error)
      }
    }
  }
}
