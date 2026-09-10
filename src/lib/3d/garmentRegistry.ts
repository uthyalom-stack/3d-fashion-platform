import { GarmentAssetConfig } from '../../types/garment';
import { Garment3DAsset } from '../../types/asset';
import { getAssetsByType } from './assetRegistry';

/**
 * Static Garment Registry
 * Derived directly from the central Asset Registry to ensure a single authoritative source of truth.
 * Supports lookups by primary asset ID (e.g. 'garment.top.basic-tshirt') and legacy alias ID (e.g. 'GARMENT_top_basic_tshirt').
 */
function buildGarmentRegistry(): Record<string, GarmentAssetConfig> {
  const garmentAssets = getAssetsByType('garment') as Garment3DAsset[];
  const registry: Record<string, GarmentAssetConfig> = {};

  garmentAssets.forEach((g) => {
    const config: GarmentAssetConfig = {
      id: g.assetId,
      name: g.displayName,
      slot: g.slot,
      modelUrl: g.modelUrl,
      supportedAvatarIds: g.supportedAvatarIds,
      version: g.version,
      scale: g.scale,
      positionOffset: g.positionOffset,
      rotationOffset: g.rotationOffset,
      metadata: g.metadata,
    };

    // Index by primary ID
    registry[g.assetId] = config;

    // Index by legacy alias IDs if present
    const rawAlias = g as unknown as { aliasIds?: string[] };
    if (rawAlias.aliasIds && Array.isArray(rawAlias.aliasIds)) {
      rawAlias.aliasIds.forEach((alias) => {
        registry[alias] = { ...config, id: alias };
      });
    }
  });

  return registry;
}

export const GARMENT_REGISTRY: Record<string, GarmentAssetConfig> = buildGarmentRegistry();

export const DEFAULT_GARMENT_ID = 'GARMENT_top_basic_tshirt';
