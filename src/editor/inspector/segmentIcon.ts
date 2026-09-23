import { createElement, type ReactElement } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  type Icon,
  type IconProps,
} from '@/editor/icons/icon'

const ICONS: Record<string, Icon> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
}

export function segmentIcon(value: string, props?: IconProps): ReactElement | undefined {
  const icon = ICONS[value]
  return icon ? createElement(icon, props) : undefined
}
