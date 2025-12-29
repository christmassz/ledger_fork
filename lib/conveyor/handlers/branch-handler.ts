import { handle } from '@/lib/main/shared'
import {
  getBranches,
  getBranchesBasic,
  getBranchesWithMetadata,
  checkoutBranch,
  createBranch,
  pushBranch,
  checkoutRemoteBranch,
  pullBranch,
} from '@/lib/main/git-service'

export const registerBranchHandlers = () => {
  handle('get-branches', async () => {
    try {
      return await getBranches()
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  handle('get-branches-basic', async () => {
    try {
      return await getBranchesBasic()
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  handle('get-branches-with-metadata', async () => {
    try {
      return await getBranchesWithMetadata()
    } catch (error) {
      return { error: (error as Error).message }
    }
  })

  handle('checkout-branch', async (branchName: string) => {
    try {
      return await checkoutBranch(branchName)
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  })

  handle('create-branch', async (branchName: string, checkout?: boolean) => {
    try {
      return await createBranch(branchName, checkout ?? true)
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  })

  handle('push-branch', async (branchName?: string, setUpstream?: boolean) => {
    try {
      return await pushBranch(branchName, setUpstream ?? true)
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  })

  handle('checkout-remote-branch', async (remoteBranch: string) => {
    try {
      return await checkoutRemoteBranch(remoteBranch)
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  })

  handle('pull-branch', async (remoteBranch: string) => {
    try {
      return await pullBranch(remoteBranch)
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  })
}
