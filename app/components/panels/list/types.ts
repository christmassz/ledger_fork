/**
 * Shared types for list panel components
 */

import type { Column } from '../../../types/app-types'

/**
 * Base props shared by all list panels
 */
export interface ListPanelBaseProps {
  /** Column configuration (for label, icon, etc.) */
  column?: Column
  /** Whether the panel is currently loading */
  loading?: boolean
  /** Error message to display */
  error?: string | null
  /** Format relative time (e.g., "2d ago") */
  formatRelativeTime?: (date: string) => string
}

/**
 * Selection state for list items
 */
export interface ListSelectionProps<T> {
  /** Currently selected item */
  selectedItem?: T | null
  /** Called when an item is clicked (single select) */
  onSelect?: (item: T) => void
  /** Called when an item is double-clicked (action) */
  onDoubleClick?: (item: T) => void
  /** Called for context menu */
  onContextMenu?: (e: React.MouseEvent, item: T) => void
}

/**
 * Header props for collapsible controls
 */
export interface ListPanelHeaderProps {
  label: string
  icon?: string
  count: number
  controlsOpen: boolean
  onToggleControls: () => void
}

