import { Subject } from './Subject'

export type MessageKind = 'error' | 'hint'

export interface Message {
  id: number
  text: string
  kind: MessageKind
}

const AT_MOST = 5

class MessageList extends Subject<MessageList> {
  private _list: Message[] = []
  private _version = 0
  private nextId = 1

  get list(): readonly Message[] { return this._list }
  get version(): number { return this._version }

  override notify(data: MessageList): void {
    this._version++
    super.notify(data)
  }

  report(text: string, kind: MessageKind = 'error'): void {
    this._list = [...this._list, { id: this.nextId++, text, kind }].slice(-AT_MOST)
    this.notify(this)
  }

  close(id: number): void {
    const rest = this._list.filter((m) => m.id !== id)
    if (rest.length === this._list.length) return
    this._list = rest
    this.notify(this)
  }

  empty(): void {
    if (this._list.length === 0) return
    this._list = []
    this.notify(this)
  }
}

export const messages = new MessageList()
