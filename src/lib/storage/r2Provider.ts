import { AssetStorageProvider } from './types';
import { getR2ConfigFromEnv, R2EnvironmentConfig } from './config';
import { normalizeObjectKey } from './objectKey';

/**
 * Concrete Storage Provider adapter for Cloudflare R2 / S3-compatible Object Storage.
 * Generates browser-safe public delivery URLs deterministically using public delivery domain configuration.
 * Separates storage API credentials from public browser delivery endpoint.
 */
export class R2StorageProvider implements AssetStorageProvider {
  readonly providerId = 'r2';
  private overrideConfig?: Partial<R2EnvironmentConfig>;

  constructor(customConfig?: Partial<R2EnvironmentConfig>) {
    if (customConfig) {
      this.overrideConfig = customConfig;
    }
  }

  private getConfig(): Partial<R2EnvironmentConfig> {
    if (this.overrideConfig) {
      return this.overrideConfig;
    }
    return getR2ConfigFromEnv();
  }

  /**
   * For public browser delivery URL generation, at minimum a public domain or bucket delivery domain is required.
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.publicDomain && config.publicDomain.trim() !== '');
  }

  resolveObjectUrl(objectKey: string): string {
    const config = this.getConfig();

    if (!config.publicDomain || config.publicDomain.trim() === '') {
      throw new Error(
        'Storage public delivery URL is not configured: Cloudflare R2 provider missing public domain setting (STORAGE_R2_PUBLIC_DOMAIN).'
      );
    }

    const cleanKey = normalizeObjectKey(objectKey);

    let rawDomain = config.publicDomain.trim();
    // Normalize protocol
    if (!rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
      rawDomain = `https://${rawDomain}`;
    }

    if (rawDomain.startsWith('http://')) {
      throw new Error('Insecure HTTP protocol is rejected. Public delivery domain must use secure HTTPS ("https://").');
    }

    // Remove trailing slash from domain
    const cleanDomain = rawDomain.replace(/\/+$/, '');

    // Return deterministic browser-safe asset delivery URL
    const finalUrl = `${cleanDomain}/${cleanKey}`;

    // Verify final URL scheme
    try {
      const parsed = new URL(finalUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error(`Insecure delivery protocol "${parsed.protocol}" rejected.`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new Error(`Failed to resolve asset delivery URL: ${err.message}`);
      }
      throw new Error('Failed to resolve asset delivery URL: Invalid URL generated.');
    }

    return finalUrl;
  }
}
