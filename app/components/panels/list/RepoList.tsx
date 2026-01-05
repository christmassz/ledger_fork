/**
 * RepoList - Repository list panel
 *
 * Shows sibling repositories from the parent directory of the current repo.
 * Worktrees are filtered out (they have a .git file instead of directory).
 */

import { useState, useMemo, useEffect } from 'react'
import type { RepoInfo } from '../../../types/electron'
import type { Column } from '../../../types/app-types'
import { ListPanelHeader } from './ListPanelHeader'

export interface RepoListProps {
  /** Column configuration */
  column?: Column
  /** Path of the current repository */
  repoPath: string | null
  /** Currently selected repo */
  selectedRepo?: RepoInfo | null
  /** Called when repo is clicked */
  onSelect?: (repo: RepoInfo) => void
  /** Called when repo is double-clicked (open in Ledger) */
  onDoubleClick?: (repo: RepoInfo) => void
}

type RepoSort = 'name' | 'current-first'

export function RepoList({
  column,
  repoPath,
  selectedRepo,
  onSelect,
  onDoubleClick,
}: RepoListProps) {
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<RepoSort>('current-first')

  // Load sibling repos when repoPath changes
  useEffect(() => {
    if (!repoPath) {
      setRepos([])
      setLoading(false)
      return
    }

    setLoading(true)
    window.electronAPI
      .getSiblingRepos()
      .then((result) => {
        setRepos(result)
      })
      .catch((error) => {
        console.error('Error loading sibling repos:', error)
        setRepos([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [repoPath])

  // Filter and sort repos
  const filteredRepos = useMemo(() => {
    let filtered = repos

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(searchLower))
    }

    // Apply sort
    const sorted = [...filtered]
    switch (sort) {
      case 'current-first':
        sorted.sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1
          if (!a.isCurrent && b.isCurrent) return 1
          return a.name.localeCompare(b.name)
        })
        break
      case 'name':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [repos, search, sort])

  const label = column?.label || 'Repositories'
  const icon = column?.icon || '⌂'
  const emptyMessage = search.trim()
    ? 'No repos match filter'
    : loading
      ? 'Loading...'
      : 'No sibling repositories found'

  // Build active filter label
  const activeFilter = search.trim() ? `"${search.trim()}"` : undefined

  return (
    <div className="list-panel repo-list-panel">
      <ListPanelHeader
        label={label}
        icon={icon}
        count={filteredRepos.length}
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
              placeholder="Repo name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="control-row">
            <label>Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as RepoSort)}
              className="control-select"
            >
              <option value="current-first">Current First</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="column-content">
        {filteredRepos.length === 0 ? (
          <div className="empty-column">{emptyMessage}</div>
        ) : (
          <ul className="item-list">
            {filteredRepos.map((repo) => (
              <li
                key={repo.path}
                className={`item repo-item clickable ${repo.isCurrent ? 'current' : ''} ${selectedRepo?.path === repo.path ? 'selected' : ''}`}
                onClick={() => onSelect?.(repo)}
                onDoubleClick={() => onDoubleClick?.(repo)}
              >
                <div className="item-main">
                  <span className="item-name">
                    {repo.isCurrent && <span className="arrow">→</span>}
                    {repo.name}
                  </span>
                  <div className="item-badges">
                    {repo.isCurrent && <span className="badge badge-current">current</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

