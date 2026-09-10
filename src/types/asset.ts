import { GarmentSlot } from './garment';
import { AvatarId } from './3d';

/**
 * Standard 3D Asset Category Types supported by the platform.
 */
export type AssetType = 'avatar' | 'garment' | 'accessory' | 'prop' | 'environment';

/**
 * Asset Source Types for Phase 6 & Phase 7 storage and delivery abstraction.
 * Supported sources:
 * - 'local': static asset relative to web root (/models/...)
 * - 'remote': direct HTTPS URL
 * - 'provider': managed object storage provider asset
 */
export type AssetSourceType = 'local' | 'remote' | 'provider';

/**
 * Asset Location Contract (Phase 6 & Phase 7 Storage Abstraction)
 * Authoritative vendor-neutral location contract pointing to where an asset binary is stored.
 */
export interface AssetLocation {
  source: AssetSourceType;
  /**
   * For 'local' and 'remote' sources: relative path or absolute HTTPS URL.
   * For 'provider' source: optional fallback path or canonical relative location.
   */
  path?: string;
  /**
   * Identifier of the registered storage provider (e.g., 'local', 'r2').
   * Required when source === 'provider'.
   */
  provider?: string;
  /**
   * Deterministic, filesystem/object-storage safe object key (e.g., 'avatars/male/v1.0.0/base-avatar.glb').
   * Required when source === 'provider'.
   */
  objectKey?: string;
  /**
   * Optional provider-specific non-sensitive metadata (e.g. bucket alias, region).
   * Credentials or secrets must NEVER be placed here.
   */
  providerMetadata?: Record<string, unknown>;
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
