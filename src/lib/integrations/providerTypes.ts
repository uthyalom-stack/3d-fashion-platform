import { CatalogProductQuery, PlatformCatalogProduct } from './types';

/**
 * Public Provider Operational Status Lifecycle States.
 */
export type ProviderLifecycleState =
  | 'configured'
  | 'enabled'
  | 'initialized'
  | 'unavailable'
  | 'initialization_failed';

/**
 * Browser-safe Provider Status interface.
 * Strictly excludes secrets, API keys, access tokens, or private credentials.
 */
export interface ProviderStatus {
  providerId: string;
  providerType: string;
  state: ProviderLifecycleState;
  initialized: boolean;
  message?: string;
  lastCheckedAt?: string;
  details?: Record<string, unknown>;
}

/**
 * Raw product representation in external provider domain.
 * Completely decoupled from PlatformCatalogProduct to prevent provider leakage.
 */
export interface ProviderProduct {
  providerProductId: string;
  title: string;
  description?: string;
  brand?: string;
  price?: number | string;
  currency?: string;
  availability?: string;
  productUrl?: string;
  imageUrls?: string[];
  threeDRepresentation?: {
    assetId?: string;
    garmentSlot?: string;
    supportedAvatarIds?: string[];
    [key: string]: unknown;
  } | null;
  providerMetadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Vendor-neutral Provider Adapter interface contract.
 *
 * Provides raw or structured catalog data from an external commerce system.
 * DOES NOT directly access Three.js, OutfitManager, ProductOutfitManager,
 * ModelLoader, or scene/avatar objects.
 */
export interface ProviderAdapter {
  /**
   * Initializes the provider adapter with runtime configuration.
   */
  initialize(): Promise<void>;

  /**
   * Reports current public operational status of the provider.
   */
  getStatus(): ProviderStatus;

  /**
   * Retrieves a single raw product by provider product ID.
   */
  getProduct(productId: string): Promise<ProviderProduct | null>;

  /**
   * Queries list of raw products from provider.
   */
  listProducts(query?: CatalogProductQuery): Promise<ProviderProduct[]>;

  /**
   * Normalizes a provider product into the canonical platform product contract.
   */
  normalizeProduct(providerProduct: ProviderProduct): PlatformCatalogProduct;
}
