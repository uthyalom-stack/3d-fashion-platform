import { GarmentAssetConfig } from '@/types/garment';

/**
 * Static Garment Registry
 * Maps canonical garment identifiers to their 3D asset configurations.
 * Completely independent of commerce/pricing/inventory databases.
 */
export const GARMENT_REGISTRY: Record<string, GarmentAssetConfig> = {
  GARMENT_top_basic_tshirt: {
    id: 'GARMENT_top_basic_tshirt',
    name: 'Basic Short-Sleeve T-Shirt',
    slot: 'top',
    modelUrl: '/models/garment/top/GARMENT_top_basic_tshirt.glb',
    supportedAvatarIds: ['male', 'female'],
    version: '1.0.0',
    metadata: {
      description: 'Canonical short-sleeve crewneck t-shirt modeled for adult base avatars.',
      category: 'top',
      triCount: 1600,
      vertexCount: 864,
      materialCount: 1,
      license: 'MIT',
      bounds: {
        min: [-3.815, 9.8, -1.23],
        max: [3.815, 14.75, 1.482],
      },
    },
  },
};

export const DEFAULT_GARMENT_ID = 'GARMENT_top_basic_tshirt';
