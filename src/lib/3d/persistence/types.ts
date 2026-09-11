import { Platform3DAsset, AssetType } from '../../../types/asset';

/**
 * Encapsulated record structure for persisting a 3D asset metadata record
 * alongside its associated lookup alias identifiers.
 */
export interface PersistedAssetRecord {
  asset: Platform3DAsset;
  aliasIds: string[];
}

/**
 * Asynchronous Repository Interface for 3D Asset Metadata Persistence.
 * Decouples 3D asset domain contracts from concrete database or storage adapters.
 *
 * Core Principles:
 * 1. AssetLocation remains the single authoritative representation of asset binary location.
 * 2. Does NOT own GLB binaries, object storage, product data, or commerce information.
 * 3. Enforces validation before saving records.
 * 4. Ensures immutability by returning deep clones of stored asset records and alias arrays.
 */
export interface AssetRepository {
  /**
   * Retrieves a 3D asset by primary asset ID or registered alias.
   * Returns null if asset does not exist.
   */
  getAsset(assetId: string): Promise<Platform3DAsset | null>;

  /**
   * Retrieves a full PersistedAssetRecord (asset + aliasIds) by primary ID or alias.
   * Returns null if record does not exist.
   */
  getRecord(assetId: string): Promise<PersistedAssetRecord | null>;

  /**
   * Returns an array of all persisted 3D assets in deterministic order.
   */
  getAssets(): Promise<Platform3DAsset[]>;

  /**
   * Filters and returns all persisted 3D assets matching a specific AssetType.
   */
  getAssetsByType(assetType: AssetType): Promise<Platform3DAsset[]>;

  /**
   * Returns all full PersistedAssetRecord instances in deterministic order.
   * Used for portable repository replication and domain cache synchronization.
   */
  getRecords(): Promise<PersistedAssetRecord[]>;

  /**
   * Checks if an asset exists in the repository by primary asset ID or alias.
   */
  hasAsset(assetId: string): Promise<boolean>;

  /**
   * Saves or updates a 3D asset record in the repository.
   * Runs strict validation before persisting.
   * Throws an Error if asset metadata or aliases are invalid/malformed.
   *
   * @param asset The 3D asset metadata record to persist.
   * @param aliasIds Optional array of alias IDs to map to this asset.
   */
  saveAsset(asset: Platform3DAsset, aliasIds?: string[]): Promise<void>;

  /**
   * Saves or updates a full PersistedAssetRecord in the repository.
   * Runs strict validation before persisting.
   */
  saveRecord(record: PersistedAssetRecord): Promise<void>;

  /**
   * Deletes an asset record and its associated alias mappings by primary ID or alias.
   * Returns true if an asset was deleted, false if asset was not found.
   */
  deleteAsset(assetId: string): Promise<boolean>;

  /**
   * Clears all stored asset records and alias mappings from the repository.
   */
  clear(): Promise<void>;

  /**
   * Seeds the repository with a collection of PersistedAssetRecords.
   * Clears or appends records after validating each record.
   * Returns the total count of successfully seeded records.
   */
  seed(records: PersistedAssetRecord[]): Promise<number>;

  /**
   * Returns the total count of distinct primary assets stored in the repository.
   */
  count(): Promise<number>;
}
