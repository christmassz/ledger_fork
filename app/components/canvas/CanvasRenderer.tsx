/**
 * CanvasRenderer - The unified canvas rendering system
 * 
 * This is the single entry point for rendering ANY canvas (preset or user-created).
 * It takes all available data and renders the appropriate panels based on canvas config.
 * 
 * Design principles:
 * - One component renders all canvases
 * - Panels are self-contained and reusable
 * - Data flows down, events flow up
 * - Canvas config determines layout, not code
 */

import { useCallback, type ReactNode } from 'react'
import type { Column } from '../../types/app-types'
import type {
  PullRequest,
  Branch,
  Worktree,
  StashEntry,
  GraphCommit,
  WorkingStatus,
  CommitDiff,
} from '../../types/electron'
import { useCanvas } from './CanvasContext'
import { Canvas } from './Canvas'
import { EditorSlot } from './EditorSlot'

// Import panels
import { PRList, BranchList, WorktreeList, StashList } from '../panels/list'
import { GitGraph } from '../panels/viz'

// ========================================
// Data Interface
// ========================================

/**
 * All the data any panel might need.
 * Pass everything - panels take what they need.
 */
export interface CanvasData {
  // Repository
  repoPath: string | null
  
  // Pull requests
  prs: PullRequest[]
  prError: string | null
  
  // Branches
  branches: Branch[]
  currentBranch: string | null
  
  // Worktrees
  worktrees: Worktree[]
  
  // Stashes
  stashes: StashEntry[]
  
  // Commits (for git graph)
  commits: GraphCommit[]
  
  // Working status (for uncommitted changes)
  workingStatus: WorkingStatus | null
  
  // Commit diff (for viewing diffs)
  commitDiff: CommitDiff | null
  loadingDiff: boolean
}

/**
 * Selection state - what's currently selected/focused
 */
export interface CanvasSelection {
  // Selected item (for highlighting in lists)
  selectedPR: PullRequest | null
  selectedBranch: Branch | null
  selectedWorktree: Worktree | null
  selectedStash: StashEntry | null
  selectedCommit: GraphCommit | null
}

/**
 * Event handlers for user interactions
 */
export interface CanvasHandlers {
  // Format helpers
  formatRelativeTime: (date: string) => string
  formatDate: (date: string) => string
  
  // PR handlers
  onSelectPR: (pr: PullRequest) => void
  onDoubleClickPR: (pr: PullRequest) => void
  onContextMenuPR: (e: React.MouseEvent, pr: PullRequest) => void
  
  // Branch handlers
  onSelectBranch: (branch: Branch) => void
  onDoubleClickBranch: (branch: Branch) => void
  onContextMenuLocalBranch: (e: React.MouseEvent, branch: Branch) => void
  onContextMenuRemoteBranch: (e: React.MouseEvent, branch: Branch) => void
  onCreateBranch: () => void
  
  // Worktree handlers
  onSelectWorktree: (worktree: Worktree) => void
  onDoubleClickWorktree: (worktree: Worktree) => void
  onContextMenuWorktree: (e: React.MouseEvent, worktree: Worktree) => void
  onCreateWorktree: () => void
  
  // Stash handlers
  onSelectStash: (stash: StashEntry) => void
  onDoubleClickStash: (stash: StashEntry) => void
  onContextMenuStash?: (e: React.MouseEvent, stash: StashEntry) => void
  
  // Commit/graph handlers
  onSelectCommit: (commit: GraphCommit) => void
  
  // Editor panel rendering (for custom editor content)
  renderEditorContent?: () => ReactNode
}

/**
 * UI state
 */
export interface CanvasUIState {
  switching: boolean  // Branch checkout in progress
  deleting: boolean   // Delete operation in progress
}

export interface CanvasRendererProps {
  data: CanvasData
  selection: CanvasSelection
  handlers: CanvasHandlers
  uiState: CanvasUIState
}

// ========================================
// Canvas Renderer Component
// ========================================

