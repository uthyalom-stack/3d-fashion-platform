import { Platform3DAsset, AssetType } from '../../../types/asset';
import { validateAsset } from '../assetValidator';
import { AssetRepository, PersistedAssetRecord } from './types';

function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

const ALIAS_FORMAT_REGEX = /^[a-zA-Z0-9._-]+$/;

function validateAliases(aliasIds: unknown, assetId: string): string[] {
  if (aliasIds === undefined || aliasIds === null) {
    return [];
  }
  if (!Array.isArray(aliasIds)) {
    throw new Error(`Invalid aliasIds for asset "${assetId}". Must be an array of strings.`);
  }

  const validAliases: string[] = [];
  for (const alias of aliasIds) {
    if (typeof alias !== 'string' || alias.trim() === '' || !ALIAS_FORMAT_REGEX.test(alias.trim())) {
      throw new Error(
        `Invalid alias ID "${alias}" for asset "${assetId}". Must be a non-empty filesystem-safe string (alphanumeric, dot, dash, underscore).`
      );
    }
    validAliases.push(alias.trim());
  }
  return validAliases;
}

/**
 * Local Reference Persistence Adapter for 3D Asset Metadata.
 * Serves as the vendor-neutral local development and reference implementation of `AssetRepository`.
 *
 * Capabilities:
 * - Deterministic, ordered asset metadata store.
 * - Full alias support (`PersistedAssetRecord`) for portable repository replication.
 * - Atomic alias ownership reassignment with bi-directional map consistency.
 * - Strict metadata and alias validation using platform `validateAsset` before saving.
 * - Deep cloning on read/write boundaries to protect internal repository state from external mutation.
 * - Pure TypeScript with zero database credentials or external SaaS dependencies.
 */
export class LocalAssetPersistenceAdapter implements AssetRepository {
  private store = new Map<string, Platform3DAsset>();
  private aliasToPrimary = new Map<string, string>(); // aliasId -> primaryAssetId
  private primaryToAliases = new Map<string, Set<string>>(); // primaryAssetId -> Set<aliasId>
  private insertionOrder: string[] = [];

  /**
   * Resolves a given ID or alias to its primary asset ID.
   */
  private resolvePrimaryId(idOrAlias: string): string {
    if (!idOrAlias || typeof idOrAlias !== 'string') return idOrAlias;
    if (this.store.has(idOrAlias)) {
      return idOrAlias;
    }
    if (this.aliasToPrimary.has(idOrAlias)) {
      return this.aliasToPrimary.get(idOrAlias)!;
    }
    return idOrAlias;
  }

  async getAsset(assetId: string): Promise<Platform3DAsset | null> {
    if (!assetId || typeof assetId !== 'string') return null;
    const primaryId = this.resolvePrimaryId(assetId);
    const asset = this.store.get(primaryId);
    return asset ? deepClone(asset) : null;
  }

  async getRecord(assetId: string): Promise<PersistedAssetRecord | null> {
    if (!assetId || typeof assetId !== 'string') return null;
    const primaryId = this.resolvePrimaryId(assetId);
    const asset = this.store.get(primaryId);
    if (!asset) return null;

    const aliasSet = this.primaryToAliases.get(primaryId);
    const aliasIds = aliasSet ? Array.from(aliasSet) : [];

    return deepClone({
      asset,
      aliasIds,
    });
  }

  async getAssets(): Promise<Platform3DAsset[]> {
    return this.insertionOrder
      .map((id) => this.store.get(id))
      .filter((asset): asset is Platform3DAsset => Boolean(asset))
      .map((asset) => deepClone(asset));
  }

  async getAssetsByType(assetType: AssetType): Promise<Platform3DAsset[]> {
    const all = await this.getAssets();
    return all.filter((asset) => asset.assetType === assetType);
  }

  async getRecords(): Promise<PersistedAssetRecord[]> {
    const records: PersistedAssetRecord[] = [];
    for (const primaryId of this.insertionOrder) {
      const asset = this.store.get(primaryId);
      if (asset) {
        const aliasSet = this.primaryToAliases.get(primaryId);
        const aliasIds = aliasSet ? Array.from(aliasSet) : [];
        records.push({
          asset,
          aliasIds,
        });
      }
    }
    return deepClone(records);
  }

  async hasAsset(assetId: string): Promise<boolean> {
    if (!assetId || typeof assetId !== 'string') return false;
    const primaryId = this.resolvePrimaryId(assetId);
    return this.store.has(primaryId);
  }

