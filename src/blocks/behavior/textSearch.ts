import { html, type TemplateResult } from 'lit'

export function plainText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function wordsOf(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
}

export function rowFits(row: readonly string[], searchText: string): boolean {
  const words = wordsOf(searchText)
  if (words.length === 0) return true

  const rowText = plainText(row.join(' '))
  return words.every((word) => rowText.includes(plainText(word)))
}

const SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

export function markHit(text: string, searchText: string): TemplateResult | string {
  const words = wordsOf(searchText)
  if (words.length === 0 || text === '') return text

  let template: RegExp
  try {
    template = new RegExp(`(${words.map((w) => w.replace(SPECIAL_CHARS, '\\$&')).join('|')})`, 'ig')
  } catch {
    return text
  }

  const parts = text.split(template)
  if (parts.length <= 1) return text
  return html`${parts.map((part, i) => (i % 2 === 1 ? html`<mark>${part}</mark>` : part))}`
}
