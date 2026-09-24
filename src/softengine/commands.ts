import { hostCall, seWindow } from './bridge'

function startToolLink(toolNumber: string, params: readonly string[]): string {
  let link = '0,START_TOOL,' + toolNumber
  if (params.length > 0) {
    link += ',' + params.map((p) => encodeURIComponent(p)).join(',')
  }
  return link
}

export function sendBwLink(command: string): boolean {
  const line = command.trim()
  if (line === '') return false

  const parts = line.split(',')
  const spot = parts.indexOf('START_TOOL')
  if (spot >= 0) return sendStartTool(parts[spot + 1] ?? '', parts.slice(spot + 2))
  const g = seWindow()
  return typeof g.basisHTML_SND_MSG === 'function'
    && hostCall(() => g.basisHTML_SND_MSG('HTMLEVENT', { art: 'BWLINK', params: line }))
}

export function sendStartTool(toolNumber: string, params: readonly string[]): boolean {
  if (toolNumber.trim() === '') return false
  const g = seWindow()
  const message: { NR: string; PARAMS?: string[] } = { NR: toolNumber }
  if (params.length > 0) message.PARAMS = [...params]
  if (typeof g.basisHTML_SND_MSG === 'function'
    && hostCall(() => g.basisHTML_SND_MSG('START_TOOL', message))) return true
  return typeof g.sendBWLinkIntern === 'function'
    && hostCall(() => g.sendBWLinkIntern(startToolLink(toolNumber, params)))
}
