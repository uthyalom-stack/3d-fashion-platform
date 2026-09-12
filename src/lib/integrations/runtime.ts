import { CatalogAdapter, PlatformCatalogProduct, CatalogProductQuery } from './types';
import { IntegrationConfig, PublicIntegrationConfig, sanitizeIntegrationConfig } from './config';
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
   * Registers and activates an integration adapter.
   * If custom adapter is provided, validates it; otherwise instantiates via factory.
   */
  public registerAdapter(config: IntegrationConfig, adapter?: CatalogAdapter): void {
    if (adapter) {
      if (!validateCatalogAdapter(adapter)) {
        throw new IntegrationError(
          'INVALID_ADAPTER',
          'Provided adapter object does not satisfy CatalogAdapter interface'
        );
      }
      if (!config.enabled) {
        throw new IntegrationError(
          'ADAPTER_INITIALIZATION_FAILED',
          `Integration "${config.integrationId}" is disabled`
        );
      }
      this.activeConfig = { ...config };
      this.activeAdapter = adapter;
    } else {
      const createdAdapter = createCatalogAdapter(config);
      this.activeConfig = { ...config };
      this.activeAdapter = createdAdapter;
    }
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
export function registerAdapter(config: IntegrationConfig, adapter?: CatalogAdapter): void {
  globalRuntimeManager.registerAdapter(config, adapter);
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
