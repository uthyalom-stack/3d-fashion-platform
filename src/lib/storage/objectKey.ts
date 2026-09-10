/**
 * Object Key Sanitization and Deterministic Resolution Utilities.
 * Enforces predictable, filesystem/object-storage safe keys without credentials,
 * query strings, absolute URLs, or path traversal sequences.
 */

/**
 * Normalizes and validates an object key string.
 * Throws explicit errors for illegal sequences, traversal attempts, or invalid characters.
 */
export function normalizeObjectKey(rawKey: unknown): string {
  if (typeof rawKey !== 'string' || rawKey.trim() === '') {
    throw new Error('Invalid storage object key: Object key must be a non-empty string.');
  }

  let clean = rawKey.trim();

  // Reject executable or inline scheme prefixes
  if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
    throw new Error('Invalid storage object key: Object key cannot use executable or data schemes.');
  }

  // Reject full URLs (http:// or https://) inside object key
  if (clean.toLowerCase().startsWith('http://') || clean.toLowerCase().startsWith('https://')) {
    throw new Error('Invalid storage object key: Object key cannot be a full URL.');
  }

  // Strip query parameters or hashes
  if (clean.includes('?') || clean.includes('#')) {
    throw new Error('Invalid storage object key: Object key cannot contain query parameters or URL fragments.');
  }

  // Prevent directory traversal attacks
  if (clean.includes('../') || clean.includes('..\\') || clean === '..') {
    throw new Error('Invalid storage object key: Illegal directory traversal attempt detected ("..").');
  }

  // Normalize slashes and strip leading slash
  clean = clean.replace(/\\/g, '/');
  while (clean.startsWith('/')) {
    clean = clean.slice(1);
  }

  if (clean.trim() === '') {
    throw new Error('Invalid storage object key: Object key resulted in empty string after normalization.');
  }

  // Enforce safe characters: alphanumeric, slash, dash, underscore, dot
  if (!/^[a-zA-Z0-9._/-]+$/.test(clean)) {
    throw new Error(`Invalid storage object key: Object key "${rawKey}" contains forbidden characters. Must be filesystem/object-storage safe.`);
  }

  return clean;
}

/**
 * Constructs a deterministic, canonical object key for platform 3D assets.
 * Standard format:
 * - Avatars:  `avatars/<avatarId>/v<version>/<filename>`
 * - Garments: `garments/<slot>/<assetId>/v<version>/<filename>`
 * - Others:   `<assetType>s/<assetId>/v<version>/<filename>`
 */
export function buildDeterministicObjectKey(params: {
  assetType: string;
  assetId: string;
  version: string;
  slot?: string;
  filename: string;
}): string {
  const { assetType, assetId, version, slot, filename } = params;

  const cleanAssetId = assetId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanVersion = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  let categoryDir = `${assetType}s`;
  if (assetType === 'avatar') {
    categoryDir = 'avatars';
    return normalizeObjectKey(`${categoryDir}/${cleanAssetId}/v${cleanVersion}/${cleanFilename}`);
  }

  if (assetType === 'garment') {
    categoryDir = 'garments';
    const cleanSlot = (slot || 'unspecified').toLowerCase().replace(/[^a-zA-Z0-9._-]/g, '_');
    return normalizeObjectKey(`${categoryDir}/${cleanSlot}/${cleanAssetId}/v${cleanVersion}/${cleanFilename}`);
  }

  return normalizeObjectKey(`${categoryDir}/${cleanAssetId}/v${cleanVersion}/${cleanFilename}`);
}
