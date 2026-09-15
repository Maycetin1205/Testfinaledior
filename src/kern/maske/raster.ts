// Das Raster der Maskenflaeche: Spalten, Zeilen und der Platz eines Bausteins darin.
import { stilAlsCss } from './stilCss'

export const RASTER = { spalten: 48, spaltePx: 20, zeilePx: 12, gapPx: 4 } as const

export interface RasterPlatz {
  x: number
  y: number
  w: number
  h: number
}

export interface RasterMass {
  startBreite: number
  startHoehe: number
  minBreite: number
  minHoehe: number
  breiteZiehbar: boolean
}

const RASTER_FALLBACK: RasterMass = {
  startBreite: 12,
  startHoehe: 3,
  minBreite: 2,
  minHoehe: 1,
  breiteZiehbar: true,
}

export const RASTER_VORGABEN: Record<string, unknown> = {
  rasterX: 0,
  rasterY: 0,
  rasterW: RASTER.spalten,
  rasterH: 1,
}

function parseRasterCell(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return fallback
}

export function rasterPlatzLesen(props: Record<string, unknown>): RasterPlatz {
  return {
    x: parseRasterCell(props.rasterX, 0),
    y: parseRasterCell(props.rasterY, 0),
    w: Math.max(1, parseRasterCell(props.rasterW, RASTER.spalten)),
    h: Math.max(1, parseRasterCell(props.rasterH, 1)),
  }
}

export function rasterMassVon(
  def: { raster?: Partial<RasterMass> } | undefined,
): RasterMass {
  return { ...RASTER_FALLBACK, ...(def?.raster ?? {}) }
}

export function rasterFlaecheStil(): Record<string, string | number> {
  return {
    display: 'grid',

    gridTemplateColumns: `repeat(${RASTER.spalten}, 1fr)`,

    gridAutoRows: `${RASTER.zeilePx}px`,
    gap: `${RASTER.gapPx}px`,

    alignContent: 'start',
  }
}

export function rasterFlaecheCss(): string {
  return stilAlsCss(rasterFlaecheStil())
}

export function rasterPlatzStil(pos: RasterPlatz): Record<string, string | number> {
  return {
    gridColumn: `${pos.x + 1} / span ${pos.w}`,
    gridRow: `${pos.y + 1} / span ${pos.h}`,
    minWidth: 0,
    minHeight: 0,
  }
}

export function naechsteFreieZeile(positionen: readonly RasterPlatz[]): number {
  return positionen.reduce((max, p) => Math.max(max, p.y + p.h), 0)
}
