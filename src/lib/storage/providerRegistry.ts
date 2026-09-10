import { AssetStorageProvider } from './types';
import { LocalStorageProvider } from './localProvider';
import { R2StorageProvider } from './r2Provider';

/**
 * Deterministic Storage Provider Registry.
 * Central registry mapping provider identifiers ('local', 'r2', etc.) to concrete AssetStorageProvider instances.
 * Client-safe: Contains zero references to server-side credentials or secret environment variables.
 */
class StorageProviderRegistry {
  private providers: Map<string, AssetStorageProvider> = new Map();

  constructor() {
    // Register default concrete providers
    this.registerProvider(new LocalStorageProvider());
    this.registerProvider(new R2StorageProvider());
  }

  /**
   * Registers or replaces a storage provider adapter.
   */
  registerProvider(provider: AssetStorageProvider): void {
    if (!provider || typeof provider.providerId !== 'string' || provider.providerId.trim() === '') {
      throw new Error('Cannot register storage provider: Provider must have a valid providerId.');
    }
    this.providers.set(provider.providerId.toLowerCase().trim(), provider);
  }

  /**
   * Retrieves a registered storage provider by ID.
   * Throws an explicit error if the provider ID is unsupported or unregistered.
   * Does NOT perform silent fallback.
   */
  getProvider(providerId: string): AssetStorageProvider {
    if (!providerId || typeof providerId !== 'string' || providerId.trim() === '') {
      throw new Error('Unsupported asset storage provider: Provider ID must be specified.');
    }

    const cleanId = providerId.toLowerCase().trim();
    const provider = this.providers.get(cleanId);

    if (!provider) {
      throw new Error(`Unsupported storage provider: "${providerId}". No registered provider adapter found.`);
    }

    return provider;
  }

  /**
   * Checks if a provider identifier is registered.
   */
  hasProvider(providerId: string): boolean {
    if (!providerId || typeof providerId !== 'string') return false;
    return this.providers.has(providerId.toLowerCase().trim());
  }

  /**
   * Lists all currently registered provider identifiers.
   */
  getRegisteredProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Global singleton instance for storage provider registry
export const providerRegistry = new StorageProviderRegistry();
