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
 * Explicitly allowed scalar operational detail values for public status.
 * Prevents arbitrary objects, function references, or credential payloads.
 */
export type ProviderStatusDetailValue = string | number | boolean | null | undefined;

/**
 * Safe, operational details dictionary for public status reporting.
 * Keys are restricted to non-sensitive operational metrics.
 */
export type ProviderStatusDetails = Record<string, ProviderStatusDetailValue>;

/**
 * Denylist of sensitive credential keys that MUST NEVER appear in public ProviderStatus.
 */
export const FORBIDDEN_CREDENTIAL_KEYS: ReadonlySet<string> = new Set([
  'apikey',
  'apisecret',
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'webhooksecret',
  'password',
  'authorization',
  'token',
  'secret',
  'credentials',
  'serverconfig',
  'bearer',
  'privatekey',
]);

/**
 * Browser-safe Provider Status interface.
 * Strictly excludes secrets, API keys, access tokens, or private credentials by construction.
 */
export interface ProviderStatus {
  providerId: string;
  providerType: string;
  state: ProviderLifecycleState;
  initialized: boolean;
  message?: string;
  lastCheckedAt?: string;
  details?: ProviderStatusDetails;
}

/**
 * Sanitizes a raw ProviderStatus object to guarantee no sensitive credentials leak to public consumers.
 * Recursively inspects and purges any forbidden key or non-scalar detail values.
 */
export function sanitizeProviderStatus(status: ProviderStatus): ProviderStatus {
  if (!status || typeof status !== 'object') {
    return {
      providerId: 'unknown',
      providerType: 'unknown',
      state: 'unavailable',
      initialized: false,
      message: 'Invalid status object received.',
    };
  }

  const cleanDetails: ProviderStatusDetails = {};

  if (status.details && typeof status.details === 'object' && !Array.isArray(status.details)) {
    for (const [key, value] of Object.entries(status.details)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check key against forbidden credential list and patterns
      const isForbidden = FORBIDDEN_CREDENTIAL_KEYS.has(lowerKey) ||
        Array.from(FORBIDDEN_CREDENTIAL_KEYS).some((forbidden) => lowerKey.includes(forbidden));

      if (isForbidden) {
        continue; // Strictly purge forbidden credential key
      }

      // Enforce scalar / primitive safe values only
      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        cleanDetails[key] = value;
      }
    }
  }

  return {
    providerId: String(status.providerId || 'unknown'),
    providerType: String(status.providerType || 'unknown'),
    state: status.state || 'unavailable',
    initialized: Boolean(status.initialized),
    message: status.message ? String(status.message) : undefined,
    lastCheckedAt: status.lastCheckedAt ? String(status.lastCheckedAt) : undefined,
    details: Object.keys(cleanDetails).length > 0 ? cleanDetails : undefined,
  };
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
