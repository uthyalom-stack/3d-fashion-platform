import {
  GarmentSlot,
  GarmentAssetConfig,
  OutfitState,
  OutfitValidationResult,
  CANONICAL_GARMENT_SLOTS,
} from '../../types/garment';
import { AvatarId } from '../../types/3d';
import { GARMENT_REGISTRY } from './garmentRegistry';

/**
 * Creates an empty serializable Outfit State where all canonical slots are null.
 */
export function createEmptyOutfitState(): OutfitState {
  return {
    top: null,
    bottom: null,
    feet: null,
    waist: null,
    hand: null,
  };
}

/**
 * Validates a garment equip request against the garment registry and target avatar.
 * Must fail deterministically if garment is missing, slot mismatches, or avatar is incompatible.
 */
export function validateGarmentEquip(
  garmentId: string,
  targetSlot: GarmentSlot,
  avatarId: AvatarId = 'male',
  registry: Record<string, GarmentAssetConfig> = GARMENT_REGISTRY
): OutfitValidationResult {
  // 1. Verify canonical slot validity
  if (!CANONICAL_GARMENT_SLOTS.includes(targetSlot)) {
    return {
      valid: false,
      error: `Invalid canonical slot: "${targetSlot}". Supported slots are [${CANONICAL_GARMENT_SLOTS.join(', ')}].`,
    };
  }

  // 2. Verify garment existence in registry
  const garment = registry[garmentId];
  if (!garment) {
    return {
      valid: false,
      error: `Garment ID "${garmentId}" not found in garment registry.`,
    };
  }

  // 3. Verify garment structural integrity
  if (!garment.id || !garment.slot || !garment.modelUrl) {
    return {
      valid: false,
      error: `Garment config for "${garmentId}" is structurally invalid (missing id, slot, or modelUrl).`,
    };
  }

  // 4. Verify slot match
  if (garment.slot !== targetSlot) {
    return {
      valid: false,
      error: `Slot mismatch: Garment "${garmentId}" belongs to slot "${garment.slot}", cannot equip to slot "${targetSlot}".`,
      garment,
    };
  }

  // 5. Verify avatar compatibility
  if (!garment.supportedAvatarIds || !garment.supportedAvatarIds.includes(avatarId)) {
    return {
      valid: false,
      error: `Avatar incompatibility: Garment "${garmentId}" supports [${(garment.supportedAvatarIds || []).join(
        ', '
      )}], but active avatar is "${avatarId}".`,
      garment,
    };
  }

  return {
    valid: true,
    garment,
  };
}

/**
 * Pure function to equip or replace a garment in a specific slot.
 * Ensures strict 1 active garment maximum per slot.
 */
export function equipGarment(
  currentState: OutfitState,
  slot: GarmentSlot,
  garmentId: string,
  avatarId: AvatarId = 'male',
  registry: Record<string, GarmentAssetConfig> = GARMENT_REGISTRY
): { state: OutfitState; result: OutfitValidationResult } {
  const validation = validateGarmentEquip(garmentId, slot, avatarId, registry);

  if (!validation.valid) {
    return {
      state: currentState,
      result: validation,
    };
  }

  const newState: OutfitState = {
    ...currentState,
    [slot]: garmentId,
  };

  return {
    state: newState,
    result: validation,
  };
}

/**
 * Pure function to unequip a garment from a specific slot.
 */
export function unequipGarment(
  currentState: OutfitState,
  slot: GarmentSlot
): OutfitState {
  if (!CANONICAL_GARMENT_SLOTS.includes(slot)) {
    return currentState;
  }

  return {
    ...currentState,
    [slot]: null,
  };
}

/**
 * Pure function to synchronize outfit state when changing base avatars.
 * Inspects all equipped garments, retains compatible ones, and deterministically removes incompatible ones.
 */
export function syncOutfitForAvatar(
  currentState: OutfitState,
  newAvatarId: AvatarId,
  registry: Record<string, GarmentAssetConfig> = GARMENT_REGISTRY
): { state: OutfitState; removedGarments: Array<{ slot: GarmentSlot; garmentId: string }> } {
  const nextState: OutfitState = { ...currentState };
  const removedGarments: Array<{ slot: GarmentSlot; garmentId: string }> = [];

  for (const slot of CANONICAL_GARMENT_SLOTS) {
    const activeGarmentId = currentState[slot];
    if (activeGarmentId) {
      const validation = validateGarmentEquip(activeGarmentId, slot, newAvatarId, registry);
      if (!validation.valid) {
        nextState[slot] = null;
        removedGarments.push({ slot, garmentId: activeGarmentId });
      }
    }
  }

  return {
    state: nextState,
    removedGarments,
  };
}

/**
 * Centralized Outfit Manager class for managing runtime outfit state.
 * Provides explicit, testable equip/replace/unequip/get/getAll operations.
 */
export class OutfitManager {
  private state: OutfitState;
  private currentAvatarId: AvatarId;
  private registry: Record<string, GarmentAssetConfig>;

  constructor(
    initialAvatarId: AvatarId = 'male',
    initialState: OutfitState = createEmptyOutfitState(),
    registry: Record<string, GarmentAssetConfig> = GARMENT_REGISTRY
  ) {
    this.currentAvatarId = initialAvatarId;
    this.state = { ...initialState };
    this.registry = registry;
  }

  /**
   * Returns copy of current Outfit State
   */
  public getOutfitState(): OutfitState {
    return { ...this.state };
  }

  /**
   * Returns current active avatar ID
   */
  public getAvatarId(): AvatarId {
    return this.currentAvatarId;
  }

  /**
   * Equip a garment into a slot (replaces if occupied).
   */
  public equip(slot: GarmentSlot, garmentId: string): OutfitValidationResult {
    const { state: newState, result } = equipGarment(
      this.state,
      slot,
      garmentId,
      this.currentAvatarId,
      this.registry
    );

    if (result.valid) {
      this.state = newState;
    }

    return result;
  }

  /**
   * Replace a garment in a slot with a new garment ID.
   */
  public replace(slot: GarmentSlot, garmentId: string): OutfitValidationResult {
    return this.equip(slot, garmentId);
  }

  /**
   * Unequip garment from a slot.
   */
  public unequip(slot: GarmentSlot): OutfitState {
    this.state = unequipGarment(this.state, slot);
    return this.getOutfitState();
  }

  /**
   * Get equipped garment ID for a single slot.
   */
  public get(slot: GarmentSlot): string | null {
    return this.state[slot] || null;
  }

  /**
   * Get all equipped garments across all canonical slots as array of active entries.
   */
  public getAll(): Array<{ slot: GarmentSlot; garmentId: string; config: GarmentAssetConfig }> {
    const items: Array<{ slot: GarmentSlot; garmentId: string; config: GarmentAssetConfig }> = [];

    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const garmentId = this.state[slot];
      if (garmentId) {
        const config = this.registry[garmentId];
        if (config) {
          items.push({ slot, garmentId, config });
        }
      }
    }

    return items;
  }

  /**
   * Switches avatar and automatically purges incompatible garments from active outfit state.
   */
  public setAvatarId(newAvatarId: AvatarId): {
    state: OutfitState;
    removedGarments: Array<{ slot: GarmentSlot; garmentId: string }>;
  } {
    this.currentAvatarId = newAvatarId;
    const { state: syncedState, removedGarments } = syncOutfitForAvatar(
      this.state,
      newAvatarId,
      this.registry
    );
    this.state = syncedState;
    return { state: this.getOutfitState(), removedGarments };
  }
}
