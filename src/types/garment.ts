/**
 * Canonical Garment Slot Representation
 * Defines strict union type for valid garment attachment positions on 3D base avatars.
 */
export type GarmentSlot = 'top' | 'bottom' | 'feet' | 'waist' | 'hand';

/**
 * Array of canonical garment slots for iteration & runtime validation
 */
export const CANONICAL_GARMENT_SLOTS: readonly GarmentSlot[] = [
  'top',
  'bottom',
  'feet',
  'waist',
  'hand',
] as const;

/**
 * Serializable Outfit State representing equipped garment per canonical slot.
 * Enforces maximum ONE garment active per slot.
 */
export type OutfitState = Record<GarmentSlot, string | null>;

/**
 * Metadata required for 3D runtime rendering & attachment
 */
export interface GarmentMetadata {
  description?: string;
  category?: string;
  author?: string;
  license?: string;
  triCount?: number;
  vertexCount?: number;
  materialCount?: number;
  origin?: [number, number, number];
  bounds?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

/**
 * 3D Garment Asset Contract (Pure 3D representation, strictly non-commerce)
 */
export interface GarmentAssetConfig {
  id: string;
  name: string;
  slot: GarmentSlot;
  modelUrl: string;
  supportedAvatarIds: string[];
  scale?: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  metadata?: GarmentMetadata;
  version: string;
}

/**
 * Garment layer state for active Studio scene composition
 */
export interface GarmentLayerState {
  slot: GarmentSlot;
  garmentId: string | null;
  visible: boolean;
}

/**
 * Validation result object for outfit operation attempts
 */
export interface OutfitValidationResult {
  valid: boolean;
  error?: string;
  garment?: GarmentAssetConfig;
}
