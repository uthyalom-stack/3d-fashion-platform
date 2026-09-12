import { CatalogProductQuery, PlatformCatalogProduct } from './types';
import { ProviderAdapter, ProviderProduct, ProviderStatus, ProviderLifecycleState } from './providerTypes';
import { IntegrationConfig } from './config';
import { IntegrationError } from './errors';
import { normalizeProviderProduct } from './providerNormalizer';

/**
 * Static fixture dataset for deterministic Mock Provider catalog.
 */
export const MOCK_VALID_PRODUCTS: ProviderProduct[] = [
  {
    providerProductId: 'mock_top_basic_tshirt',
    title: 'Mock Essential Crewneck T-Shirt',
    brand: 'Mock Studio Line',
    price: 29.99,
    currency: 'USD',
    availability: 'available',
    productUrl: 'https://mock-store.example.com/products/basic-tee',
    threeDRepresentation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['male', 'female'],
    },
    providerMetadata: { sku: 'MOCK-TSHIRT-001', vendorId: 'v_1001' },
  },
  {
    providerProductId: 'mock_top_basic_tshirt_alt',
    title: 'Mock Graphic Studio Crewneck',
    brand: 'Mock Studio Line',
    price: 39.99,
    currency: 'USD',
    availability: 'available',
    productUrl: 'https://mock-store.example.com/products/graphic-tee',
    threeDRepresentation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['male', 'female'],
    },
    providerMetadata: { sku: 'MOCK-TSHIRT-002', vendorId: 'v_1001' },
  },
  {
    providerProductId: 'mock_accessory_scarf',
    title: 'Mock Digital Silk Scarf (Non-3D Item)',
    brand: 'Mock Accessories',
    price: 19.99,
    currency: 'USD',
    availability: 'available',
    productUrl: 'https://mock-store.example.com/products/silk-scarf',
    threeDRepresentation: null,
    providerMetadata: { sku: 'MOCK-SCARF-003', vendorId: 'v_1002' },
  },
];

/**
 * Isolated test fixtures for validation and error boundary verification.
 * Kept strictly isolated from standard listProducts queries.
 */
export const MOCK_INVALID_FIXTURES: Record<string, ProviderProduct> = {
  mock_invalid_missing_price: {
    providerProductId: 'mock_invalid_missing_price',
    title: 'Item with Missing Price',
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: null,
  },
  mock_invalid_negative_price: {
    providerProductId: 'mock_invalid_negative_price',
    title: 'Item with Negative Price',
    price: -15.00,
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: null,
  },
  mock_invalid_missing_currency: {
    providerProductId: 'mock_invalid_missing_currency',
    title: 'Item with Missing Currency',
    price: 25.00,
    availability: 'available',
    threeDRepresentation: null,
  },
  mock_invalid_unknown_availability: {
    providerProductId: 'mock_invalid_unknown_availability',
    title: 'Item with Unknown Availability',
    price: 25.00,
    currency: 'USD',
    availability: 'unknown_status_xyz',
    threeDRepresentation: null,
  },
  mock_invalid_empty_asset_id: {
    providerProductId: 'mock_invalid_empty_asset_id',
    title: 'Item with Empty 3D Asset ID',
    price: 25.00,
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: {
      assetId: '',
      garmentSlot: 'top',
      supportedAvatarIds: ['male'],
    },
  },
  mock_invalid_unknown_asset_id: {
    providerProductId: 'mock_invalid_unknown_asset_id',
    title: 'Item with Unknown Asset ID',
    price: 25.00,
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: {
      assetId: 'garment.top.ghost_nonexistent_asset',
      garmentSlot: 'top',
      supportedAvatarIds: ['male'],
    },
  },
  mock_invalid_wrong_slot: {
    providerProductId: 'mock_invalid_wrong_slot',
    title: 'Item with Slot Mismatch',
    price: 25.00,
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'bottom', // Registered tshirt is slot 'top'
      supportedAvatarIds: ['male'],
    },
  },
  mock_invalid_unsupported_avatar: {
    providerProductId: 'mock_invalid_unsupported_avatar',
    title: 'Item with Unsupported Avatar',
    price: 25.00,
    currency: 'USD',
    availability: 'available',
    threeDRepresentation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['unsupported_avatar_type'],
    },
  },
};

