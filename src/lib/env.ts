/**
 * Single typed accessor for build-time configuration.
 *
 * Every value comes from a VITE_* variable so that a deployment change never
 * requires a source edit.
 */

/** A non-negative integer, or the fallback when unset or nonsense. */
function ms(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export const env = {
  /**
   * How long the mock backend waits before answering. Long enough that every
   * loading state is visible, short enough not to be annoying. Tests run at 0.
   */
  mockDelayMs: ms(import.meta.env.VITE_MOCK_DELAY_MS, import.meta.env.MODE === 'test' ? 0 : 250),
} as const

export type Env = typeof env
