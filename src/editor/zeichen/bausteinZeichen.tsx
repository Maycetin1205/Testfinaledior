// Die Zeichen der Bausteine fuer Palette und Inspector.
import type { ReactElement } from 'react'

const ESPRESSO = '#3d2b22'
const ESPRESSO_ZART = '#a99a8d'
const PAPIER = '#fffdf8'
const SAND = '#f3eada'
const KORALLE = '#e85c3f'
const KORALLE_ZART = '#fbe5dc'

interface Props {
  size?: number | string
  className?: string
}

const U = { stroke: ESPRESSO, strokeWidth: 1.8, fill: 'none', strokeLinejoin: 'round' } as const

function rahmen(kinder: ReactElement[], { size = 16, className }: Props): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {kinder}
    </svg>
  )
}



export function ZeichenTrenner(p: Props): ReactElement {
  return rahmen([
    <line key="linie" x1="3" y1="12" x2="21" y2="12" {...U} />,
    <path key="abstand" d="M8 6h8M8 18h8" stroke={ESPRESSO_ZART} strokeWidth="1" />,
  ], p)
}

export function ZeichenPopup(p: Props): ReactElement {
  return rahmen([
    <rect key="h" x="2.6" y="4.6" width="13" height="11" rx="2" fill={SAND} stroke="none" />,
    <rect key="g" x="7" y="8" width="14.4" height="11.4" rx="2" {...U} fill={PAPIER} />,
    <rect key="k" x="7" y="8" width="14.4" height="3.6" rx="2" fill={KORALLE_ZART} stroke="none" />,
    <rect key="u" x="7" y="8" width="14.4" height="11.4" rx="2" {...U} />,
    <path key="t" d="M7 11.6 h14.4" {...U} />,
    <rect key="x" x="17.9" y="9.1" width="1.8" height="1.8" fill={KORALLE} stroke="none" />,
  ], p)
}

export function ZeichenBereich(p: Props): ReactElement {
  return rahmen([
    <rect key="f" x="2.6" y="4.4" width="18.8" height="15.2" rx="2" fill={PAPIER} stroke="none" />,
    <rect key="k" x="2.6" y="4.4" width="18.8" height="4.2" rx="2" fill={KORALLE_ZART} stroke="none" />,
    <rect key="u" x="2.6" y="4.4" width="18.8" height="15.2" rx="2" {...U} />,
    <path key="t" d="M2.6 8.6 h18.8" {...U} />,
    <rect key="i1" x="5.2" y="11" width="5.8" height="5.4" rx="1" fill={SAND} stroke="none" />,
    <rect key="i2" x="13" y="11" width="5.8" height="5.4" rx="1" fill={SAND} stroke="none" />,
  ], p)
}

export function ZeichenFormularfeld(p: Props): ReactElement {
  return rahmen([
    <rect key="g" x="2.4" y="7.4" width="19.2" height="9.2" rx="2" {...U} fill={PAPIER} />,
    <line key="c" x1="6.6" y1="10" x2="6.6" y2="14" stroke={KORALLE} strokeWidth="2" />,
    <line key="t" x1="9.6" y1="12" x2="18" y2="12" stroke={ESPRESSO_ZART} strokeWidth="1.8" />,
  ], p)
}

export function ZeichenSchaltflaeche(p: Props): ReactElement {
  return rahmen([
    <rect key="g" x="3" y="8" width="18" height="8.4" rx="2.6" {...U} fill={KORALLE_ZART} />,
    <line key="t" x1="8.6" y1="12.2" x2="15.4" y2="12.2" stroke={ESPRESSO} strokeWidth="2.2" />,
    <rect key="p" x="5.2" y="10.9" width="2.6" height="2.6" fill={KORALLE} stroke="none" />,
  ], p)
}

export function ZeichenDatum(p: Props): ReactElement {
  return rahmen([
    <rect key="g" x="3.4" y="5.4" width="17.2" height="15" rx="2" {...U} fill={PAPIER} />,
    <rect key="k" x="3.4" y="5.4" width="17.2" height="4.2" fill={KORALLE_ZART} stroke="none" />,
    <rect key="u" x="3.4" y="5.4" width="17.2" height="15" rx="2" {...U} />,
    <line key="t" x1="3.4" y1="9.6" x2="20.6" y2="9.6" {...U} />,
    <line key="b1" x1="8" y1="3" x2="8" y2="7" {...U} />,
    <line key="b2" x1="16" y1="3" x2="16" y2="7" {...U} />,
    <rect key="p" x="14.2" y="13.2" width="3.4" height="3.4" fill={KORALLE} stroke="none" />,
  ], p)
}

