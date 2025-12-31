/**
 * ListPanelHeader - Shared header component for all list panels
 * 
 * Features:
 * - Icon + label + count badge
 * - Optional badge (e.g., branch name)
 * - Clickable to toggle controls
 * - Chevron indicator for open/closed state
 */

import type { ReactNode } from 'react'

interface ListPanelHeaderProps {
  label: string
  icon?: string
  count: number
  controlsOpen: boolean
  onToggleControls: () => void
  /** Optional badge element (e.g., current branch name) */
  badge?: ReactNode
}

export function ListPanelHeader({
  label,
  icon,
  count,
  controlsOpen,
  onToggleControls,
  badge,
}: ListPanelHeaderProps) {
  return (
    <div
      className={`column-header clickable-header ${controlsOpen ? 'open' : ''}`}
      onClick={onToggleControls}
    >
      <div className="column-title">
        <h2>
          {icon && <span className="column-icon">{icon}</span>}
          {label}
          {badge}
        </h2>
        <span className={`header-chevron ${controlsOpen ? 'open' : ''}`}>▾</span>
      </div>
      <span className="count-badge">{count}</span>
    </div>
  )
}



