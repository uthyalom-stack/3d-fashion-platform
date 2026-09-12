import { ValidationResult } from './types';

/**
 * Supported adapter types for external integration layer.
 * Supports 'local' reference adapter and 'mock' reference provider adapter.
 */
export type CatalogAdapterType = 'local' | 'mock' | (string & {});

/**
 * Public, browser-safe configuration for an integration adapter.
 */
export interface PublicIntegrationConfig {
  integrationId: string;
  name: string;
  adapterType: CatalogAdapterType;
  enabled: boolean;
  publicConfig?: Record<string, unknown>;
}

/**
 * Server-only configuration boundary containing private parameters.
 * MUST NOT be exposed to client bundles or serialized into catalog products.
 */
export interface ServerIntegrationConfig {
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  serverEndpoint?: string;
  [key: string]: unknown;
}

/**
 * Complete integration configuration contract separating public and server-only options.
 */
export interface IntegrationConfig extends PublicIntegrationConfig {
  serverConfig?: ServerIntegrationConfig;
}

/**
 * Validates an IntegrationConfig object for structural correctness and mandatory fields.
 */
export function validateIntegrationConfig(config: unknown): ValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Integration configuration must be a non-null object'] };
  }

  const cfg = config as Partial<IntegrationConfig>;

  if (!cfg.integrationId || typeof cfg.integrationId !== 'string' || cfg.integrationId.trim().length === 0) {
    errors.push('integrationId must be a non-empty string');
  }

  if (!cfg.name || typeof cfg.name !== 'string' || cfg.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }

  if (!cfg.adapterType || typeof cfg.adapterType !== 'string' || cfg.adapterType.trim().length === 0) {
    errors.push('adapterType must be a non-empty string');
  }

  if (typeof cfg.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (cfg.publicConfig !== undefined && (cfg.publicConfig === null || typeof cfg.publicConfig !== 'object')) {
    errors.push('publicConfig must be an object if provided');
  }

  if (cfg.serverConfig !== undefined && (cfg.serverConfig === null || typeof cfg.serverConfig !== 'object')) {
    errors.push('serverConfig must be an object if provided');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes an IntegrationConfig for client-safe exposure by stripping out serverConfig.
 * Returns a deep-cloned PublicIntegrationConfig without mutating the source object.
 */
export function sanitizeIntegrationConfig(config: IntegrationConfig): PublicIntegrationConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid integration configuration object');
  }

  const cloned: Partial<IntegrationConfig> = JSON.parse(JSON.stringify(config));
  delete cloned.serverConfig;

  return cloned as PublicIntegrationConfig;
}
