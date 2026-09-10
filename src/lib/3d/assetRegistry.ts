import { Platform3DAsset, Garment3DAsset, Avatar3DAsset, AssetType } from '../../types/asset';
import { resolveAssetUrl, resolveAssetLocation } from './assetDelivery';
import rawAssetsData from './assets.json';

interface RawAssetManifest {
  schemaVersion: string;
  assets: (Platform3DAsset & { aliasIds?: string[] })[];
}

const manifest = rawAssetsData as unknown as RawAssetManifest;

/**
 * Primary ID lookup map and alias mapping table for central 3D asset registry.
 */
const assetMap = new Map<string, Platform3DAsset>();
const aliasMap = new Map<string, string>(); // aliasId -> primaryAssetId

// Populate registry maps and ensure locations and modelUrls are fully synchronized
manifest.assets.forEach((asset) => {
  const location = asset.location || resolveAssetLocation(asset.modelUrl);
  const resolvedUrl = resolveAssetUrl({ ...asset, location });

  const initializedAsset: Platform3DAsset = {
    ...asset,
    location,
    modelUrl: resolvedUrl,
  };
  assetMap.set(asset.assetId, initializedAsset);
  if (asset.aliasIds && Array.isArray(asset.aliasIds)) {
    asset.aliasIds.forEach((alias) => {
      aliasMap.set(alias, asset.assetId);
    });
  }
});

/**
 * Resolve primary asset ID if given an alias or primary ID.
 */
export function resolveAssetId(idOrAlias: string): string {
  if (assetMap.has(idOrAlias)) {
    return idOrAlias;
  }
  if (aliasMap.has(idOrAlias)) {
    return aliasMap.get(idOrAlias)!;
  }
  return idOrAlias;
}

/**
 * Retrieves a 3D asset by primary ID or alias.
 * Returns null if asset is not found.
 */
export function getAsset(assetId: string): Platform3DAsset | null {
  if (!assetId || typeof assetId !== 'string') return null;
  const resolvedId = resolveAssetId(assetId);
  return assetMap.get(resolvedId) || null;
}

/**
 * Resolves the delivery URL for a registered asset by ID or alias.
 * Throws explicit error if asset is not found in registry.
 */
export function getAssetDeliveryUrl(assetId: string): string {
  const asset = getAsset(assetId);
  if (!asset) {
    throw new Error(`Asset ID "${assetId}" not found in Asset Registry.`);
  }
  return resolveAssetUrl(asset);
}

/**
 * Checks if an asset exists in the registry by primary ID or alias.
 */
export function hasAsset(assetId: string): boolean {
  if (!assetId || typeof assetId !== 'string') return false;
  const resolvedId = resolveAssetId(assetId);
  return assetMap.has(resolvedId);
}

/**
 * Returns an array of all registered 3D assets in the platform.
 */
export function getAssets(): Platform3DAsset[] {
  return Array.from(assetMap.values());
}

/**
 * Filters and returns all 3D assets matching a specific AssetType.
 */
export function getAssetsByType(assetType: AssetType): Platform3DAsset[] {
  return getAssets().filter((asset) => asset.assetType === assetType);
}

/**
 * Specialized getter for garment assets.
 * Returns Garment3DAsset if found and assetType === 'garment', null otherwise.
 */
export function getGarmentAsset(assetId: string): Garment3DAsset | null {
  const asset = getAsset(assetId);
  if (asset && asset.assetType === 'garment') {
    return asset as Garment3DAsset;
  }
  return null;
}

/**
 * Specialized getter for avatar assets.
 * Returns Avatar3DAsset if found and assetType === 'avatar', null otherwise.
 */
export function getAvatarAsset(assetId: string): Avatar3DAsset | null {
  const asset = getAsset(assetId);
  if (asset && asset.assetType === 'avatar') {
    return asset as Avatar3DAsset;
  }
  return null;
}

/**
 * Returns default assets for platform bootstrapping.
 */
export const DEFAULT_AVATAR_ASSET_ID = 'avatar.male.base';
export const DEFAULT_GARMENT_ASSET_ID = 'garment.top.basic-tshirt';
