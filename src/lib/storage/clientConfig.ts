/**
 * Client-Safe Public Storage Configuration Resolver.
 * Resolves ONLY public browser delivery settings (e.g. public delivery domain).
 * Does NOT import, read, reference, or expose server-side storage access keys or secrets.
 */

export interface PublicStorageConfig {
  publicDomain: string;
}

/**
 * Retrieves public delivery domain from client-safe environment variables or fallback.
 */
export function getPublicStorageConfig(): PublicStorageConfig {
  if (typeof process === 'undefined' || !process.env) {
    return { publicDomain: '' };
  }

  const publicDomain =
    process.env.STORAGE_R2_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_STORAGE_R2_PUBLIC_DOMAIN ||
    process.env.R2_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN ||
    '';

  return {
    publicDomain: publicDomain.trim(),
  };
}
