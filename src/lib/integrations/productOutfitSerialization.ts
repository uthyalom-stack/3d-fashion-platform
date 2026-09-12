import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '../../types/garment';
import { AvatarId } from '../../types/3d';
import { getGarmentAsset, hasAsset } from '../3d/assetRegistry';
import {
  ProductOutfitItem,
  ProductOutfitState,
  SerializedProductOutfitState,
  ProductOutfitSerializationResult,
  CatalogAdapter,
  ValidationResult,
} from './types';
import { createEmptyProductOutfitState } from './productOutfitManager';
import { resolveProduct3D } from './product3DResolver';

/**
 * Validates a single ProductOutfitItem entry for strict serialization safety.
 */
function validateOutfitItemForSerialization(
  rawItem: unknown,
  expectedSlot?: GarmentSlot
): string[] {
  const errors: string[] = [];

  if (!rawItem || typeof rawItem !== 'object') {
    return ['Item is not a valid object.'];
  }

  const item = rawItem as Record<string, unknown>;

  // Reject forbidden commerce properties inside items
  if ('price' in item || 'currency' in item || 'checkoutUrl' in item || 'inventory' in item) {
    errors.push('Item contains forbidden commerce state fields (price, currency, checkoutUrl, inventory).');
  }

  // productId
  if (typeof item.productId !== 'string' || item.productId.trim() === '') {
    errors.push('productId must be a non-empty string.');
  }

  // slot
  if (
    typeof item.slot !== 'string' ||
    !CANONICAL_GARMENT_SLOTS.includes(item.slot as GarmentSlot)
  ) {
    errors.push(`slot "${String(item.slot)}" is invalid. Canonical slots: ${CANONICAL_GARMENT_SLOTS.join(', ')}.`);
  } else if (expectedSlot && item.slot !== expectedSlot) {
    errors.push(`slot mismatch: item specifies "${item.slot}", but expected slot "${expectedSlot}".`);
  }

  // assetId
  if (typeof item.assetId !== 'string' || item.assetId.trim() === '') {
    errors.push('assetId must be a non-empty string.');
  } else {
    const assetId = item.assetId.trim();
    if (!hasAsset(assetId)) {
      errors.push(`assetId "${assetId}" does not exist in AssetRegistry.`);
    } else {
      const garmentAsset = getGarmentAsset(assetId);
      if (!garmentAsset) {
        errors.push(`assetId "${assetId}" is not a garment asset.`);
      } else if (typeof item.slot === 'string' && garmentAsset.slot !== item.slot) {
        errors.push(`assetId "${assetId}" specifies slot "${garmentAsset.slot}", which does not match item slot "${item.slot}".`);
      }
    }
  }

  return errors;
}

/**
 * Deterministically serializes a ProductOutfitState or array of ProductOutfitItems.
 * Performs strict validation on every entry before serializing.
 * Returns an explicit ProductOutfitSerializationResult object `{ success, errors, data }`.
 *
 * Does NOT silently discard or drop invalid entries.
 */
export function serializeProductOutfitState(
  stateOrItems: ProductOutfitState | ProductOutfitItem[]
): ProductOutfitSerializationResult {
  const errors: string[] = [];
  const itemsList: ProductOutfitItem[] = [];
  const seenSlots = new Set<GarmentSlot>();

  if (Array.isArray(stateOrItems)) {
    for (let i = 0; i < stateOrItems.length; i++) {
      const rawItem = stateOrItems[i];
      const itemErrors = validateOutfitItemForSerialization(rawItem);

      if (itemErrors.length > 0) {
        errors.push(`Item at index ${i} is invalid: ${itemErrors.join('; ')}`);
      } else {
        const validItem = rawItem as ProductOutfitItem;
        if (seenSlots.has(validItem.slot)) {
          errors.push(`Duplicate slot entry for slot "${validItem.slot}" at index ${i}.`);
        } else {
          seenSlots.add(validItem.slot);
          itemsList.push({
            productId: validItem.productId.trim(),
            assetId: validItem.assetId.trim(),
            slot: validItem.slot,
          });
        }
      }
    }
  } else if (stateOrItems && typeof stateOrItems === 'object') {
    const stateObj = stateOrItems as Record<string, unknown>;

    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const rawItem = stateObj[slot];
      if (rawItem !== null && rawItem !== undefined) {
        const itemErrors = validateOutfitItemForSerialization(rawItem, slot);
        if (itemErrors.length > 0) {
          errors.push(`Slot "${slot}" item is invalid: ${itemErrors.join('; ')}`);
        } else {
          const validItem = rawItem as ProductOutfitItem;
          itemsList.push({
            productId: validItem.productId.trim(),
            assetId: validItem.assetId.trim(),
            slot: validItem.slot,
          });
        }
      }
    }
  } else {
    return {
      success: false,
      errors: ['Input state or items must be a valid object or array.'],
    };
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  // Sort items deterministically by canonical slot order, then by productId
  itemsList.sort((a, b) => {
    const indexA = CANONICAL_GARMENT_SLOTS.indexOf(a.slot);
    const indexB = CANONICAL_GARMENT_SLOTS.indexOf(b.slot);
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.productId.localeCompare(b.productId);
  });

  return {
    success: true,
    errors: [],
    data: {
      version: 1,
      items: itemsList,
    },
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
