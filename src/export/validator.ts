// Prueft die Dateiform der Maske: nur die Bruecke von aussen, LF, reines ASCII.

// Derselbe Pfad, ueber den SoftEngines eigener Maskenkopf die Bruecke laedt.
export const BRUECKE_PFAD = '<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js'
export const BRUECKE_SKRIPT = `<script src="${BRUECKE_PFAD}"></script>`

export interface CheckResult {
  name: string
  ok: boolean
  detail: string

  warnung?: boolean
}

export function validateMaskHtml(html: string): CheckResult[] {
  const results: CheckResult[] = []
  const check = (name: string, ok: boolean, detail = '') => {
    results.push({ name, ok, detail })
  }

  const crlf = (html.match(/\r/g) ?? []).length
  check('LF-only', crlf === 0, crlf ? `${crlf} CR-Zeichen gefunden` : '')

  // SoftEngine setzt JWHtmlStart in 56 Skripte und 41 Stylesheets um (1,7 MB);
  // die Maske braucht davon nur die Bruecke (kontrakte.md 1).
  const marker = /<!--SOFTENGINE-VAR!JWHtml\w*-->/.exec(html)
  check('kein JWHtml-Marker', marker === null, marker?.[0] ?? '')

  const badChar = /[^\n\t\x20-\x7E]/.exec(html)
  check(
    'ASCII-only',
    badChar === null,
    badChar ? `Zeichen U+${badChar[0].codePointAt(0)!.toString(16).toUpperCase()} an Position ${badChar.index}` : '',
  )

  const styles = (html.match(/<style[\s>]/g) ?? []).length
  check('genau 1 <style>', styles === 1, `gefunden: ${styles}`)

  check(
    'Laufzeit eingebettet',
    html.includes('customElements.define'),
    'ohne die Laufzeit bleibt jeder Baustein stumm',
  )

  const skripte = [...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((treffer) => treffer[1])
  const bruecken = skripte.filter((src) => src === BRUECKE_PFAD).length
  check('Bruecke eingebunden', bruecken === 1, `gefunden: ${bruecken}`)
  // Die Laufzeit steht in der Maske; der Kunde bekommt einen festen Stand.
  const fremde = skripte.filter((src) => src !== BRUECKE_PFAD)
  check('kein fremdes Skript', fremde.length === 0, fremde.join(', '))

  check('DOCTYPE vorhanden', html.includes('<!DOCTYPE html>'))
  check('Wurzel-Fluss vorhanden', html.includes('class="ff-root"'))
  check('Masken-Tokens eingebettet', html.includes('--se-accent:'))

  return results
}

export function failedChecks(results: CheckResult[]): CheckResult[] {
  return results.filter((r) => !r.ok && r.warnung !== true)
}

