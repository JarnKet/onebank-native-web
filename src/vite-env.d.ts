/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** BCEL One core endpoint, e.g. http://10.0.19.65/service3.php */
  readonly VITE_SERVICE_URL: string
  /** Origin serving the b1hybrid pages, trailing slash required */
  readonly VITE_PAYLOAD_PATH: string
  /** Origin serving the onebank-ui pages, trailing slash required */
  readonly VITE_ONEBANK_PATH: string
  /** Base URL uploaded pictures are served from, trailing slash required */
  readonly VITE_UPLOAD_PUBLIC_PATH: string
  /** SocketCluster host used for QR login approval */
  readonly VITE_SOCKET_HOST: string
  /** Milliseconds before a call to the core is abandoned. Default 20000 */
  readonly VITE_REQUEST_TIMEOUT_MS?: string
  readonly VITE_UNMAPPED_TIMEOUT_MS?: string
  readonly VITE_SOCKET_PORT: string
  /** Comma-separated extra origins permitted to drive the iframe bridge */
  readonly VITE_EXTRA_FRAME_ORIGINS?: string
  /** '1' to expose the host-override fields on the login form */
  readonly VITE_ENABLE_DEV_OVERRIDES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
