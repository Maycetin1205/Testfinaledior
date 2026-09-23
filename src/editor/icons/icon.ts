import { createElement, forwardRef, type ReactElement, type SVGProps } from 'react'
import { NODE, type Node } from './iconData'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
}

export type Icon = ReturnType<typeof iconFactory>

const BASE = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function iconFactory(name: string, node: readonly Node[]) {
  const Component = forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, strokeWidth = 2, className, ...rest }, ref): ReactElement =>
      createElement(
        'svg',
        {
          ref,
          ...BASE,
          width: size,
          height: size,
          strokeWidth,

          className: ['lucide', `lucide-${name}`, className].filter(Boolean).join(' '),

          'aria-hidden': 'true',
          ...rest,
        },
        node.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: i })),
      ),
  )
  Component.displayName = name
  return Component
}

export const AlignCenter = iconFactory('text-align-center', NODE.AlignCenter)
export const AlignLeft = iconFactory('text-align-start', NODE.AlignLeft)
export const AlignRight = iconFactory('text-align-end', NODE.AlignRight)
export const ArrowDown = iconFactory('arrow-down', NODE.ArrowDown)
export const ArrowUp = iconFactory('arrow-up', NODE.ArrowUp)
export const Boxes = iconFactory('boxes', NODE.Boxes)
export const Check = iconFactory('check', NODE.Check)
export const ChevronDown = iconFactory('chevron-down', NODE.ChevronDown)
export const Component = iconFactory('component', NODE.Component)
export const Copy = iconFactory('copy', NODE.Copy)
export const Database = iconFactory('database', NODE.Database)
export const Download = iconFactory('download', NODE.Download)
export const FileText = iconFactory('file-text', NODE.FileText)
export const FileUp = iconFactory('file-up', NODE.FileUp)
export const FolderOpen = iconFactory('folder-open', NODE.FolderOpen)
export const Link2 = iconFactory('link-2', NODE.Link2)
export const MoreHorizontal = iconFactory('ellipsis', NODE.MoreHorizontal)
export const Minus = iconFactory('minus', NODE.Minus)
export const Plus = iconFactory('plus', NODE.Plus)
export const Redo2 = iconFactory('redo-2', NODE.Redo2)
export const Save = iconFactory('save', NODE.Save)
export const Search = iconFactory('search', NODE.Search)
export const Share2 = iconFactory('share-2', NODE.Share2)
export const SlidersHorizontal = iconFactory('sliders-horizontal', NODE.SlidersHorizontal)
export const Trash = iconFactory('trash', NODE.Trash)
export const Trash2 = iconFactory('trash-2', NODE.Trash2)
export const TriangleAlert = iconFactory('triangle-alert', NODE.TriangleAlert)
export const Undo2 = iconFactory('undo-2', NODE.Undo2)
export const Users = iconFactory('users', NODE.Users)
export const X = iconFactory('x', NODE.X)
