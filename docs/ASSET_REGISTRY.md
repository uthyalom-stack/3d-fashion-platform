# 3D Asset Registry & Management Architecture

This document describes the Phase 5 3D Asset Registry foundation for the platform.

---

## 1. Asset Pipeline Architecture

The platform strictly decouples asset metadata from 3D resource loading and rendering:

```text
Asset definition (assets.json)
      ↓
Registry (src/lib/3d/assetRegistry.ts)
      ↓
Model URL (/models/...)
      ↓
ModelLoader (src/components/3d/ModelLoader.tsx)
      ↓
Three.js Scene Graph
```

* **Asset Identity & Metadata:** Centralized in pure JSON/TypeScript (`assets.json` and `assetRegistry.ts`).
* **Model Loading:** Managed exclusively by `ModelLoader` via `@react-three/drei`'s `useGLTF`.
* **Resource Ownership:** The `useGLTF` cache owns GPU geometries, base materials, and textures. The registry owns only lightweight metadata strings and objects.

---

## 2. Asset Identifier Rules

Asset IDs are deterministic, stable, unique, and filesystem-safe:

* **Format Style:** `<assetType>.<slot_or_variant>.<name>`
  * Example Avatar IDs: `avatar.male.base`, `avatar.female.base`
  * Example Garment IDs: `garment.top.basic-tshirt`
* **Alias Mapping:** For backward compatibility, legacy identifiers (e.g. `male`, `female`, `GARMENT_top_basic_tshirt`) map deterministically to primary asset IDs in `assetRegistry.ts`.
* **Decoupling from Commerce:** Asset IDs reflect 3D platform geometry and asset identity. They do not contain pricing, inventory, cart, SKU, or checkout information.

---

## 3. Schema & Versioning

Assets carry explicit schema and version fields to allow future contract evolution without breaking changes:

* `schemaVersion`: The structural metadata contract version (e.g., `'1.0'`).
* `version`: The 3D asset content version (e.g., `'1.0.0'`).

---

## 4. Garment Asset Relationship

Garment assets build upon the generic 3D asset contract by adding slot and compatibility constraints:

```text
Generic Base3DAsset
      ↓
Garment3DAsset
      ↓
Canonical Garment Slot ('top' | 'bottom' | 'feet' | 'waist' | 'hand')
      ↓
Supported Avatar IDs ('male' | 'female')
      ↓
Attachment Resolver & Skeleton Anchor
```

* **Canonical Slots:** Enforced as exactly `'top'`, `'bottom'`, `'feet'`, `'waist'`, `'hand'`.
* **Avatar Compatibility:** A garment explicitly lists supported avatar IDs. Incompatible garments cannot be equipped.

---

## 5. Storage Model

* **Current Implementation:** Phase 5 references local static GLB files hosted in `/public/models/...`.
* **Future Migration:** Storage provider integration (e.g. Cloudflare R2 or AWS S3) is intentionally deferred. The `modelUrl` abstraction ensures future storage migrations require no changes to runtime scene or attachment code.

---

## 6. Resource Ownership & Lifecycle

The platform follows a safe Strict Mode-compatible resource ownership model established in Phase 1:

* **Registry Scope:** The `AssetRegistry` is a pure metadata layer. It does NOT load GLTF files or instantiate Three.js objects.
* **Cache Ownership:** Shared GPU geometries, base materials, and textures are owned exclusively by `@react-three/drei`'s `useGLTF` loader cache. Code outside the cache must never dispose these shared GPU resources.
* **Instance Transform Isolation:** Every `ModelLoader` component instance creates an isolated clone of the Object3D scene tree (`gltf.scene.clone(true)`).
* **Instance Material Management:** When instance-isolated materials are enabled (`deepCloneMaterials = true`), original material references are safely preserved in `mesh.userData._originalMaterial`. Upon unmount or React Strict Mode remount, instance-owned cloned materials are disposed cleanly via `disposeMaterial()` while original cached materials are restored prior to disposal, ensuring cached GPU allocations remain intact and uncorrupted.
