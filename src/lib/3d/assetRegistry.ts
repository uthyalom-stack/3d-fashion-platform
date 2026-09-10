import { Platform3DAsset, Garment3DAsset, Avatar3DAsset, AssetType } from '../../types/asset';
import { resolveAssetUrl, validateAssetLocation } from './assetDelivery';
import { AssetRepository } from './persistence/types';
import { LocalAssetPersistenceAdapter } from './persistence/localAdapter';
import { seedAssetRepository } from './persistence/seed';
import rawAssetsData from './assets.json';

interface RawAssetManifest {
  schemaVersion: string;
  assets: (Platform3DAsset & { aliasIds?: string[] })[];
}

const manifest = rawAssetsData as unknown as RawAssetManifest;

/**
 * Primary backing AssetRepository instance and synchronous domain caches.
 */
let backingRepository: AssetRepository = new LocalAssetPersistenceAdapter();
const syncCache = new Map<string, Platform3DAsset>();
const aliasMap = new Map<string, string>(); // aliasId -> primaryAssetId

let initializationPromise: Promise<void> | null = null;

/**
 * Synchronously populates domain caches for zero-latency module bootstrap
 * and initiates backing repository seed tracking.
 */
function initializeDefaultRegistry() {
  syncCache.clear();
  aliasMap.clear();

  manifest.assets.forEach((asset) => {
    const locValidation = validateAssetLocation(asset.location);
    if (!locValidation.valid) {
      throw new Error(`Asset "${asset.assetId}" in manifest has invalid location: ${locValidation.errors.join('; ')}`);
    }

    syncCache.set(asset.assetId, asset);
    if (asset.aliasIds && Array.isArray(asset.aliasIds)) {
      asset.aliasIds.forEach((alias) => {
        aliasMap.set(alias, asset.assetId);
      });
    }
  });

  // Track async repository seed completion
  initializationPromise = seedAssetRepository(backingRepository).then(() => {
    return syncFromRepository();
  });
}

// Bootstrap on module load
initializeDefaultRegistry();

/**
 * Guarantees backing repository seed/sync is complete.
 */
export async function ensureRegistryInitialized(): Promise<void> {
  if (initializationPromise) {
    await initializationPromise;
  }
}

/**
 * Configures or swaps the backing AssetRepository implementation for the domain registry.
 * Synchronizes domain cache and alias mappings from the new repository.
 */
export async function setAssetRepository(repository: AssetRepository): Promise<void> {
  if (!repository) {
    throw new Error('AssetRepository instance cannot be null or undefined.');
  }
  await ensureRegistryInitialized();
  backingRepository = repository;
  await syncFromRepository();
}

/**
 * Returns the active backing AssetRepository instance.
 */
export function getAssetRepository(): AssetRepository {
  return backingRepository;
}

/**
 * Synchronizes AssetRegistry's domain cache and alias mappings from the backing repository.
 */
export async function syncFromRepository(): Promise<void> {
  const records = await backingRepository.getRecords();
  syncCache.clear();
  aliasMap.clear();

  for (const record of records) {
    syncCache.set(record.asset.assetId, record.asset);
    if (record.aliasIds && Array.isArray(record.aliasIds)) {
      for (const alias of record.aliasIds) {
        aliasMap.set(alias, record.asset.assetId);
      }
    }
  }
}

/**
 * Resolves primary asset ID if given an alias or primary ID.
 */
export function resolveAssetId(idOrAlias: string): string {
  if (!idOrAlias || typeof idOrAlias !== 'string') return idOrAlias;
  if (syncCache.has(idOrAlias)) {
    return idOrAlias;
  }
  if (aliasMap.has(idOrAlias)) {
    return aliasMap.get(idOrAlias)!;
  }
  return idOrAlias;
}

/**
 * Retrieves a 3D asset synchronously by primary ID or alias.
 * Returns null if asset is not found.
 */
