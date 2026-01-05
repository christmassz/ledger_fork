/**
 * ListPanelHeader - Shared header component for all list panels
 * 
 * Features:
 * - Icon + label + count badge
 * - Optional badge (e.g., branch name)
 * - Funnel icon to toggle filter controls
 * - Active filter indicator badge
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
  /** Active filter label to display when filter is non-default */
  activeFilter?: string
}

export function ListPanelHeader({
  label,
  icon,
  count,
  controlsOpen,
  onToggleControls,
  badge,
  activeFilter,
}: ListPanelHeaderProps) {
  return (
    <div className="column-header list-header">
      <div className="column-title">
        <h2>
          {icon && <span className="column-icon">{icon}</span>}
          {label}
          {badge}
        </h2>
      </div>
      <div className="header-actions">
        {activeFilter && (
          <span className="active-filter-badge" title={`Filtered: ${activeFilter}`}>
            {activeFilter}
          </span>
        )}
        <button
          className={`header-filter-btn ${controlsOpen ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleControls()
          }}
          title="Toggle filters"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M0 1h10L6 5v4L4 10V5L0 1z" />
          </svg>
        </button>
        <span className="count-badge">{count}</span>
      </div>
    </div>
  )
}



