/**
 * StashList - Stash list panel
 * 
 * Self-contained list panel for displaying git stashes with:
 * - Search control
 * - Stash items with message, index, branch, date
 * - Selection and action handlers
 */

import { useState, useMemo } from 'react'
import type { StashEntry, StashFilter, StashSort } from '../../../types/electron'
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
  // Local filter/sort state
  const [controlsOpen, setControlsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StashFilter>('all')
  const [sort, setSort] = useState<StashSort>('date')

  // Sort stashes
  const sortStashes = (stashList: StashEntry[]): StashEntry[] => {
    const sorted = [...stashList]
    switch (sort) {
      case 'message':
        return sorted.sort((a, b) => a.message.localeCompare(b.message))
      case 'branch':
        return sorted.sort((a, b) => (a.branch || '').localeCompare(b.branch || ''))
      case 'date':
      default:
        // Default git stash order is already by date (newest first)
        return sorted.sort((a, b) => {
          if (!a.date) return 1
          if (!b.date) return -1
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
    }
  }

  // Filter and sort stashes
  const filteredStashes = useMemo(() => {
    let filtered = [...stashes]

    // Apply filter based on redundant status
    switch (filter) {
      case 'has-changes':
        // Show stashes that would add changes (not redundant)
        filtered = filtered.filter((stash) => !stash.redundant)
        break
      case 'redundant':
        // Show stashes whose changes already exist on the branch
        filtered = filtered.filter((stash) => stash.redundant)
        break
      case 'all':
      default:
        break
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filtered = filtered.filter(
        (stash) =>
          stash.message.toLowerCase().includes(searchLower) ||
          (stash.branch && stash.branch.toLowerCase().includes(searchLower))
      )
    }

    return sortStashes(filtered)
  }, [stashes, search, filter, sort])

  const label = column?.label || 'Stashes'
  const icon = column?.icon || '⊡'
  const emptyMessage = search.trim() || filter !== 'all'
    ? 'No stashes match filter'
    : 'No stashes'

  // Build active filter label
  const activeFilterParts: string[] = []
  if (search.trim()) activeFilterParts.push(`"${search.trim()}"`)
  if (filter !== 'all') activeFilterParts.push(filter === 'has-changes' ? 'Has Changes' : 'Redundant')
  const activeFilter = activeFilterParts.length > 0 ? activeFilterParts.join(' · ') : undefined

  return (
    <div className="list-panel stash-list-panel">
      <ListPanelHeader
        label={label}
        icon={icon}
        count={filteredStashes.length}
        controlsOpen={controlsOpen}
        onToggleControls={() => setControlsOpen(!controlsOpen)}
        activeFilter={activeFilter}
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
          <div className="control-row">
            <label>Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StashFilter)}
              className="control-select"
            >
              <option value="all">All</option>
              <option value="has-changes">Has Changes</option>
              <option value="redundant">Redundant</option>
            </select>
          </div>
          <div className="control-row">
            <label>Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as StashSort)}
              className="control-select"
            >
              <option value="date">Date Created</option>
              <option value="message">Message</option>
              <option value="branch">Branch</option>
            </select>
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
                className={`item stash-item clickable ${stash.redundant ? 'redundant' : ''} ${selectedStash?.index === stash.index ? 'selected' : ''}`}
                onClick={() => onSelect?.(stash)}
                onDoubleClick={() => onDoubleClick?.(stash)}
                onContextMenu={(e) => onContextMenu?.(e, stash)}
              >
                <div className="item-main">
                  <span className="item-name" title={stash.message}>
                    {stash.message}
                  </span>
                  <div className="item-badges">
                    {stash.redundant && (
                      <span className="badge badge-redundant" title="Changes already exist on branch">
                        redundant
                      </span>
                    )}
                  </div>
                </div>
                <div className="item-meta">
                  <code className="commit-hash">stash@{'{' + stash.index + '}'}</code>
                  {stash.branch && <span className="stash-branch">{stash.branch}</span>}
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
