/**
 * Panel components index
 *
 * Re-exports all panel components for convenient importing.
 * For panel types, see app/types/app-types.ts
 */

// Re-export all editor panels
export {
  DiffPanel,
  CommitCreatePanel,
  BranchDetailPanel,
  PRDetailPanel,
  WorktreeDetailPanel,
  StashDetailPanel,
  WorktreeCreatePanel,
} from './editor'

export type {
  DiffPanelProps,
  CommitCreatePanelProps,
  BranchDetailPanelProps,
  PRDetailPanelProps,
  WorktreeDetailPanelProps,
  StashDetailPanelProps,
  WorktreeCreatePanelProps,
} from './editor'

// Re-export viz panels
export { GitGraph } from './viz'
export type { GitGraphProps } from './viz'
