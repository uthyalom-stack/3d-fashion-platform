# Phase 10 — Integration Contract & Catalog Handoff Foundation

## 1. Purpose

The Phase 10 Integration Contract establishes a strongly typed, vendor-neutral boundary between external commerce systems (storefronts, catalogs, inventory engines) and the 3D Fashion Platform core engine.

This integration layer enables external products to be mapped cleanly to platform 3D assets while keeping the 3D platform strictly decoupled from commerce authority.

---

## 2. Architecture & Handoff Pipeline

```
External Store (Authoritative Commerce)
        ↓
Catalog Adapter (Vendor-Neutral / Local)
        ↓
Catalog Product Contract (PlatformCatalogProduct)
        ↓
3D Asset Mapping (assetId -> Product3DRepresentation)
        ↓
Central 3D Asset Registry (AssetRegistry & Persistence)
        ↓
Storage & Delivery Abstraction (AssetLocation -> resolveAssetUrl)
        ↓
3D Model Loader & Outfit State System (ModelLoader / OutfitManager)
```

### Resolution Flow

1. **Product Lookup:** External Store or Adapter queries `getProduct(productId)`.
2. **Product Representation Check:** Product specifies optional 3D mapping `representation` containing `assetId`, `garmentSlot`, and `supportedAvatarIds`.
3. **Asset Registry Lookup:** The platform passes `representation.assetId` to `AssetRegistry.getAsset(assetId)`.
4. **Binary Location Resolution:** `AssetRegistry` evaluates authoritative `AssetLocation` and resolves public delivery URL via `resolveAssetUrl(asset)`.
5. **Viewer / Outfit Equip:** `OutfitManager.equip(slot, assetId)` equips garment into active outfit state without needing commerce URLs or prices.

---

## 3. Platform Catalog Contract

The canonical catalog contract is defined in `src/lib/integrations/types.ts`:

```typescript
export type ProductAvailability = 'available' | 'out_of_stock' | 'preorder' | 'discontinued';

export interface Product3DRepresentation {
  assetId: string;
  garmentSlot: GarmentSlot;
  supportedAvatarIds: string[];
}

export interface PlatformCatalogProduct {
  externalProductId: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  representation?: Product3DRepresentation | null;
  metadata?: Record<string, unknown>;
}
```

---

## 4. External Product Identity

The external product identity (`externalProductId`) represents the authoritative primary key in the external ecommerce provider (e.g. SKU or product ID).

* The platform consumes product display metadata (`title`, `brand`, `price`, `currency`, `availability`) strictly as read-only catalog attributes.
* The 3D platform **never** acts as the source of truth for pricing, stock, cart, or order state.

---

## 5. 3D Asset Mapping

The 3D representation mapping links an external commerce product to platform 3D asset metadata via `representation.assetId`.

* **No Competing URLs:** Catalog products do **not** define `modelUrl`, `gltfUrl`, or `assetUrl` fields.
* **Single Authority:** `AssetRegistry` and `AssetLocation` remain solely authoritative for binary asset delivery and storage provider resolution.

---

## 6. Adapter Interface

External storefront adapters implement the vendor-neutral `CatalogAdapter` contract:

```typescript
export interface CatalogProductQuery {
  availability?: ProductAvailability;
  has3D?: boolean;
  limit?: number;
  offset?: number;
}

export interface CatalogAdapter {
  getProduct(productId: string): Promise<PlatformCatalogProduct | null>;
  getProducts(query?: CatalogProductQuery): Promise<PlatformCatalogProduct[]>;
}
```

---

## 7. Local Reference Adapter

`LocalCatalogAdapter` (`src/lib/integrations/localCatalogAdapter.ts`) provides a deterministic, in-memory reference implementation for local development, tests, and Studio demonstrations.

It seeds realistic product records referencing canonical assets (`garment.top.basic-tshirt`, `avatar.male.base`, `avatar.female.base`) from `src/lib/3d/assets.json`.

---

## 8. Validation Rules

Validation is enforced by `validateCatalogProduct` (`src/lib/integrations/catalogValidator.ts`):

* Rejects empty `externalProductId` or `title`.
* Rejects negative or non-finite `price`.
* Rejects empty `currency` strings.
* Rejects invalid `availability` values.
* Rejects competing URL properties (`modelUrl`, `assetUrl`, `gltfUrl`).
* Rejects invalid or non-canonical `garmentSlot`.
* Rejects unknown `supportedAvatarIds`.
* Rejects references to non-existent assets in `AssetRegistry`.

---

## 9. Normalization Boundary

Raw incoming data from external providers is sanitized through `normalizeCatalogProduct` (`src/lib/integrations/catalogNormalizer.ts`):

* Strips vendor-specific extra fields or secrets.
* Sanitizes string whitespace and numeric types.
* Maps vendor status values (`in_stock`, `sold_out`, `pre_order`) to canonical `ProductAvailability`.
* Returns clean `PlatformCatalogProduct` shapes.

---

## 10. Relationship with AssetRegistry

The integration layer remains strictly a consumer of `AssetRegistry`:

* `PlatformCatalogProduct` holds a reference (`assetId`).
* `AssetRegistry` validates asset existence and maintains ownership of `AssetLocation`.
* `AssetLocation` resolves storage provider and URL via `resolveAssetUrl`.

---

## 11. Why Commerce Remains External

To maintain a clean modular architecture:

* **Separation of Concerns:** 3D rendering engines require geometry, materials, and attachment transforms. Commerce systems require inventory, carts, billing, and order workflows.
* **Storefront Portability:** The 3D platform can be integrated with any e-commerce provider without modifying core 3D scene, material, or garment attachment logic.

---

## 12. Future Integration Implementation Guide

To connect a production e-commerce store in the future:

1. Create a custom implementation of `CatalogAdapter` (e.g. `MyStorefrontAdapter`).
2. Implement `getProduct(id)` and `getProducts(query)` fetching from external storefront APIs.
3. Pass raw product responses through `normalizeCatalogProduct(rawResponse)`.
4. Run `validateCatalogProduct(normalizedProduct)` to verify asset mapping compatibility.

---

## 13. Explicitly Out of Scope in Phase 10

The following are strictly out of scope for Phase 10 and intentionally **not** implemented:

* Production store API connections / SDKs
* API keys, OAuth, authentication, or secrets
* Customer accounts or profiles
* Cart, checkout, payment processing, or order creation
* Webhooks or background inventory synchronization
* Database persistence for external catalog records
* Cloth simulation, body customization, or AI features
