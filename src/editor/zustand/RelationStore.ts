import { EINGEBAUTE_RELATIONEN, type RelationsVorlage } from '../../kern/daten/relationen'
import { VorlagenStore } from './VorlagenStore'

export class RelationStore extends VorlagenStore<RelationsVorlage> {
  constructor(bestand: readonly RelationsVorlage[] = EINGEBAUTE_RELATIONEN) {
    super(bestand)
  }
}
