import { nothing, type TemplateResult } from 'lit'
import { choiceProperty, type Property } from '../../core/block/property'
import { icon, ICON_PATHS, type IconName } from '../parts/icons'
import type { LookInit } from './look'

// The small symbol a block shows beside its text, chosen in the editor like
// the color: declared once here, the same at every block that takes it.
const SYMBOLS: readonly { value: string; name: string; icon?: IconName }[] = [
  { value: '', name: 'Kein' },
  { value: 'phone', name: 'Telefon', icon: 'phone' },
  { value: 'mobile', name: 'Mobil', icon: 'mobile' },
  { value: 'mail', name: 'E-Mail', icon: 'mail' },
  { value: 'place', name: 'Ort', icon: 'place' },
  { value: 'home', name: 'Adresse', icon: 'home' },
  { value: 'person', name: 'Person', icon: 'person' },
  { value: 'calendar', name: 'Datum', icon: 'calendar' },
  { value: 'clock', name: 'Uhrzeit', icon: 'clock' },
  { value: 'note', name: 'Notiz', icon: 'note' },
  { value: 'warning', name: 'Warnung', icon: 'warning' },
  { value: 'info', name: 'Hinweis', icon: 'info' },
  { value: 'paw', name: 'Tier', icon: 'paw' },
  { value: 'syringe', name: 'Impfung', icon: 'syringe' },
  { value: 'pill', name: 'Medikament', icon: 'pill' },
  { value: 'scales', name: 'Gewicht', icon: 'scales' },
  { value: 'barcode', name: 'Chip', icon: 'barcode' },
  { value: 'card', name: 'Ausweis', icon: 'card' },
  { value: 'euro', name: 'Betrag', icon: 'euro' },
  { value: 'hash', name: 'Nummer', icon: 'hash' },
  { value: 'tag', name: 'Kennzeichen', icon: 'tag' },
  { value: 'firstAid', name: 'Behandlung', icon: 'firstAid' },
  { value: 'stethoscope', name: 'Arzt', icon: 'stethoscope' },
]

export function symbolProperty(init: LookInit = {}): Property<string> {
  const options = SYMBOLS.map((s) => (s.icon ? { value: s.value, name: s.name, icon: ICON_PATHS[s.icon] } : { value: s.value, name: s.name }))
  return choiceProperty(options, { default: '', label: 'Symbol', attribute: 'symbol', ...init })
}

// The outline of a chosen symbol, nothing without one.
export function symbolTpl(value: string): TemplateResult | typeof nothing {
  const name = SYMBOLS.find((s) => s.value === value)?.icon
  return name ? icon(name) : nothing
}
