import { CANONICAL_GARMENT_SLOTS, GarmentSlot } from '../../types/garment';
import { PlatformCatalogProduct, Product3DRepresentation, ProductAvailability } from './types';

/**
 * Normalizes raw external product records into canonical PlatformCatalogProduct structure.
 *
 * Normalization cleans external representations (trimming whitespace, normalizing casing,
 * converting valid numeric strings to numbers, mapping status aliases).
 *
 * Normalization MUST NOT invent missing or valid data (e.g., negative prices are NOT clamped to 0,
 * unknown statuses are NOT defaulted to 'available', missing currencies are NOT fabricated).
 */
export function normalizeCatalogProduct(rawInput: unknown): PlatformCatalogProduct {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Cannot normalize invalid raw product: input must be a non-null object.');
  }

  const raw = rawInput as Record<string, unknown>;

  // Extract externalProductId with fallbacks for alternative field names
  const externalProductId = String(
    raw.externalProductId ?? raw.id ?? raw.productId ?? raw.sku ?? ''
  ).trim();

  // Extract title
  const title = String(raw.title ?? raw.name ?? raw.displayName ?? '').trim();

  // Extract brand
  const brandRaw = raw.brand ?? raw.vendor ?? raw.manufacturer;
  const brand = brandRaw !== undefined && brandRaw !== null ? String(brandRaw).trim() : undefined;

  // Extract price (preserve raw numeric value or parsed float; do NOT clamp negative prices or convert undefined to 0)
  let price: number = raw.price as number;
  if (typeof raw.price === 'string') {
    const trimmed = raw.price.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (!isNaN(parsed)) {
        price = parsed;
      }
    }
  }

  // Extract currency (preserve raw string casing normalized to uppercase; do NOT default missing currency)
  const currencyRaw = raw.currency ?? raw.currencyCode;
  const currency = currencyRaw !== undefined && currencyRaw !== null ? String(currencyRaw).trim().toUpperCase() : '';

  // Normalize availability status aliases without silently falling back to 'available' for invalid statuses
  let availability: ProductAvailability = (raw.availability ?? raw.status ?? '') as ProductAvailability;
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

  // Normalize 3D representation
  let representation: Product3DRepresentation | null = null;
  const rawRep = raw.representation ?? raw.threeD ?? raw.model3d;

  if (rawRep && typeof rawRep === 'object') {
    const repObj = rawRep as Record<string, unknown>;
    const assetId = String(repObj.assetId ?? repObj['3dAssetId'] ?? repObj.asset_id ?? '').trim();

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
    }

    if (assetId.length > 0) {
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
