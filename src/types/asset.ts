import { GarmentSlot } from './garment';
import { AvatarId } from './3d';

/**
 * Standard 3D Asset Category Types supported by the platform.
 */
export type AssetType = 'avatar' | 'garment' | 'accessory' | 'prop' | 'environment';

/**
 * Asset Source Types for Phase 6 storage and delivery abstraction.
 * Supported sources are local static public assets or remote HTTPS hosted assets.
 */
export type AssetSourceType = 'local' | 'remote';

/**
 * Asset Location Contract (Phase 6 Storage Abstraction)
 * Vendor-neutral location pointing to where an asset binary is hosted/stored.
 */
export interface AssetLocation {
  source: AssetSourceType;
  path: string;
}

/**
 * Developer-facing 3D performance and geometry metadata.
 * Derived from GLB asset analysis or explicitly specified.
 */
export interface PerformanceMetadata {
  triCount?: number;
  vertexCount?: number;
  materialCount?: number;
  textureCount?: number;
  maxTextureDimension?: number;
  fileSizeBytes?: number;
}

/**
 * Generic 3D Asset Contract (Phase 5 & 6 Foundation)
 * Pure 3D asset metadata contract, strictly decoupled from commerce/product logic.
 * `location` is the single authoritative asset-location representation.
 */
export interface Base3DAsset {
  assetId: string;
  assetType: AssetType;
  schemaVersion: string; // e.g. '1.0'
  version: string;       // e.g. '1.0.0'
  displayName: string;
  location: AssetLocation; // Authoritative location definition
  metadata?: PerformanceMetadata & Record<string, unknown>;
}

/**
 * Avatar 3D Asset Contract
 */
export interface Avatar3DAsset extends Base3DAsset {
  assetType: 'avatar';
  avatarId: AvatarId;
  gender: 'male' | 'female' | 'unisex';
  scale: [number, number, number] | number;
  positionOffset: [number, number, number];
  rotationOffset: [number, number, number];
}

/**
 * Garment 3D Asset Contract
 * Extends base asset contract with canonical slot and avatar compatibility.
 */
export interface Garment3DAsset extends Base3DAsset {
  assetType: 'garment';
  slot: GarmentSlot;
  supportedAvatarIds: string[];
  scale?: number;
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
}

/**
 * Union type for all typed platform 3D assets.
 */
export type Platform3DAsset = Avatar3DAsset | Garment3DAsset | Base3DAsset;
