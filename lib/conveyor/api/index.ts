import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { RepoApi } from './repo-api'
import { BranchApi } from './branch-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  repo: new RepoApi(electronAPI),
  branch: new BranchApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