/**
 * Deterministic Mock Provider Adapter implementation.
 * Acts as a reference external provider boundary for development and testing.
 */
export class MockProviderAdapter implements ProviderAdapter {
  private config: IntegrationConfig;
  private state: ProviderLifecycleState = 'configured';
  private isInitialized = false;
  private validProductsMap = new Map<string, ProviderProduct>();
  private invalidFixturesMap = new Map<string, ProviderProduct>();

  constructor(config: IntegrationConfig) {
    this.config = config;

    MOCK_VALID_PRODUCTS.forEach((p) => {
      this.validProductsMap.set(p.providerProductId, { ...p });
    });

    Object.entries(MOCK_INVALID_FIXTURES).forEach(([id, p]) => {
      this.invalidFixturesMap.set(id, { ...p });
    });
  }

  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.state = 'initialization_failed';
      throw new IntegrationError(
        'ADAPTER_INITIALIZATION_FAILED',
        `Mock provider "${this.config.integrationId}" is disabled.`
      );
    }

    if (
      this.config.publicConfig?.simulateInitFailure === true ||
      this.config.serverConfig?.simulateInitFailure === true
    ) {
      this.state = 'initialization_failed';
      throw new IntegrationError(
        'ADAPTER_INITIALIZATION_FAILED',
        `Simulated initialization failure for mock provider "${this.config.integrationId}".`
      );
    }

    this.isInitialized = true;
    this.state = 'initialized';
  }

  public getStatus(): ProviderStatus {
    return {
      providerId: this.config.integrationId,
      providerType: 'mock',
      state: this.state,
      initialized: this.isInitialized,
      message: this.isInitialized
        ? 'Mock Provider initialized successfully.'
        : 'Mock Provider ready for initialization.',
      lastCheckedAt: new Date().toISOString(),
      details: {
        productCount: this.validProductsMap.size,
        fixtureCount: this.invalidFixturesMap.size,
      },
    };
  }

  public async getProduct(productId: string): Promise<ProviderProduct | null> {
    if (!productId || typeof productId !== 'string') return null;

    const trimmedId = productId.trim();

    // Check valid products first, then invalid fixtures
    const valid = this.validProductsMap.get(trimmedId);
    if (valid) return JSON.parse(JSON.stringify(valid));

    const invalid = this.invalidFixturesMap.get(trimmedId);
    if (invalid) return JSON.parse(JSON.stringify(invalid));

    return null;
  }

  public async listProducts(query?: CatalogProductQuery): Promise<ProviderProduct[]> {
    let results = Array.from(this.validProductsMap.values());

    if (query?.availability) {
      results = results.filter((p) => p.availability === query.availability);
    }

    if (query?.has3D !== undefined) {
      results = results.filter((p) =>
        query.has3D
          ? p.threeDRepresentation !== null && p.threeDRepresentation !== undefined
          : p.threeDRepresentation === null || p.threeDRepresentation === undefined
      );
    }

    const offset = query?.offset && query.offset > 0 ? query.offset : 0;
    const limit = query?.limit && query.limit > 0 ? query.limit : results.length;

    return results.slice(offset, offset + limit).map((p) => JSON.parse(JSON.stringify(p)));
  }

  public normalizeProduct(providerProduct: ProviderProduct): PlatformCatalogProduct {
    return normalizeProviderProduct(providerProduct);
  }
}

/**
 * CatalogAdapter bridge wrapping ProviderAdapter.
 * Bridges vendor-neutral ProviderAdapter to platform CatalogAdapter contract.
 */
export class ProviderCatalogAdapter {
  private provider: ProviderAdapter;

  constructor(provider: ProviderAdapter) {
    this.provider = provider;
  }

  public getProviderStatus(): ProviderStatus {
    return this.provider.getStatus();
  }

  public getProvider(): ProviderAdapter {
    return this.provider;
  }

  public async getProduct(productId: string): Promise<PlatformCatalogProduct | null> {
    const raw = await this.provider.getProduct(productId);
    if (!raw) return null;
    return this.provider.normalizeProduct(raw);
  }

  public async getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]> {
    const rawProducts = await this.provider.listProducts(query);
    return rawProducts.map((p) => this.provider.normalizeProduct(p));
  }
}
