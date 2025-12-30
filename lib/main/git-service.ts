import { simpleGit, SimpleGit } from 'simple-git'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { RepositoryContext, getRepositoryManager } from '@/lib/repositories'
import * as BranchService from '@/lib/services/branch'
import * as CommitService from '@/lib/services/commit'
import * as PRService from '@/lib/services/pr'
import * as WorktreeService from '@/lib/services/worktree'

const execAsync = promisify(exec)
const statAsync = promisify(fs.stat)

// Legacy global state - maintained for backward compatibility
// New code should use RepositoryManager instead
// SAFETY: This state is kept in sync by RepositoryManager via setLegacySyncCallback
let git: SimpleGit | null = null
let repoPath: string | null = null

/**
 * Initialize the legacy sync callback
 * This ensures legacy state stays in sync with RepositoryManager
 * Call this once at application startup
 */
export function initializeLegacySync(): void {
  const manager = getRepositoryManager()
  manager.setLegacySyncCallback((newPath: string | null) => {
    if (newPath) {
      repoPath = newPath
      git = simpleGit(newPath)
    } else {
      repoPath = null
      git = null
    }
  })
}

/**
 * @deprecated Use RepositoryManager.open() instead
 * SAFETY: This function should only be called during the transition period.
 * Once all handlers use RepositoryManager, this will be removed.
 */
export function setRepoPath(newPath: string) {
  repoPath = newPath
  git = simpleGit(newPath)
}

/**
 * @deprecated Use RepositoryManager.getActive()?.path instead
 */
export function getRepoPath(): string | null {
  return repoPath
}

/**
 * Clear all legacy global state
 * Use this when you need to ensure no stale state exists
 */
export function clearLegacyState(): void {
  git = null
  repoPath = null
}

/**
 * Helper to get the active repository context
 * Throws if no repository is selected
 *
 * SAFETY: This function ONLY returns the RepositoryManager's active context.
 * It no longer falls back to legacy state to prevent state confusion.
 * If you need legacy compatibility during migration, use the legacy functions directly.
 */
function requireContext(): RepositoryContext {
  const manager = getRepositoryManager()
  const ctx = manager.getActive()
  if (ctx) return ctx

  // SAFETY: No longer falling back to legacy state
  // This prevents the scenario where operations act on the wrong repo
  // If there's no active context in RepositoryManager, we fail fast
  throw new Error('No repository selected. Use RepositoryManager.open() to select a repository.')
}

// Re-export BranchInfo from branch service for backward compatibility
export type { BranchInfo } from '@/lib/services/branch'

/**
 * Pure function: Get branches for a specific repository context
 * @deprecated Use BranchService.getBranches directly
 */
export const getBranchesForContext = BranchService.getBranches

/**
 * Get branches for the active repository
 */
export async function getBranches() {
  return BranchService.getBranches(requireContext())
}

/**
 * Pure function: Get branch metadata for a specific context
 * @deprecated Use BranchService.getBranchMetadata directly
 */
export const getBranchMetadataForContext = BranchService.getBranchMetadata

/**
 * Wrapper for backward compatibility
 */
export async function getBranchMetadata(branchName: string) {
  return BranchService.getBranchMetadata(requireContext(), branchName)
}

/**
 * Pure function: Get unmerged branches for a specific context
 * @deprecated Use BranchService.getUnmergedBranches directly
 */
export const getUnmergedBranchesForContext = BranchService.getUnmergedBranches

/**
 * Wrapper for backward compatibility
 */
export async function getUnmergedBranches(baseBranch: string = 'origin/master'): Promise<string[]> {
  return BranchService.getUnmergedBranches(requireContext(), baseBranch)
}

/**
 * Pure function: Fast branch loading for a specific context
 * Only gets basic info, no per-branch metadata
 * @deprecated Use BranchService.getBranchesBasic directly
 */
export const getBranchesBasicForContext = BranchService.getBranchesBasic

/**
 * Wrapper for backward compatibility
 * Fast branch loading - only gets basic info, no per-branch metadata
 * This is much faster for large repos (single git command vs 3*N commands)
 */
export async function getBranchesBasic() {
  return BranchService.getBranchesBasic(requireContext())
}

/**
 * Pure function: Full metadata loading for a specific context
 * Expensive - should be called in background after initial load
 * @deprecated Use BranchService.getBranchesWithMetadata directly
 */
export const getBranchesWithMetadataForContext = BranchService.getBranchesWithMetadata

/**
 * Wrapper for backward compatibility
 * Full metadata loading - expensive, should be called in background after initial load
 */
export async function getBranchesWithMetadata() {
  return BranchService.getBranchesWithMetadata(requireContext())
}

// Re-export worktree types from worktree service for backward compatibility
export type { WorktreeAgent, WorktreeActivityStatus, BasicWorktree, EnhancedWorktree } from '@/lib/services/worktree'

/**
 * Pure function: Get worktrees for a specific context
 * @deprecated Use WorktreeService.getWorktrees directly
 */
export const getWorktreesForContext = WorktreeService.getWorktrees

/**
 * Wrapper for backward compatibility
 */
export async function getWorktrees() {
  return WorktreeService.getWorktrees(requireContext())
}

/**
 * Pure function: Get enhanced worktrees with agent detection and metadata for a specific context
 * @deprecated Use WorktreeService.getEnhancedWorktrees directly
 */
export const getEnhancedWorktreesForContext = WorktreeService.getEnhancedWorktrees

/**
 * Wrapper for backward compatibility
 */
export async function getEnhancedWorktrees() {
  return WorktreeService.getEnhancedWorktrees(requireContext())
}

/**
 * Pure function: Check if there are uncommitted changes
 * @deprecated Use BranchService.hasUncommittedChanges directly
 */
export const hasUncommittedChangesForContext = BranchService.hasUncommittedChanges

/**
 * Wrapper for backward compatibility
 */
export async function hasUncommittedChanges(): Promise<boolean> {
  return BranchService.hasUncommittedChanges(requireContext())
}

/**
 * Pure function: Stash uncommitted changes for a specific context
 * @deprecated Use BranchService.stashChanges directly
 */