export function ZeichenText(p: Props): ReactElement {
  return rahmen([
    <rect key="k" x="4" y="5.8" width="12.4" height="3" rx="1" fill={KORALLE} stroke="none" />,
    <line key="z1" x1="4" y1="12.6" x2="20" y2="12.6" stroke={ESPRESSO} strokeWidth="2" />,
    <line key="z2" x1="4" y1="17" x2="15" y2="17" stroke={ESPRESSO} strokeWidth="2" />,
  ], p)
}

export function ZeichenTabelle(p: Props): ReactElement {
  return rahmen([
    <rect key="g" x="3" y="4.8" width="18" height="15" rx="2" {...U} fill={PAPIER} />,
    <rect key="k" x="3" y="4.8" width="18" height="4" fill={KORALLE_ZART} stroke="none" />,
    <rect key="u" x="3" y="4.8" width="18" height="15" rx="2" {...U} />,
    <line key="h1" x1="3" y1="8.8" x2="21" y2="8.8" {...U} />,
    <line key="h2" x1="3" y1="14.2" x2="21" y2="14.2" {...U} />,
    <line key="v1" x1="9.6" y1="4.8" x2="9.6" y2="19.8" {...U} />,
    <line key="v2" x1="15.4" y1="4.8" x2="15.4" y2="19.8" {...U} />,
    <rect key="p" x="5.2" y="15.9" width="2.4" height="2.4" fill={KORALLE} stroke="none" />,
  ], p)
}

export function ZeichenKanban(p: Props): ReactElement {
  return rahmen([
    <rect key="s1" x="2.8" y="4.6" width="5.6" height="15" rx="1.6" {...U} fill={PAPIER} />,
    <rect key="s2" x="9.2" y="4.6" width="5.6" height="11" rx="1.6" {...U} fill={PAPIER} />,
    <rect key="s3" x="15.6" y="4.6" width="5.6" height="13" rx="1.6" {...U} fill={PAPIER} />,
    <rect key="k1" x="4" y="6.4" width="3.2" height="3" fill={KORALLE_ZART} stroke="none" />,
    <rect key="k2" x="4" y="10.6" width="3.2" height="3" fill={KORALLE_ZART} stroke="none" />,
    <rect key="k3" x="10.4" y="6.4" width="3.2" height="3" fill={KORALLE} stroke="none" />,
    <rect key="k4" x="16.8" y="6.4" width="3.2" height="3" fill={KORALLE_ZART} stroke="none" />,
  ], p)
}

export function ZeichenKanbanSpalte(p: Props): ReactElement {
  return rahmen([
    <rect key="s" x="7.5" y="3.6" width="9" height="16.8" rx="1.6" {...U} fill={PAPIER} />,
    <rect key="k1" x="9.4" y="5.8" width="5.2" height="3.2" fill={KORALLE} stroke="none" />,
    <rect key="k2" x="9.4" y="10.4" width="5.2" height="3.2" fill={KORALLE_ZART} stroke="none" />,
    <rect key="k3" x="9.4" y="15" width="5.2" height="3.2" fill={KORALLE_ZART} stroke="none" />,
  ], p)
}

export function ZeichenKarte(p: Props): ReactElement {
  return rahmen([
    <path key="l" d="M5 7.6 v-2 a1.6 1.6 0 0 1 1.6 -1.6 h4 a1.6 1.6 0 0 1 1.6 1.6 v2" {...U} fill={KORALLE_ZART} />,
    <rect key="g" x="3.2" y="7.6" width="17.6" height="12.6" rx="2" {...U} fill={PAPIER} />,
    <line key="f" x1="3.2" y1="15.8" x2="20.8" y2="15.8" stroke={ESPRESSO_ZART} strokeWidth="1.4" />,
    <rect key="p" x="5.4" y="17" width="2.4" height="2.4" fill={KORALLE} stroke="none" />,
    <line key="t" x1="6" y1="11.4" x2="17" y2="11.4" stroke={ESPRESSO} strokeWidth="2" />,
  ], p)
}
