import { GarmentAssetConfig } from '@/types/garment';
import rawGarments from './garments.json';

/**
 * Static Garment Registry
 * Maps canonical garment identifiers to their 3D asset configurations.
 * Completely independent of commerce/pricing/inventory databases.
 */
export const GARMENT_REGISTRY: Record<string, GarmentAssetConfig> = (rawGarments as unknown) as Record<string, GarmentAssetConfig>;

export const DEFAULT_GARMENT_ID = 'GARMENT_top_basic_tshirt';
