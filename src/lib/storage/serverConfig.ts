/**
 * Server-Only Storage Credentials and Administrative Configuration.
 * MUST NEVER be imported by client-facing 3D components or asset delivery resolvers.
 */

export interface ServerStorageCredentials {
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

/**
 * Retrieves server-side storage credentials.
 * This function must ONLY be invoked in server-side API routes, Server Actions, or server scripts.
 */
export function getServerStorageCredentials(): ServerStorageCredentials {
  if (typeof process === 'undefined' || !process.env) {
    return {
      bucketName: '',
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
    };
  }

  const bucketName = process.env.STORAGE_R2_BUCKET || process.env.R2_BUCKET || '';
  const endpoint = process.env.STORAGE_R2_ENDPOINT || process.env.R2_ENDPOINT || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';

  return {
    bucketName,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

/**
 * Security boundary check: Validates that no storage secrets are exposed in NEXT_PUBLIC_ variables.
 */
export function enforceServerSecurityBoundaries(): void {
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
