/**
 * WorktreeList - Worktree list panel
 * 
 * Self-contained list panel for displaying worktrees with:
 * - Search and parent filter controls
 * - Worktree items with branch, path, stats
 * - Working folder pseudo-entry support
 * - Selection and action handlers
 */

import { useState, useMemo } from 'react'
import type { Worktree, WorktreeSort } from '../../../types/electron'
import type { Column } from '../../../types/app-types'
import { ListPanelHeader } from './ListPanelHeader'

export interface WorktreeListProps {
  /** Column configuration */
  column?: Column
  /** List of worktrees */
  worktrees: Worktree[]
  /** Current branch name (to highlight matching worktree) */
  currentBranch?: string | null
  /** Path to main repo (for filtering) */
  repoPath?: string | null
  /** Currently selected worktree */
  selectedWorktree?: Worktree | null
  /** Called when worktree is clicked */
  onSelect?: (worktree: Worktree) => void
  /** Called when worktree is double-clicked */
  onDoubleClick?: (worktree: Worktree) => void
  /** Called for context menu */
  onContextMenu?: (e: React.MouseEvent, worktree: Worktree) => void
  /** Called to create new worktree */
  onCreateWorktree?: () => void
}

/**
 * Extract parent folders from worktree paths
 */
function getWorktreeParents(worktrees: Worktree[], repoPath: string | null): string[] {
  const parents = new Set<string>()
  
  for (const wt of worktrees) {
    const pathParts = wt.path.split('/')
    // Check for known agent folders
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      if (
        part.startsWith('.') &&
        ['cursor', 'claude', 'gemini', 'junie'].some((a) => part.toLowerCase().includes(a))
      ) {
        parents.add(part)
        break
      }
      if (part === 'conductor' && pathParts[i + 1] === 'workspaces') {
        parents.add('conductor')
        break
      }
    }
    if (repoPath && wt.path.startsWith(repoPath)) {
      parents.add('main')
    }
  }
  
  return Array.from(parents).sort()
}

