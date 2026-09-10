/**
 * Storage Environment Configuration Resolver.
 * Resolves configuration securely from environment variables.
 * Note: Storage secrets MUST be server-side only and MUST NEVER use `NEXT_PUBLIC_` prefixes.
 */

export interface R2EnvironmentConfig {
  publicDomain: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Gets the configured active default storage provider name from environment or fallback.
 */
export function getActiveStorageProviderName(): string {
  if (typeof process === 'undefined' || !process.env) {
    return 'local';
  }
  return process.env.STORAGE_PROVIDER || process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'local';
}

/**
 * Retrieves server-side environment configuration for Cloudflare R2 provider.
 */
export function getR2ConfigFromEnv(): Partial<R2EnvironmentConfig> {
  if (typeof process === 'undefined' || !process.env) {
    return {};
  }

  // Pure public delivery domain can be public if provided
  const publicDomain = process.env.STORAGE_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || '';
  const bucketName = process.env.STORAGE_R2_BUCKET || process.env.R2_BUCKET || '';
  const endpoint = process.env.STORAGE_R2_ENDPOINT || process.env.R2_ENDPOINT || '';

  // Credentials must NEVER be prefixed with NEXT_PUBLIC_
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

  return {
    publicDomain,
    bucketName,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

/**
 * Validates that no sensitive storage credentials exist under client-exposed NEXT_PUBLIC_ prefixes.
 * Throws a security error if a developer accidentally exposes storage secrets.
 */
export function enforceSecurityBoundaries(): void {
  if (typeof process === 'undefined' || !process.env) return;

  const unsafeKeys = Object.keys(process.env).filter(
    (key) =>
      key.startsWith('NEXT_PUBLIC_') &&
      (key.includes('SECRET') || key.includes('ACCESS_KEY') || key.includes('PASSWORD') || key.includes('CREDENTIAL'))
  );

  if (unsafeKeys.length > 0) {
    throw new Error(
      `Security violation: Storage credentials exposed under NEXT_PUBLIC_ environment variable(s): ${unsafeKeys.join(
        ', '
      )}. Remove NEXT_PUBLIC_ prefix immediately.`
    );
  }
}
