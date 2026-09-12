# Phase 11 — Integration Runtime & Product/Outfit State Foundation

## Overview

Phase 11 establishes the runtime boundary that bridges external commerce catalog products with the 3D outfit system. It enables the platform to reason about catalog products, their 3D representations, canonical garment slots, active outfit state, and live 3D avatar rendering.

Target Architecture:

```text
Catalog Product (PlatformCatalogProduct)
      ↓
3D Representation (Product3DRepresentation)
      ↓
AssetRegistry Lookup (getAsset)
      ↓
Garment Asset (Garment3DAsset)
      ↓
Product Outfit Manager (ProductOutfitManager)
      ↓
Equip / Replace / Remove
      ↓
Live 3D Avatar Scene (OutfitManager & Garment)
```

---

## Key Modules & Responsibilities

### 1. Product 3D Resolver (`src/lib/integrations/product3DResolver.ts`)

Provides canonical resolution from catalog products to registered 3D garment assets:

* `resolveProduct3D(product, avatarId?)`: Synchronous resolution and validation.
* `resolveProduct3DById(productId, adapter, avatarId?)`: Async resolution fetching from `CatalogAdapter`.

Validation Rules:
1. Product must exist and possess a non-null `representation`.
2. Referenced `assetId` must exist in `AssetRegistry`.
3. Referenced asset must be of type `'garment'` (`Garment3DAsset`).
4. `garmentSlot` must match a canonical slot (`'top' | 'bottom' | 'feet' | 'waist' | 'hand'`) and align with the registered asset slot.
5. Avatar compatibility must be verified when `avatarId` is supplied.

### 2. Product Outfit Manager (`src/lib/integrations/productOutfitManager.ts`)

Central runtime manager for catalog-selected outfit state:

* `equipProduct(product, avatarId?)`: Atomically equips a product into its canonical slot. Replaces existing product in the same slot.
* `replaceProduct(product, avatarId?)`: Alias for same-slot replacement.
* `removeProduct(productId)`: Removes equipped product across any canonical slot.
* `removeSlot(slot)`: Clears equipped item in a specific canonical slot.
* `getEquippedProduct(slot)`: Returns current equipped item for a slot.
* `getEquippedItems()`: Returns list of all active equipped items.
* `setAvatarId(newAvatarId, catalogAdapter?)`: Switches target avatar and purges incompatible equipped products.

### 3. Serialization & Deserialization (`src/lib/integrations/productOutfitSerialization.ts`)

Deterministic, versioned JSON serialization format:

* `serializeProductOutfitState(stateOrItems)`: Produces version 1 JSON-safe payload sorted deterministically by slot index.
* `deserializeProductOutfitState(input, options?)`: Parses and validates payload version, slot uniqueness, asset existence, asset type, and optional catalog product existence.

Serialized Payload Schema (v1):

```json
{
  "version": 1,
  "items": [
    {
      "productId": "prod_basic_tshirt_001",
      "assetId": "garment.top.basic-tshirt",
      "slot": "top"
    }
  ]
}
```

---

## Strict Isolation of Commerce and Runtime State

The platform enforces strict separation between catalog commerce data and 3D engine state:

| Platform Domain | Authoritative Scope |
| :--- | :--- |
| **External Catalog** | Product Identity, Title, Brand, Price, Currency, Availability, Inventory |
| **3D Platform Engine** | 3D Asset Identity, Garment Slot, Asset Location, Avatar Joint Attachment, Outfit State |

Runtime outfit contracts (`ProductOutfitItem`, `ProductOutfitState`) hold strictly `productId`, `assetId`, and `slot`. No price, inventory, or checkout URL fields exist inside 3D runtime contracts.

---

## Future Integration Boundary

* **Current Implementation**: Uses `LocalCatalogAdapter` with local product fixtures referencing real registered GLB assets.
* **Production Path**: External storefront platforms (Shopify, Commerce Layer, custom APIs) implement the `CatalogAdapter` interface, mapping product catalogs to canonical `PlatformCatalogProduct` records without requiring changes to the 3D platform runtime.
