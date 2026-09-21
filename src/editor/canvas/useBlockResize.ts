// Das Ziehen an Breite und Hoehe eines Bausteins.
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Baustein } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { RASTER, rasterPlatzLesen, rasterMassVon } from '../../kern/maske/raster'
import { freieZeileAuf } from '../../kern/maske/rasterFlaeche'
import type { Editor } from '../zustand/Editor'
import { flaecheVon, hoeheImKasten, kapazitaetVon, zeilenKapazitaet } from './rasterFlaeche'
import { zieheGroesse } from './zieheGroesse'

export function useBlockResize(
  editor: Editor,
  blockRef: RefObject<Baustein>,
  elementRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
) {
  function startResize(
    e: ReactPointerEvent<HTMLDivElement>,
    prop: 'width' | 'height',
    min: number,
  ) {
    const host = elementRef.current
    if (!host) return
    zieheGroesse(editor, e, {
      achse: prop === 'width' ? 'x' : 'y',
      prop,
      getId: () => blockRef.current.id,
      start: host.getBoundingClientRect()[prop],
      min,
    })
  }

  function startRasterResize(e: ReactPointerEvent<HTMLDivElement>, achse: 'x' | 'y') {
    const el = rootRef.current
    if (!el) return
    const node = blockRef.current
    const pos = rasterPlatzLesen(node.werte)
    const spec = rasterMassVon(bausteinArt(node.typ))
    const rect = el.getBoundingClientRect()
    if (achse === 'x') {
      zieheGroesse(editor, e, {
        achse: 'x',
        prop: 'rasterW',
        getId: () => blockRef.current.id,
        start: pos.w,
        min: Math.max(1, spec.minBreite),
        schritt: (rect.width + RASTER.gapPx) / pos.w,

        anwenden: (id, wert) => editor.resizeNodeToCells(id, 'x', wert),
      })
    } else {
      // Der Kasten um den Baustein waechst beim Ziehen nicht mit: was unter
      // seine letzte Zeile reicht, waere weg.
      const flaeche = el.parentElement ? flaecheVon(el.parentElement) : null
      const kapazitaet = flaeche && node.elternId
        ? zeilenKapazitaet(editor.tree, node.elternId, flaeche)
        : null
      const eigene = kapazitaetVon(editor.tree, node.id)
      const inhalt = eigene === null ? 0 : freieZeileAuf(editor.tree, node.id) + pos.h - eigene
      zieheGroesse(editor, e, {
        achse: 'y',
        prop: 'rasterH',
        getId: () => blockRef.current.id,
        start: pos.h,
        min: Math.max(1, spec.minHoehe, inhalt),
        schritt: (rect.height + RASTER.gapPx) / pos.h,

        anwenden: (id, wert) => {
          editor.resizeNodeToCells(id, 'y', hoeheImKasten(kapazitaet, pos.y, wert))
        },
      })
    }
  }

  return { startResize, startRasterResize }
}
