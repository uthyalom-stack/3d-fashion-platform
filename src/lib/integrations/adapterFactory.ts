import { CatalogAdapter, PlatformCatalogProduct } from './types';
import { IntegrationConfig, validateIntegrationConfig } from './config';
import { LocalCatalogAdapter } from './localCatalogAdapter';
import { MockProviderAdapter, ProviderCatalogAdapter } from './mockProvider';
import { IntegrationError } from './errors';

/**
 * Validates whether an object conforms to the CatalogAdapter interface.
 */
export function validateCatalogAdapter(adapter: unknown): adapter is CatalogAdapter {
  if (!adapter || typeof adapter !== 'object') return false;
  const candidate = adapter as Partial<CatalogAdapter>;
  return typeof candidate.getProduct === 'function' && typeof candidate.getProducts === 'function';
}

/**
 * Factory function for instantiating vendor-neutral CatalogAdapters based on IntegrationConfig.
 * Strictly enforces supported adapter types and fails clearly without silent fallbacks.
 */
export function createCatalogAdapter(config: IntegrationConfig): CatalogAdapter {
  const valResult = validateIntegrationConfig(config);
  if (!valResult.valid) {
    throw new IntegrationError(
      'ADAPTER_INITIALIZATION_FAILED',
      `Invalid integration configuration: ${valResult.errors.join('; ')}`
    );
  }

  if (!config.enabled) {
    throw new IntegrationError(
      'ADAPTER_INITIALIZATION_FAILED',
      `Integration "${config.integrationId}" is disabled`
    );
  }

  let adapter: CatalogAdapter;

  switch (config.adapterType) {
    case 'local': {
      const customProducts = config.publicConfig?.initialProducts as PlatformCatalogProduct[] | undefined;
      adapter = new LocalCatalogAdapter(customProducts);
      break;
    }

    case 'mock': {
      const mockProvider = new MockProviderAdapter(config);
      // Synchronous initialization trigger for deterministic factory flow
      mockProvider.initialize().catch((err) => {
        // Initialization errors caught on query if async
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[MockProvider] Async initialization warning for "${config.integrationId}":`, err);
        }
      });
      adapter = new ProviderCatalogAdapter(mockProvider);
      break;
    }

    default:
      throw new IntegrationError(
        'UNSUPPORTED_ADAPTER_TYPE',
        `Unsupported adapter type "${config.adapterType}"`
      );
  }

  if (!validateCatalogAdapter(adapter)) {
    throw new IntegrationError(
      'INVALID_ADAPTER',
      `Instantiated adapter for type "${config.adapterType}" does not satisfy CatalogAdapter contract`
    );
  }

  return adapter;
}
