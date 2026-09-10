import { AssetStorageProvider } from './types';
import { AssetLocation } from '../../types/asset';
import { normalizeObjectKey } from './objectKey';

/**
 * Concrete Storage Provider implementation for Local Static Public Assets.
 */
export class LocalStorageProvider implements AssetStorageProvider {
  readonly providerId = 'local';

  isConfigured(): boolean {
    return true; // Local static public assets require no external credentials or environment configuration
  }

  resolveObjectUrl(objectKey: string, location?: AssetLocation): string {
    // If location contains a path starting with slash, return path directly
    if (location && location.path && location.path.startsWith('/')) {
      return location.path;
    }

    const cleanKey = normalizeObjectKey(objectKey);
    return cleanKey.startsWith('/') ? cleanKey : `/${cleanKey}`;
  }
}
