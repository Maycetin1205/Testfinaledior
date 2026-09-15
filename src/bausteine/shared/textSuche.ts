// Text fuer Suche und Sortierung vergleichbar machen: Umlaute und Akzente auf
// ihren Grundbuchstaben, ss fuer ss. Suche und Sortierung brauchen dasselbe
// Verstaendnis von „gleich".
export function schlichtText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function woerterVon(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
}

export function zeilePasst(zeile: readonly string[], suchtext: string): boolean {
  const woerter = woerterVon(suchtext)
  if (woerter.length === 0) return true

  const zeileText = schlichtText(zeile.join(' '))
  return woerter.every((wort) => zeileText.includes(schlichtText(wort)))
}
