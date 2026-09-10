import { GarmentSlot, GarmentAssetConfig as GarmentConfig } from '../../types/garment';
import { getGarmentAsset, getAssetsByType, DEFAULT_GARMENT_ASSET_ID } from './assetRegistry';
import { resolveAssetUrl } from './assetDelivery';
import { Garment3DAsset } from '../../types/asset';

export type { GarmentConfig };
export const DEFAULT_GARMENT_ID = DEFAULT_GARMENT_ASSET_ID;

/**
 * Builds static garment registry derived directly from authoritative platform AssetRegistry.
 * Generates lookup entries generically from asset IDs and any manifest `aliasIds`.
 */
function buildGarmentRegistry(): Record<string, GarmentConfig> {
  const garmentAssets = getAssetsByType('garment') as Garment3DAsset[];
  const registry: Record<string, GarmentConfig> = {};

  garmentAssets.forEach((asset) => {
    const config: GarmentConfig = {
      id: asset.assetId,
      name: asset.displayName,
      modelUrl: resolveAssetUrl(asset),
      slot: asset.slot,
      supportedAvatarIds: asset.supportedAvatarIds,
      scale: asset.scale ?? 1.0,
      positionOffset: asset.positionOffset ?? [0, 0, 0],
      rotationOffset: asset.rotationOffset ?? [0, 0, 0],
      version: asset.version,
    };

    // Primary asset ID entry
    registry[asset.assetId] = config;

    // Generic alias entries directly from authoritative manifest aliasIds
    const rawAsset = asset as Platform3DAssetWithAliases;
    if (rawAsset.aliasIds && Array.isArray(rawAsset.aliasIds)) {
      rawAsset.aliasIds.forEach((alias) => {
        registry[alias] = config;
      });
    }
  });

  return registry;
}

interface Platform3DAssetWithAliases extends Garment3DAsset {
  aliasIds?: string[];
}

/**
 * Derived Garment Registry contract.
 * Primary source of truth remains `AssetRegistry` (`src/lib/3d/assetRegistry.ts`).
 */
export const GARMENT_REGISTRY: Record<string, GarmentConfig> = buildGarmentRegistry();

/**
 * Retrieves garment configuration by asset ID or alias generically.
 */
export function getGarmentConfig(garmentId: string): GarmentConfig | null {
  if (GARMENT_REGISTRY[garmentId]) {
    return GARMENT_REGISTRY[garmentId];
  }

  const asset = getGarmentAsset(garmentId);
  if (asset) {
    return {
      id: asset.assetId,
      name: asset.displayName,
      modelUrl: resolveAssetUrl(asset),
      slot: asset.slot,
      supportedAvatarIds: asset.supportedAvatarIds,
      scale: asset.scale ?? 1.0,
      positionOffset: asset.positionOffset ?? [0, 0, 0],
      rotationOffset: asset.rotationOffset ?? [0, 0, 0],
      version: asset.version,
    };
  }

  return null;
}

/**
 * Returns available garment assets by canonical slot.
 */
export function getGarmentsBySlot(slot: GarmentSlot): GarmentConfig[] {
  return Object.values(GARMENT_REGISTRY).filter(
    (g, idx, arr) => g.slot === slot && arr.findIndex((x) => x.id === g.id) === idx
  );
}
