import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '../../types/garment';
import { Garment3DAsset } from '../../types/asset';
import { AvatarId } from '../../types/3d';
import { PlatformCatalogProduct, CatalogAdapter } from './types';
import { getAsset } from '../3d/assetRegistry';

/**
 * Result of resolving a catalog product to its 3D garment asset.
 */
export interface Product3DResolutionResult {
  valid: boolean;
  errors: string[];
  product?: PlatformCatalogProduct;
  garmentAsset?: Garment3DAsset;
  garmentSlot?: GarmentSlot;
}

/**
 * Resolves a PlatformCatalogProduct into a registered 3D Garment Asset.
 *
 * Enforces canonical validation rules:
 * 1. Product must exist and be valid.
 * 2. Product must have a valid 3D representation (`product.representation`).
 * 3. `garmentSlot` must be a canonical garment slot.
 * 4. The referenced `assetId` must exist in `AssetRegistry`.
 * 5. The referenced asset must be of type `'garment'`.
 * 6. The registered garment asset's slot must match the representation's garment slot.
 * 7. If `avatarId` is supplied, both representation and registered asset must support the avatar.
 *
 * Does NOT load GLB files, perform rendering, or modify commerce state.
 */
export function resolveProduct3D(
  product: PlatformCatalogProduct | null | undefined,
  avatarId?: AvatarId
): Product3DResolutionResult {
  const errors: string[] = [];

  if (!product || typeof product !== 'object') {
    return {
      valid: false,
      errors: ['Product does not exist or is invalid.'],
    };
  }

  if (!product.externalProductId || typeof product.externalProductId !== 'string') {
    return {
      valid: false,
      errors: ['Product does not exist or has invalid externalProductId.'],
    };
  }

  if (!product.representation) {
    return {
      valid: false,
      errors: [`Product "${product.externalProductId}" has no 3D representation.`],
      product,
    };
  }

  const rep = product.representation;

  // Validate representation assetId
  if (!rep.assetId || typeof rep.assetId !== 'string' || rep.assetId.trim() === '') {
    errors.push('Product 3D representation specifies missing or empty assetId.');
  }

  // Validate garment slot
  if (!rep.garmentSlot || !CANONICAL_GARMENT_SLOTS.includes(rep.garmentSlot as GarmentSlot)) {
    errors.push(`Invalid garment slot "${String(rep.garmentSlot)}". Canonical slots: ${CANONICAL_GARMENT_SLOTS.join(', ')}.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, product };
  }

  const assetId = rep.assetId.trim();

  // Lookup in AssetRegistry
  const asset = getAsset(assetId);

  if (!asset) {
    return {
      valid: false,
      errors: [`Representation references unknown asset "${assetId}".`],
      product,
    };
  }

  if (asset.assetType !== 'garment') {
    return {
      valid: false,
      errors: [`Referenced asset "${assetId}" is not a garment asset (found assetType "${asset.assetType}").`],
      product,
    };
  }

  const garmentAsset = asset as Garment3DAsset;

  // Verify slot alignment between product representation and registered garment asset
  if (garmentAsset.slot !== rep.garmentSlot) {
    errors.push(
      `Slot mismatch between product representation ("${rep.garmentSlot}") and registered garment asset ("${garmentAsset.slot}").`
    );
  }

  // Verify avatar compatibility if avatarId is provided
  if (avatarId) {
    const repSupportsAvatar = Array.isArray(rep.supportedAvatarIds) && rep.supportedAvatarIds.includes(avatarId);
    const assetSupportsAvatar = Array.isArray(garmentAsset.supportedAvatarIds) && garmentAsset.supportedAvatarIds.includes(avatarId);

    if (!repSupportsAvatar || !assetSupportsAvatar) {
      errors.push(
        `Avatar "${avatarId}" is unsupported by product representation or registered garment asset.`
      );
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      product,
      garmentAsset,
      garmentSlot: rep.garmentSlot,
    };
  }

  return {
    valid: true,
    errors: [],
    product,
    garmentAsset,
    garmentSlot: rep.garmentSlot,
  };
}

/**
 * Async helper to fetch a catalog product via adapter and resolve its 3D representation.
 */
export async function resolveProduct3DById(
  productId: string,
  catalogAdapter: CatalogAdapter,
  avatarId?: AvatarId
): Promise<Product3DResolutionResult> {
  if (!productId || typeof productId !== 'string') {
    return {
      valid: false,
      errors: ['Product ID must be a non-empty string.'],
    };
  }

  const product = await catalogAdapter.getProduct(productId.trim());
  if (!product) {
    return {
      valid: false,
      errors: [`Product with ID "${productId}" does not exist in catalog.`],
    };
  }

  return resolveProduct3D(product, avatarId);
}
