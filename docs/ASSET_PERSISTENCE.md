# Phase 8 — 3D Asset Metadata Persistence Architecture

## 1. Overview

Phase 8 introduces a clean persistence architecture for 3D asset metadata within the platform. Historically, platform 3D assets were statically bound to a JSON manifest (`src/lib/3d/assets.json`). Phase 8 decouples asset domain representations from static storage files by introducing an asynchronous `AssetRepository` boundary and a vendor-neutral persistence layer.

> **Crucial Rule:**
> **Asset metadata persistence is separate from 3D binary storage.**

The persistence layer owns **asset metadata records** (e.g. IDs, categories, semantic versions, display names, transform offsets, slot definitions, and authoritative asset locations).

It does **NOT** own:
- Actual GLB 3D binary files (handled by storage providers / web servers)
- Object storage buckets or credentials (handled by Phase 7 Storage Provider abstraction)
- Product data, prices, inventory, cart, or checkout (strictly decoupled commerce concerns)
- User accounts, authentication, or roles
- Admin panel UI or CRUD forms

---

## 2. Platform Architecture Context

```text
3D Asset Domain Contract (Platform3DAsset)
        ↓
Asset Repository Interface (AssetRepository)
        ↓
Persistence Adapter (LocalAssetPersistenceAdapter / PostgreSQL / SQLite)
        ↓
Stored Asset Metadata Record
        ↓
Asset Registry / Domain Consumers
        ↓
Asset Location (AssetLocation)
        ↓
Storage Provider / Delivery Resolver (resolveAssetUrl)
        ↓
ModelLoader (useGLTF)
        ↓
Three.js Scene Graph
```

---

## 3. Core Architectural Rules

1. **`AssetLocation` is Authoritative:** `AssetLocation` remains the SINGLE authoritative representation of where an asset binary is stored and how it is fetched. No competing location or URL properties (`modelUrl`, `assetUrl`, `storageUrl`, `cdnUrl`) are permitted on asset records.
2. **Domain vs Persistence Separation:**
   - **Persistence answers:** *"What asset metadata exists in the repository?"*
   - **Storage / Delivery answers:** *"Where is the asset binary located and how does the runtime obtain it?"*
3. **Validation before Persistence:** Every asset record must pass strict validation against platform domain contracts (`validateAsset`) before being stored or updated.
4. **Immutability & State Safety:** The persistence layer works purely with serializable JSON metadata. It NEVER stores Three.js WebGL runtime objects (`THREE.Object3D`, `THREE.Mesh`, `THREE.BufferGeometry`, etc.). All records retrieved from or saved to the repository are deep-cloned to prevent internal state mutation bugs.

---

## 4. Repository Interface (`AssetRepository`)

Located at `src/lib/3d/persistence/types.ts`:

```ts
export interface AssetRepository {
  /**
   * Retrieves a 3D asset by primary asset ID or registered alias.
   */
  getAsset(assetId: string): Promise<Platform3DAsset | null>;

  /**
   * Returns an array of all persisted 3D assets in deterministic order.
   */
  getAssets(): Promise<Platform3DAsset[]>;

  /**
   * Filters and returns all persisted 3D assets matching a specific AssetType.
   */
  getAssetsByType(assetType: AssetType): Promise<Platform3DAsset[]>;

  /**
   * Checks if an asset exists in the repository by primary asset ID or alias.
   */
  hasAsset(assetId: string): Promise<boolean>;

  /**
   * Saves or updates a 3D asset record in the repository after strict validation.
   */
  saveAsset(asset: Platform3DAsset, aliasIds?: string[]): Promise<void>;

  /**
   * Deletes an asset record and its associated aliases by primary ID or alias.
   */
  deleteAsset(assetId: string): Promise<boolean>;

  /**
   * Clears all stored asset records and alias mappings.
   */
  clear(): Promise<void>;

  /**
   * Returns total count of distinct primary assets in repository.
   */
  count(): Promise<number>;
}
```

---

## 5. Local Reference Persistence Adapter

Located at `src/lib/3d/persistence/localAdapter.ts`:

`LocalAssetPersistenceAdapter` is the default vendor-neutral local development implementation of `AssetRepository`.

### Features:
- **Zero Heavy Dependencies:** Implemented in pure TypeScript/JavaScript without requiring native module compilation or external hosted database connections.
- **Deterministic Storage & Lookup:** Maintains an insertion-ordered store and secondary alias lookup map.
- **Strict Validation:** Executes `validateAsset` prior to persisting any record.
- **Deep Cloning:** Uses JSON-serialization deep cloning on read and write boundaries to prevent accidental mutation of internal state.

---

## 6. Manifest Migration & Seed Path

Located at `src/lib/3d/persistence/seed.ts`:

To maintain compatibility with existing platform assets, `src/lib/3d/assets.json` serves as the initial canonical seed data source. The `seedAssetRepository` utility populates an `AssetRepository` instance directly from `assets.json`:

```ts
import { seedAssetRepository, LocalAssetPersistenceAdapter } from '@/lib/3d/persistence';

const repository = new LocalAssetPersistenceAdapter();
await seedAssetRepository(repository);
```

Preserved fields during seeding:
- `assetId`
- `assetType`
- `schemaVersion`
- `version`
- `displayName`
- `location` (Authoritative `AssetLocation`)
- Avatar-specific metadata (`avatarId`, `gender`, `scale`, `positionOffset`, `rotationOffset`)
- Garment-specific metadata (`slot`, `supportedAvatarIds`, `scale`, `positionOffset`, `rotationOffset`)
- Performance metadata (`triCount`, `vertexCount`, `materialCount`, `fileSizeBytes`)
- Alias mappings (`aliasIds`)

---

## 7. AssetRegistry Integration

`src/lib/3d/assetRegistry.ts` acts as the domain-facing layer for studio and runtime consumers. It wraps `AssetRepository` as its backing source while maintaining synchronous domain getters for existing Three.js scene rendering graphs.

```text
Studio / Runtime Consumers
          ↓
     AssetRegistry
          ↓
    AssetRepository
          ↓
LocalAssetPersistenceAdapter / Database Adapter
```

Runtime consumers use `AssetRegistry` or `getAssetRepository()` to interact with 3D asset metadata without coupling components to specific persistence implementations.

---

## 8. Security & Boundaries

- **Zero Credentials in Metadata:** Persisted asset metadata contains NO database passwords, access keys, or storage tokens.
- **Client/Server Safe:** The domain contract and `LocalAssetPersistenceAdapter` are pure, serializable TypeScript modules safe for execution across both Next.js App Router client components and server environments.
- **No `NEXT_PUBLIC_` Exposure of Database Credentials:** Any future server-side database adapters (e.g., Prisma, Drizzle, PostgreSQL connection pools) must remain strictly on the server layer.

---

## 9. Future Production Database Strategy

Because the 3D runtime consumes the abstract `AssetRepository` interface, future production deployments can substitute `LocalAssetPersistenceAdapter` with database adapters (e.g., `PostgresAssetRepository`, `SQLiteAssetRepository`, or `LibSQLAssetRepository`) without altering Three.js components, `ModelLoader`, `AssetLocation`, or `AssetRegistry` domain contracts.

---

## 10. Explicitly Out-of-Scope Items

The following features are intentionally excluded from Phase 8 to preserve core platform purity:
- User authentication, roles, or multi-tenancy
- Admin CRUD web UI or asset upload forms
- E-commerce fields (prices, SKUs, inventory, checkout)
- Hosted database provisioning or cloud infrastructure automation
