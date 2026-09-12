import { PlatformCatalogProduct, Product3DRepresentation, ProductAvailability } from './types';
import { ProviderProduct } from './providerTypes';
import { CANONICAL_GARMENT_SLOTS, GarmentSlot } from '../../types/garment';

/**
 * Converts a raw ProviderProduct into a canonical PlatformCatalogProduct.
 *
 * Rules:
 * - NEVER invent missing commerce data (e.g., missing price stays undefined/NaN, missing currency stays '').
 * - NEVER turn invalid prices into zero or clamp negative prices.
 * - NEVER convert unknown availability into 'available'.
 * - NEVER invent a 3D asset, garment slot, or avatar compatibility.
 * - Preserve invalid data as-is so canonical catalogValidator can reject it.
 * - Strip provider-specific fields (productUrl, imageUrls, providerMetadata, etc.) so they do not leak into platform products.
 */
export function normalizeProviderProduct(providerProduct: ProviderProduct): PlatformCatalogProduct {
  if (!providerProduct || typeof providerProduct !== 'object') {
    throw new Error('Cannot normalize invalid provider product: input must be a non-null object.');
  }

  // 1. Map externalProductId
  const externalProductId = String(
    providerProduct.providerProductId ?? providerProduct.externalProductId ?? providerProduct.id ?? ''
  ).trim();

  // 2. Map title
  const title = String(providerProduct.title ?? providerProduct.name ?? '').trim();

  // 3. Map brand
  const brandRaw = providerProduct.brand ?? providerProduct.vendor;
  const brand = brandRaw !== undefined && brandRaw !== null ? String(brandRaw).trim() : undefined;

  // 4. Map price (preserve raw number/string parsed float; do NOT clamp negative prices or convert undefined to 0)
  let price: number = providerProduct.price as number;
  if (typeof providerProduct.price === 'string') {
    const trimmed = providerProduct.price.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!isNaN(parsed)) {
        price = parsed;
      }
    }
  }

  // 5. Map currency (normalize casing to upper; do NOT fabricate missing currency)
  const currencyRaw = providerProduct.currency ?? providerProduct.currencyCode;
  const currency = currencyRaw !== undefined && currencyRaw !== null ? String(currencyRaw).trim().toUpperCase() : '';

  // 6. Map availability without defaulting to 'available' for unknown/invalid states
  let availability: ProductAvailability = (providerProduct.availability ?? '') as ProductAvailability;
  if (typeof availability === 'string') {
    const rawAvail = availability.toLowerCase().trim();
    if (rawAvail === 'out_of_stock' || rawAvail === 'outofstock' || rawAvail === 'sold_out' || rawAvail === 'in_stock_false') {
      availability = 'out_of_stock';
    } else if (rawAvail === 'preorder' || rawAvail === 'pre_order') {
      availability = 'preorder';
    } else if (rawAvail === 'discontinued' || rawAvail === 'archived') {
      availability = 'discontinued';
    } else if (rawAvail === 'available' || rawAvail === 'in_stock' || rawAvail === 'active') {
      availability = 'available';
    } else {
      availability = rawAvail as ProductAvailability;
    }
  }

  // 7. Map 3D representation
  let representation: Product3DRepresentation | null = null;
  const rawRep = providerProduct.threeDRepresentation ?? providerProduct.representation;

  if (rawRep && typeof rawRep === 'object') {
    const repObj = rawRep as Record<string, unknown>;
    const assetId = String(repObj.assetId ?? repObj['3dAssetId'] ?? '').trim();

    let garmentSlot: GarmentSlot = (repObj.garmentSlot ?? repObj.slot ?? '') as GarmentSlot;
    if (typeof garmentSlot === 'string') {
      const rawSlot = garmentSlot.toLowerCase().trim();
      if (CANONICAL_GARMENT_SLOTS.includes(rawSlot as GarmentSlot)) {
        garmentSlot = rawSlot as GarmentSlot;
      } else {
        garmentSlot = rawSlot as GarmentSlot;
      }
    }

    let supportedAvatarIds: string[] = [];
    if (Array.isArray(repObj.supportedAvatarIds)) {
      supportedAvatarIds = repObj.supportedAvatarIds
        .map((a) => String(a).trim())
        .filter((a) => a.length > 0);
    } else if (repObj.supportedAvatarIds !== undefined && repObj.supportedAvatarIds !== null) {
      // Preserve invalid non-array representation so validator can flag it
      supportedAvatarIds = repObj.supportedAvatarIds as unknown as string[];
    }

    if (assetId.length > 0 || repObj.garmentSlot !== undefined) {
      representation = {
        assetId,
        garmentSlot,
        supportedAvatarIds,
      };
    }
  }

  return {
    externalProductId,
    title,
    ...(brand ? { brand } : {}),
    price,
    currency,
    availability,
    representation,
  };
}