export function CanvasRenderer({
  data,
  selection,
  handlers,
  uiState,
}: CanvasRendererProps) {
  const {
    activeCanvas,
    resizeColumn,
    reorderColumns,
  } = useCanvas()

  // Render a list panel based on column config
  const renderListSlot = useCallback(
    (column: Column): ReactNode => {
      switch (column.panel) {
        case 'pr-list':
          return (
            <PRList
              column={column}
              prs={data.prs}
              selectedPR={selection.selectedPR}
              error={data.prError}
              formatRelativeTime={handlers.formatRelativeTime}
              onSelect={handlers.onSelectPR}
              onDoubleClick={handlers.onDoubleClickPR}
              onContextMenu={handlers.onContextMenuPR}
            />
          )

        case 'branch-list':
          return (
            <BranchList
              column={column}
              branches={data.branches.filter((b) => !b.isRemote)}
              isRemote={false}
              selectedBranch={selection.selectedBranch}
              switching={uiState.switching}
              formatDate={handlers.formatDate}
              onSelect={handlers.onSelectBranch}
              onDoubleClick={handlers.onDoubleClickBranch}
              onContextMenu={handlers.onContextMenuLocalBranch}
              onCreateBranch={handlers.onCreateBranch}
            />
          )

        case 'remote-list':
          return (
            <BranchList
              column={column}
              branches={data.branches.filter((b) => b.isRemote)}
              isRemote={true}
              selectedBranch={selection.selectedBranch}
              switching={uiState.switching}
              formatDate={handlers.formatDate}
              onSelect={handlers.onSelectBranch}
              onDoubleClick={handlers.onDoubleClickBranch}
              onContextMenu={handlers.onContextMenuRemoteBranch}
            />
          )

        case 'worktree-list':
          return (
            <WorktreeList
              column={column}
              worktrees={data.worktrees}
              currentBranch={data.currentBranch}
              repoPath={data.repoPath}
              selectedWorktree={selection.selectedWorktree}
              onSelect={handlers.onSelectWorktree}
              onDoubleClick={handlers.onDoubleClickWorktree}
              onContextMenu={handlers.onContextMenuWorktree}
              onCreateWorktree={handlers.onCreateWorktree}
            />
          )

        case 'stash-list':
          return (
            <StashList
              column={column}
              stashes={data.stashes}
              selectedStash={selection.selectedStash}
              formatRelativeTime={handlers.formatRelativeTime}
              onSelect={handlers.onSelectStash}
              onDoubleClick={handlers.onDoubleClickStash}
              onContextMenu={handlers.onContextMenuStash}
            />
          )

        case 'commit-list':
          // Commits are shown in the git graph viz panel
          return (
            <div className="empty-column">
              <span>Commits shown in graph</span>
            </div>
          )

        case 'unified-list':
          // This is the Focus sidebar - for now, render a placeholder
          // In the full migration, this would be a UnifiedList component
          return (
            <div className="empty-column">
              <span>Unified list (Focus sidebar)</span>
            </div>
          )

        default:
          return (
            <div className="empty-column">
              <span>Unknown panel: {column.panel}</span>
            </div>
          )
      }
    },
    [data, selection, handlers, uiState]
  )

  // Render a viz panel based on column config
  const renderVizSlot = useCallback(
    (column: Column): ReactNode => {
      switch (column.panel) {
        case 'git-graph':
          return (
            <GitGraph
              commits={data.commits}
              selectedCommit={selection.selectedCommit}
              onSelectCommit={handlers.onSelectCommit}
              formatRelativeTime={handlers.formatRelativeTime}
            />
          )

        default:
          return (
            <div className="empty-column">
              <span>Unknown viz panel: {column.panel}</span>
            </div>
          )
      }
    },
    [data.commits, selection.selectedCommit, handlers]
  )

  // Render an editor panel based on column config
  const renderEditorSlot = useCallback(
    (column: Column): ReactNode => {
      // Use EditorSlot which handles back/forward navigation
      return (
        <EditorSlot
          column={column}
          renderPanel={(panel, panelData) => {
            // If there's custom editor content from the parent, use it
            if (handlers.renderEditorContent) {
              return handlers.renderEditorContent()
            }
            
            // Otherwise render based on panel type
            // This will be expanded as we migrate editor panels
            return (
              <div className="editor-slot-empty">
                <div className="editor-slot-empty-icon">◇</div>
                <p>Panel: {panel}</p>
                <p className="editor-slot-empty-hint">
                  {panelData ? 'Has data' : 'Select an item'}
                </p>
              </div>
            )
          }}
        />
      )
    },
    [handlers.renderEditorContent]
  )

  // Handle column resize
  const handleResizeColumn = useCallback(
    (columnId: string, width: number) => {
      if (activeCanvas) {
        resizeColumn(activeCanvas.id, columnId, width)
      }
    },
    [activeCanvas, resizeColumn]
  )

  // Handle column reorder
  const handleReorderColumns = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (activeCanvas) {
        reorderColumns(activeCanvas.id, fromIndex, toIndex)
      }
    },
    [activeCanvas, reorderColumns]
  )

  // Don't render if no active canvas
  if (!activeCanvas) {
    return (
      <div className="canvas-empty">
        <p>No canvas selected</p>
      </div>
    )
  }

  return (
    <Canvas
      canvas={activeCanvas}
      renderListSlot={renderListSlot}
      renderVizSlot={renderVizSlot}
      renderEditorSlot={renderEditorSlot}
      onResizeColumn={handleResizeColumn}
      onReorderColumns={handleReorderColumns}
    />
  )
}

