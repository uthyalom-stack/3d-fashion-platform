import { AssetLocation, AssetSourceType, Base3DAsset } from '../../types/asset';

export interface LocationValidationResult {
  valid: boolean;
  errors: string[];
}

const SUPPORTED_SOURCES: AssetSourceType[] = ['local', 'remote'];

/**
 * Validates an AssetLocation instance for correctness and security boundaries.
 * Enforces HTTPS-only for remote sources, filesystem-safe public paths for local sources,
 * and rejects executable schemes (javascript:, data:), directory traversal, and malformed inputs.
 */
export function validateAssetLocation(location: unknown): LocationValidationResult {
  const errors: string[] = [];

  if (!location || typeof location !== 'object') {
    return { valid: false, errors: ['Asset location must be a non-null object.'] };
  }

  const loc = location as Partial<AssetLocation>;

  if (!loc.source || !SUPPORTED_SOURCES.includes(loc.source as AssetSourceType)) {
    errors.push(`Asset location source "${loc.source}" is unsupported. Must be one of: ${SUPPORTED_SOURCES.join(', ')}.`);
  }

  if (typeof loc.path !== 'string' || loc.path.trim() === '') {
    errors.push('Asset location path must be a non-empty string.');
    return { valid: false, errors };
  }

  const rawPath = loc.path.trim();

  // Validate Local Source
  if (loc.source === 'local') {
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      errors.push('Local asset location path cannot be an absolute HTTP/HTTPS URL.');
    }
    if (rawPath.toLowerCase().startsWith('javascript:') || rawPath.toLowerCase().startsWith('data:')) {
      errors.push('Local asset location path cannot use javascript: or data: schemes.');
    }
    // Prevent unsafe directory traversal attempts
    if (rawPath.includes('../') || rawPath.includes('..\\')) {
      errors.push('Local asset location path contains illegal directory traversal sequences ("..").');
    }
    if (!rawPath.startsWith('/')) {
      errors.push('Local asset location path must start with a leading slash "/".');
    }
  }

  // Validate Remote Source
  if (loc.source === 'remote') {
    if (rawPath.toLowerCase().startsWith('javascript:') || rawPath.toLowerCase().startsWith('data:')) {
      errors.push('Remote asset location cannot use executable or inline schemes (javascript:, data:).');
    }
    if (rawPath.startsWith('http://')) {
      errors.push('Insecure HTTP protocol is rejected. Remote assets must use secure HTTPS ("https://").');
    }

    try {
      const parsedUrl = new URL(rawPath);
      if (parsedUrl.protocol !== 'https:') {
        errors.push(`Remote asset location protocol "${parsedUrl.protocol}" is rejected. Must be "https:".`);
      }
    } catch {
      errors.push(`Remote asset location "${rawPath}" is not a valid URL.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Derives or validates an AssetLocation from an asset object, AssetLocation, or URL path string.
 * `location` on asset is authoritative.
 */
export function resolveAssetLocation(assetOrLocation: Base3DAsset | AssetLocation | string): AssetLocation {
  if (typeof assetOrLocation === 'string') {
    const trimmed = assetOrLocation.trim();
    if (trimmed.startsWith('https://')) {
      return { source: 'remote', path: trimmed };
    }
    return { source: 'local', path: trimmed.startsWith('/') ? trimmed : `/${trimmed}` };
  }

  if ('source' in assetOrLocation && 'path' in assetOrLocation) {
    const loc = assetOrLocation as AssetLocation;
    const validation = validateAssetLocation(loc);
    if (!validation.valid) {
      throw new Error(`Invalid AssetLocation provided: ${validation.errors.join('; ')}`);
    }
    return loc;
  }

  if ('location' in assetOrLocation && assetOrLocation.location) {
    const validation = validateAssetLocation(assetOrLocation.location);
    if (!validation.valid) {
      throw new Error(`Asset "${assetOrLocation.assetId}" has invalid location: ${validation.errors.join('; ')}`);
    }
    return assetOrLocation.location;
  }

  throw new Error('Unable to resolve AssetLocation from provided parameter.');
}

/**
 * Deterministic, side-effect-free Asset Delivery Resolver.
 * Resolves an AssetLocation or Base3DAsset into the runtime model URL that ModelLoader / useGLTF consumes.
 */
export function resolveAssetUrl(assetOrLocation: Base3DAsset | AssetLocation | string): string {
  const location = resolveAssetLocation(assetOrLocation);
  const validation = validateAssetLocation(location);

  if (!validation.valid) {
    throw new Error(`Failed to resolve asset URL: ${validation.errors.join('; ')}`);
  }

  if (location.source === 'local') {
    // Normalizes local public path guarantees
    return location.path;
  }

  if (location.source === 'remote') {
    // Remote HTTPS URL returns deterministically unchanged
    return location.path;
  }

  throw new Error(`Unhandled asset source type: ${(location as AssetLocation).source}`);
}