  async saveAsset(asset: Platform3DAsset, aliasIds?: string[]): Promise<void> {
    if (!asset) {
      throw new Error('Cannot save null or undefined asset record.');
    }

    // Collect all known avatar asset IDs (defaulting to canonical platform avatar IDs)
    const knownAvatarIds = new Set<string>(['male', 'female', 'avatar.male.base', 'avatar.female.base']);
    for (const storedAsset of this.store.values()) {
      if (storedAsset.assetType === 'avatar') {
        knownAvatarIds.add(storedAsset.assetId);
        if ('avatarId' in storedAsset && storedAsset.avatarId) {
          knownAvatarIds.add(storedAsset.avatarId);
        }
      }
    }
    if (asset.assetType === 'avatar') {
      knownAvatarIds.add(asset.assetId);
      if ('avatarId' in asset && asset.avatarId) {
        knownAvatarIds.add(asset.avatarId);
      }
    }

    // Strict validation of asset metadata before saving
    const validation = validateAsset(asset, knownAvatarIds);
    if (!validation.valid) {
      throw new Error(`Validation failed for asset "${asset.assetId}": ${validation.errors.join('; ')}`);
    }

    // Merge aliases explicitly provided with aliases embedded on asset record (if any)
    const rawAliases: string[] = [];
    if (aliasIds) {
      rawAliases.push(...aliasIds);
    }
    if ('aliasIds' in asset && Array.isArray((asset as unknown as { aliasIds?: string[] }).aliasIds)) {
      rawAliases.push(...(asset as unknown as { aliasIds: string[] }).aliasIds);
    }

    // Strict alias validation
    const validatedAliasesList = validateAliases(rawAliases, asset.assetId);
    const newAliasesSet = new Set<string>(validatedAliasesList);

    const primaryId = asset.assetId;

    // Check for atomic primary ID / alias collisions before modifying any repository state
    for (const alias of newAliasesSet) {
      if (alias !== primaryId && this.store.has(alias)) {
        throw new Error(
          `Alias collision error for asset "${primaryId}": Alias "${alias}" matches an existing primary asset ID. Aliases cannot collide with primary asset IDs.`
        );
      }
    }

    const clonedAsset = deepClone(asset);

    // 1. If updating an existing primary asset, clean up old aliases it previously owned that are omitted in update
    const previousAliasesOfAsset = this.primaryToAliases.get(primaryId);
    if (previousAliasesOfAsset) {
      for (const oldAlias of previousAliasesOfAsset) {
        if (!newAliasesSet.has(oldAlias)) {
          if (this.aliasToPrimary.get(oldAlias) === primaryId) {
            this.aliasToPrimary.delete(oldAlias);
          }
        }
      }
    } else {
      this.insertionOrder.push(primaryId);
    }

    // Store asset
    this.store.set(primaryId, clonedAsset);

    // 2. Register new aliases and handle atomic ownership reassignment
    const currentOwnerAliasSet = new Set<string>();

    for (const alias of newAliasesSet) {
      if (alias === primaryId) continue; // Primary ID lookup is handled directly via this.store

      // If alias was previously owned by another asset, reassign ownership and clean up previous owner's set
      if (this.aliasToPrimary.has(alias)) {
        const previousOwnerId = this.aliasToPrimary.get(alias);
        if (previousOwnerId && previousOwnerId !== primaryId) {
          const previousOwnerAliasSet = this.primaryToAliases.get(previousOwnerId);
          if (previousOwnerAliasSet) {
            previousOwnerAliasSet.delete(alias);
          }
        }
      }

      // Assign alias to current primary asset ID
      this.aliasToPrimary.set(alias, primaryId);
      currentOwnerAliasSet.add(alias);
    }

    this.primaryToAliases.set(primaryId, currentOwnerAliasSet);
  }

  async saveRecord(record: PersistedAssetRecord): Promise<void> {
    if (!record || typeof record !== 'object') {
      throw new Error('PersistedAssetRecord must be a non-null object.');
    }
    await this.saveAsset(record.asset, record.aliasIds);
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    if (!assetId || typeof assetId !== 'string') return false;
    const primaryId = this.resolvePrimaryId(assetId);

    if (!this.store.has(primaryId)) {
      return false;
    }

    // Delete primary asset record and insertion order entry
    this.store.delete(primaryId);
    this.insertionOrder = this.insertionOrder.filter((id) => id !== primaryId);

    // Delete associated alias maps only for aliases genuinely pointing to this primary asset
    const associatedAliases = this.primaryToAliases.get(primaryId);
    if (associatedAliases) {
      for (const alias of associatedAliases) {
        if (this.aliasToPrimary.get(alias) === primaryId) {
          this.aliasToPrimary.delete(alias);
        }
      }
    }
    this.primaryToAliases.delete(primaryId);

    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.aliasToPrimary.clear();
    this.primaryToAliases.clear();
    this.insertionOrder = [];
  }

  async seed(records: PersistedAssetRecord[]): Promise<number> {
    if (!Array.isArray(records)) {
      throw new Error('Seed input must be an array of PersistedAssetRecords.');
    }

    await this.clear();

    for (const record of records) {
      await this.saveRecord(record);
    }

    return this.store.size;
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}