export function WorktreeList({
  column,
  worktrees,
  currentBranch,
  repoPath,
  selectedWorktree,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onCreateWorktree,
}: WorktreeListProps) {
  // Local filter/sort state
  const [controlsOpen, setControlsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [parentFilter, setParentFilter] = useState<string>('all')
  const [sort, setSort] = useState<WorktreeSort>('last-modified')

  // Get available parent filters
  const parentFilters = useMemo(() => getWorktreeParents(worktrees, repoPath), [worktrees, repoPath])

  // Create working folder pseudo-worktree
  const workingFolderWorktree: Worktree | null = useMemo(() => {
    if (!repoPath) return null
    const repoName = repoPath.split('/').pop() || 'Repository'
    const mainWorktree = worktrees.find((wt) => wt.path === repoPath)
    
    return {
      path: repoPath,
      branch: mainWorktree?.branch || null,
      commit: mainWorktree?.commit || '',
      displayName: repoName,
      agent: 'working-folder',
      additions: mainWorktree?.additions || 0,
      deletions: mainWorktree?.deletions || 0,
      changedFileCount: mainWorktree?.changedFileCount || 0,
    }
  }, [repoPath, worktrees])

  // Sort worktrees
  const sortWorktrees = (wtList: Worktree[]): Worktree[] => {
    const sorted = [...wtList]
    switch (sort) {
      case 'folder-name':
        return sorted.sort((a, b) => {
          const aName = a.path.split('/').pop() || ''
          const bName = b.path.split('/').pop() || ''
          return aName.localeCompare(bName)
        })
      case 'branch-name':
        return sorted.sort((a, b) => {
          const aName = a.branch || a.displayName || ''
          const bName = b.branch || b.displayName || ''
          return aName.localeCompare(bName)
        })
      case 'last-modified':
      default:
        return sorted.sort((a, b) => {
          if (!a.lastModified) return 1
          if (!b.lastModified) return -1
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        })
    }
  }

  // Filter and sort worktrees
  const filteredWorktrees = useMemo(() => {
    // Filter out the main repo worktree (shown as working folder)
    let filtered = worktrees.filter((wt) => wt.path !== repoPath)

    // Apply parent filter
    if (parentFilter !== 'all') {
      filtered = filtered.filter((wt) => {
        if (parentFilter === 'main') {
          return repoPath && wt.path.startsWith(repoPath)
        }
        return wt.path.includes(`/${parentFilter}/`)
      })
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filtered = filtered.filter(
        (wt) => 
          wt.displayName.toLowerCase().includes(searchLower) || 
          (wt.branch && wt.branch.toLowerCase().includes(searchLower))
      )
    }

    // Sort the filtered results
    filtered = sortWorktrees(filtered)

    // Prepend working folder if it matches filters (always at top)
    if (workingFolderWorktree) {
      const matchesParent = parentFilter === 'all' || parentFilter === 'main'
      const matchesSearch = !search.trim() ||
        workingFolderWorktree.displayName.toLowerCase().includes(search.toLowerCase().trim()) ||
        (workingFolderWorktree.branch?.toLowerCase().includes(search.toLowerCase().trim()))
      
      if (matchesParent && matchesSearch) {
        filtered = [workingFolderWorktree, ...filtered]
      }
    }

    return filtered
  }, [worktrees, repoPath, parentFilter, search, workingFolderWorktree, sort])

  const label = column?.label || 'Worktrees'
  const icon = column?.icon || '⧉'
  const emptyMessage = search.trim() || parentFilter !== 'all' 
    ? 'No worktrees match filter' 
    : 'No worktrees found'

  // Build active filter label
  const activeFilterParts: string[] = []
  if (search.trim()) activeFilterParts.push(`"${search.trim()}"`)
  if (parentFilter !== 'all') activeFilterParts.push(parentFilter)
  const activeFilter = activeFilterParts.length > 0 ? activeFilterParts.join(' · ') : undefined

  return (
    <div className="list-panel worktree-list-panel">
      <ListPanelHeader
        label={label}
        icon={icon}
        count={filteredWorktrees.length}
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
              placeholder="Name or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="control-row">
            <label>Filter</label>
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="control-select"
            >
              <option value="all">All</option>
              {parentFilters.map((parent) => (
                <option key={parent} value={parent}>
                  {parent}
                </option>
              ))}
            </select>
          </div>
          <div className="control-row">
            <label>Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as WorktreeSort)}
              className="control-select"
            >
              <option value="last-modified">Last Modified</option>
              <option value="folder-name">Folder Name</option>
              <option value="branch-name">Branch Name</option>
            </select>
          </div>
          {onCreateWorktree && (
            <div className="control-row">
              <button className="control-button" onClick={onCreateWorktree}>
                + New Worktree
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="column-content">
        {filteredWorktrees.length === 0 ? (
          <div className="empty-column">{emptyMessage}</div>
        ) : (
          <ul className="item-list">
            {filteredWorktrees.map((wt) => {
              const isWorkingFolder = wt.agent === 'working-folder'
              const isCurrent = !isWorkingFolder && wt.branch === currentBranch
              
              return (
                <li
                  key={wt.path}
                  className={`item worktree-item clickable ${isCurrent ? 'current' : ''} ${isWorkingFolder ? 'working-folder' : ''} ${selectedWorktree?.path === wt.path ? 'selected' : ''}`}
                  onClick={() => onSelect?.(wt)}
                  onDoubleClick={() => !isWorkingFolder && onDoubleClick?.(wt)}
                  onContextMenu={(e) => onContextMenu?.(e, wt)}
                >
                  <div className="item-main">
                    <span className="item-name">
                      {isWorkingFolder 
                        ? `Working Folder: ${wt.branch || 'detached'}` 
                        : (wt.branch || wt.displayName)}
                    </span>
                    {isCurrent && <span className="current-indicator">●</span>}
                  </div>
                  {!isWorkingFolder && wt.branch && (
                    <div className="item-agent-hint">{wt.displayName}</div>
                  )}
                  <div className="item-path" title={wt.path}>
                    {wt.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                  <div className="item-meta worktree-stats">
                    <code className="commit-hash">{wt.path.split('/').pop()}</code>
                    {(wt.additions > 0 || wt.deletions > 0) && (
                      <>
                        {wt.additions > 0 && <span className="diff-additions">+{wt.additions}</span>}
                        {wt.deletions > 0 && <span className="diff-deletions">-{wt.deletions}</span>}
                        <span className="diff-separator">·</span>
                      </>
                    )}
                    {wt.changedFileCount > 0 && (
                      <span className="file-count">
                        {wt.changedFileCount} {wt.changedFileCount === 1 ? 'file' : 'files'}
                      </span>
                    )}
                    {wt.changedFileCount === 0 && <span className="clean-indicator">clean</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}


