import { dialog } from 'electron'
import { handle } from '@/lib/main/shared'
import { setRepoPath, getRepoPath, initializeLegacySync } from '@/lib/main/git-service'
import { getLastRepoPath, saveLastRepoPath } from '@/lib/main/settings-service'
import { getRepositoryManager } from '@/lib/repositories'

// Check for --repo command line argument (for testing)
const repoArgIndex = process.argv.findIndex((arg) => arg.startsWith('--repo='))
const testRepoPath = repoArgIndex !== -1 ? process.argv[repoArgIndex].split('=')[1] : null

export const registerRepoHandlers = () => {
  // SAFETY: Initialize legacy sync so git-service globals stay in sync with RepositoryManager
  initializeLegacySync()
  handle('select-repo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Git Repository',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selectedPath = result.filePaths[0]

    // Use RepositoryManager for the new architecture
    const manager = getRepositoryManager()
    try {
      const ctx = await manager.open(selectedPath)
      // Also update legacy global state for backward compatibility
      setRepoPath(ctx.path)
      saveLastRepoPath(ctx.path)
      return ctx.path
    } catch (error) {
      // Fall back to legacy behavior if RepositoryManager fails
      setRepoPath(selectedPath)
      saveLastRepoPath(selectedPath)
      return selectedPath
    }
  })

  handle('get-repo-path', () => {
    // Try RepositoryManager first
    const manager = getRepositoryManager()
    const active = manager.getActive()
    if (active) return active.path

    // Fall back to legacy
    return getRepoPath()
  })

  handle('get-saved-repo-path', () => {
    return getLastRepoPath()
  })

  handle('load-saved-repo', async () => {
    const manager = getRepositoryManager()

    // Check for test repo path first (command line argument)
    if (testRepoPath) {
      try {
        const ctx = await manager.open(testRepoPath)
        setRepoPath(ctx.path)
        return ctx.path
      } catch {
        setRepoPath(testRepoPath)
        return testRepoPath
      }
    }

    // Otherwise use saved settings
    const savedPath = getLastRepoPath()
    if (savedPath) {
      try {
        const ctx = await manager.open(savedPath)
        setRepoPath(ctx.path)
        return ctx.path
      } catch {
        setRepoPath(savedPath)
        return savedPath
      }
    }

    return null
  })
}
