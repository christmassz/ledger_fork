/**
 * ListPanelHeader - Shared header component for all list panels
 * 
 * Features:
 * - Icon + label + count badge
 * - Clickable to toggle controls
 * - Chevron indicator for open/closed state
 */

interface ListPanelHeaderProps {
  label: string
  icon?: string
  count: number
  controlsOpen: boolean
  onToggleControls: () => void
}

export function ListPanelHeader({
  label,
  icon,
  count,
  controlsOpen,
  onToggleControls,
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
        </h2>
        <span className={`header-chevron ${controlsOpen ? 'open' : ''}`}>▾</span>
      </div>
      <span className="count-badge">{count}</span>
    </div>
  )
}


