/**
 * Deterministic error codes for external integration runtime operations.
 */
export type IntegrationErrorCode =
  | 'NO_ACTIVE_ADAPTER'
  | 'UNSUPPORTED_ADAPTER_TYPE'
  | 'INVALID_ADAPTER'
  | 'ADAPTER_INITIALIZATION_FAILED'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_VALIDATION_FAILED'
  | 'REPRESENTATION_MISSING'
  | 'ASSET_MISSING'
  | 'INCOMPATIBLE_AVATAR'
  | 'INCOMPATIBLE_SLOT';

/**
 * Custom error class for integration domain failures.
 * Provides deterministic error codes and structured contextual details.
 */
export class IntegrationError extends Error {
  public readonly code: IntegrationErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: IntegrationErrorCode, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'IntegrationError';
    this.code = code;
    this.details = details;

    // Maintain standard stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IntegrationError);
    }
  }
}

/**
 * Type guard to check if an unknown error is an instance of IntegrationError.
 */
export function isIntegrationError(error: unknown): error is IntegrationError {
  return error instanceof IntegrationError;
}
