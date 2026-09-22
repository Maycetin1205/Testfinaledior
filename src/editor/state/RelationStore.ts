import { BUILT_IN_RELATION, type RelationTemplate } from '../../core/data/relations'
import { LibraryStore } from './LibraryStore'

export class RelationStore extends LibraryStore<RelationTemplate> {
  constructor(stock: readonly RelationTemplate[] = BUILT_IN_RELATION) {
    super(stock)
  }
}
