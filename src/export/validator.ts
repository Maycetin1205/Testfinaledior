const BRIDGE_PATH = '<!--SOFTENGINE-VAR!EditorPfad-->/JS/JS/basis.html.interface.js'
export const BRIDGE_SCRIPT = `<script src="${BRIDGE_PATH}"></script>`

export interface CheckResult {
  name: string
  ok: boolean
  detail: string

  warning?: boolean
}

export function validateMaskHtml(html: string): CheckResult[] {
  const results: CheckResult[] = []
  const check = (name: string, ok: boolean, detail = '') => {
    results.push({ name, ok, detail })
  }

  const crlf = (html.match(/\r/g) ?? []).length
  check('LF-only', crlf === 0, crlf ? `${crlf} CR-Zeichen gefunden` : '')

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

  const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((hit) => hit[1])
  const bridge = scripts.filter((src) => src === BRIDGE_PATH).length
  check('Bruecke eingebunden', bridge === 1, `gefunden: ${bridge}`)

  const foreign = scripts.filter((src) => src !== BRIDGE_PATH)
  check('kein fremdes Skript', foreign.length === 0, foreign.join(', '))

  check('DOCTYPE vorhanden', html.includes('<!DOCTYPE html>'))
  check('Wurzel-Fluss vorhanden', html.includes('class="ff-root"'))
  check('Masken-Tokens eingebettet', html.includes('--se-accent:'))

  return results
}

export function failedChecks(results: CheckResult[]): CheckResult[] {
  return results.filter((r) => !r.ok && r.warning !== true)
}
