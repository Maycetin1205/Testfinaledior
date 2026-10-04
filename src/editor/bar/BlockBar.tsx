import { useMemo, type ReactNode, type RefObject } from 'react'
import { Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Separator } from '@/editor/widgets/Separator'
import type { BlockNode } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { propertyVisible, type PropertyPlace } from '../../core/block/property'
import { propertiesFor, type DeclaredProperty } from '../../core/block/propertyPlace'
import {
  carriesOwnSource,
  maySelectionFollows,
  SOURCE_PROP,
} from '../../core/block/treeQuery'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { BarControl, FontChoice } from './BarControl'
import { BarFrame, BarSign } from './BarFrame'
import { controlShown } from './controlShown'
import { followOf, followOffered } from './followOffer'
import { FollowPick } from './FollowPick'
import { SettingsWindow } from './SettingsWindow'

interface BlockBarProps {
  block: BlockNode
  def: BlockType | undefined

  host: RefObject<HTMLElement | null>
  element: HTMLElement | null

  onRemove?: () => void
}

// Color and size stand right behind the choice that presets them, like the
// role of a text; without one, behind all choices.
function withFonts(
  shown: ReactNode[],
  choices: DeclaredProperty[],
  fonts: DeclaredProperty[],
  block: BlockNode,
): ReactNode[] {
  if (fonts.length === 0) return shown
  const by = fonts.find((f) => f.property.preset)?.property.preset?.by
  const after = choices.findIndex((c) => c.key === by)
  const at = after < 0 ? shown.length : after + 1
  return [...shown.slice(0, at), <FontChoice key="fonts" block={block} fonts={fonts} />, ...shown.slice(at)]
}

// The small bar at the marked block: its sign and name, what the surface
// cannot show, and on the right the bin. One line. The frame and its place
// are BarFrame, the window „Einstellungen" is SettingsWindow, the waiting
// for a giver is FollowPick.
export function BlockBar({ block, def, host, element, onRemove }: BlockBarProps) {
  const ed = useEditor()
  const library = useDataSources().list

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])

  const sourceInReach = ed.dataSourceFor(block.id)
  const at = (where: PropertyPlace): DeclaredProperty[] => (def ? propertiesFor(block, def, where) : [])
    .filter(({ property }) => controlShown(property, block, sourceInReach, library))
  const controls = (props: DeclaredProperty[]) => props.map(({ key, property }) => (
    <BarControl
      key={key}
      block={block}
      propertyKey={key}
      property={property}
      sourceInReach={sourceInReach}
      session={session}
    />
  ))

  const choices = at('bar')
  const fonts = at('font')
  const searchWindow = capability(def, 'lookupWindow')?.window
  // A window per column opens at the column head, not here.
  const windowShown = searchWindow !== undefined && searchWindow.entriesProp === undefined
    && propertyVisible(searchWindow.when, block.values)
  const helpersApart = capability(def, 'source')?.helpersApart === true && carriesOwnSource(block)
  const follows = maySelectionFollows(block) && followOffered(ed.tree, block, library)
  const follow = follows ? followOf(block) : undefined
  const waiting = ed.followPickFor === block.id

  return (
    <BarFrame host={host} element={element} head={def?.head}>
      <BarSign type={block.type} name={def?.name ?? block.type} />

      {(choices.length > 0 || fonts.length > 0) && <Separator vertical />}
      {withFonts(controls(choices), choices, fonts, block)}

      <SettingsWindow
        block={block}
        host={host}
        controls={controls}
        sourceProps={at('source')}
        shows={at('display')}
        lookupProps={at('lookup')}
        searchWindow={windowShown ? searchWindow : undefined}
        helpersApart={helpersApart && String(block.values[SOURCE_PROP] ?? '') !== ''}
        follow={follow !== undefined && !waiting ? follow : undefined}
        events={capability(def, 'events')?.list ?? []}
      />
      {follows && (follow === undefined || waiting) && <FollowPick block={block} />}

      {onRemove && (
        <>
          <Separator vertical />
          <Button onlyIcon title="Baustein löschen" aria-label="Baustein löschen" onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}

    </BarFrame>
  )
}
