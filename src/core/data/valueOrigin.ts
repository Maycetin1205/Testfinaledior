// Where a value comes from. One list for every place that takes a value: the
// key of a helper source, a factor of a calculation, the parameter of an action,
// the following of a selection. Each place offers the part of it it can read.
export type OriginKind = 'row' | 'helper' | 'document' | 'formField' | 'fixed'

export interface ValueOrigin {
  kind: OriginKind

  // The column or field, the form field's block, or the fixed text.
  value: string

  // The source a field belongs to: a helper source or the open document.
  sourceId?: string
}

export const ORIGIN_KINDS: Readonly<Record<OriginKind, string>> = {
  row: 'Spalte dieser Zeile',
  helper: 'Feld einer Hilfsquelle',
  document: 'Feld des offenen Belegs',
  formField: 'Formularfeld',
  fixed: 'Fester Wert',
}
