import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '../../types/garment';
import { AvatarId } from '../../types/3d';
import {
  PlatformCatalogProduct,
  CatalogAdapter,
  ProductOutfitItem,
  ProductOutfitState,
  ProductOutfitOperationResult,
} from './types';
import { resolveProduct3D } from './product3DResolver';

/**
 * Creates an empty Product Outfit State with all canonical garment slots initialized to null.
 */
export function createEmptyProductOutfitState(): ProductOutfitState {
  return {
    top: null,
    bottom: null,
    feet: null,
    waist: null,
    hand: null,
  };
}

/**
 * Centralized Manager for managing runtime product outfit state.
 *
 * Enforces:
 * - One item per canonical slot (equipped item replaces existing item in the same slot).
 * - Atomic state mutation (if validation or resolution fails, state is NOT mutated).
 * - Separation of commerce data from 3D runtime state.
 * - Avatar compatibility validation.
 */
export class ProductOutfitManager {
  private state: ProductOutfitState;
  private activeAvatarId: AvatarId;

  constructor(
    initialAvatarId: AvatarId = 'male',
    initialState: ProductOutfitState = createEmptyProductOutfitState()
  ) {
    this.activeAvatarId = initialAvatarId;
    this.state = { ...initialState };
  }

  /**
   * Returns current active avatar ID.
   */
  public getAvatarId(): AvatarId {
    return this.activeAvatarId;
  }

  /**
   * Returns a copy of the current ProductOutfitState.
   */
  public getOutfitState(): ProductOutfitState {
    return { ...this.state };
  }

  /**
   * Returns an array of all currently equipped ProductOutfitItems.
   */
  public getEquippedItems(): ProductOutfitItem[] {
    const items: ProductOutfitItem[] = [];
    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const item = this.state[slot];
      if (item) {
        items.push({ ...item });
      }
    }
    return items;
  }

  /**
   * Returns the equipped product item for a specific canonical slot, or null if empty.
   */
  public getEquippedProduct(slot: GarmentSlot): ProductOutfitItem | null {
    if (!CANONICAL_GARMENT_SLOTS.includes(slot)) {
      return null;
    }
    const item = this.state[slot];
    return item ? { ...item } : null;
  }

  /**
   * Equips a catalog product into its canonical garment slot.
   * Atomic operation: validates product and avatar compatibility before mutating state.
   */
  public equipProduct(
    product: PlatformCatalogProduct,
    avatarId: AvatarId = this.activeAvatarId
  ): ProductOutfitOperationResult {
    const resolution = resolveProduct3D(product, avatarId);

    if (!resolution.valid || !resolution.product || !resolution.garmentAsset || !resolution.garmentSlot) {
      return {
        success: false,
        errors: resolution.errors.length > 0 ? resolution.errors : ['Failed to resolve product 3D representation.'],
      };
    }

    const slot = resolution.garmentSlot;
    const newItem: ProductOutfitItem = {
      productId: resolution.product.externalProductId,
      assetId: resolution.garmentAsset.assetId,
      slot,
    };

    const previousItem = this.state[slot] ? { ...this.state[slot]! } : null;

    // Atomic mutation after successful resolution
    this.state = {
      ...this.state,
      [slot]: newItem,
    };

    return {
      success: true,
      errors: [],
      item: newItem,
      replacedItem: previousItem,
    };
  }

  /**
   * Async equip helper using CatalogAdapter.
   */
  public async equipProductById(
    productId: string,
    catalogAdapter: CatalogAdapter,
    avatarId: AvatarId = this.activeAvatarId
  ): Promise<ProductOutfitOperationResult> {
    if (!productId || typeof productId !== 'string') {
      return {
        success: false,
        errors: ['Product ID must be a non-empty string.'],
      };
    }

    const product = await catalogAdapter.getProduct(productId.trim());
    if (!product) {
      return {
        success: false,
        errors: [`Product with ID "${productId}" does not exist in catalog.`],
      };
    }

    return this.equipProduct(product, avatarId);
  }

  /**
   * Replaces an existing product in a canonical slot with a new product.
   * Functionally equivalent to equipProduct (which enforces 1 item per slot).
   */
  public replaceProduct(
    product: PlatformCatalogProduct,
    avatarId: AvatarId = this.activeAvatarId
  ): ProductOutfitOperationResult {
    return this.equipProduct(product, avatarId);
  }

  /**
   * Removes an equipped item from the outfit by product ID across all slots.
   */
  public removeProduct(productId: string): { removed: boolean; slot: GarmentSlot | null } {
    if (!productId || typeof productId !== 'string') {
      return { removed: false, slot: null };
    }

    const trimmedId = productId.trim();
    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const item = this.state[slot];
      if (item && item.productId === trimmedId) {
        this.state = {
          ...this.state,
          [slot]: null,
        };
        return { removed: true, slot };
      }
    }

    return { removed: false, slot: null };
  }

  /**
   * Removes an equipped item from a specific canonical garment slot.
   */
  public removeSlot(slot: GarmentSlot): { removed: boolean; item: ProductOutfitItem | null } {
    if (!CANONICAL_GARMENT_SLOTS.includes(slot)) {
      return { removed: false, item: null };
    }

    const item = this.state[slot];
    if (item) {
      this.state = {
        ...this.state,
        [slot]: null,
      };
      return { removed: true, item };
    }

    return { removed: false, item: null };
  }

  /**
   * Clears all equipped products from all canonical slots.
   */
  public clearOutfit(): ProductOutfitState {
    this.state = createEmptyProductOutfitState();
    return this.getOutfitState();
  }

  /**
   * Sets active avatar ID and re-validates all equipped products.
   * Purges items incompatible with the new avatar.
   */
  public async setAvatarId(
    newAvatarId: AvatarId,
    catalogAdapter?: CatalogAdapter
  ): Promise<{
    state: ProductOutfitState;
    removedItems: Array<{ slot: GarmentSlot; item: ProductOutfitItem }>;
  }> {
    this.activeAvatarId = newAvatarId;
    const removedItems: Array<{ slot: GarmentSlot; item: ProductOutfitItem }> = [];

    for (const slot of CANONICAL_GARMENT_SLOTS) {
      const item = this.state[slot];
      if (item) {
        let isCompatible = true;

        if (catalogAdapter) {
          const product = await catalogAdapter.getProduct(item.productId);
          if (product) {
            const res = resolveProduct3D(product, newAvatarId);
            if (!res.valid) {
              isCompatible = false;
            }
          } else {
            isCompatible = false;
          }
        } else {
          // Fallback resolve directly with dummy catalog product structure referencing item.assetId & slot
          const dummyProduct: PlatformCatalogProduct = {
            externalProductId: item.productId,
            title: item.productId,
            price: 0,
            currency: 'USD',
            availability: 'available',
            representation: {
              assetId: item.assetId,
              garmentSlot: slot,
              supportedAvatarIds: ['male', 'female'], // validate via AssetRegistry in resolveProduct3D
            },
          };
          const res = resolveProduct3D(dummyProduct, newAvatarId);
          if (!res.valid) {
            isCompatible = false;
          }
        }

        if (!isCompatible) {
          removedItems.push({ slot, item });
          this.state = {
            ...this.state,
            [slot]: null,
          };
        }
      }
    }

    return {
      state: this.getOutfitState(),
      removedItems,
    };
  }
}
