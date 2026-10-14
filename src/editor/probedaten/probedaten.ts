// Sample rows for the editor: invented, plausible, the same as in the
// picture of the mask with data (docs/design/2026-10-14-fachsoftware-*.png).
// One list per SoftEngine table, as a source names it in its table id; each
// row holds its values by the field codes the sources of the masks in
// masken/ use. A field without a value here keeps its placeholder.

type SampleRow = Readonly<Record<string, string>>

// A position of the document, as the SEFILELOOP of the positions delivers it.
function position(nr: number, article: string, text: string, quantity: string, unit: string, price: string, sum: string): SampleRow {
  return {
    '645_10': String(1000 + nr), '128_6': String(nr), '0_1': '6', '1_1': '0', '2_1': 'R', '3_8': '10024617',
    '18_25': article, '45_60': text, '164_8': quantity, '689_5': unit, '246_9': price, '372_5': '19', '280_12': sum,
  }
}

// An appointment of the old diary IDB021, which the reception still reads.
function appointment(nr: number, customer: string, kind: string, breed: string, animal: string, time: string, treatment: string, room: string, priority: string): SampleRow {
  return {
    IDBID0021_0_10: String(59100 + nr), IDBID0021_10_8: customer, IDBID0021_18_30: kind,
    IDBID0021_48_30: breed, IDBID0021_78_30: animal, IDBID0021_118_5: time,
    IDBID0021_123_150: treatment, IDBID0021_273_10: '14.10.2026', IDBID0021_343_30: room,
    IDBID0021_373_12: priority,
  }
}

function owner(nr: string, first: string, last: string, mobile: string, street: string, house: string, zip: string, town: string): SampleRow {
  const mail = `${first[0]}.${last}@web.de`.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  return {
    ADR_2_8: nr, ADR_3292_30: first, ADR_3322_40: last, ADR_1114_20: mobile, ADR_1330_60: mail,
    ADR_2187_46: street, ADR_2170_11: house, ADR_110_10: zip, ADR_2233_40: town,
  }
}

// An animal of a customer, kept in the delivery addresses of the address master.
function animal(nr: number, customer: string, name: string, kind: string, breed: string, born: string, sex: string, weight: string, neutered: string, allergies: string): SampleRow {
  return {
    LFA_2_8: String(30000 + nr), LFA_10_8: customer, LFA_400_30: name, LFA_971_30: kind, LFA_430_30: breed,
    LFA_960_10: born, LFA_2000_12: sex, LFA_2072_6: weight, LFA_970_1: neutered, LFA_2012_60: allergies,
    LFA_2080_30: `276098106${String(234500 + nr * 17)}`,
    LFA_2110_1: 'J', LFA_2111_10: '12.03.2026', LFA_2151_1: 'J', LFA_2121_30: '12.03.2026',
    LFA_2152_30: 'N', LFA_2182_10: '',
  }
}

const article = ([nr, text, stock, unit, net, gross, store]: readonly string[]): SampleRow => ({
  ART_1_25: nr, ART_51_60: text, ART_759_10: stock, ART_1706_5: unit,
  ART_8320_9: net, ART_8329_9: gross, ART_1216_8: store,
})

