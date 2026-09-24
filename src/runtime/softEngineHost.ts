import { freshDataRequest, hasSeData, onSeData, startSe } from '../softengine/bridge'
import { sendBwLink, sendStartTool } from '../softengine/commands'
import { fieldRead, fieldWrite } from '../softengine/data'
import { fetchQuerySource } from '../softengine/queryLoader'
import { loadRowsPerRelation } from '../softengine/relationLoader'
import { parameterResolve, relationRun, runtimeRelation } from '../softengine/relations'
import { rowsOfSource, runtimeSource, runtimeSources } from '../softengine/runtimeSources'
import { fetchValueSource } from '../softengine/valueLoader'
import type { MaskHost } from './maskHost'

// The only door from the mask to SoftEngine.
export const softEngineHost: MaskHost = {
  start: startSe,
  hasData: hasSeData,
  onData: onSeData,

  sources: runtimeSources,
  source: runtimeSource,
  rows: rowsOfSource,
  readField: fieldRead,
  writeField: fieldWrite,

  relation: runtimeRelation,
  resolveParameter: parameterResolve,
  runRelation: relationRun,
  sendStartTool,
  sendBwLink,
  requestFreshData: freshDataRequest,

  loadRowsPerRelation,
  fetchValueSource,
  fetchQuerySource,
}
