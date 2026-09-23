import { useMemo, type ReactNode } from 'react'
import { Copy } from '@/editor/icons/icon'
import { propertiesFor } from '../../core/block/propertyPlace'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import type { DeclaredProperty } from '../../core/block/propertyPlace'
import { maySelectionFollows, carriesOwnSource } from '../../core/block/treeQuery'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/PushButton'
import { Row } from '@/editor/widgets/Row'
import { blockName } from '../../core/block/blockName'
import { capacityOf } from '../canvas/gridArea'
import { useSection } from './sectionState'
import { ActionsSection } from './ActionsSection'
import { SelectionFollowSection } from './SelectionFollowSection'
import { PropControl } from './PropControl'
import { SourcesList } from './SourceList'
import { LookupWindowSection } from './LookupSection'

interface InspectorRow {
  row?: string
  props: DeclaredProperty[]
}

function inspectorRows(props: DeclaredProperty[]): InspectorRow[] {
  const rows: InspectorRow[] = []
  for (const p of props) {
    const last = rows[rows.length - 1]
    const row = p.property.row
    if (row && last?.row === row) last.props.push(p)
    else rows.push({ row, props: [p] })
  }
  return rows
}

function Panel({ title, actions, children }: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <header className="flex h-steuer shrink-0 items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-ui font-semibold text-tinte">{title}</h2>
        {actions}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function Inspector() {
  const [fieldsOpen, toggleFields] = useSection('fields')
  const [actionsOpen, toggleActions] = useSection('actions')
  const ed = useEditor()

  const sources = useDataSources()

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])
  const block = ed.selectedNode
  if (!block) return null

  const def = blockType(block.type)
  if (!def) return null

  const shownName = blockName(block, sources.list)

  const sourceInReach = ed.dataSourceFor(block.id)

  const propControl = ({ key, property }: DeclaredProperty, compact = false) => (
    <PropControl
      key={key}
      block={block}
      propertyKey={key}
      property={property}
      sourceInReach={sourceInReach}
      session={session}
      compact={compact}
    />
  )

  const visibleProps = propertiesFor(block, def, 'inspector')

  const dataProps = visibleProps.filter(({ property }) => property.type.control === 'field'
    || property.type.control === 'source')
  const generalProps = visibleProps.filter((p) => !dataProps.includes(p))

  const tileProps = generalProps.filter(({ property }) => property.type.control === 'boolean')
  const valueProps = generalProps.filter(({ property }) => property.type.control !== 'boolean')

  const showDataSection = carriesOwnSource(block) || dataProps.length > 0

  const events = capability(def, 'events')?.list ?? []
  const hasActions = events.length > 0

  const searchWindow = capability(def, 'lookupWindow')?.window

  return (
    <Panel
      title={shownName}
      actions={(
        <Button
          onlyIcon
          aria-label="Duplizieren (Ctrl+D)"
          title="Duplizieren (Ctrl+D)"
          onClick={() => ed.duplicateBlock(block.id, capacityOf(ed.tree, block.parentId))}
          disabled={ed.isRemoveProtected(block.id)}
        >
          <Copy size={14} />
        </Button>
      )}
    >
      <div className="flex flex-col gap-4">
        {tileProps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tileProps.map((p) => propControl(p))}
          </div>
        )}

        {valueProps.length > 0 && (
          <div className="inspektor-werte">
            {inspectorRows(valueProps).map((row) =>
              row.row ? (
                <Row key={`zeile:${row.row}`} label={row.row}>
                  {() => (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {row.props.map((p) => propControl(p, true))}
                    </div>
                  )}
                </Row>
              ) : (
                propControl(row.props[0])
              ),
            )}
          </div>
        )}

        {showDataSection && (
          <div className="flex flex-col gap-4">
            {carriesOwnSource(block) && <SourcesList block={block} />}

            {dataProps.length > 0 && (
              <Group title="Felder" open={fieldsOpen} onToggle={toggleFields}>
                <div className="inspektor-werte">
                  {dataProps.map((p) => propControl(p))}
                </div>
              </Group>
            )}
          </div>
        )}

        {searchWindow && <LookupWindowSection block={block} window={searchWindow} />}

        {maySelectionFollows(block) && <SelectionFollowSection block={block} />}

        {hasActions && (
          <Group title="Aktionen" open={actionsOpen} onToggle={toggleActions}>
            <ActionsSection block={block} events={events} />
          </Group>
        )}
      </div>
    </Panel>
  )
}
