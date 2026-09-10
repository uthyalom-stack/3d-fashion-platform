import { Platform3DAsset, AssetType } from '../../../types/asset';
import { validateAsset } from '../assetValidator';
import { AssetRepository } from './types';

function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Local Reference Persistence Adapter for 3D Asset Metadata.
 * Serves as the vendor-neutral local development and reference implementation of `AssetRepository`.
 *
 * Capabilities:
 * - Deterministic, ordered asset metadata store.
 * - Strict metadata validation using platform `validateAsset` before saving.
 * - Deep cloning on read/write to protect internal repository state from external mutation.
 * - Deterministic alias mapping.
 * - Pure TypeScript with zero database credentials or external SaaS dependencies.
 */
export class LocalAssetPersistenceAdapter implements AssetRepository {
  private store = new Map<string, Platform3DAsset>();
  private aliases = new Map<string, string>(); // aliasId -> primaryAssetId
  private insertionOrder: string[] = [];

  /**
   * Resolves a given ID or alias to its primary asset ID.
   */
  private resolvePrimaryId(idOrAlias: string): string {
    if (!idOrAlias || typeof idOrAlias !== 'string') return idOrAlias;
    if (this.store.has(idOrAlias)) {
      return idOrAlias;
    }
    if (this.aliases.has(idOrAlias)) {
      return this.aliases.get(idOrAlias)!;
    }
    return idOrAlias;
  }

  async getAsset(assetId: string): Promise<Platform3DAsset | null> {
    if (!assetId || typeof assetId !== 'string') return null;
    const primaryId = this.resolvePrimaryId(assetId);
    const asset = this.store.get(primaryId);
    return asset ? deepClone(asset) : null;
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

    // Strict validation before saving
    const validation = validateAsset(asset, knownAvatarIds);
    if (!validation.valid) {
      throw new Error(`Validation failed for asset "${asset.assetId}": ${validation.errors.join('; ')}`);
    }

    const clonedAsset = deepClone(asset);

    // Maintain insertion order for new primary assets
    if (!this.store.has(clonedAsset.assetId)) {
      this.insertionOrder.push(clonedAsset.assetId);
    }

    // Persist asset clone
    this.store.set(clonedAsset.assetId, clonedAsset);

    // Register alias IDs if explicitly supplied or defined on asset record
    const aliasesToRegister = new Set<string>();
    if (aliasIds && Array.isArray(aliasIds)) {
      aliasIds.forEach((alias) => aliasesToRegister.add(alias));
    }
    if ('aliasIds' in asset && Array.isArray((asset as unknown as { aliasIds?: string[] }).aliasIds)) {
      (asset as unknown as { aliasIds: string[] }).aliasIds.forEach((alias) => aliasesToRegister.add(alias));
    }

    aliasesToRegister.forEach((alias) => {
      if (alias !== clonedAsset.assetId) {
        this.aliases.set(alias, clonedAsset.assetId);
      }
    });
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    if (!assetId || typeof assetId !== 'string') return false;
    const primaryId = this.resolvePrimaryId(assetId);

    if (!this.store.has(primaryId)) {
      return false;
    }

    this.store.delete(primaryId);
    this.insertionOrder = this.insertionOrder.filter((id) => id !== primaryId);

    // Remove any alias pointers mapped to this primary ID
    for (const [alias, targetId] of Array.from(this.aliases.entries())) {
      if (targetId === primaryId) {
        this.aliases.delete(alias);
      }
    }

    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.aliases.clear();
    this.insertionOrder = [];
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}
