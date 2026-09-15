// Die Zeichen der Oberflaeche, unter Namen erreichbar.
import { createElement, forwardRef, type ReactElement, type SVGProps } from 'react'
import { KNOTEN, type Knoten } from './zeichenDaten'

export interface ZeichenProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
}

export type Zeichen = ReturnType<typeof zeichenFabrik>

const GRUND = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function zeichenFabrik(name: string, knoten: readonly Knoten[]) {
  const Komponente = forwardRef<SVGSVGElement, ZeichenProps>(
    ({ size = 24, strokeWidth = 2, className, ...rest }, ref): ReactElement =>
      createElement(
        'svg',
        {
          ref,
          ...GRUND,
          width: size,
          height: size,
          strokeWidth,

          className: ['lucide', `lucide-${name}`, className].filter(Boolean).join(' '),

          'aria-hidden': 'true',
          ...rest,
        },
        knoten.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: i })),
      ),
  )
  Komponente.displayName = name
  return Komponente
}

export const AlignCenter = zeichenFabrik('text-align-center', KNOTEN.AlignCenter)
export const AlignLeft = zeichenFabrik('text-align-start', KNOTEN.AlignLeft)
export const AlignRight = zeichenFabrik('text-align-end', KNOTEN.AlignRight)
export const ArrowDown = zeichenFabrik('arrow-down', KNOTEN.ArrowDown)
export const ArrowUp = zeichenFabrik('arrow-up', KNOTEN.ArrowUp)
export const Boxes = zeichenFabrik('boxes', KNOTEN.Boxes)
export const Check = zeichenFabrik('check', KNOTEN.Check)
export const ChevronDown = zeichenFabrik('chevron-down', KNOTEN.ChevronDown)
export const ChevronUp = zeichenFabrik('chevron-up', KNOTEN.ChevronUp)
export const Component = zeichenFabrik('component', KNOTEN.Component)
export const Copy = zeichenFabrik('copy', KNOTEN.Copy)
export const Database = zeichenFabrik('database', KNOTEN.Database)
export const Download = zeichenFabrik('download', KNOTEN.Download)
export const FileText = zeichenFabrik('file-text', KNOTEN.FileText)
export const FileUp = zeichenFabrik('file-up', KNOTEN.FileUp)
export const FolderOpen = zeichenFabrik('folder-open', KNOTEN.FolderOpen)
export const Link2 = zeichenFabrik('link-2', KNOTEN.Link2)
export const MoreHorizontal = zeichenFabrik('ellipsis', KNOTEN.MoreHorizontal)
export const MousePointer2 = zeichenFabrik('mouse-pointer-2', KNOTEN.MousePointer2)
export const MousePointerClick = zeichenFabrik('mouse-pointer-click', KNOTEN.MousePointerClick)
export const Minus = zeichenFabrik('minus', KNOTEN.Minus)
export const Plus = zeichenFabrik('plus', KNOTEN.Plus)
export const Redo2 = zeichenFabrik('redo-2', KNOTEN.Redo2)
export const Save = zeichenFabrik('save', KNOTEN.Save)
export const Search = zeichenFabrik('search', KNOTEN.Search)
export const Share2 = zeichenFabrik('share-2', KNOTEN.Share2)
export const SlidersHorizontal = zeichenFabrik('sliders-horizontal', KNOTEN.SlidersHorizontal)
export const Trash = zeichenFabrik('trash', KNOTEN.Trash)
export const Trash2 = zeichenFabrik('trash-2', KNOTEN.Trash2)
export const TriangleAlert = zeichenFabrik('triangle-alert', KNOTEN.TriangleAlert)
export const Undo2 = zeichenFabrik('undo-2', KNOTEN.Undo2)
export const Users = zeichenFabrik('users', KNOTEN.Users)
export const Wand2 = zeichenFabrik('wand-sparkles', KNOTEN.Wand2)
export const X = zeichenFabrik('x', KNOTEN.X)