export const PROBEDATEN: Readonly<Record<string, readonly SampleRow[]>> = {
  WINDOW_VARIABLE: [{
    BEL_3440_60: 'Sabine Krüger',
    BELERF_26500_100: 'Frau Sabine Krüger · Lindenstraße 14 · 49074 Osnabrück',
    BELERF_28600_200: 'Bello, Labrador Retriever',
    BEL_11_8: '20003',
    BEL_3_8: '10024617',
    BEL_19_10: '14.10.2026',
    BEL_29_10: '14.10.2026',
    BEL_393_12: '132,76',
    BEL_263_12: '0,00',
    BEL_275_12: '0,00',
    BEL_441_12: '25,22',
    BEL_465_12: '41,18',
    BEL_453_12: '157,98',
    BELERF_27000_100: '14 Tage 2 % Skonto',
    BELERF_27100_100: '30 Tage netto',
  }],
  BEL: [{
    '0_11': '61000246170', '0_1': '6', '1_1': '0', '2_1': 'R', '3_8': '10024617', '11_8': '20003',
    '107_30': 'Sabine Krüger', '19_10': '14.10.2026', '29_10': '14.10.2026', '1313_8': '7741',
  }],
  ADR: [{
    '110_10': '49074', '1330_60': 's.krueger@web.de', '2170_11': '14',
    '2187_46': 'Lindenstraße', '2233_40': 'Osnabrück', '2332_20': '0541 33 81 27',
  }],
  POS: [
    position(1, 'GOT-ALLG', 'Allgemeine Untersuchung Hund', '1', 'Stk', '23,62', '23,62'),
    position(2, 'IMP-DHPPI', 'Nobivac DHPPi Impfstoff', '1', 'Dos', '18,40', '18,40'),
    position(3, 'IMP-TOLL', 'Tollwutimpfung Rabisin', '1', 'Dos', '12,90', '12,90'),
    position(4, 'WURM-MIL-L', 'Milbemax Tabletten große Hunde', '2', 'Tbl', '6,85', '13,70'),
    position(5, 'ZECK-BRAV-40', 'Bravecto Kautablette 20–40 kg', '1', 'Pck', '54,90', '54,90'),
    position(6, 'GOT-INJ', 'Injektion s.c. / i.m.', '2', 'Stk', '4,62', '9,24'),
  ],
  // Bravecto first: a block reading one article shows it, as the picture
  // shows the article of the chosen position.
  'ARTIKEL.GET': [
    ['ZECK-BRAV-40', 'Bravecto Kautablette 20–40 kg', '37', 'Pck', '54,90', '65,33', 'Apotheke'],
    ['GOT-ALLG', 'Allgemeine Untersuchung Hund', '', 'Stk', '23,62', '28,11', ''],
    ['IMP-DHPPI', 'Nobivac DHPPi Impfstoff', '24', 'Dos', '18,40', '21,90', 'Kühlung'],
    ['IMP-TOLL', 'Tollwutimpfung Rabisin', '31', 'Dos', '12,90', '15,35', 'Kühlung'],
    ['WURM-MIL-L', 'Milbemax Tabletten große Hunde', '112', 'Tbl', '6,85', '8,15', 'Apotheke'],
    ['GOT-INJ', 'Injektion s.c. / i.m.', '', 'Stk', '4,62', '5,50', ''],
  ].map(article),
  'CHARGE.GET': [
    { CHA_1_25: 'A417B02', CHA_26_25: 'IMP-DHPPI', CHA_77_60: 'Nobivac DHPPi Impfstoff', CHA_61_8: '70012', CHA_1054_10: '31.05.2027', CHA_198_10: '24' },
    { CHA_1_25: 'L2291', CHA_26_25: 'IMP-TOLL', CHA_77_60: 'Tollwutimpfung Rabisin', CHA_61_8: '70012', CHA_1054_10: '30.11.2027', CHA_198_10: '31' },
  ],
  'BELEG.GET': [
    { BEL_3_8: '10023980', BEL_19_10: '02.09.2026', BEL_8204_12: '48,90', BEL_11_8: '20003', BEL_3440_60: 'Sabine Krüger' },
    { BEL_3_8: '10022514', BEL_19_10: '18.06.2026', BEL_8204_12: '86,40', BEL_11_8: '20003', BEL_3440_60: 'Sabine Krüger' },
    { BEL_3_8: '10020877', BEL_19_10: '12.03.2026', BEL_8204_12: '64,25', BEL_11_8: '20003', BEL_3440_60: 'Sabine Krüger' },
  ],
  'ADRESSE.GET': [
    owner('20003', 'Sabine', 'Krüger', '0171 4482 913', 'Lindenstraße', '14', '49074', 'Osnabrück'),
    owner('20001', 'Thomas', 'Becker', '0160 9312 448', 'Am Wall', '3', '49074', 'Osnabrück'),
    owner('20002', 'Michael', 'Wagner', '0152 2290 117', 'Iburger Straße', '81', '49082', 'Osnabrück'),
    owner('20004', 'Peter', 'Schmidt', '0170 5528 306', 'Rheiner Landstraße', '120', '49078', 'Osnabrück'),
    owner('20005', 'Anna', 'Schäfer', '0176 8841 290', 'Bergstraße', '7', '49076', 'Osnabrück'),
    owner('20006', 'Julia', 'Hoffmann', '0151 3307 652', 'Kirchweg', '22', '49124', 'Georgsmarienhütte'),
    owner('20007', 'Laura', 'Meyer', '0157 6634 018', 'Lotter Straße', '45', '49078', 'Osnabrück'),
    owner('20008', 'Klaus', 'Fischer', '0172 1185 473', 'Hauptstraße', '9', '49134', 'Wallenhorst'),
  ],
  'LIEFERADRESSE.GET': [
    animal(1, '20003', 'Bello', 'Hund', 'Labrador Retriever', '04.05.2019', 'Rüde', '32,4', 'J', 'Keine bekannt'),
    animal(2, '20003', 'Mia', 'Katze', 'Europäisch Kurzhaar', '17.08.2021', 'Kätzin', '4,1', 'J', ''),
    animal(3, '20001', 'Minka', 'Katze', 'Europäisch Kurzhaar', '02.02.2018', 'Kätzin', '3,8', 'J', ''),
    animal(4, '20002', 'Rocky', 'Hund', 'Jack Russell Terrier', '23.11.2020', 'Rüde', '7,6', 'N', 'Penicillin'),
    animal(5, '20005', 'Hoppel', 'Kaninchen', 'Zwergwidder', '10.04.2023', 'Rammler', '1,9', 'J', ''),
  ],
  // The reception's day, 14.10.2026: three to come, two waiting, two in a
  // room, one at the desk.
  'IDBID0021.GET': [
    appointment(1, '20003', 'Hund', 'Labrador Retriever', 'Bello', '09:30', 'Impfung DHPPi und Tollwut', '', ''),
    appointment(2, '20001', 'Katze', 'Europäisch Kurzhaar', 'Minka', '10:15', 'Zahnkontrolle', '', ''),
    appointment(3, '20005', 'Kaninchen', 'Zwergwidder', 'Hoppel', '11:00', 'Krallen kürzen', '', ''),
    appointment(4, '20002', 'Hund', 'Jack Russell Terrier', 'Rocky', '08:45', 'Lahmt hinten links', 'Wartezimmer', 'Notfall'),
    appointment(5, '20006', 'Katze', 'Maine Coon', 'Luna', '09:00', 'Fäden ziehen nach Kastration', 'Wartezimmer', ''),
    appointment(6, '20004', 'Hund', 'Berner Sennenhund', 'Balu', '08:15', 'Ohrenentzündung rechts', 'Behandlungszimmer 1', ''),
    appointment(7, '20007', 'Katze', 'Britisch Kurzhaar', 'Felix', '08:30', 'Blutbild, Nierenwerte', 'Behandlungszimmer 2', 'OP'),
    appointment(8, '20008', 'Meerschweinchen', 'Rosette', 'Emma', '08:00', 'Zahnkontrolle', 'Abrechnung', ''),
  ],
}
