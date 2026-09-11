import { Platform3DAsset, AssetType } from '../../types/asset';
import { PersistedAssetRecord } from '../3d/persistence/types';
import { validateAsset } from '../3d/assetValidator';
import {
  getAssetRepository,
  ensureRegistryInitialized,
  syncFromRepository,
} from '../3d/assetRegistry';

/**
 * Thin Service Layer for Admin Operations on 3D Asset Metadata.
 *
 * Responsibilities:
 * - Direct interface between Admin UI and backing AssetRepository.
 * - Enforces metadata validation before persistence via AssetRepository.
 * - Guarantees domain cache synchronization (`syncFromRepository`) on mutation.
 * - Pure 3D asset metadata operations — strictly decoupled from commerce/product logic.
 * - Does NOT expose storage credentials or direct storage internals to client code.
 */

/**
 * Lists all registered 3D assets in deterministic order.
 */
export async function listAssets(): Promise<Platform3DAsset[]> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.getAssets();
}

/**
 * Filters and lists registered 3D assets by AssetType.
 */
export async function listAssetsByType(assetType: AssetType): Promise<Platform3DAsset[]> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.getAssetsByType(assetType);
}

/**
 * Retrieves a single 3D asset by primary asset ID or alias.
 * Returns null if asset does not exist.
 */
export async function getAsset(assetId: string): Promise<Platform3DAsset | null> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.getAsset(assetId);
}

/**
 * Retrieves a full PersistedAssetRecord (asset + aliasIds) by primary asset ID or alias.
 * Returns null if record does not exist.
 */
export async function getAssetRecord(assetId: string): Promise<PersistedAssetRecord | null> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.getRecord(assetId);
}

/**
 * Retrieves all full PersistedAssetRecords in deterministic order.
 */
export async function listAssetRecords(): Promise<PersistedAssetRecord[]> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.getRecords();
}

/**
 * Checks if an asset exists in the repository by primary asset ID or alias.
 */
export async function hasAsset(assetId: string): Promise<boolean> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  return repo.hasAsset(assetId);
}

/**
 * Creates and persists a new 3D asset record with optional aliases.
 * Throws an Error if asset metadata or aliases are invalid or if assetId is already taken.
 */
export async function createAsset(asset: Platform3DAsset, aliasIds: string[] = []): Promise<void> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();

  if (!asset || !asset.assetId) {
    throw new Error('Cannot create asset without a valid assetId.');
  }

  // Explicit domain validation before calling repo.saveAsset
  const validation = validateAsset(asset);
  if (!validation.valid) {
    throw new Error(`Validation failed for asset "${asset.assetId}": ${validation.errors.join('; ')}`);
  }

  // Verify asset doesn't already exist as a primary asset ID
  const existingRecord = await repo.getRecord(asset.assetId);
  if (existingRecord && existingRecord.asset.assetId === asset.assetId) {
    throw new Error(`Asset with ID "${asset.assetId}" already exists. Use updateAsset to modify existing records.`);
  }

  await repo.saveAsset(asset, aliasIds);
  await syncFromRepository();
}

/**
 * Updates an existing 3D asset record and its associated aliases.
 * Throws an Error if the asset does not exist or if validation fails.
 */
export async function updateAsset(
  assetId: string,
  asset: Platform3DAsset,
  aliasIds: string[] = []
): Promise<void> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();

  const existing = await repo.getAsset(assetId);
  if (!existing) {
    throw new Error(`Cannot update asset "${assetId}". Asset not found.`);
  }

  // Explicit domain validation before calling repo.saveAsset
  const validation = validateAsset(asset);
  if (!validation.valid) {
    throw new Error(`Validation failed for asset "${asset.assetId}": ${validation.errors.join('; ')}`);
  }

  await repo.saveAsset(asset, aliasIds);
  await syncFromRepository();
}

/**
 * Saves or updates a full PersistedAssetRecord (asset + aliasIds).
 */
export async function saveAssetRecord(record: PersistedAssetRecord): Promise<void> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  await repo.saveRecord(record);
  await syncFromRepository();
}

/**
 * Deletes a 3D asset record and its associated alias mappings by primary ID or alias.
 * Returns true if asset was deleted, false if not found.
 */
export async function deleteAsset(assetId: string): Promise<boolean> {
  await ensureRegistryInitialized();
  const repo = getAssetRepository();
  const deleted = await repo.deleteAsset(assetId);
  if (deleted) {
    await syncFromRepository();
  }
  return deleted;
}
