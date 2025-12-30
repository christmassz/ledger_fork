import { simpleGit, SimpleGit } from 'simple-git'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

/**
 * Repository provider type - detected from remote URL
 */
export type RepositoryProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'local'

/**
 * Metadata about a repository that can be cached
 */
export interface RepositoryMetadata {
  name: string
  defaultBranch: string
  remoteUrl: string | null
  provider: RepositoryProvider
  lastFetched: Date | null
}

/**
 * Complete context for a repository instance
 *
 * This replaces the global `let git` and `let repoPath` variables
 * in git-service.ts. Each repository gets its own context with:
 * - Unique ID for tracking
 * - Path to the repository
 * - SimpleGit instance (no more global!)
 * - Metadata for display and caching
 */
export interface RepositoryContext {
  id: string                    // UUID for this context
  path: string                  // Filesystem path to repo root
  name: string                  // Display name (folder name by default)
  git: SimpleGit                // SimpleGit instance for this repo
  metadata: RepositoryMetadata
  lastAccessed: Date
}

/**
 * Detect the git provider from a remote URL
 *
 * @param remoteUrl - The git remote URL (https or ssh format)
 * @returns The detected provider or 'local' if no remote
 *
 * @example
 * detectProvider('https://github.com/user/repo.git') // 'github'
 * detectProvider('git@gitlab.com:user/repo.git')     // 'gitlab'
 * detectProvider(null)                               // 'local'
 */
export const detectProvider = (remoteUrl: string | null): RepositoryProvider => {
  if (!remoteUrl) return 'local'

  const url = remoteUrl.toLowerCase()

  if (url.includes('github.com')) return 'github'
  if (url.includes('gitlab.com') || url.includes('gitlab')) return 'gitlab'
  if (url.includes('bitbucket.org') || url.includes('bitbucket')) return 'bitbucket'
  if (url.includes('azure.com') || url.includes('visualstudio.com')) return 'azure'

  return 'local'
}

/**
 * Get the default branch for a repository
 *
 * Tries to detect from:
 * 1. Remote HEAD reference
 * 2. Common defaults (main, master)
 * 3. First available branch
 *
 * @param git - SimpleGit instance
 * @returns The default branch name
 */
export const getDefaultBranch = async (git: SimpleGit): Promise<string> => {
  try {
    // Try to get from remote HEAD
    const remoteInfo = await git.remote(['show', 'origin'])
    if (remoteInfo) {
      const match = remoteInfo.match(/HEAD branch: (\S+)/)
      if (match) return match[1]
    }
  } catch {
    // Remote might not exist or be accessible
  }

  // Check for common defaults
  try {
    const branches = await git.branchLocal()
    if (branches.all.includes('main')) return 'main'
    if (branches.all.includes('master')) return 'master'
    if (branches.all.length > 0) return branches.all[0]
  } catch {
    // Fall through to default
  }

  return 'main'
}

/**
 * Get the origin remote URL for a repository
 *
 * @param git - SimpleGit instance
 * @returns The remote URL or null if not set
 */
export const getRemoteUrl = async (git: SimpleGit): Promise<string | null> => {
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    return origin?.refs?.fetch || origin?.refs?.push || null
  } catch {
    return null
  }
}

/**
 * Create a new RepositoryContext for a given path
 *
 * This is a pure factory function that:
 * 1. Validates the path is a git repository
 * 2. Creates a SimpleGit instance
 * 3. Detects metadata (provider, default branch, etc.)
 * 4. Returns a complete context
 *
 * @param repoPath - Absolute path to the git repository
 * @returns A new RepositoryContext
 * @throws Error if path is not a valid git repository
 *
 * @example
 * const ctx = await createRepositoryContext('/Users/me/projects/myrepo')
 * // ctx.git is ready to use
 * // ctx.metadata.provider is 'github' if that's the remote
 */
export const createRepositoryContext = async (repoPath: string): Promise<RepositoryContext> => {
  const git = simpleGit(repoPath)

  // Validate this is a git repository
  const isRepo = await git.checkIsRepo()
  if (!isRepo) {
    throw new Error(`Path is not a git repository: ${repoPath}`)
  }

  // Get the root of the repository (in case path is a subdirectory)
  const root = await git.revparse(['--show-toplevel'])
  const actualPath = root.trim()

  // Detect metadata
  const remoteUrl = await getRemoteUrl(git)
  const defaultBranch = await getDefaultBranch(git)
  const provider = detectProvider(remoteUrl)
  const name = path.basename(actualPath)

  const metadata: RepositoryMetadata = {
    name,
    defaultBranch,
    remoteUrl,
    provider,
    lastFetched: null,
  }

  return {
    id: uuidv4(),
    path: actualPath,
    name,
    git: simpleGit(actualPath), // Fresh instance at actual root
    metadata,
    lastAccessed: new Date(),
  }
}
