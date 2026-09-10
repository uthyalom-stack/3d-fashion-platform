import rawAssetsData from '../assets.json';
import { Platform3DAsset } from '../../../types/asset';
import { AssetRepository } from './types';

export type ManifestAsset = Platform3DAsset & {
  aliasIds?: string[];
};

interface RawAssetManifest {
  schemaVersion: string;
  assets: ManifestAsset[];
}

/**
 * Seeds an AssetRepository instance from the static manifest (`src/lib/3d/assets.json`).
 * Preserves all metadata (assetId, assetType, schemaVersion, version, displayName, location,
 * avatar fields, garment fields, performance metadata, and alias mappings).
 *
 * @param repository The target AssetRepository instance to populate.
 * @param customAssets Optional custom array of manifest asset records. Defaults to `assets.json`.
 * @returns Promise resolving to the total count of seeded assets.
 */
export async function seedAssetRepository(
  repository: AssetRepository,
  customAssets?: ManifestAsset[]
): Promise<number> {
  const assetsToSeed: ManifestAsset[] = customAssets || (rawAssetsData as unknown as RawAssetManifest).assets;

  let seededCount = 0;
  for (const assetRecord of assetsToSeed) {
    const { aliasIds, ...asset } = assetRecord;
    await repository.saveAsset(asset as Platform3DAsset, aliasIds);
    seededCount++;
  }

  return seededCount;
}
