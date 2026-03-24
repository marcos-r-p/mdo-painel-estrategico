/**
 * Standardized error handler for the API layer.
 *
 * Ensures every service throws errors with a consistent `[context] message` format,
 * making it easier to trace issues in logs and user-facing messages.
 */
export function throwApiError(context: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error)
  throw new Error(`[${context}] ${message}`)
}
