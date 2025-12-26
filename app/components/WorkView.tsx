import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Branch, Commit, CommitDetails } from '../types/electron'

interface StatusMessage {
  type: 'success' | 'error' | 'info';
  message: string;
  stashed?: string;
}

interface WorkViewProps {
  branches: Branch[];
  currentBranch: string;
  switching: boolean;
  onStatusChange: (status: StatusMessage | null) => void;
  onRefresh: () => Promise<void>;
}

export default function WorkView({ 
  branches, 
  currentBranch, 
  switching,
  onStatusChange,
  onRefresh 
}: WorkViewProps) {
  // State for sidebar
  const [localBranchesOpen, setLocalBranchesOpen] = useState(true)
  const [remoteBranchesOpen, setRemoteBranchesOpen] = useState(false)
  
  // State for selected reference and commit
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  
  // State for commit list
  const [commits, setCommits] = useState<Commit[]>([])
  const [loadingCommits, setLoadingCommits] = useState(false)
  
  // State for commit details
  const [commitDetails, setCommitDetails] = useState<CommitDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Split branches into local and remote
  const localBranches = useMemo(() => 
    branches.filter(b => !b.isRemote).sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  )
  
  const remoteBranches = useMemo(() => 
    branches.filter(b => b.isRemote).sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  )

  // Initialize selected ref to current branch
  useEffect(() => {
    if (!selectedRef && currentBranch) {
      setSelectedRef(currentBranch)
    }
  }, [currentBranch, selectedRef])

  // Load commits when selected ref changes
  useEffect(() => {
    if (!selectedRef) return

    const loadCommits = async () => {
      setLoadingCommits(true)
      setCommits([])
      setSelectedCommit(null)
      setCommitDetails(null)
      
      try {
        const result = await window.electronAPI.getCommitHistoryForRef(selectedRef, 50)
        setCommits(result)
        // Auto-select first commit
        if (result.length > 0) {
          setSelectedCommit(result[0].hash)
        }
      } catch (error) {
        console.error('Error loading commits:', error)
      } finally {
        setLoadingCommits(false)
      }
    }

    loadCommits()
  }, [selectedRef])

  // Load commit details when selected commit changes
  useEffect(() => {
    if (!selectedCommit) {
      setCommitDetails(null)
      return
    }

    const loadDetails = async () => {
      setLoadingDetails(true)
      
      try {
        const details = await window.electronAPI.getCommitDetails(selectedCommit)
        setCommitDetails(details)
      } catch (error) {
        console.error('Error loading commit details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    loadDetails()
  }, [selectedCommit])

  // Handle branch selection
  const handleBranchSelect = useCallback((branch: Branch) => {
    setSelectedRef(branch.name)
  }, [])

  // Handle checkout
  const handleCheckout = useCallback(async (branch: Branch) => {
    if (switching) return
    
    onStatusChange({ type: 'info', message: `Switching to ${branch.name}...` })
    
    try {
      const result = branch.isRemote 
        ? await window.electronAPI.checkoutRemoteBranch(branch.name)
        : await window.electronAPI.checkoutBranch(branch.name)
        
      if (result.success) {
        onStatusChange({ type: 'success', message: result.message, stashed: result.stashed })
        await onRefresh()
      } else {
        onStatusChange({ type: 'error', message: result.message })
      }
    } catch (error) {
      onStatusChange({ type: 'error', message: (error as Error).message })
    }
  }, [switching, onStatusChange, onRefresh])

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  // Format full date
  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get file status icon
  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return '+'
      case 'deleted': return '−'
      case 'modified': return '●'
      case 'renamed': return '→'
      case 'copied': return '⧉'
      default: return '?'
    }
  }

  // Get file status class
  const getFileStatusClass = (status: string) => {
    switch (status) {
      case 'added': return 'file-added'
      case 'deleted': return 'file-deleted'
      case 'modified': return 'file-modified'
      case 'renamed': return 'file-renamed'
      case 'copied': return 'file-copied'
      default: return ''
    }
  }

  return (
    <main className="work-view">
      {/* Sidebar - References */}
      <aside className="work-sidebar">
        <div className="sidebar-section">
          <div 
            className="sidebar-header"
            onClick={() => setLocalBranchesOpen(!localBranchesOpen)}
          >
            <span className={`sidebar-chevron ${localBranchesOpen ? 'open' : ''}`}>▸</span>
            <span className="sidebar-title">Local Branches</span>
            <span className="sidebar-count">{localBranches.length}</span>
          </div>
          {localBranchesOpen && (
            <ul className="sidebar-list">
              {localBranches.map(branch => (
                <li
                  key={branch.name}
                  className={`sidebar-item ${selectedRef === branch.name ? 'selected' : ''} ${branch.current ? 'current' : ''}`}
                  onClick={() => handleBranchSelect(branch)}
                  onDoubleClick={() => handleCheckout(branch)}
                  title={`Double-click to checkout ${branch.name}`}
                >
                  {branch.current && <span className="current-marker">●</span>}
                  <span className="sidebar-item-name">{branch.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-section">
          <div 
            className="sidebar-header"
            onClick={() => setRemoteBranchesOpen(!remoteBranchesOpen)}
          >
            <span className={`sidebar-chevron ${remoteBranchesOpen ? 'open' : ''}`}>▸</span>
            <span className="sidebar-title">Remote Branches</span>
            <span className="sidebar-count">{remoteBranches.length}</span>
          </div>
          {remoteBranchesOpen && (
            <ul className="sidebar-list">
              {remoteBranches.map(branch => (
                <li
                  key={branch.name}
                  className={`sidebar-item ${selectedRef === branch.name ? 'selected' : ''}`}
                  onClick={() => handleBranchSelect(branch)}
                  onDoubleClick={() => handleCheckout(branch)}
                  title={`Double-click to checkout ${branch.name}`}
                >
                  <span className="sidebar-item-name">
                    {branch.name.replace('remotes/', '').replace(/^origin\//, '')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Commit List */}
      <section className="work-commits">
        <div className="work-commits-header">
          <h3>
            Commits
            {selectedRef && <code className="ref-badge">{selectedRef}</code>}
          </h3>
          <span className="commits-count">{commits.length}</span>
        </div>
        <div className="work-commits-list">
          {loadingCommits ? (
            <div className="work-loading">Loading commits...</div>
          ) : commits.length === 0 ? (
            <div className="work-empty">No commits found</div>
          ) : (
            commits.map(commit => (
              <div
                key={commit.hash}
                className={`work-commit-item ${selectedCommit === commit.hash ? 'selected' : ''} ${commit.isMerge ? 'merge' : ''}`}
                onClick={() => setSelectedCommit(commit.hash)}
              >
                <div className="work-commit-graph">
                  <span className="graph-node" />
                </div>
                <div className="work-commit-content">
                  <div className="work-commit-message">{commit.message}</div>
                  <div className="work-commit-meta">
                    <code className="commit-hash">{commit.shortHash}</code>
                    <span className="commit-author">{commit.author}</span>
                    <span className="commit-date">{formatRelativeTime(commit.date)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Detail View */}
      <section className="work-details">
        {!selectedCommit ? (
          <div className="work-empty">Select a commit to view details</div>
        ) : loadingDetails ? (
          <div className="work-loading">Loading details...</div>
        ) : !commitDetails ? (
          <div className="work-empty">Could not load commit details</div>
        ) : (
          <>
            {/* Commit Info Header */}
            <div className="detail-header">
              <h3 className="detail-title">{commitDetails.message}</h3>
              {commitDetails.body && (
                <p className="detail-body">{commitDetails.body}</p>
              )}
              <div className="detail-meta">
                <div className="detail-meta-row">
                  <span className="meta-label">Commit</span>
                  <code className="meta-value hash">{commitDetails.hash}</code>
                </div>
                <div className="detail-meta-row">
                  <span className="meta-label">Author</span>
                  <span className="meta-value">{commitDetails.author} &lt;{commitDetails.authorEmail}&gt;</span>
                </div>
                <div className="detail-meta-row">
                  <span className="meta-label">Date</span>
                  <span className="meta-value">{formatFullDate(commitDetails.date)}</span>
                </div>
                {commitDetails.parentHashes.length > 0 && (
                  <div className="detail-meta-row">
                    <span className="meta-label">Parent{commitDetails.parentHashes.length > 1 ? 's' : ''}</span>
                    <span className="meta-value">
                      {commitDetails.parentHashes.map(h => h.slice(0, 7)).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Files Changed */}
            <div className="detail-files">
              <div className="detail-files-header">
                <span className="files-title">Changed Files</span>
                <span className="files-summary">
                  <span className="diff-additions">+{commitDetails.totalAdditions}</span>
                  <span className="diff-deletions">-{commitDetails.totalDeletions}</span>
                  <span className="files-count">{commitDetails.files.length} files</span>
                </span>
              </div>
              <ul className="files-list">
                {commitDetails.files.map((file, idx) => (
                  <li key={idx} className={`file-item ${getFileStatusClass(file.status)}`}>
                    <span className="file-status-icon">{getFileStatusIcon(file.status)}</span>
                    <span className="file-path">
                      {file.oldPath ? (
                        <>
                          <span className="file-old-path">{file.oldPath}</span>
                          <span className="file-arrow">→</span>
                          {file.path}
                        </>
                      ) : (
                        file.path
                      )}
                    </span>
                    <span className="file-stats">
                      {file.additions > 0 && <span className="diff-additions">+{file.additions}</span>}
                      {file.deletions > 0 && <span className="diff-deletions">-{file.deletions}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

