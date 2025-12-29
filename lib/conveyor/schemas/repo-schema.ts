import { z } from 'zod'

export const repoIpcSchema = {
  'select-repo': {
    args: z.tuple([]),
    return: z.string().nullable(),
  },
  'get-repo-path': {
    args: z.tuple([]),
    return: z.string().nullable(),
  },
  'get-saved-repo-path': {
    args: z.tuple([]),
    return: z.string().nullable(),
  },
  'load-saved-repo': {
    args: z.tuple([]),
    return: z.string().nullable(),
  },
}