export function getAsset(assetId: string): Platform3DAsset | null {
  if (!assetId || typeof assetId !== 'string') return null;
  const resolvedId = resolveAssetId(assetId);
  return syncCache.get(resolvedId) || null;
}

/**
 * Retrieves a 3D asset asynchronously from the backing repository by primary ID or alias.
 */
export async function getAssetAsync(assetId: string): Promise<Platform3DAsset | null> {
  await ensureRegistryInitialized();
  return backingRepository.getAsset(assetId);
}

/**
 * Resolves the delivery URL for a registered asset by ID or alias derived from its authoritative location.
 * Throws explicit error if asset is not found in registry.
 */
export function getAssetDeliveryUrl(assetId: string): string {
  const asset = getAsset(assetId);
  if (!asset) {
    throw new Error(`Asset ID "${assetId}" not found in Asset Registry.`);
  }
  return resolveAssetUrl(asset);
}

/**
 * Checks if an asset exists in the registry synchronously by primary ID or alias.
 */
export function hasAsset(assetId: string): boolean {
  if (!assetId || typeof assetId !== 'string') return false;
  const resolvedId = resolveAssetId(assetId);
  return syncCache.has(resolvedId);
}

/**
 * Checks if an asset exists in the backing repository asynchronously by primary ID or alias.
 */
export async function hasAssetAsync(assetId: string): Promise<boolean> {
  await ensureRegistryInitialized();
  return backingRepository.hasAsset(assetId);
}

/**
 * Returns an array of all registered 3D assets in the platform synchronously.
 */
export function getAssets(): Platform3DAsset[] {
  return Array.from(syncCache.values());
}

/**
 * Returns an array of all registered 3D assets asynchronously from the backing repository.
 */
export async function getAssetsAsync(): Promise<Platform3DAsset[]> {
  await ensureRegistryInitialized();
  return backingRepository.getAssets();
}

/**
 * Filters and returns all 3D assets matching a specific AssetType synchronously.
 */
export function getAssetsByType(assetType: AssetType): Platform3DAsset[] {
  return getAssets().filter((asset) => asset.assetType === assetType);
}

/**
 * Filters and returns all 3D assets matching a specific AssetType asynchronously from the backing repository.
 */
export async function getAssetsByTypeAsync(assetType: AssetType): Promise<Platform3DAsset[]> {
  await ensureRegistryInitialized();
  return backingRepository.getAssetsByType(assetType);
}

/**
 * Specialized getter for garment assets.
 * Returns Garment3DAsset if found and assetType === 'garment', null otherwise.
 */
export function getGarmentAsset(assetId: string): Garment3DAsset | null {
  const asset = getAsset(assetId);
  if (asset && asset.assetType === 'garment') {
    return asset as Garment3DAsset;
  }
  return null;
}

/**
 * Specialized getter for avatar assets.
 * Returns Avatar3DAsset if found and assetType === 'avatar', null otherwise.
 */
export function getAvatarAsset(assetId: string): Avatar3DAsset | null {
  const asset = getAsset(assetId);
  if (asset && asset.assetType === 'avatar') {
    return asset as Avatar3DAsset;
  }
  return null;
}

/**
 * Persists a 3D asset to the backing repository and updates domain cache.
 */
export async function saveAssetToRepository(asset: Platform3DAsset, aliasIds?: string[]): Promise<void> {
  await ensureRegistryInitialized();
  await backingRepository.saveAsset(asset, aliasIds);
  await syncFromRepository();
}

/**
 * Deletes a 3D asset from the backing repository and updates domain cache.
 */
export async function deleteAssetFromRepository(assetId: string): Promise<boolean> {
  await ensureRegistryInitialized();
  const deleted = await backingRepository.deleteAsset(assetId);
  if (deleted) {
    await syncFromRepository();
  }
  return deleted;
}

/**
 * Returns default assets for platform bootstrapping.
 */
export const DEFAULT_AVATAR_ASSET_ID = 'avatar.male.base';
export const DEFAULT_GARMENT_ASSET_ID = 'garment.top.basic-tshirt';
