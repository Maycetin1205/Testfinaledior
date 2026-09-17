// Ein Baustein auf der Leinwand samt seinen Kindern.
import { Fragment, type DragEvent } from 'react'
import type { Baustein } from '../../kern/maske/baum'
import { darfEnthalten, bausteinArt } from '../../kern/maske/registry'
import {
  flussHoeheStil,
  flussBreiteStil,
  flussHoeheLesen,
  flussBreiteLesen,
  richtungDerKinder,
  type Richtung,
} from '../../kern/maske/fluss'
import { rasterPlatzLesen, rasterPlatzStil } from '../../kern/maske/raster'
import { useEditor } from '../zustand/useEditor'
import { BlockHost } from './BlockHost'
import { isNewBlockDrag, newBlockDragType } from './dnd'
import { commitDrop, useDnd } from './dndState'
import { cn } from '@/editor/werkbank/cn'
import { ziehePosition } from './rasterMove'

const CONTAINER_EDGE = 12

function InsertionLine({ direction }: { direction: Richtung }) {
  return (
    <div
      data-ff-editor-helper
      className={cn(
        'self-stretch rounded-[2px] bg-[hsl(var(--wb-auswahl))]',
        direction === 'column' ? 'h-[2px]' : 'min-h-6 w-[2px]',
      )}
    />
  )
}

export function NodeList(
  { parentId, direction, raster = false, vorlage }:
  { parentId: string; direction: Richtung; raster?: boolean; vorlage?: Baustein },
) {
  const ed = useEditor()
  const dnd = useDnd()

  const alle = ed.childNodesOf(parentId)
  // Die Vorlage einer Tafel haengt im Baum an der Tafel, damit eine geloeschte
  // Spalte sie nicht mitnimmt. Gezeigt wird sie dort, wo zur Laufzeit die
  // Karten liegen: so tief im ersten Kind, wie es Kinder aufnimmt.
  const muster = bausteinArt(ed.getNode(parentId)?.typ ?? '')?.musterKind
  const eigene = muster ? alle.find((n) => n.typ === muster.typ) : undefined
  const nodes = eigene ? alle.filter((n) => n.id !== eigene.id) : alle
  const weiter = vorlage ?? eigene

  const lineAt = (i: number) =>
    !raster
    && dnd.dropTarget?.kind === 'flow'
    && dnd.dropTarget.parentId === parentId
    && dnd.dropTarget.index === i

  const vorlageHier = weiter !== undefined && nodes.length === 0 ? weiter : undefined
  const vorlageWeiter = weiter !== undefined && nodes.length > 0 ? weiter : undefined

  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={node.id}>
          {lineAt(i) && <InsertionLine direction={direction} />}
          <CanvasNode
            node={node}
            index={i}
            parentId={parentId}
            listDirection={direction}
            raster={raster}
            vorlage={i === 0 ? vorlageWeiter : undefined}
          />
        </Fragment>
      ))}
      {lineAt(nodes.length) && <InsertionLine direction={direction} />}
      {vorlageHier && <VorlageKnoten vorlage={vorlageHier} rueckfallEltern={parentId} direction={direction} />}
    </>
  )
}

// Die Vorlage wird als gewoehnlicher Knoten gezeichnet, aber mit IHRER Stelle
// im Baum: Auswaehlen, Binden und Loeschschutz haengen daran.
function VorlageKnoten(
  { vorlage, rueckfallEltern, direction }:
  { vorlage: Baustein; rueckfallEltern: string; direction: Richtung },
) {
  const ed = useEditor()
  const elternId = vorlage.elternId ?? rueckfallEltern
  const index = ed.childNodesOf(elternId).findIndex((n) => n.id === vorlage.id)
  return (
    <CanvasNode
      node={vorlage}
      index={Math.max(0, index)}
      parentId={elternId}
      listDirection={direction}
    />
  )
}

interface CanvasNodeProps {
  node: Baustein
  index: number
  parentId: string
  listDirection: Richtung

  raster?: boolean

  // Die Vorlage der Tafel, die hier oder tiefer im ersten Kind zu zeichnen ist.
  vorlage?: Baustein
}

function CanvasNode({ node, index, parentId, listDirection, raster = false, vorlage }: CanvasNodeProps) {
  const ed = useEditor()
  const dnd = useDnd()
  const def = bausteinArt(node.typ)
  const isContainer = def?.nimmtKinder ?? false
  const childDirection = richtungDerKinder(def, node.werte)

  const invalidTarget = (targetParentId: string) =>
    dnd.dragId !== null && ed.isInSubtree(dnd.dragId, targetParentId)

  const onDragStart = (e: DragEvent) => {
    e.stopPropagation()
    dnd.setDragId(node.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }

  const onDragOver = (e: DragEvent) => {
    if (dnd.dragId === null && !isNewBlockDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    if (dnd.dragId === node.id) return dnd.setDropTarget(null)
    const rect = e.currentTarget.getBoundingClientRect()

    const draggedType = dnd.dragId !== null
      ? ed.getNode(dnd.dragId)?.typ ?? null
      : newBlockDragType(e.dataTransfer)

    const allowedIn = (containerType: string) =>
      draggedType !== null && darfEnthalten(containerType, draggedType)
    const parentType = ed.getNode(parentId)?.typ ?? ''

    if (isContainer && !invalidTarget(node.id) && allowedIn(node.typ)) {
      const before = listDirection === 'row'
        ? e.clientX < rect.left + CONTAINER_EDGE
        : e.clientY < rect.top + CONTAINER_EDGE
      const after = listDirection === 'row'
        ? e.clientX > rect.right - CONTAINER_EDGE
        : e.clientY > rect.bottom - CONTAINER_EDGE
      if (!before && !after) {
        dnd.setDropTarget({ kind: 'flow', parentId: node.id, index: ed.childNodesOf(node.id).length })
        return
      }
      if (invalidTarget(parentId) || !allowedIn(parentType)) return dnd.setDropTarget(null)
      dnd.setDropTarget({ kind: 'flow', parentId, index: before ? index : index + 1 })
      return
    }

    if (invalidTarget(parentId) || !allowedIn(parentType)) return dnd.setDropTarget(null)
    const after = listDirection === 'row'
      ? e.clientX > rect.left + rect.width / 2
      : e.clientY > rect.top + rect.height / 2
    dnd.setDropTarget({ kind: 'flow', parentId, index: after ? index + 1 : index })
  }

  const inhalt = (
    <BlockHost
      block={node}
      selected={ed.selectedId === node.id}
      onSelect={() => ed.waehleGetroffenen(node.id)}
      raster={raster}
    >
      {isContainer && <NodeList parentId={node.id} direction={childDirection} vorlage={vorlage} />}
    </BlockHost>
  )

  if (raster) {
    return (
      <div
        onPointerDown={(e) => ziehePosition(ed, dnd, e, node, parentId)}
        style={{
          opacity: dnd.dragId === node.id ? 0.4 : 1,
          ...rasterPlatzStil(rasterPlatzLesen(node.werte)),
        }}
      >
        {inhalt}
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        commitDrop(e, ed, dnd)
      }}
      onDragEnd={dnd.reset}
      style={{
        opacity: dnd.dragId === node.id ? 0.4 : 1,
        ...flussBreiteStil(flussBreiteLesen(node.werte.width), listDirection, def?.festeBreite),
        ...flussHoeheStil(flussHoeheLesen(node.werte.height), listDirection),
      }}
    >
      {inhalt}
    </div>
  )
}
