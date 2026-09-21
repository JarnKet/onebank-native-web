/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Milliseconds the mock backend waits before answering. Default 250 */
  readonly VITE_MOCK_DELAY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
