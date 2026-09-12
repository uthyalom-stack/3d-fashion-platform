import { CatalogAdapter, PlatformCatalogProduct, CatalogProductQuery } from './types';
import { IntegrationConfig, PublicIntegrationConfig, validateIntegrationConfig, sanitizeIntegrationConfig } from './config';
import { createCatalogAdapter, validateCatalogAdapter } from './adapterFactory';
import { IntegrationError } from './errors';
import { resolveProduct3D, Product3DResolutionResult } from './product3DResolver';
import { AvatarId } from '../../types/3d';

/**
 * Integration Runtime Manager boundary.
 * Manages active integration adapter lifecycle, queries, and 3D product resolution.
 */
export class IntegrationRuntimeManager {
  private activeConfig: IntegrationConfig | null = null;
  private activeAdapter: CatalogAdapter | null = null;

  /**
   * Registers and activates an integration adapter asynchronously.
   * Validates configuration and adapter contract atomically before committing active state.
   */
  public async registerAdapter(config: IntegrationConfig, adapter?: CatalogAdapter): Promise<void> {
    // 1. Validate IntegrationConfig structure
    const configVal = validateIntegrationConfig(config);
    if (!configVal.valid) {
      throw new IntegrationError(
        'ADAPTER_INITIALIZATION_FAILED',
        `Invalid integration configuration: ${configVal.errors.join('; ')}`
      );
    }

    // 2. Verify enabled status
    if (!config.enabled) {
      throw new IntegrationError(
        'ADAPTER_INITIALIZATION_FAILED',
        `Integration "${config.integrationId}" is disabled`
      );
    }

    let targetAdapter: CatalogAdapter;

    // 3. Obtain or validate adapter instance
    if (adapter) {
      if (!validateCatalogAdapter(adapter)) {
        throw new IntegrationError(
          'INVALID_ADAPTER',
          'Provided adapter object does not satisfy CatalogAdapter interface'
        );
      }
      targetAdapter = adapter;
    } else {
      targetAdapter = await createCatalogAdapter(config);
    }

    // 4. Atomic commit: Mutate active state only after all async validations and initializations pass
    this.activeConfig = JSON.parse(JSON.stringify(config));
    this.activeAdapter = targetAdapter;
  }

  /**
   * Unregisters active adapter and resets runtime state.
   */
  public reset(): void {
    this.activeConfig = null;
    this.activeAdapter = null;
  }

  /**
   * Checks whether an active adapter is configured and initialized.
   */
  public isAdapterConfigured(): boolean {
    return this.activeAdapter !== null;
  }

  /**
   * Retrieves active CatalogAdapter or throws explicit NO_ACTIVE_ADAPTER error.
   */
  public getActiveAdapter(): CatalogAdapter {
    if (!this.activeAdapter) {
      throw new IntegrationError('NO_ACTIVE_ADAPTER', 'No integration adapter is currently registered or active');
    }
    return this.activeAdapter;
  }

  /**
   * Retrieves sanitized client-safe active integration configuration.
   */
  public getActiveConfig(): PublicIntegrationConfig | null {
    if (!this.activeConfig) return null;
    return sanitizeIntegrationConfig(this.activeConfig);
  }

  /**
   * Queries products from active integration adapter.
   */
  public async getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]> {
    const adapter = this.getActiveAdapter();
    return adapter.getProducts(query);
  }

  /**
   * Retrieves a product by ID from active integration adapter.
   */
  public async getProduct(productId: string): Promise<PlatformCatalogProduct | null> {
    const adapter = this.getActiveAdapter();
    return adapter.getProduct(productId);
  }

  /**
   * Strict product lookup that throws IntegrationError with code PRODUCT_NOT_FOUND if missing.
   */
  public async getProductOrThrow(productId: string): Promise<PlatformCatalogProduct> {
    const product = await this.getProduct(productId);
    if (!product) {
      throw new IntegrationError(
        'PRODUCT_NOT_FOUND',
        `Product with ID "${productId}" was not found in active catalog`
      );
    }
    return product;
  }

  /**
   * Resolves a catalog product to its 3D garment asset.
   */
  public resolveProduct3D(product: PlatformCatalogProduct | null | undefined, avatarId?: AvatarId): Product3DResolutionResult {
    return resolveProduct3D(product, avatarId);
  }

  /**
   * Fetches a product by ID via active adapter and resolves its 3D representation.
   */
  public async resolveProduct3DById(productId: string, avatarId?: AvatarId): Promise<Product3DResolutionResult> {
    const adapter = this.getActiveAdapter();
    const product = await adapter.getProduct(productId);
    if (!product) {
      return {
        valid: false,
        errors: [`Product with ID "${productId}" does not exist in active catalog`],
      };
    }
    return resolveProduct3D(product, avatarId);
  }
}

// Global default runtime instance
const globalRuntimeManager = new IntegrationRuntimeManager();

/**
 * Global integration runtime convenience functions.
 */
export function registerAdapter(config: IntegrationConfig, adapter?: CatalogAdapter): Promise<void> {
  return globalRuntimeManager.registerAdapter(config, adapter);
}

export function resetIntegrationRuntime(): void {
  globalRuntimeManager.reset();
}

export function isAdapterConfigured(): boolean {
  return globalRuntimeManager.isAdapterConfigured();
}

export function getActiveAdapter(): CatalogAdapter {
  return globalRuntimeManager.getActiveAdapter();
}

export function getActiveConfig(): PublicIntegrationConfig | null {
  return globalRuntimeManager.getActiveConfig();
}

export function getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]> {
  return globalRuntimeManager.getProducts(query);
}

export function getProduct(productId: string): Promise<PlatformCatalogProduct | null> {
  return globalRuntimeManager.getProduct(productId);
}

export function getProductOrThrow(productId: string): Promise<PlatformCatalogProduct> {
  return globalRuntimeManager.getProductOrThrow(productId);
}

export function resolveRuntimeProduct3D(
  product: PlatformCatalogProduct | null | undefined,
  avatarId?: AvatarId
): Product3DResolutionResult {
  return globalRuntimeManager.resolveProduct3D(product, avatarId);
}

export function resolveRuntimeProduct3DById(
  productId: string,
  avatarId?: AvatarId
): Promise<Product3DResolutionResult> {
  return globalRuntimeManager.resolveProduct3DById(productId, avatarId);
}
