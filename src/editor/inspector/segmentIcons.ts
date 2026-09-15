// Die Zeichen der Zungenreihen im Inspector.
import { createElement, type ReactElement } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  type Zeichen,
  type ZeichenProps,
} from '@/editor/zeichen/zeichen'

const ICONS: Record<string, Zeichen> = {
  links: AlignLeft,
  mitte: AlignCenter,
  rechts: AlignRight,
}

export function segmentIcon(value: string, props?: ZeichenProps): ReactElement | undefined {
  const icon = ICONS[value]
  return icon ? createElement(icon, props) : undefined
}