export const stashChangesForContext = BranchService.stashChanges

/**
 * Wrapper for backward compatibility
 */
export async function stashChanges(): Promise<{ stashed: boolean; message: string }> {
  return BranchService.stashChanges(requireContext())
}

/**
 * Pure function: Switch to a local branch for a specific context
 * @deprecated Use BranchService.checkoutBranch directly
 */
export const checkoutBranchForContext = BranchService.checkoutBranch

/**
 * Wrapper for backward compatibility
 */
export async function checkoutBranch(
  branchName: string
): Promise<{ success: boolean; message: string; stashed?: string }> {
  return BranchService.checkoutBranch(requireContext(), branchName)
}

/**
 * Pure function: Push a branch to origin for a specific context
 * @deprecated Use BranchService.pushBranch directly
 */
export const pushBranchForContext = BranchService.pushBranch

/**
 * Wrapper for backward compatibility
 */
export async function pushBranch(
  branchName?: string,
  setUpstream: boolean = true
): Promise<{ success: boolean; message: string }> {
  return BranchService.pushBranch(requireContext(), branchName, setUpstream)
}

/**
 * Pure function: Create a new branch for a specific context
 * @deprecated Use BranchService.createBranch directly
 */
export const createBranchForContext = BranchService.createBranch

/**
 * Wrapper for backward compatibility
 */
export async function createBranch(
  branchName: string,
  checkout: boolean = true
): Promise<{ success: boolean; message: string }> {
  return BranchService.createBranch(requireContext(), branchName, checkout)
}

/**
 * Pure function: Checkout a remote branch for a specific context
 * @deprecated Use BranchService.checkoutRemoteBranch directly
 */
export const checkoutRemoteBranchForContext = BranchService.checkoutRemoteBranch

/**
 * Wrapper for backward compatibility
 */
export async function checkoutRemoteBranch(
  remoteBranch: string
): Promise<{ success: boolean; message: string; stashed?: string }> {
  return BranchService.checkoutRemoteBranch(requireContext(), remoteBranch)
}

/**
 * Get the path of a worktree to open (identity function for compatibility)
 * @deprecated Use WorktreeService.getWorktreePath directly
 */
export const getWorktreePath = WorktreeService.getWorktreePath

// Re-export PR types from PR service for backward compatibility
export type { PullRequest, MergeMethod } from '@/lib/services/pr'

/**
 * Pure function: Get pull requests for a specific context
 * @deprecated Use PRService.getPullRequests directly
 */
export const getPullRequestsForContext = PRService.getPullRequests

/**
 * Fetch open pull requests using GitHub CLI
 */
export async function getPullRequests() {
  return PRService.getPullRequests(requireContext())
}

/**
 * Open a PR in the browser
 * Note: This function doesn't need context as it just opens a URL
 */
export const openPullRequest = PRService.openPullRequest

// Re-export CreatePROptions type
export type { CreatePROptions, MergePROptions } from '@/lib/services/pr'

/**
 * Pure function: Create a pull request for a specific context
 * @deprecated Use PRService.createPullRequest directly
 */
export const createPullRequestForContext = PRService.createPullRequest

/**
 * Create a new pull request
 */
export async function createPullRequest(options: {
  title: string
  body?: string
  headBranch?: string
  baseBranch?: string
  draft?: boolean
  web?: boolean
}) {
  return PRService.createPullRequest(requireContext(), options)
}

/**
 * Pure function: Merge a pull request for a specific context
 * @deprecated Use PRService.mergePullRequest directly
 */
export const mergePullRequestForContext = PRService.mergePullRequest

/**
 * Merge a pull request (full options)
 */
export async function mergePullRequest(
  prNumber: number,
  options?: {
    method?: 'merge' | 'squash' | 'rebase'
    deleteAfterMerge?: boolean
  }
) {
  return PRService.mergePullRequest(requireContext(), prNumber, options)
}

// ========================================
// PR Review Types and Functions
// ========================================

// Re-export PR detail types from PR service
export type { PRComment, PRReview, PRFile, PRCommit, PRReviewComment, PRDetail } from '@/lib/services/pr'

/**
 * Pure function: Get PR detail for a specific context
 * @deprecated Use PRService.getPRDetail directly
 */
export const getPRDetailForContext = PRService.getPRDetail

/**
 * Get detailed PR information including comments, reviews, files
 */
export async function getPRDetail(prNumber: number) {
  return PRService.getPRDetail(requireContext(), prNumber)
}

/**
 * Pure function: Get PR review comments for a specific context
 * @deprecated Use PRService.getPRReviewComments directly
 */
export const getPRReviewCommentsForContext = PRService.getPRReviewComments

/**
 * Get line-specific review comments for a PR
 */
export async function getPRReviewComments(prNumber: number) {
  return PRService.getPRReviewComments(requireContext(), prNumber)
}

/**
 * Pure function: Get PR file diff for a specific context
 * @deprecated Use PRService.getPRFileDiff directly
 */
export const getPRFileDiffForContext = PRService.getPRFileDiff

/**
 * Get the diff for a specific file in a PR
 */
export async function getPRFileDiff(prNumber: number, filePath: string) {
  return PRService.getPRFileDiff(requireContext(), prNumber, filePath)
}

/**
 * Pure function: Comment on a PR for a specific context
 * @deprecated Use PRService.commentOnPR directly
 */
export const commentOnPRForContext = PRService.commentOnPR

/**
 * Add a comment to a PR
 */
export async function commentOnPR(prNumber: number, body: string): Promise<{ success: boolean; message: string }> {
  return PRService.commentOnPR(requireContext(), prNumber, body)
}

/**
 * Pure function: Merge a PR for a specific context
 * @deprecated Use PRService.mergePR directly
 */
export const mergePRForContext = PRService.mergePR

/**
 * Merge a PR
 */
