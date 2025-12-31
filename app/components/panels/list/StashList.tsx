/**
 * StashList - Stash list panel
 * 
 * Self-contained list panel for displaying git stashes with:
 * - Search control
 * - Stash items with message, index, branch, date
 * - Selection and action handlers
 */

import { useState, useMemo } from 'react'
import type { StashEntry } from '../../../types/electron'
import type { Column } from '../../../types/app-types'
import { ListPanelHeader } from './ListPanelHeader'

export interface StashListProps {
  /** Column configuration */
  column?: Column
  /** List of stashes */
  stashes: StashEntry[]
  /** Currently selected stash */
  selectedStash?: StashEntry | null
  /** Format relative time */
  formatRelativeTime: (date: string) => string
  /** Called when stash is clicked */
  onSelect?: (stash: StashEntry) => void
  /** Called when stash is double-clicked */
  onDoubleClick?: (stash: StashEntry) => void
  /** Called for context menu */
  onContextMenu?: (e: React.MouseEvent, stash: StashEntry) => void
}

export function StashList({
  column,
  stashes,
  selectedStash,
  formatRelativeTime,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: StashListProps) {
  // Local filter state
  const [controlsOpen, setControlsOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filter stashes
  const filteredStashes = useMemo(() => {
    if (!search.trim()) return stashes

    const searchLower = search.toLowerCase().trim()
    return stashes.filter(
      (stash) =>
        stash.message.toLowerCase().includes(searchLower) ||
        (stash.branch && stash.branch.toLowerCase().includes(searchLower))
    )
  }, [stashes, search])

  const label = column?.label || 'Stashes'
  const icon = column?.icon || '⊡'
  const emptyMessage = search.trim() ? 'No stashes match filter' : 'No stashes'

  return (
    <div className="list-panel stash-list-panel">
      <ListPanelHeader
        label={label}
        icon={icon}
        count={filteredStashes.length}
        controlsOpen={controlsOpen}
        onToggleControls={() => setControlsOpen(!controlsOpen)}
      />

      {/* Controls */}
      {controlsOpen && (
        <div className="column-controls" onClick={(e) => e.stopPropagation()}>
          <div className="control-row">
            <label>Search</label>
            <input
              type="text"
              className="control-search"
              placeholder="Message or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="column-content">
        {filteredStashes.length === 0 ? (
          <div className="empty-column">{emptyMessage}</div>
        ) : (
          <ul className="item-list">
            {filteredStashes.map((stash) => (
              <li
                key={stash.index}
                className={`item stash-item clickable ${selectedStash?.index === stash.index ? 'selected' : ''}`}
                onClick={() => onSelect?.(stash)}
                onDoubleClick={() => onDoubleClick?.(stash)}
                onContextMenu={(e) => onContextMenu?.(e, stash)}
              >
                <div className="item-main">
                  <span className="item-name" title={stash.message}>
                    {stash.message}
                  </span>
                </div>
                <div className="item-meta">
                  <code className="commit-hash">stash@{'{' + stash.index + '}'}</code>
                  {stash.branch && <span className="stash-branch">on {stash.branch}</span>}
                  <span className="stash-time">{formatRelativeTime(stash.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

