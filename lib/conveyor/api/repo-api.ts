import { ConveyorApi } from '@/lib/preload/shared'

export class RepoApi extends ConveyorApi {
  selectRepo = () => this.invoke('select-repo')
  getRepoPath = () => this.invoke('get-repo-path')
  getSavedRepoPath = () => this.invoke('get-saved-repo-path')
  loadSavedRepo = () => this.invoke('load-saved-repo')
}
