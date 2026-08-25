import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

export default defineConfig({
  // Needed so imports that reach a .svelte file (svelte-spa-router's entry is
  // one) can be compiled rather than parsed as plain JS. vite-plugin-svelte 7
  // dropped the `hot` option; HMR is off under Vitest regardless.
  plugins: [svelte()],
  resolve: {
    alias: {
      $: path.resolve(__dirname, './src'),
    },
    // svelte-spa-router only publishes a "svelte" export condition; without it
    // Vitest cannot resolve the package at all.
    conditions: ['svelte', 'browser', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,js}'],
    setupFiles: ['./src/setupTests.ts'],
    // Node 22+ exposes a native `globalThis.localStorage`, and Vitest's jsdom
    // environment skips any global that already exists — so jsdom's Storage is
    // never installed and every `localStorage` call in a test hits Node's Web
    // Storage stub instead. Turning the native implementation off leaves the
    // field clear for jsdom. See the note in `src/setupTests.ts`.
    // Vitest 4 flattened `poolOptions.<pool>.execArgv` to a top-level option.
    execArgv: ['--no-experimental-webstorage'],
  },
})
