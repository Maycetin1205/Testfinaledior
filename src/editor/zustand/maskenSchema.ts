// Die Version des Masken-Aufbaus. Format 10: deutsche Schluessel im Baum
// (typ, werte, ketten, elternId, kinderIds) und in Quellen, Relationen, Ketten.
export const CURRENT_SCHEMA_VERSION = 10

// Aeltere Staende hebt der Lader nicht mehr: sie tragen die englischen
// Schluessel und werden mit Klartext abgelehnt.
export function schemaLesbar(version: unknown): version is number {
  return version === CURRENT_SCHEMA_VERSION
}
