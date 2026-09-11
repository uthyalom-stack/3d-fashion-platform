import { GarmentSlot } from '../../types/garment';

/**
 * Product Availability Status in external commerce systems.
 */
export type ProductAvailability = 'available' | 'out_of_stock' | 'preorder' | 'discontinued';

/**
 * 3D Representation Contract linking external product to platform 3D asset metadata.
 * References platform assets by canonical assetId (AssetLocation is handled by AssetRegistry/Storage).
 */
export interface Product3DRepresentation {
  assetId: string;
  garmentSlot: GarmentSlot;
  supportedAvatarIds: string[];
}

/**
 * Platform Catalog Product Contract.
 * Distinguishes external commerce identity & metadata from 3D platform identity.
 */
export interface PlatformCatalogProduct {
  externalProductId: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  representation?: Product3DRepresentation | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filter and query options for external catalog adapter product listings.
 */
export interface CatalogProductQuery {
  availability?: ProductAvailability;
  has3D?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Validation result contract for catalog product records.
 * Single canonical public validation result type across integration layer.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Vendor-neutral Adapter Interface for external catalog / storefront integration.
 */
export interface CatalogAdapter {
  /**
   * Retrieves a single product by external product ID.
   */
  getProduct(productId: string): Promise<PlatformCatalogProduct | null>;

  /**
   * Retrieves a list of products matching query criteria.
   */
  getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]>;
}
