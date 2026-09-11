import { CANONICAL_GARMENT_SLOTS, GarmentSlot } from '../../types/garment';
import { getAsset, hasAsset } from '../3d/assetRegistry';
import { ValidationResult, ProductAvailability } from './types';

const VALID_AVAILABILITY_STATES: Set<ProductAvailability> = new Set([
  'available',
  'out_of_stock',
  'preorder',
  'discontinued',
]);

const KNOWN_AVATARS: Set<string> = new Set(['male', 'female']);

/**
 * Validates a catalog product record against platform integration rules.
 *
 * Checks:
 * - Non-empty externalProductId
 * - Non-empty title
 * - Valid finite price >= 0
 * - Non-empty currency code
 * - Valid availability status
 * - Absence of illegal competing URL properties (e.g. modelUrl, assetUrl)
 * - Valid 3D representation (if provided): non-empty assetId, canonical garment slot, valid avatar IDs, asset existence in AssetRegistry, asset must be a Garment3DAsset
 */
export function validateCatalogProduct(
  product: unknown,
  options?: { checkRegistryAssetExistence?: boolean }
): ValidationResult {
  const errors: string[] = [];

  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['Catalog product must be a non-null object.'] };
  }

  const p = product as Record<string, unknown>;

  // Check for forbidden duplicate/competing URL properties
  if ('modelUrl' in p || 'assetUrl' in p || 'gltfUrl' in p || 'url' in p) {
    errors.push('Catalog product contains forbidden competing URL fields (modelUrl, assetUrl, gltfUrl, url). AssetLocation in AssetRegistry is authoritative.');
  }

  // externalProductId
  if (typeof p.externalProductId !== 'string' || p.externalProductId.trim() === '') {
    errors.push('externalProductId must be a non-empty string.');
  }

  // title
  if (typeof p.title !== 'string' || p.title.trim() === '') {
    errors.push('title must be a non-empty string.');
  }

  // price
  if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) {
    errors.push('price must be a finite number greater than or equal to 0.');
  }

  // currency
  if (typeof p.currency !== 'string' || p.currency.trim() === '') {
    errors.push('currency must be a non-empty string.');
  }

  // availability
  if (
    typeof p.availability !== 'string' ||
    !VALID_AVAILABILITY_STATES.has(p.availability as ProductAvailability)
  ) {
    errors.push(
      `availability must be one of: ${Array.from(VALID_AVAILABILITY_STATES).join(', ')}.`
    );
  }

  // representation
  if ('representation' in p && p.representation !== null && p.representation !== undefined) {
    if (typeof p.representation !== 'object') {
      errors.push('representation must be an object or null.');
    } else {
      const rep = p.representation as Record<string, unknown>;

      if ('modelUrl' in rep || 'assetUrl' in rep || 'gltfUrl' in rep) {
        errors.push('representation contains forbidden competing URL fields. Only assetId reference is allowed.');
      }

      // assetId
      if (typeof rep.assetId !== 'string' || rep.assetId.trim() === '') {
        errors.push('representation.assetId must be a non-empty string.');
      } else if (options?.checkRegistryAssetExistence !== false) {
        const assetId = rep.assetId.trim();
        if (!hasAsset(assetId)) {
          errors.push(`representation.assetId "${assetId}" referenced by product does not exist in AssetRegistry.`);
        } else {
          const registeredAsset = getAsset(assetId);
          if (registeredAsset && registeredAsset.assetType !== 'garment') {
            errors.push(`representation.assetId "${assetId}" references an asset of type "${registeredAsset.assetType}". Only "garment" assets can be mapped as product 3D representations.`);
          }
        }
      }

      // garmentSlot
      if (
        typeof rep.garmentSlot !== 'string' ||
        !CANONICAL_GARMENT_SLOTS.includes(rep.garmentSlot as GarmentSlot)
      ) {
        errors.push(
          `representation.garmentSlot "${String(
            rep.garmentSlot
          )}" is invalid. Canonical slots: ${CANONICAL_GARMENT_SLOTS.join(', ')}.`
        );
      }

      // supportedAvatarIds
      if (!Array.isArray(rep.supportedAvatarIds) || rep.supportedAvatarIds.length === 0) {
        errors.push('representation.supportedAvatarIds must be a non-empty array of avatar IDs.');
      } else {
        for (const avatarId of rep.supportedAvatarIds) {
          if (typeof avatarId !== 'string' || avatarId.trim() === '') {
            errors.push('representation.supportedAvatarIds contains invalid or empty avatar ID.');
          } else if (!KNOWN_AVATARS.has(avatarId.trim())) {
            errors.push(`representation.supportedAvatarIds references unknown avatar ID "${avatarId}".`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
