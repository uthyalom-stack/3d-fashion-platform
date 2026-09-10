import { Platform3DAsset, Garment3DAsset, Avatar3DAsset, AssetType } from '../../types/asset';
import { CANONICAL_GARMENT_SLOTS } from '../../types/garment';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ASSET_TYPES: AssetType[] = ['avatar', 'garment', 'accessory', 'prop', 'environment'];

/**
 * Validates an individual 3D asset definition against platform contracts.
 * Pure TypeScript validation executable without WebGL or DOM dependencies.
 */
export function validateAsset(
  asset: Platform3DAsset,
  knownAvatarIds: Set<string> = new Set(['male', 'female', 'avatar.male.base', 'avatar.female.base'])
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!asset) {
    return { valid: false, errors: ['Asset object is null or undefined.'], warnings: [] };
  }

  // 1. Asset ID
  if (!asset.assetId || typeof asset.assetId !== 'string' || asset.assetId.trim() === '') {
    errors.push('Asset assetId must be a non-empty string.');
  } else if (!/^[a-zA-Z0-9._-]+$/.test(asset.assetId)) {
    errors.push(`Asset assetId "${asset.assetId}" contains invalid characters. Must be filesystem-safe (alphanumeric, dot, dash, underscore).`);
  }

  // 2. Asset Type
  if (!asset.assetType || !VALID_ASSET_TYPES.includes(asset.assetType)) {
    errors.push(`Asset assetType "${asset.assetType}" is invalid. Must be one of: ${VALID_ASSET_TYPES.join(', ')}.`);
  }

  // 3. Display Name
  if (!asset.displayName || typeof asset.displayName !== 'string' || asset.displayName.trim() === '') {
    errors.push('Asset displayName must be a non-empty string.');
  }

  // 4. Model URL
  if (!asset.modelUrl || typeof asset.modelUrl !== 'string' || asset.modelUrl.trim() === '') {
    errors.push('Asset modelUrl must be a non-empty string.');
  }

  // 5. Schema & Version
  if (!asset.schemaVersion || typeof asset.schemaVersion !== 'string' || asset.schemaVersion.trim() === '') {
    errors.push('Asset schemaVersion must be specified.');
  }

  if (!asset.version || typeof asset.version !== 'string' || asset.version.trim() === '') {
    errors.push('Asset version must be specified.');
  }

  // 6. Garment-specific validations
  if (asset.assetType === 'garment') {
    const garment = asset as Garment3DAsset;

    // Slot validation
    if (!garment.slot || !CANONICAL_GARMENT_SLOTS.includes(garment.slot)) {
      errors.push(`Garment asset "${asset.assetId}" has invalid slot "${garment.slot}". Must be one of canonical slots: [${CANONICAL_GARMENT_SLOTS.join(', ')}].`);
    }

    // Supported avatar IDs validation
    if (!Array.isArray(garment.supportedAvatarIds) || garment.supportedAvatarIds.length === 0) {
      errors.push(`Garment asset "${asset.assetId}" must define at least one supported avatar ID in supportedAvatarIds.`);
    } else {
      garment.supportedAvatarIds.forEach((avatarId) => {
        if (!knownAvatarIds.has(avatarId)) {
          errors.push(`Garment asset "${asset.assetId}" references unknown supported avatar ID "${avatarId}".`);
        }
      });
    }

    // Attachment metadata bounds/offset check
    if (garment.positionOffset && (!Array.isArray(garment.positionOffset) || garment.positionOffset.length !== 3)) {
      errors.push(`Garment asset "${asset.assetId}" positionOffset must be a 3-element tuple [x, y, z].`);
    }

    if (garment.rotationOffset && (!Array.isArray(garment.rotationOffset) || garment.rotationOffset.length !== 3)) {
      errors.push(`Garment asset "${asset.assetId}" rotationOffset must be a 3-element tuple [x, y, z].`);
    }

    if (garment.scale !== undefined && (typeof garment.scale !== 'number' || garment.scale <= 0)) {
      errors.push(`Garment asset "${asset.assetId}" scale must be a positive number.`);
    }
  }

  // 7. Avatar-specific validations
  if (asset.assetType === 'avatar') {
    const avatar = asset as Avatar3DAsset;

    if (!avatar.avatarId || typeof avatar.avatarId !== 'string') {
      errors.push(`Avatar asset "${asset.assetId}" missing required avatarId field.`);
    }

    if (!['male', 'female', 'unisex'].includes(avatar.gender)) {
      errors.push(`Avatar asset "${asset.assetId}" gender must be 'male', 'female', or 'unisex'.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a full collection/registry of 3D assets for uniqueness, missing references, and integrity.
 */
export function validateAssetRegistry(assets: Platform3DAsset[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(assets)) {
    return { valid: false, errors: ['Asset registry input must be an array.'], warnings: [] };
  }

  const seenAssetIds = new Set<string>();
  const avatarIdsInRegistry = new Set<string>();

  // First pass: collect avatar IDs
  assets.forEach((asset) => {
    if (asset && asset.assetType === 'avatar') {
      const avatar = asset as Avatar3DAsset;
      if (avatar.assetId) avatarIdsInRegistry.add(avatar.assetId);
      if (avatar.avatarId) avatarIdsInRegistry.add(avatar.avatarId);
    }
  });

  // Second pass: validate each asset and check unique IDs
  assets.forEach((asset, idx) => {
    if (!asset) {
      errors.push(`Asset at index ${idx} is null or undefined.`);
      return;
    }

    if (seenAssetIds.has(asset.assetId)) {
      errors.push(`Duplicate asset ID detected in registry: "${asset.assetId}".`);
    } else if (asset.assetId) {
      seenAssetIds.add(asset.assetId);
    }

    const singleResult = validateAsset(asset, avatarIdsInRegistry);
    errors.push(...singleResult.errors);
    warnings.push(...singleResult.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