export async function mergePR(prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<{ success: boolean; message: string }> {
  return PRService.mergePR(requireContext(), prNumber, mergeMethod)
}

/**
 * Pure function: Get GitHub URL for a specific context
 * @deprecated Use PRService.getGitHubUrl directly
 */
export const getGitHubUrlForContext = PRService.getGitHubUrl

/**
 * Get the GitHub remote URL for the repository
 */
export async function getGitHubUrl(): Promise<string | null> {
  return PRService.getGitHubUrl(requireContext())
}

/**
 * Pure function: Open a branch in GitHub for a specific context
 * @deprecated Use PRService.openBranchInGitHub directly
 */
export const openBranchInGitHubForContext = PRService.openBranchInGitHub

/**
 * Open a branch in GitHub
 */
export async function openBranchInGitHub(branchName: string): Promise<{ success: boolean; message: string }> {
  return PRService.openBranchInGitHub(requireContext(), branchName)
}

// Pull/fetch a remote branch
export async function pullBranch(remoteBranch: string): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    // Extract remote and branch name
    const cleanBranch = remoteBranch.replace(/^remotes\//, '')
    const parts = cleanBranch.split('/')
    const remote = parts[0] // e.g., "origin"
    const branch = parts.slice(1).join('/') // e.g., "feature/something"

    // Fetch the specific branch
    await git.fetch(remote, branch)

    return { success: true, message: `Fetched ${branch} from ${remote}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Re-export CommitInfo from commit service for backward compatibility
export type { CommitInfo } from '@/lib/services/commit'

/**
 * Pure function: Get commit history for a specific context
 * @deprecated Use CommitService.getCommitHistory directly
 */
export const getCommitHistoryForContext = CommitService.getCommitHistory

/**
 * Get recent commit history for the current branch
 */
export async function getCommitHistory(limit: number = 20) {
  return CommitService.getCommitHistory(requireContext(), limit)
}

// Re-export UncommittedFile from commit service for backward compatibility
export type { UncommittedFile } from '@/lib/services/commit'

/**
 * Pure function: Get uncommitted files for a specific context
 * @deprecated Use CommitService.getUncommittedFiles directly
 */
export const getUncommittedFilesForContext = CommitService.getUncommittedFiles

/**
 * Get list of uncommitted files (staged + unstaged + untracked)
 */
export async function getUncommittedFiles() {
  return CommitService.getUncommittedFiles(requireContext())
}

// Get working directory status summary
export interface WorkingStatus {
  hasChanges: boolean
  files: UncommittedFile[]
  stagedCount: number
  unstagedCount: number
  additions: number
  deletions: number
}

export async function getWorkingStatus(): Promise<WorkingStatus> {
  if (!git) throw new Error('No repository selected')

  const files = await getUncommittedFiles()
  const stagedCount = files.filter((f) => f.staged).length
  const unstagedCount = files.filter((f) => !f.staged).length

  // Get line change stats (both staged and unstaged)
  let additions = 0
  let deletions = 0
  try {
    // Get unstaged changes
    const unstagedDiff = await git.diff(['--stat'])
    if (unstagedDiff.trim()) {
      const lines = unstagedDiff.trim().split('\n')
      const summaryLine = lines[lines.length - 1]
      const addMatch = summaryLine.match(/(\d+) insertions?\(\+\)/)
      const delMatch = summaryLine.match(/(\d+) deletions?\(-\)/)
      additions += addMatch ? parseInt(addMatch[1]) : 0
      deletions += delMatch ? parseInt(delMatch[1]) : 0
    }

    // Get staged changes
    const stagedDiff = await git.diff(['--cached', '--stat'])
    if (stagedDiff.trim()) {
      const lines = stagedDiff.trim().split('\n')
      const summaryLine = lines[lines.length - 1]
      const addMatch = summaryLine.match(/(\d+) insertions?\(\+\)/)
      const delMatch = summaryLine.match(/(\d+) deletions?\(-\)/)
      additions += addMatch ? parseInt(addMatch[1]) : 0
      deletions += delMatch ? parseInt(delMatch[1]) : 0
    }
  } catch {
    // Ignore diff errors
  }

  return {
    hasChanges: files.length > 0,
    files,
    stagedCount,
    unstagedCount,
    additions,
    deletions,
  }
}

// Re-export ResetResult from commit service for backward compatibility
export type { ResetResult } from '@/lib/services/commit'

/**
 * Pure function: Reset to a specific commit for a specific context
 * @deprecated Use CommitService.resetToCommit directly
 */
export const resetToCommitForContext = CommitService.resetToCommit

/**
 * Reset to a specific commit
 */
export async function resetToCommit(
  commitHash: string,
  mode: 'soft' | 'mixed' | 'hard' = 'hard'
) {
  return CommitService.resetToCommit(requireContext(), commitHash, mode)
}

// Re-export commit detail types from commit service for backward compatibility
export type { CommitFileChange, CommitDetails } from '@/lib/services/commit'

/**
 * Pure function: Get commit details for a specific context
 * @deprecated Use CommitService.getCommitDetails directly
 */
export const getCommitDetailsForContext = CommitService.getCommitDetails

/**
 * Get detailed information about a specific commit
 */
export async function getCommitDetails(commitHash: string) {
  return CommitService.getCommitDetails(requireContext(), commitHash)
}

/**
 * Pure function: Get commit history for a specific ref and context
 * @deprecated Use CommitService.getCommitHistoryForRef directly
 */
export const getCommitHistoryForRefForContext = CommitService.getCommitHistoryForRef

/**
 * Get commit history for a specific branch/ref
 */
export async function getCommitHistoryForRef(ref: string, limit: number = 50) {
  return CommitService.getCommitHistoryForRef(requireContext(), ref, limit)
}

/**
 * Pure function: Convert a worktree to a branch for a specific context
 * Takes changes from a worktree, creates a new branch from master/main with the folder name, and applies the changes
 */
export async function convertWorktreeToBranchForContext(
  ctx: RepositoryContext,
  worktreePath: string
): Promise<{ success: boolean; message: string; branchName?: string }> {
  try {
    // Get the folder name from the worktree path to use as branch name
    const folderName = path.basename(worktreePath)

    // Sanitize folder name for use as branch name (replace spaces and special chars)
    const branchName = folderName
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')

    if (!branchName) {
      return { success: false, message: 'Could not derive a valid branch name from the folder' }
    }

    // Check if branch already exists
    const branches = await ctx.git.branchLocal()
    if (branches.all.includes(branchName)) {
      return { success: false, message: `Branch '${branchName}' already exists` }
    }

    // Find the base branch (master or main)
    let baseBranch = 'master'
    try {
      await ctx.git.raw(['rev-parse', '--verify', 'origin/master'])
    } catch {
      try {
        await ctx.git.raw(['rev-parse', '--verify', 'origin/main'])
        baseBranch = 'main'
      } catch {
        // Try local master/main
        if (branches.all.includes('main')) {
          baseBranch = 'main'
        } else if (!branches.all.includes('master')) {
          return { success: false, message: 'Could not find master or main branch' }
        }
      }
    }

    // Get the diff from the worktree as a patch
    const { stdout: patchOutput } = await execAsync('git diff HEAD', { cwd: worktreePath })

    // Also get untracked files
    const { stdout: untrackedOutput } = await execAsync('git ls-files --others --exclude-standard', {
      cwd: worktreePath,
    })
    const untrackedFiles = untrackedOutput.split('\n').filter(Boolean)

    // Check if there are any changes
    if (!patchOutput.trim() && untrackedFiles.length === 0) {
      return { success: false, message: 'No changes to convert - worktree is clean' }
    }

    // Stash any changes in the main repo first
    const stashResult = await stashChangesForContext(ctx)

    // Create a new branch from the base branch
    const baseRef = branches.all.includes(baseBranch) ? baseBranch : `origin/${baseBranch}`
    await ctx.git.checkout(['-b', branchName, baseRef])

    // Apply the patch if there are tracked file changes
    if (patchOutput.trim()) {
      // Write patch to a temp file
      const tempPatchFile = path.join(ctx.path, '.ledger-temp-patch')
      try {
        await fs.promises.writeFile(tempPatchFile, patchOutput)
        await execAsync(`git apply --3way "${tempPatchFile}"`, { cwd: ctx.path })
      } catch (applyError) {
        // If apply fails, try to apply with less strict options
        try {
          await execAsync(`git apply --reject --whitespace=fix "${tempPatchFile}"`, { cwd: ctx.path })
        } catch {
          // Clean up and revert to the base branch
          try {
            await fs.promises.unlink(tempPatchFile)
          } catch {
            /* ignore */
          }
          await ctx.git.checkout(stashResult.stashed ? '-' : baseBranch)
          await ctx.git.branch(['-D', branchName])
          if (stashResult.stashed) {
            await ctx.git.stash(['pop'])
          }
          return { success: false, message: `Failed to apply changes: ${(applyError as Error).message}` }
        }
      } finally {
        // Clean up temp file
        try {
          await fs.promises.unlink(tempPatchFile)
        } catch {
          /* ignore */
        }
      }
    }

    // Copy untracked files from worktree to main repo
    for (const file of untrackedFiles) {
      const srcPath = path.join(worktreePath, file)
      const destPath = path.join(ctx.path, file)

      // Ensure destination directory exists
      const destDir = path.dirname(destPath)
      await fs.promises.mkdir(destDir, { recursive: true })

      // Copy the file
      await fs.promises.copyFile(srcPath, destPath)
    }

    // Stage all changes
    await ctx.git.add(['-A'])

    // Commit the changes
    const commitMessage = `Changes from worktree: ${folderName}`
    await ctx.git.commit(commitMessage)

    return {
      success: true,
      message: `Created branch '${branchName}' with changes from worktree`,
      branchName,
    }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Wrapper for backward compatibility
 */
export async function convertWorktreeToBranch(
  worktreePath: string
): Promise<{ success: boolean; message: string; branchName?: string }> {
  return convertWorktreeToBranchForContext(requireContext(), worktreePath)
}

/**
 * Pure function: Apply changes from a worktree to the main repo for a specific context
 */
export async function applyWorktreeChangesForContext(
  ctx: RepositoryContext,
  worktreePath: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if this is the current worktree (main repo)
    if (worktreePath === ctx.path) {
      return { success: false, message: 'Cannot apply from the main repository to itself' }
    }

    // Get the diff from the worktree as a patch
    const { stdout: patchOutput } = await execAsync('git diff HEAD', { cwd: worktreePath })

    // Also get list of untracked files
    const { stdout: untrackedOutput } = await execAsync('git ls-files --others --exclude-standard', {
      cwd: worktreePath,
    })
    const untrackedFiles = untrackedOutput.split('\n').filter(Boolean)

    // Check if there are any changes
    if (!patchOutput.trim() && untrackedFiles.length === 0) {
      return { success: false, message: 'No changes to apply - worktree is clean' }
    }

    // Apply the patch if there are tracked file changes
    if (patchOutput.trim()) {
      // Write patch to a temp file
      const tempPatchFile = path.join(ctx.path, '.ledger-temp-patch')
      try {
        await fs.promises.writeFile(tempPatchFile, patchOutput)
        await execAsync(`git apply --3way "${tempPatchFile}"`, { cwd: ctx.path })
        await fs.promises.unlink(tempPatchFile)
      } catch (_applyError) {
        // If apply fails, try with less strict options
        try {
          await execAsync(`git apply --reject --whitespace=fix "${tempPatchFile}"`, { cwd: ctx.path })
          await fs.promises.unlink(tempPatchFile)
        } catch {
          try {
            await fs.promises.unlink(tempPatchFile)
          } catch {
            /* ignore */
          }
          return { success: false, message: 'Failed to apply changes - patch may have conflicts' }
        }
      }
    }

    // Copy untracked files
    for (const file of untrackedFiles) {
      const srcPath = path.join(worktreePath, file)
      const destPath = path.join(ctx.path, file)

      // Ensure destination directory exists
      const destDir = path.dirname(destPath)
      await fs.promises.mkdir(destDir, { recursive: true })

      // Copy the file
      await fs.promises.copyFile(srcPath, destPath)
    }

    const folderName = path.basename(worktreePath)
    return {
      success: true,
      message: `Applied changes from worktree: ${folderName}`,
    }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Wrapper for backward compatibility
 */
export async function applyWorktreeChanges(worktreePath: string): Promise<{ success: boolean; message: string }> {
  return applyWorktreeChangesForContext(requireContext(), worktreePath)
}

/**
 * Pure function: Remove a worktree for a specific context
 */
export async function removeWorktreeForContext(
  ctx: RepositoryContext,
  worktreePath: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if this is the current worktree (main repo)
    if (worktreePath === ctx.path) {
      return { success: false, message: 'Cannot remove the main repository worktree' }
    }

    // Get worktree info to check for uncommitted changes
    const worktrees = await getWorktreesForContext(ctx)
    const worktree = worktrees.find((wt) => wt.path === worktreePath)

    if (!worktree) {
      return { success: false, message: 'Worktree not found' }
    }

    // Check for uncommitted changes if not forcing
    if (!force) {
      try {
        const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: worktreePath })
        if (statusOutput.trim()) {
          return { success: false, message: 'Worktree has uncommitted changes. Use force to remove anyway.' }
        }
      } catch {
        // If we can't check status, proceed with caution
      }
    }

    // Remove the worktree
    const args = ['worktree', 'remove']
    if (force) {
      args.push('--force')
    }
    args.push(worktreePath)

    await ctx.git.raw(args)

    return {
      success: true,
      message: `Removed worktree: ${path.basename(worktreePath)}`,
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    if (errorMsg.includes('contains modified or untracked files')) {
      return { success: false, message: 'Worktree has uncommitted changes. Use force to remove anyway.' }
    }
    return { success: false, message: errorMsg }
  }
}

/**
 * Wrapper for backward compatibility
 */
export async function removeWorktree(
  worktreePath: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  return removeWorktreeForContext(requireContext(), worktreePath, force)
}

// Create a new worktree
export interface CreateWorktreeOptions {
  branchName: string
  isNewBranch: boolean
  folderPath: string
}

/**
 * Pure function: Create a new worktree for a specific context
 */
export async function createWorktreeForContext(
  ctx: RepositoryContext,
  options: CreateWorktreeOptions
): Promise<{ success: boolean; message: string; path?: string }> {
  const { branchName, isNewBranch, folderPath } = options

  try {
    // Validate branch name
    if (!branchName || !branchName.trim()) {
      return { success: false, message: 'Branch name is required' }
    }

    // Validate folder path
    if (!folderPath || !folderPath.trim()) {
      return { success: false, message: 'Folder path is required' }
    }

    // Check if folder already exists
    if (fs.existsSync(folderPath)) {
      return { success: false, message: `Folder already exists: ${folderPath}` }
    }

    // Check if branch already exists (for new branches)
    const branches = await ctx.git.branchLocal()
    const branchExists = branches.all.includes(branchName)

    if (isNewBranch && branchExists) {
      return { success: false, message: `Branch '${branchName}' already exists` }
    }

    if (!isNewBranch && !branchExists) {
      // Check if it's a remote branch we can track
      const remoteBranches = await ctx.git.branch(['-r'])
      const remoteBranchName = `origin/${branchName}`
      if (!remoteBranches.all.includes(remoteBranchName)) {
        return { success: false, message: `Branch '${branchName}' does not exist` }
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(folderPath)
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true })
    }

    // Create the worktree
    if (isNewBranch) {
      // Create worktree with new branch: git worktree add -b <branch> <path>
      await ctx.git.raw(['worktree', 'add', '-b', branchName, folderPath])
    } else {
      // Create worktree with existing branch: git worktree add <path> <branch>
      await ctx.git.raw(['worktree', 'add', folderPath, branchName])
    }

    return {
      success: true,
      message: `Created worktree at ${path.basename(folderPath)} on branch ${branchName}`,
      path: folderPath,
    }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Wrapper for backward compatibility
 */
export async function createWorktree(
  options: CreateWorktreeOptions
): Promise<{ success: boolean; message: string; path?: string }> {
  return createWorktreeForContext(requireContext(), options)
}

/**
 * Pure function: Checkout a PR branch for a specific context
 * @deprecated Use PRService.checkoutPRBranch directly
 */
export const checkoutPRBranchForContext = PRService.checkoutPRBranch

/**
 * Checkout a PR branch (by branch name)
 */
export async function checkoutPRBranch(
  branchName: string
): Promise<{ success: boolean; message: string; stashed?: string }> {
  return PRService.checkoutPRBranch(requireContext(), branchName)
}

// ========================================
// Focus Mode APIs
// ========================================

// Re-export GraphCommit from commit service for backward compatibility
export type { GraphCommit } from '@/lib/services/commit'

/**
 * Pure function: Get commit graph history for a specific context
 * @deprecated Use CommitService.getCommitGraphHistory directly
 */
export const getCommitGraphHistoryForContext = CommitService.getCommitGraphHistory

/**
 * Get commit history with parent info for git graph
 * skipStats=true makes this much faster for initial load (100x fewer git commands)
 * showCheckpoints=false hides Conductor checkpoint commits (checkpoint:... messages)
 */
export async function getCommitGraphHistory(
  limit: number = 100,
  skipStats: boolean = false,
  showCheckpoints: boolean = false
) {
  return CommitService.getCommitGraphHistory(requireContext(), limit, skipStats, showCheckpoints)
}

// Re-export diff types from commit service for backward compatibility
export type { DiffFile, DiffHunk, DiffLine, FileDiff, CommitDiff } from '@/lib/services/commit'

/**
 * Pure function: Get commit diff for a specific context
 * @deprecated Use CommitService.getCommitDiff directly
 */
export const getCommitDiffForContext = CommitService.getCommitDiff

/**
 * Get diff for a specific commit
 */
export async function getCommitDiff(commitHash: string) {
  return CommitService.getCommitDiff(requireContext(), commitHash)
}

// Branch diff interface - shows diff between a branch and master/main
export interface BranchDiff {
  branchName: string
  baseBranch: string
  files: FileDiff[]
  totalAdditions: number
  totalDeletions: number
  commitCount: number
}

// Get diff for a branch compared to master/main
export async function getBranchDiff(branchName: string): Promise<BranchDiff | null> {
  if (!git) throw new Error('No repository selected')

  try {
    // Find the base branch (master or main)
    let baseBranch = 'origin/master'
    try {
      await git.raw(['rev-parse', '--verify', 'origin/master'])
    } catch {
      try {
        await git.raw(['rev-parse', '--verify', 'origin/main'])
        baseBranch = 'origin/main'
      } catch {
        // Try local master/main
        const branches = await git.branchLocal()
        if (branches.all.includes('main')) {
          baseBranch = 'main'
        } else if (branches.all.includes('master')) {
          baseBranch = 'master'
        } else {
          return null // No base branch found
        }
      }
    }

    // Count commits between base and branch
    let commitCount = 0
    try {
      const countOutput = await git.raw(['rev-list', '--count', `${baseBranch}..${branchName}`])
      commitCount = parseInt(countOutput.trim()) || 0
    } catch {
      // Ignore count errors
    }

    // Get diff between base and branch (three-dot syntax shows changes since branches diverged)
    const diffOutput = await git.raw(['diff', `${baseBranch}...${branchName}`, '--patch', '--stat'])

    if (!diffOutput.trim()) {
      return {
        branchName,
        baseBranch: baseBranch.replace('origin/', ''),
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        commitCount,
      }
    }

    // Parse the diff output (same logic as getCommitDiff)
    const files: FileDiff[] = []
    let totalAdditions = 0
    let totalDeletions = 0

    // Split by file diffs
    const diffParts = diffOutput.split(/^diff --git /m).filter(Boolean)

    for (const part of diffParts) {
      const lines = part.split('\n')

      // Parse file header
      const headerMatch = lines[0].match(/a\/(.+) b\/(.+)/)
      if (!headerMatch) continue

      const oldPath = headerMatch[1]
      const newPath = headerMatch[2]

      // Determine status
      let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'
      if (part.includes('new file mode')) status = 'added'
      else if (part.includes('deleted file mode')) status = 'deleted'
      else if (oldPath !== newPath) status = 'renamed'

      // Check for binary
      const isBinary = part.includes('Binary files')

      // Parse hunks
      const hunks: DiffHunk[] = []
      let fileAdditions = 0
      let fileDeletions = 0

      if (!isBinary) {
        const hunkMatches = part.matchAll(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/g)

        for (const match of hunkMatches) {
          const oldStart = parseInt(match[1])
          const oldLinesCount = match[2] ? parseInt(match[2]) : 1
          const newStart = parseInt(match[3])
          const newLinesCount = match[4] ? parseInt(match[4]) : 1

          // Find the lines after this hunk header
          const hunkStartIndex = part.indexOf(match[0])
          const hunkContent = part.slice(hunkStartIndex + match[0].length)
          const hunkLines: DiffLine[] = []

          let oldLine = oldStart
          let newLine = newStart

          for (const line of hunkContent.split('\n')) {
            if (line.startsWith('@@') || line.startsWith('diff --git')) break

            if (line.startsWith('+') && !line.startsWith('+++')) {
              hunkLines.push({ type: 'add', content: line.slice(1), newLineNumber: newLine })
              newLine++
              fileAdditions++
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              hunkLines.push({ type: 'delete', content: line.slice(1), oldLineNumber: oldLine })
              oldLine++
              fileDeletions++
            } else if (line.startsWith(' ')) {
              hunkLines.push({
                type: 'context',
                content: line.slice(1),
                oldLineNumber: oldLine,
                newLineNumber: newLine,
              })
              oldLine++
              newLine++
            }
          }

          hunks.push({
            oldStart,
            oldLines: oldLinesCount,
            newStart,
            newLines: newLinesCount,
            lines: hunkLines,
          })
        }
      }

      totalAdditions += fileAdditions
      totalDeletions += fileDeletions

      files.push({
        file: {
          path: newPath,
          status,
          additions: fileAdditions,
          deletions: fileDeletions,
          oldPath: status === 'renamed' ? oldPath : undefined,
        },
        hunks,
        isBinary,
      })
    }

    return {
      branchName,
      baseBranch: baseBranch.replace('origin/', ''),
      files,
      totalAdditions,
      totalDeletions,
      commitCount,
    }
  } catch (error) {
    console.error('Error getting branch diff:', error)
    return null
  }
}

// Stash entry
export interface StashEntry {
  index: number
  message: string
  branch: string
  date: string
}

// Get list of stashes
export async function getStashes(): Promise<StashEntry[]> {
  if (!git) throw new Error('No repository selected')

  try {
    const output = await git.raw(['stash', 'list', '--format=%gd|%gs|%ci'])

    if (!output.trim()) {
      return []
    }

    const stashes: StashEntry[] = []
    const lines = output.trim().split('\n')

    for (const line of lines) {
      const [indexStr, message, date] = line.split('|')
      // Parse stash@{0} to get index
      const indexMatch = indexStr.match(/stash@\{(\d+)\}/)
      const index = indexMatch ? parseInt(indexMatch[1]) : 0

      // Extract branch from message if present (format: "WIP on branch: message" or "On branch: message")
      const branchMatch = message.match(/(?:WIP )?[Oo]n ([^:]+):/)
      const branch = branchMatch ? branchMatch[1] : ''

      stashes.push({
        index,
        message: message.replace(/^(?:WIP )?[Oo]n [^:]+: /, ''),
        branch,
        date,
      })
    }

    return stashes
  } catch {
    return []
  }
}

// Get files changed in a stash
export interface StashFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
}

export async function getStashFiles(stashIndex: number): Promise<StashFile[]> {
  if (!git) throw new Error('No repository selected')

  try {
    // Run numstat and name-status separately (combining them only returns name-status)
    const [numstatOutput, nameStatusOutput] = await Promise.all([
      git.raw(['stash', 'show', `stash@{${stashIndex}}`, '--numstat']),
      git.raw(['stash', 'show', `stash@{${stashIndex}}`, '--name-status']),
    ])

    if (!numstatOutput.trim() && !nameStatusOutput.trim()) {
      return []
    }

    const files: StashFile[] = []

    // Parse numstat output (additions deletions filename)
    const numstatLines: Map<string, { additions: number; deletions: number }> = new Map()
    for (const line of numstatOutput.trim().split('\n')) {
      const numstatMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
      if (numstatMatch) {
        const [, adds, dels, path] = numstatMatch
        numstatLines.set(path, {
          additions: adds === '-' ? 0 : parseInt(adds),
          deletions: dels === '-' ? 0 : parseInt(dels),
        })
      }
    }

    // Parse name-status output (status filename)
    const statusLines: Map<string, string> = new Map()
    for (const line of nameStatusOutput.trim().split('\n')) {
      const statusMatch = line.match(/^([AMDRC])\t(.+)$/)
      if (statusMatch) {
        const [, status, path] = statusMatch
        statusLines.set(path, status)
      }
    }

    // Combine the information
    for (const [path, stats] of numstatLines) {
      const statusCode = statusLines.get(path) || 'M'
      let status: StashFile['status'] = 'modified'

      switch (statusCode) {
        case 'A':
          status = 'added'
          break
        case 'D':
          status = 'deleted'
          break
        case 'R':
          status = 'renamed'
          break
        default:
          status = 'modified'
      }

      files.push({
        path,
        status,
        additions: stats.additions,
        deletions: stats.deletions,
      })
    }

    return files
  } catch {
    return []
  }
}

// Get diff for a specific file in a stash
// Note: git stash show doesn't support -- filepath syntax, so we use git diff instead
export async function getStashFileDiff(stashIndex: number, filePath: string): Promise<string | null> {
  if (!git) throw new Error('No repository selected')

  try {
    // Compare the stash's parent commit with the stash itself for the specific file
    const stashRef = `stash@{${stashIndex}}`
    const output = await git.raw(['diff', `${stashRef}^`, stashRef, '--', filePath])
    return output || null
  } catch {
    return null
  }
}

// Get full diff for a stash
export async function getStashDiff(stashIndex: number): Promise<string | null> {
  if (!git) throw new Error('No repository selected')

  try {
    const output = await git.raw(['stash', 'show', '-p', `stash@{${stashIndex}}`])
    return output || null
  } catch {
    return null
  }
}

// Apply a stash (keeps stash in list)
export async function applyStash(stashIndex: number): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['stash', 'apply', `stash@{${stashIndex}}`])
    return { success: true, message: `Applied stash@{${stashIndex}}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Pop a stash (applies and removes from list)
export async function popStash(stashIndex: number): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['stash', 'pop', `stash@{${stashIndex}}`])
    return { success: true, message: `Applied and removed stash@{${stashIndex}}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Drop a stash (removes without applying)
export async function dropStash(stashIndex: number): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['stash', 'drop', `stash@{${stashIndex}}`])
    return { success: true, message: `Dropped stash@{${stashIndex}}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Create a branch from a stash
export async function stashToBranch(
  stashIndex: number,
  branchName: string
): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    // git stash branch <branchname> [<stash>]
    // Creates a new branch starting from the commit at which the stash was created,
    // applies the stash, and drops it if successful
    await git.raw(['stash', 'branch', branchName, `stash@{${stashIndex}}`])
    return { success: true, message: `Created branch '${branchName}' from stash@{${stashIndex}}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// ========================================
// Staging & Commit Functions
// ========================================

// Stage a single file
export async function stageFile(filePath: string): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.add(filePath)
    return { success: true, message: `Staged ${filePath}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Unstage a single file
export async function unstageFile(filePath: string): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['restore', '--staged', filePath])
    return { success: true, message: `Unstaged ${filePath}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Stage all changes
export async function stageAll(): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.add('-A')
    return { success: true, message: 'Staged all changes' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Unstage all changes
export async function unstageAll(): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['restore', '--staged', '.'])
    return { success: true, message: 'Unstaged all changes' }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Discard changes in a file (revert to last commit)
export async function discardFileChanges(filePath: string): Promise<{ success: boolean; message: string }> {
  if (!git) throw new Error('No repository selected')

  try {
    await git.raw(['restore', filePath])
    return { success: true, message: `Discarded changes in ${filePath}` }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// Staging file diff types (for working directory changes)
export interface StagingDiffHunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: StagingDiffLine[]
}

export interface StagingDiffLine {
  type: 'context' | 'add' | 'delete'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface StagingFileDiff {
  filePath: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  hunks: StagingDiffHunk[]
  isBinary: boolean
  additions: number
  deletions: number
}

// Get diff for a specific file
export async function getFileDiff(filePath: string, staged: boolean): Promise<StagingFileDiff | null> {
  if (!git) throw new Error('No repository selected')

  try {
    const args = staged ? ['diff', '--staged', '--', filePath] : ['diff', '--', filePath]

    const diffOutput = await git.raw(args)

    // If no diff output, the file might be untracked
    if (!diffOutput.trim()) {
      // Check if it's an untracked file
      const status = await git.status()
      const isUntracked = status.not_added.includes(filePath)

      if (isUntracked) {
        // Read the file content for untracked files
        const fullPath = path.join(repoPath!, filePath)
        try {
          const content = await fs.promises.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          return {
            filePath,
            status: 'untracked',
            isBinary: false,
            additions: lines.length,
            deletions: 0,
            hunks: [
              {
                header: `@@ -0,0 +1,${lines.length} @@`,
                oldStart: 0,
                oldLines: 0,
                newStart: 1,
                newLines: lines.length,
                lines: lines.map((line, idx) => ({
                  type: 'add' as const,
                  content: line,
                  newLineNumber: idx + 1,
                })),
              },
            ],
          }
        } catch {
          return null
        }
      }

      return null
    }

    // Parse the diff output
    return parseDiff(diffOutput, filePath)
  } catch (error) {
    console.error('Error getting file diff:', error)
    return null
  }
}

// Parse unified diff format
function parseDiff(diffOutput: string, filePath: string): StagingFileDiff {
  const lines = diffOutput.split('\n')
  const hunks: StagingDiffHunk[] = []
  let currentHunk: StagingDiffHunk | null = null
  let oldLineNum = 0
  let newLineNum = 0
  let additions = 0
  let deletions = 0
  let isBinary = false
  let status: StagingFileDiff['status'] = 'modified'
  let oldPath: string | undefined

  for (const line of lines) {
    // Check for binary file
    if (line.startsWith('Binary files')) {
      isBinary = true
      continue
    }

    // Check for new file
    if (line.startsWith('new file mode')) {
      status = 'added'
      continue
    }

    // Check for deleted file
    if (line.startsWith('deleted file mode')) {
      status = 'deleted'
      continue
    }

    // Check for rename
    if (line.startsWith('rename from ')) {
      oldPath = line.replace('rename from ', '')
      status = 'renamed'
      continue
    }

    // Parse hunk header
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/)
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk)
      }

      oldLineNum = parseInt(hunkMatch[1])
      newLineNum = parseInt(hunkMatch[3])

      currentHunk = {
        header: line,
        oldStart: oldLineNum,
        oldLines: parseInt(hunkMatch[2] || '1'),
        newStart: newLineNum,
        newLines: parseInt(hunkMatch[4] || '1'),
        lines: [],
      }
      continue
    }

    // Parse diff lines
    if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLineNum++,
        })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
        currentHunk.lines.push({
          type: 'delete',
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
        })
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        })
      }
    }
  }

  // Don't forget the last hunk
  if (currentHunk) {
    hunks.push(currentHunk)
  }

  return {
    filePath,
    oldPath,
    status,
    hunks,
    isBinary,
    additions,
    deletions,
  }
}

// Pull current branch from origin (with rebase to avoid merge commits)
// Pull current branch from origin (with rebase to avoid merge commits)
// Ledger Opinion: Auto-stashes uncommitted changes, pulls, then restores them
// Git is overly cautious - it refuses to pull with ANY uncommitted changes.
// We're smarter: stash, pull, unstash. Only fail on real conflicts.
export async function pullCurrentBranch(): Promise<{
  success: boolean
  message: string
  hadConflicts?: boolean
  autoStashed?: boolean
}> {
  if (!git) throw new Error('No repository selected')

  let didStash = false

  try {
    const currentBranch = (await git.branchLocal()).current
    if (!currentBranch) {
      return { success: false, message: 'Not on a branch (detached HEAD state)' }
    }

    // Fetch first to get the latest refs
    await git.fetch('origin', currentBranch)

    // Check if there are remote changes to pull
    const statusBefore = await git.status()
    if (statusBefore.behind === 0) {
      return { success: true, message: 'Already up to date' }
    }

    // Check if we have uncommitted changes
    const hasUncommittedChanges =
      statusBefore.modified.length > 0 ||
      statusBefore.not_added.length > 0 ||
      statusBefore.created.length > 0 ||
      statusBefore.deleted.length > 0 ||
      statusBefore.staged.length > 0

    // Auto-stash if we have uncommitted changes
    if (hasUncommittedChanges) {
      await git.raw(['stash', 'push', '--include-untracked', '-m', 'ledger-auto-stash-for-pull'])
      didStash = true
    }

    // Pull with rebase
    await git.pull('origin', currentBranch, ['--rebase'])

    // Restore stashed changes
    if (didStash) {
      try {
        await git.raw(['stash', 'pop'])
        return {
          success: true,
          message: `Pulled ${statusBefore.behind} commit${statusBefore.behind > 1 ? 's' : ''} and restored your uncommitted changes`,
          autoStashed: true,
        }
      } catch (stashError) {
        const stashMsg = (stashError as Error).message
        if (stashMsg.includes('conflict') || stashMsg.includes('CONFLICT')) {
          return {
            success: true,
            message: 'Pulled successfully, but restoring your changes caused conflicts. Please resolve them.',
            hadConflicts: true,
            autoStashed: true,
          }
        }
        // Stash pop failed for other reason - leave it in stash list
        return {
          success: true,
          message: 'Pulled successfully. Your changes are in the stash (run git stash pop to restore).',
          autoStashed: true,
        }
      }
    }

    return {
      success: true,
      message: `Pulled ${statusBefore.behind} commit${statusBefore.behind > 1 ? 's' : ''} from origin`,
    }
  } catch (error) {
    const errorMessage = (error as Error).message

    // If we stashed but pull failed, try to restore
    if (didStash) {
      try {
        await git.raw(['stash', 'pop'])
      } catch {
        // Stash restore failed - it's still in stash list, user can recover
      }
    }

    // Check for merge/rebase conflicts
    if (
      errorMessage.includes('conflict') ||
      errorMessage.includes('CONFLICT') ||
      errorMessage.includes('Merge conflict') ||
      errorMessage.includes('could not apply')
    ) {
      try {
        await git.rebase(['--abort'])
      } catch {
        /* ignore */
      }
      return {
        success: false,
        message: 'Pull failed due to conflicts with incoming changes. Please resolve manually.',
        hadConflicts: true,
      }
    }

    // No tracking branch - this is fine for new branches
    if (errorMessage.includes('no tracking') || errorMessage.includes("doesn't track")) {
      return { success: true, message: 'No remote tracking branch (will be created on push)' }
    }

    return { success: false, message: errorMessage }
  }
}

// Re-export CommitResult from commit service for backward compatibility
export type { CommitResult } from '@/lib/services/commit'

/**
 * Pure function: Commit staged changes for a specific context
 * @deprecated Use CommitService.commitChanges directly
 */
export const commitChangesForContext = CommitService.commitChanges

/**
 * Commit staged changes
 * Ledger Opinion: Check if origin has moved ahead before committing.
 * If behind, return behindCount so UI can prompt user to pull first or commit ahead.
 */
export async function commitChanges(
  message: string,
  description?: string,
  force: boolean = false
) {
  return CommitService.commitChanges(requireContext(), message, description, force)
}
