import { Platform3DAsset, AssetType } from '../../../types/asset';

/**
 * Asynchronous Repository Interface for 3D Asset Metadata Persistence.
 * Decouples 3D asset domain contracts from concrete database or storage adapters.
 *
 * Core Principles:
 * 1. AssetLocation remains the single authoritative representation of asset binary location.
 * 2. Does NOT own GLB binaries, object storage, product data, or commerce information.
 * 3. Enforces validation before saving records.
 * 4. Ensures immutability by returning deep clones of stored asset records.
 */
export interface AssetRepository {
  /**
   * Retrieves a 3D asset by primary asset ID or registered alias.
   * Returns null if asset does not exist.
   */
  getAsset(assetId: string): Promise<Platform3DAsset | null>;

  /**
   * Returns an array of all persisted 3D assets in deterministic order.
   */
  getAssets(): Promise<Platform3DAsset[]>;

  /**
   * Filters and returns all persisted 3D assets matching a specific AssetType.
   */
  getAssetsByType(assetType: AssetType): Promise<Platform3DAsset[]>;

  /**
   * Checks if an asset exists in the repository by primary asset ID or alias.
   */
  hasAsset(assetId: string): Promise<boolean>;

  /**
   * Saves or updates a 3D asset record in the repository.
   * Runs strict validation before persisting.
   * Throws an Error if asset metadata is invalid or malformed.
   *
   * @param asset The 3D asset metadata record to persist.
   * @param aliasIds Optional array of alias IDs to map to this asset.
   */
  saveAsset(asset: Platform3DAsset, aliasIds?: string[]): Promise<void>;

  /**
   * Deletes an asset record from the repository by primary ID or alias.
   * Returns true if an asset was deleted, false if asset was not found.
   */
  deleteAsset(assetId: string): Promise<boolean>;

  /**
   * Clears all stored asset records and alias mappings from the repository.
   */
  clear(): Promise<void>;

  /**
   * Returns the total count of distinct primary assets stored in the repository.
   */
  count(): Promise<number>;
}
