# Phase 12 — Real Integration Adapter Foundation

## Purpose

Phase 12 establishes the vendor-neutral integration runtime boundary and adapter architecture. It allows the platform to consume external storefront and catalog data through standard integration contracts (`CatalogAdapter`, `PlatformCatalogProduct`, `Product3DRepresentation`) while keeping the platform completely provider-agnostic, secure, and usable with reference/local adapters.

---

## Architecture Overview

The integration runtime architecture strictly isolates external commerce systems from the 3D rendering pipeline. The engine reasons about 3D assets, garment slots, avatar compatibility, and 3D scenes without importing vendor-specific SDKs or exposing server credentials to client applications.

```text
External Store
      ↓
Provider Adapter
      ↓
CatalogAdapter
      ↓
Integration Runtime
      ↓
PlatformCatalogProduct
      ↓
Product3DResolver
      ↓
AssetRegistry
      ↓
Garment
      ↓
ProductOutfitManager
      ↓
Three.js Scene
```

---

## Key Components

### 1. Integration Configuration Contract (`src/lib/integrations/config.ts`)

Defines vendor-neutral configuration types:
- `IntegrationConfig`: Complete configuration including public metadata and optional server-only parameters.
- `PublicIntegrationConfig`: Client-safe configuration object containing `integrationId`, `name`, `adapterType`, `enabled`, and optional `publicConfig`.
- `ServerIntegrationConfig`: Server-only credentials boundary (API keys, secrets, private endpoints) that MUST NOT leak into browser bundles.
- `sanitizeIntegrationConfig(config)`: Utility function that strips `serverConfig` and returns an immutable client-safe configuration object.

### 2. Error Definitions (`src/lib/integrations/errors.ts`)

Provides deterministic error codes and the `IntegrationError` class:
- `NO_ACTIVE_ADAPTER`: Thrown when querying products or resolving 3D representations without an active adapter.
- `UNSUPPORTED_ADAPTER_TYPE`: Thrown when attempting to instantiate an unregistered or unsupported adapter type.
- `INVALID_ADAPTER`: Thrown when an adapter object fails contract validation.
- `ADAPTER_INITIALIZATION_FAILED`: Thrown when configuration is invalid or the integration is disabled.
- `PRODUCT_NOT_FOUND`: Thrown when a product ID cannot be resolved in the catalog.
- `PRODUCT_VALIDATION_FAILED`: Thrown when catalog product data violates platform contract.
- `REPRESENTATION_MISSING`: Thrown when a product has no 3D representation.
- `ASSET_MISSING`: Thrown when a product references a non-existent 3D asset in `AssetRegistry`.
- `INCOMPATIBLE_AVATAR`: Thrown when a product representation or 3D asset is incompatible with target avatar.
- `INCOMPATIBLE_SLOT`: Thrown when representation garment slot does not match registered asset slot.

### 3. Reference Adapter Factory (`src/lib/integrations/adapterFactory.ts`)

Provides `createCatalogAdapter(config)` to instantiate catalog adapters based on configuration:
- Validates structural correctness of `config`.
- Checks `config.enabled` status.
- Instantiates `LocalCatalogAdapter` for type `'local'`.
- Rejects unknown adapter types (e.g. `'shopify'`, `'woocommerce'`) explicitly with `UNSUPPORTED_ADAPTER_TYPE` error. Does *not* silently fall back to local adapter.

### 4. Integration Runtime Boundary (`src/lib/integrations/runtime.ts`)

Provides `IntegrationRuntimeManager` to control active adapter lifecycle:
- `registerAdapter(config, adapter?)`: Registers configuration and active adapter.
- `getActiveAdapter()`: Returns the active `CatalogAdapter` instance or throws `NO_ACTIVE_ADAPTER`.
- `isAdapterConfigured()`: Queries whether an active adapter is ready.
- `getActiveConfig()`: Returns sanitized public configuration.
- `getProducts(query?)`: Delegates product listing to active adapter.
- `getProduct(productId)`: Delegates product lookup to active adapter.
- `resolveProduct3D(product, avatarId?)`: Resolves catalog product to 3D garment asset.
- `resolveProduct3DById(productId, avatarId?)`: Fetches product from active adapter and resolves its 3D representation.

---

## Authority Boundaries

To maintain platform integrity and vendor neutrality, authority is cleanly divided:

| Domain | Authoritative Scope |
| :--- | :--- |
| **External Commerce / Storefront** | External product ID, title, brand, price, currency, availability, inventory, cart, checkout, orders |
| **Platform Integration Layer** | Public configuration, adapter registration, product validation, catalog normalization |
| **3D Engine / Platform** | 3D asset metadata (`AssetRegistry`), canonical garment slots, avatar attachment, `ProductOutfitManager`, runtime outfit state, asset delivery (`AssetLocation`) |

*Note: `AssetLocation` remains the single authoritative source of truth for physical 3D asset locations. The integration contract prohibits competing fields such as `modelUrl`, `assetUrl`, `runtimeUrl`, or `cdnUrl` on catalog products or runtime outfit state.*

---

## Server / Client Security Boundaries

1. **No API Secrets in Client Bundles**: `serverConfig` parameters (API keys, private tokens) are defined behind server boundaries and stripped via `sanitizeIntegrationConfig` before sending data to client components.
2. **No Credentials in Catalog Objects**: `PlatformCatalogProduct` and `ProductOutfitItem` objects contain zero credentials or private endpoint URLs.
3. **No Direct Commerce API Calls in 3D Engine**: Three.js scene components interact strictly with `OutfitManager` and `ProductOutfitManager`.

---

## Adding Future Provider Adapters

To connect a future production storefront (e.g. Shopify, Saleor, WooCommerce, or custom REST/GraphQL APIs):

1. **Implement `CatalogAdapter`**: Create an adapter class implementing `getProduct(productId)` and `getProducts(query)`.
2. **Normalize Raw Vendor Data**: Use `normalizeCatalogProduct(rawVendorData)` to transform external product payloads into canonical `PlatformCatalogProduct` records with `Product3DRepresentation`.
3. **Register Adapter Type in Factory**: Update `createCatalogAdapter(config)` in `src/lib/integrations/adapterFactory.ts` to instantiate the new adapter when `config.adapterType` matches.
4. **Register Integration**: Call `registerAdapter(config)` with integration settings.

*Explicit Statement: No production storefront, live API credentials, or vendor SDKs are connected in this phase. The local/reference adapter is used to verify architecture and runtime contracts.*
