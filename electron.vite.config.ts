import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// Shared alias configuration
const aliases = {
  '@/app': resolve(__dirname, 'app'),
  '@/lib': resolve(__dirname, 'lib'),
  '@/resources': resolve(__dirname, 'resources'),
}

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'lib/main/main.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    // Bundle all deps into main.js to avoid shipping node_modules in the asar
    // Only electron and node built-ins remain external
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          'fix-path',
          'shell-path',
          'strip-ansi',
          'simple-git',
          '@electron-toolkit/utils',
          '@kwsites/file-exists',
          '@kwsites/promise-deferred',
          'debug',
          'ms',
        ],
      }),
    ],
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'lib/preload/preload.ts'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    // Bundle preload deps as well
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@electron-toolkit/preload'],
      }),
    ],
  },
  renderer: {
    root: './app',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'app/index.html'),
        },
      },
    },
    resolve: {
      alias: aliases,
    },
    plugins: [tailwindcss(), react()],
  },
})
