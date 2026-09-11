import { CANONICAL_GARMENT_SLOTS, GarmentSlot } from '../../types/garment';
import { PlatformCatalogProduct, Product3DRepresentation, ProductAvailability } from './types';

/**
 * Normalizes raw external product records into canonical PlatformCatalogProduct structure.
 * Strips provider-specific extra fields or URL properties and sanitizes string/number values.
 */
export function normalizeCatalogProduct(rawInput: unknown): PlatformCatalogProduct {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new Error('Cannot normalize invalid raw product: input must be a non-null object.');
  }

  const raw = rawInput as Record<string, unknown>;

  // Extract externalProductId with fallbacks for alternative field names
  const externalProductId = String(
    raw.externalProductId || raw.id || raw.productId || raw.sku || ''
  ).trim();

  // Extract title
  const title = String(raw.title || raw.name || raw.displayName || '').trim();

  // Extract brand
  const brandRaw = raw.brand || raw.vendor || raw.manufacturer;
  const brand = brandRaw !== undefined && brandRaw !== null ? String(brandRaw).trim() : undefined;

  // Extract & sanitize price
  let price = 0;
  if (typeof raw.price === 'number' && Number.isFinite(raw.price)) {
    price = Math.max(0, raw.price);
  } else if (typeof raw.price === 'string') {
    const parsed = parseFloat(raw.price);
    price = !isNaN(parsed) && Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  // Extract currency
  const currency = String(raw.currency || raw.currencyCode || 'USD').trim().toUpperCase();

  // Normalize availability
  let availability: ProductAvailability = 'available';
  const rawAvail = String(raw.availability || raw.status || '').toLowerCase().trim();
  if (rawAvail === 'out_of_stock' || rawAvail === 'outofstock' || rawAvail === 'sold_out') {
    availability = 'out_of_stock';
  } else if (rawAvail === 'preorder' || rawAvail === 'pre_order') {
    availability = 'preorder';
  } else if (rawAvail === 'discontinued' || rawAvail === 'archived') {
    availability = 'discontinued';
  } else if (rawAvail === 'available' || rawAvail === 'in_stock' || rawAvail === 'active') {
    availability = 'available';
  }

  // Normalize 3D representation
  let representation: Product3DRepresentation | null = null;
  const rawRep = raw.representation || raw.threeD || raw.model3d;

  if (rawRep && typeof rawRep === 'object') {
    const repObj = rawRep as Record<string, unknown>;
    const assetId = String(repObj.assetId || repObj['3dAssetId'] || repObj.asset_id || '').trim();

    let garmentSlot: GarmentSlot = 'top';
    const rawSlot = String(repObj.garmentSlot || repObj.slot || '').toLowerCase().trim();
    if (CANONICAL_GARMENT_SLOTS.includes(rawSlot as GarmentSlot)) {
      garmentSlot = rawSlot as GarmentSlot;
    }

    let supportedAvatarIds: string[] = ['male', 'female'];
    if (Array.isArray(repObj.supportedAvatarIds)) {
      const filtered = repObj.supportedAvatarIds
        .map((a) => String(a).trim())
        .filter((a) => a.length > 0);
      if (filtered.length > 0) {
        supportedAvatarIds = filtered;
      }
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
