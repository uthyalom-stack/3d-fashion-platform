# Provider Adapters & External Catalog Integration

## Overview

Phase 13 establishes the **Provider Adapter Contract** and **Mock Reference Integration Foundation** for the platform. This boundary prepares the platform for future real external commerce/catalog integrations (e.g. Shopify, WooCommerce, Medusa) without coupling core 3D platform rendering or runtime state to any specific vendor.

> **Note:** The mock provider included in this repository is a development and reference implementation. It is not a production commerce provider.

---

## Architectural Boundary

The external catalog provider layer strictly respects the platform runtime hierarchy:

```text
Provider (External Commerce System)
   │
   ▼
ProviderAdapter (`src/lib/integrations/providerTypes.ts`)
   │
   ▼
ProviderProduct (Raw Vendor Data)
   │
   ▼
ProviderNormalizer (`src/lib/integrations/providerNormalizer.ts`)
   │
   ▼
PlatformCatalogProduct (`src/lib/integrations/types.ts`)
   │
   ▼
CatalogAdapter (`src/lib/integrations/types.ts`)
   │
   ▼
IntegrationRuntime (`src/lib/integrations/runtime.ts`)
   │
   ▼
Product3DResolver (`src/lib/integrations/product3DResolver.ts`)
   │
   ▼
AssetRegistry (`src/lib/3d/assetRegistry.ts`)
   │
   ▼
ProductOutfitManager (`src/lib/integrations/productOutfitManager.ts`)
   │
   ▼
Three.js (Rendering Boundary)
```

The vendor-specific provider layer terminates at the `CatalogAdapter` boundary. The rest of the 3D platform remains entirely vendor-neutral.

---

## ProviderAdapter Contract

The `ProviderAdapter` interface (`src/lib/integrations/providerTypes.ts`) defines the operations required from external catalog providers:

```typescript
export interface ProviderAdapter {
  initialize(): Promise<void>;
  getStatus(): ProviderStatus;
  getProduct(productId: string): Promise<ProviderProduct | null>;
  listProducts(query?: CatalogProductQuery): Promise<ProviderProduct[]>;
  normalizeProduct(providerProduct: ProviderProduct): PlatformCatalogProduct;
}
```

### Decoupling Rules

A `ProviderAdapter`:
1. MUST NOT import Three.js, `@react-three/fiber`, or scene graph objects.
2. MUST NOT directly access `OutfitManager`, `ProductOutfitManager`, or `ModelLoader`.
3. MUST NOT leak vendor-specific fields (`productUrl`, `providerMetadata`, vendor IDs) into `PlatformCatalogProduct`.

---

## Data Boundary: `ProviderProduct` vs `PlatformCatalogProduct`

* `ProviderProduct`: Holds raw vendor catalog fields (`providerProductId`, vendor titles, vendor URLs, raw metadata).
* `PlatformCatalogProduct`: The canonical platform catalog record following the Phase 10 integration contract.

### Normalization Rules (`src/lib/integrations/providerNormalizer.ts`)

The normalizer transforms vendor data into platform records:
* **Strings**: Trimmed (e.g. titles, brand names).
* **Currency**: Uppercased string codes (e.g., `'usd'` -> `'USD'`).
* **Availability**: Mapped to canonical status string aliases (`'available'`, `'out_of_stock'`, `'preorder'`, `'discontinued'`).

#### Critical Normalization Guardrails
* **NEVER invent missing commerce data**: Missing prices remain `undefined`, missing currencies remain `''`.
* **NEVER clamp or convert invalid prices**: Negative prices or `NaN` values are preserved as-is.
* **NEVER default unknown status**: Unknown status strings are preserved so `validateCatalogProduct` can flag them.
* **NEVER fabricate 3D representations**: Missing representations remain `null`.

---

## Status & Operational Lifecycle

The provider status contract (`ProviderStatus`) reports operational status safely to client components:

```typescript
export interface ProviderStatus {
  providerId: string;
  providerType: string;
  state: ProviderLifecycleState; // 'configured' | 'enabled' | 'initialized' | 'unavailable' | 'initialization_failed'
  initialized: boolean;
  message?: string;
  lastCheckedAt?: string;
  details?: Record<string, unknown>;
}
```

### Security Boundary for Provider Status & Credentials
* Private API keys (`apiKey`), client secrets (`apiSecret`), and webhook secrets MUST remain inside `serverConfig` (`ServerIntegrationConfig`).
* `serverConfig` MUST NOT be serialized into public configuration, `ProviderStatus`, catalog products, or outfit state.

---

## Reference Mock Provider (`src/lib/integrations/mockProvider.ts`)

The repository provides a deterministic mock provider (`MockProviderAdapter` & `ProviderCatalogAdapter`) for development and testing:

* **Product A** (`mock_top_basic_tshirt`): Valid garment product mapped to real asset `garment.top.basic-tshirt`.
* **Product B** (`mock_top_basic_tshirt_alt`): Second valid garment product mapped to real asset `garment.top.basic-tshirt`.
* **Product C** (`mock_accessory_scarf`): Valid non-3D product record (no 3D representation).
* **Isolated Invalid Fixtures**: Fixtures testing validation edge cases (`mock_invalid_missing_price`, `mock_invalid_negative_price`, `mock_invalid_missing_currency`, `mock_invalid_unknown_availability`, `mock_invalid_unknown_asset_id`, `mock_invalid_wrong_slot`, `mock_invalid_unsupported_avatar`).

---

## Implementing a Future Real Store Provider Adapter

When building a provider adapter for a real commerce platform in the future:

1. Implement `ProviderAdapter` in a new module under `src/lib/integrations/providers/`.
2. Wrap vendor API calls inside server-only boundaries or Server Actions.
3. Use `normalizeProviderProduct` or custom normalizers to produce valid `PlatformCatalogProduct` records.
4. Wrap the `ProviderAdapter` instance using `ProviderCatalogAdapter` to satisfy `CatalogAdapter`.
5. Register the provider type in `adapterFactory.ts`.

### What a Real Provider MUST NOT Do:
* Do NOT import commerce SDKs into client-side 3D bundle code.
* Do NOT expose API keys or secrets to the browser.
* Do NOT handle cart, checkout, or payment inside the 3D studio runtime.
* Do NOT bypass `Product3DResolver` or `AssetRegistry` for asset metadata resolution.
