# Phase 9 — Platform Admin Asset Management Architecture

## 1. Purpose

Phase 9 establishes the internal **3D Platform Asset Management Foundation** for the platform. It provides an administrative service layer and UI for managing 3D asset metadata records (`Platform3DAsset`) and location metadata (`AssetLocation`).

Key distinctions:
- **3D Asset Metadata Administration**: Manages 3D models, locations, slots, versioning, avatar compatibility, and lookup aliases.
- **Strict Decoupling from Commerce**: Does NOT store product pricing, inventory, cart, checkout, store accounts, or vendor e-commerce APIs.
- **Separate from Physical Storage**: Manages asset location metadata records in `AssetRepository`. Does not physically upload or delete binary files in S3/R2 directly from the client.

---

## 2. Architecture & Data Flow

```text
Platform Admin UI (/admin/assets)
        ↓
Asset Admin Service (`src/lib/admin/assetAdminService.ts`)
        ↓
Asset Repository (`AssetRepository` / `LocalAssetPersistenceAdapter`)
        ↓
Persisted Asset Metadata (`PersistedAssetRecord`)
        ↓
Asset Location (`AssetLocation`)
        ↓
Storage Provider (`LocalProvider` / `R2Provider`)
        ↓
Asset Delivery (`resolveAssetUrl`)
        ↓
ModelLoader (`src/components/3d/ModelLoader.tsx`)
        ↓
Three.js / React Three Fiber Canvas
```

### Persistence Boundary
The admin interface interacts exclusively with `AssetRepository` via the thin `assetAdminService` layer. It never directly mutates:
- `assets.json`
- In-memory maps
- R2 or S3 SDK internals
- Three.js scene graphs or WebGL state

---

## 3. Supported Admin Operations

| Operation | Service Method | Description |
| :--- | :--- | :--- |
| **List Assets** | `listAssets()`, `listAssetRecords()` | Lists all persisted 3D assets and PersistedAssetRecords in deterministic order. |
| **Inspect Asset** | `getAsset(id)`, `getAssetRecord(id)` | Resolves primary asset or alias and returns deep-cloned asset metadata and alias arrays. |
| **Create Asset** | `createAsset(asset, aliasIds)` | Validates and persists new 3D asset metadata with lookup aliases. Rejects duplicate primary IDs. |
| **Update Asset** | `updateAsset(id, asset, aliasIds)` | Updates existing asset metadata and atomic alias mappings. Preserves deep-clone state. |
| **Delete Asset** | `deleteAsset(id)` | Deletes asset metadata record and associated aliases from repository. Requires explicit UI confirmation. |

---

## 4. AssetLocation Authority

`AssetLocation` remains the single authoritative contract defining where an asset binary is stored.

Supported sources:
- `local`: Path relative to web root (e.g. `/models/garment/top/GARMENT_top_basic_tshirt.glb`).
- `provider`: Managed object storage provider ID (e.g. `r2`) + deterministic `objectKey` (e.g. `garments/top/v1.0.0/basic-tshirt.glb`).
- `remote`: Direct absolute HTTPS URL.

Competing location fields such as `modelUrl`, `assetUrl`, `runtimeUrl`, or `storageUrl` are strictly forbidden.

---

## 5. Alias Ownership & Reassignment Model

Lookup aliases (`aliasIds`) provide portable secondary keys for asset lookup (e.g., legacy IDs or canonical glTF node names like `GARMENT_top_basic_tshirt`).

Rules enforced:
- **Validation**: Aliases must be non-empty filesystem-safe strings (alphanumeric, dot, dash, underscore).
- **Atomic Reassignment**: If an alias previously belonged to Asset A and is assigned to Asset B, ownership transfers atomically to Asset B without corrupting Asset A's primary record or leaving orphaned references.
- **Deletion Scope**: Deleting an asset removes only the aliases pointing directly to that asset, without removing other assets.

---

## 6. Storage Provider & Security Isolation

- **No Secrets Client-Side**: Storage provider credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) and AWS SDK imports (`@aws-sdk/*`) are strictly isolated to server-only modules (`src/lib/storage/serverConfig.ts`, `src/lib/storage/r2Provider.ts`).
- **No Client Hardcoding**: Client components operate on vendor-neutral `AssetLocation` records.
- **Authentication Note**: Real authentication and role-based authorization (RBAC) are intentionally out of scope for this foundation phase. In production, server endpoints and mutation routes must be protected by an authentication proxy / middleware layer.

---

## 7. Metadata vs. Physical Asset Deletion

When an asset is deleted via the Admin interface:
- The metadata record and alias mappings are purged from `AssetRepository`.
- Physical GLB files on local disk or in R2 storage buckets are **NOT** deleted automatically.
- Physical asset cleanup remains a separate administrative process to prevent accidental file deletion across shared assets or staging environments.

---

## 8. Relation to 3D Studio

- The 3D Studio (`/studio`) remains the customer/developer interactive 3D viewport for testing outfit equipping, avatar switching, and camera controls.
- The Admin interface (`/admin/assets`) is an internal platform tool for asset registration and metadata maintenance.
- Both consume the central `AssetRegistry` and `AssetLocation` delivery pipeline seamlessly.
