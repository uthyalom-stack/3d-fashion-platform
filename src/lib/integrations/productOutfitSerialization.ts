import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '../../types/garment';
import { AvatarId } from '../../types/3d';
import { getGarmentAsset, hasAsset } from '../3d/assetRegistry';
import {
  ProductOutfitItem,
  ProductOutfitState,
  SerializedProductOutfitState,
  CatalogAdapter,
  ValidationResult,
} from './types';
import { createEmptyProductOutfitState } from './productOutfitManager';
import { resolveProduct3D } from './product3DResolver';

/**
 * Deterministically serializes a ProductOutfitState or array of ProductOutfitItems
 * into a JSON-safe, versioned SerializedProductOutfitState object.
 *
 * Rules:
 * - Version: 1
 * - Items are sorted deterministically by canonical slot order.
 * - No runtime Three.js objects or functions.
 * - No commerce state (price, inventory, etc).
 */
export function serializeProductOutfitState(
  stateOrItems: ProductOutfitState | ProductOutfitItem[]
): SerializedProductOutfitState {
  let itemsList: ProductOutfitItem[] = [];

  if (Array.isArray(stateOrItems)) {
    itemsList = [...stateOrItems];
  } else if (stateOrItems && typeof stateOrItems === 'object') {
    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const item = stateOrItems[slot];
      if (item && item.productId && item.assetId && item.slot) {
        itemsList.push({
          productId: String(item.productId).trim(),
          assetId: String(item.assetId).trim(),
          slot: item.slot,
        });
      }
    }
  }

  // Sort items deterministically by slot order index
  itemsList.sort((a, b) => {
    const indexA = CANONICAL_GARMENT_SLOTS.indexOf(a.slot);
    const indexB = CANONICAL_GARMENT_SLOTS.indexOf(b.slot);
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.productId.localeCompare(b.productId);
  });

  return {
    version: 1,
    items: itemsList,
  };
}

/**
 * Validates a serialized product outfit payload structure and rules.
 */
export function validateSerializedProductOutfit(
  data: unknown,
  options?: { avatarId?: AvatarId }
): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Serialized outfit state must be a non-null object.'] };
  }

  const payload = data as Record<string, unknown>;

  if (payload.version !== 1) {
    errors.push(`Unsupported or missing serialization version "${String(payload.version)}". Expected version 1.`);
  }

  if (!Array.isArray(payload.items)) {
    errors.push('Serialized outfit payload "items" must be an array.');
    return { valid: false, errors };
  }

  const seenSlots = new Set<GarmentSlot>();

  for (let i = 0; i < payload.items.length; i++) {
    const rawItem = payload.items[i];
    if (!rawItem || typeof rawItem !== 'object') {
      errors.push(`Item at index ${i} is not an object.`);
      continue;
    }

    const item = rawItem as Record<string, unknown>;

    // Reject forbidden commerce properties inside items
    if ('price' in item || 'currency' in item || 'checkoutUrl' in item || 'inventory' in item) {
      errors.push(`Item at index ${i} contains forbidden commerce state fields.`);
    }

    // productId
    if (typeof item.productId !== 'string' || item.productId.trim() === '') {
      errors.push(`Item at index ${i} has an invalid or empty productId.`);
    }

    // slot
    if (
      typeof item.slot !== 'string' ||
      !CANONICAL_GARMENT_SLOTS.includes(item.slot as GarmentSlot)
    ) {
      errors.push(`Item at index ${i} has an invalid canonical garment slot "${String(item.slot)}".`);
    } else {
      const slot = item.slot as GarmentSlot;
      if (seenSlots.has(slot)) {
        errors.push(`Duplicate slot entry found for slot "${slot}". Only 1 active item per slot allowed.`);
      } else {
        seenSlots.add(slot);
      }
    }

    // assetId
    if (typeof item.assetId !== 'string' || item.assetId.trim() === '') {
      errors.push(`Item at index ${i} has an invalid or empty assetId.`);
    } else {
      const assetId = item.assetId.trim();
      if (!hasAsset(assetId)) {
        errors.push(`Item at index ${i} references unknown asset ID "${assetId}" in AssetRegistry.`);
      } else {
        const garmentAsset = getGarmentAsset(assetId);
        if (!garmentAsset) {
          errors.push(`Item at index ${i} references asset "${assetId}" of non-garment type.`);
        } else {
          if (typeof item.slot === 'string' && garmentAsset.slot !== item.slot) {
            errors.push(`Item at index ${i} slot mismatch: item specifies "${item.slot}" but asset specifies "${garmentAsset.slot}".`);
          }

          if (options?.avatarId) {
            if (!garmentAsset.supportedAvatarIds || !garmentAsset.supportedAvatarIds.includes(options.avatarId)) {
              errors.push(`Item at index ${i} asset "${assetId}" does not support avatar "${options.avatarId}".`);
            }
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

/**
 * Result contract for deserialization operations.
 */
export interface DeserializationResult {
  success: boolean;
  errors: string[];
  state?: ProductOutfitState;
}

/**
 * Deserializes a SerializedProductOutfitState object or JSON string into a runtime ProductOutfitState.
 *
 * Validates:
 * - Version (must be 1)
 * - Array structure
 * - Canonical slot validity and duplicate prevention
 * - Asset existence in AssetRegistry
 * - Asset type ('garment')
 * - Asset slot match
 * - Avatar compatibility (if avatarId is supplied)
 * - Optional catalog validation via CatalogAdapter
 *
 * Fails cleanly without inventing or substituting data on invalid input.
 */
export async function deserializeProductOutfitState(
  input: SerializedProductOutfitState | string,
  options?: {
    avatarId?: AvatarId;
    catalogAdapter?: CatalogAdapter;
  }
): Promise<DeserializationResult> {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return {
        success: false,
        errors: ['Failed to parse JSON string for serialized outfit state.'],
      };
    }
  }

  const structuralValidation = validateSerializedProductOutfit(parsed, { avatarId: options?.avatarId });
  if (!structuralValidation.valid) {
    return {
      success: false,
      errors: structuralValidation.errors,
    };
  }

  const payload = parsed as SerializedProductOutfitState;
  const resultState = createEmptyProductOutfitState();

  for (const item of payload.items) {
    const slot = item.slot;
    const productId = item.productId.trim();

    if (options?.catalogAdapter) {
      const product = await options.catalogAdapter.getProduct(productId);
      if (!product) {
        return {
          success: false,
          errors: [`Product ID "${productId}" in serialized state does not exist in external catalog.`],
        };
      }

      const res = resolveProduct3D(product, options.avatarId);
      if (!res.valid) {
        return {
          success: false,
          errors: [`Product ID "${productId}" failed 3D resolution during deserialization: ${res.errors.join('; ')}`],
        };
      }

      if (res.garmentSlot !== slot) {
        return {
          success: false,
          errors: [`Product ID "${productId}" slot "${res.garmentSlot}" does not match serialized slot "${slot}".`],
        };
      }

      if (res.garmentAsset?.assetId !== item.assetId.trim()) {
        return {
          success: false,
          errors: [`Product ID "${productId}" asset ID "${res.garmentAsset?.assetId}" does not match serialized asset ID "${item.assetId}".`],
        };
      }
    }

    resultState[slot] = {
      productId,
      assetId: item.assetId.trim(),
      slot,
    };
  }

  return {
    success: true,
    errors: [],
    state: resultState,
  };
}
