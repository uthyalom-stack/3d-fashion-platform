import { AssetLocation } from '../../types/asset';

/**
 * Storage Provider Configuration Interface.
 * Server-only runtime settings for storage providers.
 */
export interface StorageProviderConfig {
  providerId: string;
  publicDomain?: string;
  bucketName?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

/**
 * Generic Storage Provider Interface (Phase 7 Foundation).
 * Decouples core platform 3D asset delivery from concrete storage implementations (R2, S3, Local, etc.).
 */
export interface AssetStorageProvider {
  /**
   * Unique identifier for this provider instance (e.g. 'local', 'r2').
   */
  readonly providerId: string;

  /**
   * Checks if the provider has all required environment configuration present.
   */
  isConfigured(): boolean;

  /**
   * Resolves a public, browser-safe asset URL from a deterministic object key and AssetLocation.
   * Throws explicit configuration or location errors when resolution is impossible.
   */
  resolveObjectUrl(objectKey: string, location?: AssetLocation): string;
}
