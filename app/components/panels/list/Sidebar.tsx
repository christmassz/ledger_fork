/**
 * Sidebar - Focus mode sidebar panel
 * 
 * Shows all items (PRs, branches, worktrees, stashes) in collapsible sections.
 * Provides a compact overview with search filtering.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { PullRequest, Branch, Worktree, StashEntry, RepoInfo } from '../../../types/electron'
import type { Column } from '../../../types/app-types'

export interface SidebarProps {
  column?: Column
  // Data
  prs: PullRequest[]
  branches: Branch[]
  worktrees: Worktree[]
  stashes: StashEntry[]
  repoPath?: string | null
  // Selection
  selectedPR?: PullRequest | null
  selectedBranch?: Branch | null
  selectedWorktree?: Worktree | null
  selectedStash?: StashEntry | null
  selectedRepo?: RepoInfo | null
  // Handlers
  onSelectPR?: (pr: PullRequest) => void
  onDoubleClickPR?: (pr: PullRequest) => void
  onContextMenuPR?: (e: React.MouseEvent, pr: PullRequest) => void
  onSelectBranch?: (branch: Branch) => void
  onDoubleClickBranch?: (branch: Branch) => void
  onContextMenuBranch?: (e: React.MouseEvent, branch: Branch) => void
  onSelectWorktree?: (wt: Worktree) => void
  onDoubleClickWorktree?: (wt: Worktree) => void
  onContextMenuWorktree?: (e: React.MouseEvent, wt: Worktree) => void
  onSelectStash?: (stash: StashEntry) => void
  onDoubleClickStash?: (stash: StashEntry) => void
  onContextMenuStash?: (e: React.MouseEvent, stash: StashEntry) => void
  onSelectRepo?: (repo: RepoInfo) => void
  onDoubleClickRepo?: (repo: RepoInfo) => void
  // Utilities
  formatRelativeTime?: (date: string) => string
}

interface SectionState {
  prs: boolean
  branches: boolean
  remotes: boolean
  worktrees: boolean
  stashes: boolean
  repos: boolean
}

export function Sidebar({
  column,
  prs,
  branches,
  worktrees,
  stashes,
  repoPath,
  selectedPR,
  selectedBranch,
  selectedWorktree,
  selectedStash,
  selectedRepo,
  onSelectPR,
  onDoubleClickPR,
  onContextMenuPR,
  onSelectBranch,
  onDoubleClickBranch,
  onContextMenuBranch,
  onSelectWorktree,
  onDoubleClickWorktree,
  onContextMenuWorktree,
  onSelectStash,
  onDoubleClickStash,
  onContextMenuStash,
  onSelectRepo,
  onDoubleClickRepo,
  formatRelativeTime,
}: SidebarProps) {
  // Section expanded state
  const [sections, setSections] = useState<SectionState>({
    prs: true,
    branches: true,
    remotes: false,
    worktrees: true,
    stashes: false,
    repos: false,
  })

  // Sibling repos state
  const [repos, setRepos] = useState<RepoInfo[]>([])

  // Load sibling repos when repoPath changes
  useEffect(() => {
    if (!repoPath) {
      setRepos([])
      return
    }
    window.electronAPI
      .getSiblingRepos()
      .then(setRepos)
      .catch(() => setRepos([]))
  }, [repoPath])

  // Search state
  const [search, setSearch] = useState('')

  // Split branches
  const localBranches = useMemo(() => branches.filter((b) => !b.isRemote), [branches])
  const remoteBranches = useMemo(() => branches.filter((b) => b.isRemote), [branches])

  // Filter items by search
  const filteredPRs = useMemo(() => {
    if (!search.trim()) return prs
    const s = search.toLowerCase()
    return prs.filter(
      (pr) =>
        pr.title.toLowerCase().includes(s) ||
        pr.branch.toLowerCase().includes(s)
    )
  }, [prs, search])

  const filteredLocalBranches = useMemo(() => {
    if (!search.trim()) return localBranches
    const s = search.toLowerCase()
    return localBranches.filter((b) => b.name.toLowerCase().includes(s))
  }, [localBranches, search])

  const filteredRemoteBranches = useMemo(() => {
    if (!search.trim()) return remoteBranches
    const s = search.toLowerCase()
    return remoteBranches.filter((b) => b.name.toLowerCase().includes(s))
  }, [remoteBranches, search])

  const filteredWorktrees = useMemo(() => {
    if (!search.trim()) return worktrees
    const s = search.toLowerCase()
    return worktrees.filter(
      (wt) =>
        wt.path.toLowerCase().includes(s) ||
        (wt.branch && wt.branch.toLowerCase().includes(s))
    )
  }, [worktrees, search])

  const filteredStashes = useMemo(() => {
    if (!search.trim()) return stashes
    const s = search.toLowerCase()
    return stashes.filter((st) => st.message.toLowerCase().includes(s))
  }, [stashes, search])

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const s = search.toLowerCase()
    return repos.filter((r) => r.name.toLowerCase().includes(s))
  }, [repos, search])

  // Toggle section
  const toggleSection = useCallback((section: keyof SectionState) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const icon = column?.icon || '☰'
  const label = column?.label || 'All Items'

  return (
    <div className="sidebar-panel">
      {/* Header */}
      <div className="sidebar-header">
        <h2>
          <span className="column-icon">{icon}</span>
          {label}
        </h2>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="control-search"
        />
      </div>

      {/* Sections */}
      <div className="sidebar-sections">
        {/* PRs Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.prs ? 'open' : ''}`}
            onClick={() => toggleSection('prs')}
          >
            <span className="section-icon">⬡</span>
            <span className="section-label">Pull Requests</span>
            <span className="section-count">{filteredPRs.length}</span>
            <span className="section-chevron">{sections.prs ? '▾' : '▸'}</span>
          </button>
          {sections.prs && (
            <ul className="sidebar-items">
              {filteredPRs.map((pr) => (
                <li
                  key={pr.number}
                  className={`sidebar-item ${selectedPR?.number === pr.number ? 'selected' : ''}`}
                  onClick={() => onSelectPR?.(pr)}
                  onDoubleClick={() => onDoubleClickPR?.(pr)}
                  onContextMenu={(e) => onContextMenuPR?.(e, pr)}
                >
                  <span className="item-title" title={pr.title}>{pr.title}</span>
                  <span className="item-meta">#{pr.number}</span>
                </li>
              ))}
              {filteredPRs.length === 0 && (
                <li className="sidebar-empty">No PRs</li>
              )}
            </ul>
          )}
        </div>

        {/* Branches Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.branches ? 'open' : ''}`}
            onClick={() => toggleSection('branches')}
          >
            <span className="section-icon">⎇</span>
            <span className="section-label">Branches</span>
            <span className="section-count">{filteredLocalBranches.length}</span>
            <span className="section-chevron">{sections.branches ? '▾' : '▸'}</span>
          </button>
          {sections.branches && (
            <ul className="sidebar-items">
              {filteredLocalBranches.map((branch) => (
                <li
                  key={branch.name}
                  className={`sidebar-item ${selectedBranch?.name === branch.name && !selectedBranch?.isRemote ? 'selected' : ''}`}
                  onClick={() => onSelectBranch?.(branch)}
                  onDoubleClick={() => onDoubleClickBranch?.(branch)}
                  onContextMenu={(e) => onContextMenuBranch?.(e, branch)}
                >
                  <span className="item-title">{branch.name}</span>
                  {branch.current && <span className="badge badge-current">•</span>}
                </li>
              ))}
              {filteredLocalBranches.length === 0 && (
                <li className="sidebar-empty">No branches</li>
              )}
            </ul>
          )}
        </div>

        {/* Remotes Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.remotes ? 'open' : ''}`}
            onClick={() => toggleSection('remotes')}
          >
            <span className="section-icon">◈</span>
            <span className="section-label">Remotes</span>
            <span className="section-count">{filteredRemoteBranches.length}</span>
            <span className="section-chevron">{sections.remotes ? '▾' : '▸'}</span>
          </button>
          {sections.remotes && (
            <ul className="sidebar-items">
              {filteredRemoteBranches.map((branch) => (
                <li
                  key={branch.name}
                  className={`sidebar-item ${selectedBranch?.name === branch.name && selectedBranch?.isRemote ? 'selected' : ''}`}
                  onClick={() => onSelectBranch?.(branch)}
                  onDoubleClick={() => onDoubleClickBranch?.(branch)}
                  onContextMenu={(e) => onContextMenuBranch?.(e, branch)}
                >
                  <span className="item-title">{branch.name}</span>
                </li>
              ))}
              {filteredRemoteBranches.length === 0 && (
                <li className="sidebar-empty">No remotes</li>
              )}
            </ul>
          )}
        </div>

        {/* Worktrees Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.worktrees ? 'open' : ''}`}
            onClick={() => toggleSection('worktrees')}
          >
            <span className="section-icon">⊙</span>
            <span className="section-label">Worktrees</span>
            <span className="section-count">{filteredWorktrees.length}</span>
            <span className="section-chevron">{sections.worktrees ? '▾' : '▸'}</span>
          </button>
          {sections.worktrees && (
            <ul className="sidebar-items">
              {filteredWorktrees.map((wt) => (
                <li
                  key={wt.path}
                  className={`sidebar-item ${selectedWorktree?.path === wt.path ? 'selected' : ''}`}
                  onClick={() => onSelectWorktree?.(wt)}
                  onDoubleClick={() => onDoubleClickWorktree?.(wt)}
                  onContextMenu={(e) => onContextMenuWorktree?.(e, wt)}
                >
                  <span className="item-title">{wt.branch || wt.path.split('/').pop()}</span>
                  {wt.agent && <span className="item-meta">{wt.agent}</span>}
                </li>
              ))}
              {filteredWorktrees.length === 0 && (
                <li className="sidebar-empty">No worktrees</li>
              )}
            </ul>
          )}
        </div>

        {/* Stashes Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.stashes ? 'open' : ''}`}
            onClick={() => toggleSection('stashes')}
          >
            <span className="section-icon">⊡</span>
            <span className="section-label">Stashes</span>
            <span className="section-count">{filteredStashes.length}</span>
            <span className="section-chevron">{sections.stashes ? '▾' : '▸'}</span>
          </button>
          {sections.stashes && (
            <ul className="sidebar-items">
              {filteredStashes.map((stash, index) => (
                <li
                  key={stash.index ?? index}
                  className={`sidebar-item ${selectedStash?.index === stash.index ? 'selected' : ''}`}
                  onClick={() => onSelectStash?.(stash)}
                  onDoubleClick={() => onDoubleClickStash?.(stash)}
                  onContextMenu={(e) => onContextMenuStash?.(e, stash)}
                >
                  <span className="item-title" title={stash.message}>{stash.message}</span>
                  {formatRelativeTime && (
                    <span className="item-meta">{formatRelativeTime(stash.date)}</span>
                  )}
                </li>
              ))}
              {filteredStashes.length === 0 && (
                <li className="sidebar-empty">No stashes</li>
              )}
            </ul>
          )}
        </div>

        {/* Repos Section */}
        <div className="sidebar-section">
          <button
            className={`sidebar-section-header ${sections.repos ? 'open' : ''}`}
            onClick={() => toggleSection('repos')}
          >
            <span className="section-icon">⌂</span>
            <span className="section-label">Repositories</span>
            <span className="section-count">{filteredRepos.length}</span>
            <span className="section-chevron">{sections.repos ? '▾' : '▸'}</span>
          </button>
          {sections.repos && (
            <ul className="sidebar-items">
              {filteredRepos.map((repo) => (
                <li
                  key={repo.path}
                  className={`sidebar-item ${selectedRepo?.path === repo.path ? 'selected' : ''}`}
                  onClick={() => onSelectRepo?.(repo)}
                  onDoubleClick={() => onDoubleClickRepo?.(repo)}
                >
                  <span className="item-title">{repo.name}</span>
                  {repo.isCurrent && <span className="badge badge-current">•</span>}
                </li>
              ))}
              {filteredRepos.length === 0 && (
                <li className="sidebar-empty">No sibling repos</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

