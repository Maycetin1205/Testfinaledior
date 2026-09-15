import { describe, expect, it } from 'vitest'
import { WURZEL_ID, type Maskenbaum } from './baum'
import { BELEG_RAHMEN_PROP, belegDateinamen, rahmenNummer, rahmenNummerVon } from './belegRahmen'

describe('rahmenNummer', () => {
  it('fuellt auf fuenf Stellen auf, wie die Ordner der Auslieferung', () => {
    expect(rahmenNummer('1')).toBe('00001')
    expect(rahmenNummer('00001')).toBe('00001')
    expect(rahmenNummer(23)).toBe('00023')
  })

  it('nimmt nichts an, was kein Rahmenordner sein kann', () => {
    expect(rahmenNummer('')).toBe('')
    expect(rahmenNummer('  ')).toBe('')
    expect(rahmenNummer('0')).toBe('')
    expect(rahmenNummer('000000')).toBe('')
    expect(rahmenNummer('12a')).toBe('')
    expect(rahmenNummer('-1')).toBe('')
    expect(rahmenNummer(undefined)).toBe('')
  })
})

describe('belegDateinamen', () => {
  it('nennt beide Dateien, wie SoftEngine sie im Rahmenordner erwartet', () => {
    expect(belegDateinamen('00001')).toEqual({
      html: 'Rahmen00001.basis.source.html',
      sevariablen: 'Rahmen00001.basis.SEvariablen.json',
    })
  })
})

describe('rahmenNummerVon', () => {
  it('liest die Nummer aus der Maskenwurzel', () => {
    const baum = {
      [WURZEL_ID]: { id: WURZEL_ID, typ: 'root', werte: { [BELEG_RAHMEN_PROP]: '7' }, kinderIds: [] },
    } as unknown as Maskenbaum
    expect(rahmenNummerVon(baum)).toBe('00007')
  })

  it('schweigt, wo keine steht', () => {
    expect(rahmenNummerVon({} as Maskenbaum)).toBe('')
  })
})
