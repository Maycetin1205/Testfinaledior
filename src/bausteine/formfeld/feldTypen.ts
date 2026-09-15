// Die Typen eines Formularfelds und der Platzhalter zu jedem.
const FELD_TYPEN = ['text', 'number', 'textarea', 'select', 'date', 'time', 'checkbox', 'nachschlagen'] as const
export type FeldTyp = (typeof FELD_TYPEN)[number]

export function coerceFeldTyp(v: unknown): FeldTyp {
  return FELD_TYPEN.includes(v as FeldTyp) ? (v as FeldTyp) : 'text'
}

export const MIT_PLATZHALTER: readonly FeldTyp[] = [
  'text', 'number', 'textarea', 'select', 'nachschlagen', 'date', 'time',
]

export const PH_KLASSE: Partial<Record<FeldTyp, string>> = {
  select: 'ph-select',
  date: 'ph-nativ',
  time: 'ph-nativ',
  nachschlagen: 'ph-nachschlag',
}
