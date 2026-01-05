/**
 * PRList - Pull Request list panel
 * 
 * Self-contained list panel for displaying pull requests with:
 * - Search, filter, and sort controls
 * - PR items with title, branch info, metadata
 * - Selection and action handlers
 */

import { useState, useMemo } from 'react'
import type { PullRequest, PRFilter, PRSort } from '../../../types/electron'
import type { Column } from '../../../types/app-types'
import { ListPanelHeader } from './ListPanelHeader'

export interface PRListProps {
  /** Column configuration */
  column?: Column
  /** List of pull requests */
  prs: PullRequest[]
  /** Currently selected PR */
  selectedPR?: PullRequest | null
  /** Error message (e.g., gh CLI not available) */
  error?: string | null
  /** Loading state */
  loading?: boolean
  /** Format relative time */
  formatRelativeTime: (date: string) => string
  /** Called when PR is clicked */
  onSelect?: (pr: PullRequest) => void
  /** Called when PR is double-clicked */
  onDoubleClick?: (pr: PullRequest) => void
  /** Called for context menu */
  onContextMenu?: (e: React.MouseEvent, pr: PullRequest) => void
}

/**
 * Get review decision badge
 */
function getReviewBadge(decision: string | null) {
  switch (decision) {
    case 'APPROVED':
      return <span className="badge badge-approved">Approved</span>
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-changes">Changes</span>
    case 'REVIEW_REQUIRED':
      return <span className="badge badge-review">Review</span>
    default:
      return null
  }
}

export function PRList({
  column,
  prs,
  selectedPR,
  error,
  loading,
  formatRelativeTime,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: PRListProps) {
  // Local filter/sort state
  const [controlsOpen, setControlsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PRFilter>('open-not-draft')
  const [sort, setSort] = useState<PRSort>('updated')

  // Filter and sort PRs
  const filteredPRs = useMemo(() => {
    let filtered = [...prs]

    // Apply filter
    switch (filter) {
      case 'open-not-draft':
        filtered = filtered.filter((pr) => !pr.isDraft)
        break
      case 'open-draft':
        filtered = filtered.filter((pr) => pr.isDraft)
        break
      case 'all':
      default:
        break
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filtered = filtered.filter(
        (pr) =>
          pr.title.toLowerCase().includes(searchLower) ||
          pr.branch.toLowerCase().includes(searchLower) ||
          pr.author.toLowerCase().includes(searchLower)
      )
    }

    // Apply sort
    switch (sort) {
      case 'comments':
        filtered.sort((a, b) => b.comments - a.comments)
        break
      case 'first-commit':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'last-commit':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case 'updated':
      default:
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
    }

    return filtered
  }, [prs, filter, sort, search])

  const label = column?.label || 'Pull Requests'
  const icon = column?.icon || '⬡'

  // Build active filter label
  const activeFilterParts: string[] = []
  if (search.trim()) activeFilterParts.push(`"${search.trim()}"`)
  if (filter === 'open-draft') activeFilterParts.push('Drafts')
  // Note: 'open-not-draft' is the default, so we don't show it
  const activeFilter = activeFilterParts.length > 0 ? activeFilterParts.join(' · ') : undefined

  return (
    <div className="list-panel pr-list-panel">
      <ListPanelHeader
        label={label}
        icon={icon}
        count={filteredPRs.length}
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
              placeholder="Title, branch, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="control-row">
            <label>Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as PRFilter)}
              className="control-select"
            >
              <option value="all">All Open</option>
              <option value="open-not-draft">Open + Not Draft</option>
              <option value="open-draft">Open + Draft</option>
            </select>
          </div>
          <div className="control-row">
            <label>Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PRSort)}
              className="control-select"
            >
              <option value="updated">Last Updated</option>
              <option value="comments">Comments</option>
              <option value="first-commit">First Commit</option>
              <option value="last-commit">Last Commit</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="column-content">
        {loading ? (
          <div className="empty-column">Loading PRs...</div>
        ) : error ? (
          <div className="empty-column pr-error">
            <span className="pr-error-icon">⚠</span>
            {error}
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="empty-column">
            {search.trim() || filter !== 'all' ? 'No PRs match filter' : 'No open PRs'}
          </div>
        ) : (
          <ul className="item-list">
            {filteredPRs.map((pr) => (
              <li
                key={pr.number}
                className={`item pr-item clickable ${pr.isDraft ? 'draft' : ''} ${selectedPR?.number === pr.number ? 'selected' : ''}`}
                onClick={() => onSelect?.(pr)}
                onDoubleClick={() => onDoubleClick?.(pr)}
                onContextMenu={(e) => onContextMenu?.(e, pr)}
              >
                <div className="item-main">
                  <span className="item-name" title={pr.title}>
                    {pr.title}
                  </span>
                  <div className="item-badges">
                    {pr.isDraft && <span className="badge badge-draft">draft</span>}
                    {getReviewBadge(pr.reviewDecision)}
                  </div>
                </div>
                <div className="pr-branch">
                  <span className="pr-branch-name">{pr.branch}</span>
                  <span className="pr-arrow">→</span>
                  <span className="pr-base">{pr.baseBranch}</span>
                </div>
                <div className="item-meta">
                  <code className="commit-hash">#{pr.number}</code>
                  <span className="pr-author">@{pr.author}</span>
                  <span className="pr-time">{formatRelativeTime(pr.updatedAt)}</span>
                  {pr.comments > 0 && <span className="pr-comments">💬 {pr.comments}</span>}
                  <span className="pr-diff">
                    <span className="pr-additions">+{pr.additions}</span>
                    <span className="pr-deletions">-{pr.deletions}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}



