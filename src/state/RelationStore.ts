import { EINGEBAUTE_RELATIONEN, type RelationsVorlage } from '../core/data/relations'
import { VorlagenStore } from './VorlagenStore'

export class RelationStore extends VorlagenStore<RelationsVorlage> {
  constructor(bestand: readonly RelationsVorlage[] = EINGEBAUTE_RELATIONEN) {
    super(bestand)
  }
}
