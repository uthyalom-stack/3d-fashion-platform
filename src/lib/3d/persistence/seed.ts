import rawAssetsData from '../assets.json';
import { Platform3DAsset } from '../../../types/asset';
import { AssetRepository, PersistedAssetRecord } from './types';

export type ManifestAsset = Platform3DAsset & {
  aliasIds?: string[];
};

interface RawAssetManifest {
  schemaVersion: string;
  assets: ManifestAsset[];
}

/**
 * Utility to convert static manifest assets into `PersistedAssetRecord[]` and seed an `AssetRepository`.
 * Serves as the canonical migration/seed utility from `assets.json`.
 *
 * @param repository The target AssetRepository instance to populate via repository.seed().
 * @param customAssets Optional custom array of manifest asset records. Defaults to static `assets.json`.
 * @returns Promise resolving to the total count of seeded records.
 */
export async function seedAssetRepository(
  repository: AssetRepository,
  customAssets?: ManifestAsset[]
): Promise<number> {
  if (!repository) {
    throw new Error('Target AssetRepository instance must be provided.');
  }

  const manifestAssets: ManifestAsset[] = customAssets || (rawAssetsData as unknown as RawAssetManifest).assets;

  const records: PersistedAssetRecord[] = manifestAssets.map((record) => {
    const { aliasIds = [], ...asset } = record;
    return {
      asset: asset as Platform3DAsset,
      aliasIds: Array.isArray(aliasIds) ? aliasIds : [],
    };
  });

  return repository.seed(records);
}
