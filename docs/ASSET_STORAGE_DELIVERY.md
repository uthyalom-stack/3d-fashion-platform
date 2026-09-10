# 3D Asset Storage & Delivery Architecture (Phase 6)

This document describes the vendor-neutral 3D asset storage and delivery abstraction implemented in Phase 6 for the 3D Fashion Platform.

---

## 1. Architectural Architecture Flow

The platform separates what an asset is, where it is stored, how its delivery URL is resolved, and how the model is loaded:

```text
3D Asset Metadata (assets.json)
       ↓
AssetRegistry (src/lib/3d/assetRegistry.ts)
       ↓
AssetLocation (src/types/asset.ts)
       ↓
AssetDeliveryResolver (src/lib/3d/assetDelivery.ts)
       ↓
Resolved Model URL
       ↓
ModelLoader (src/components/3d/ModelLoader.tsx)
       ↓
Three.js Runtime / WebGL Canvas
```

### Layer Responsibilities

1. **Asset Metadata & Registry (`src/lib/3d/assetRegistry.ts`)**: Authoritative single source of truth for platform asset metadata, performance metrics, supported avatar IDs, and slots. Decoupled from commerce or vendor specifics.
2. **Asset Location Contract (`AssetLocation` in `src/types/asset.ts`)**: Specifies the asset storage type (`'local'` | `'remote'`) and location path without credential or provider coupling.
3. **Asset Delivery Resolver (`src/lib/3d/assetDelivery.ts`)**: Deterministic, side-effect-free URL resolution and protocol/path validation module.
4. **Model Loader (`src/components/3d/ModelLoader.tsx`)**: Primary GLB/glTF runtime loading boundary powered by `@react-three/drei` (`useGLTF`) with strict Three.js resource ownership and material cloning safeguards.

---

## 2. Asset Location Contracts & Sources

The platform supports two primary asset location sources:

### Local Static Source (`source: 'local'`)
- Points to static public assets hosted within the web application repository (e.g., `/public/models/avatar/male/base-avatar.glb`).
- **Validation**: Rejects empty strings, HTTP/HTTPS absolute URLs, `javascript:` or `data:` inline schemes, and illegal directory traversal sequences (`../`).
- **Resolution**: Resolves into normalized relative web paths (e.g. `/models/...`) consumable directly by standard browser fetchers.

### Remote HTTPS Source (`source: 'remote'`)
- Points to publicly accessible, HTTPS-hosted 3D asset binaries (e.g., `https://cdn.fashion-platform.org/models/garment.glb`).
- **Validation**: Enforces strict URL syntax and HTTPS scheme (`https:`). Rejects insecure HTTP (`http:`), executable schemes (`javascript:`), or data URIs (`data:`).
- **Resolution**: Resolves deterministically into the unchanged HTTPS URL string.

---

## 3. Extensibility for Future Cloud Storage Providers

The delivery resolver is deliberately decoupled from cloud provider SDKs and paid SaaS dependencies.

Conceptually, a future S3, Cloudflare R2, or CDN integration fits cleanly into the delivery resolver without changing `ModelLoader` or `AssetRegistry`:

```text
Object Storage / CDN (S3 / R2 / CDN)
                 ↓
      AssetDeliveryResolver
                 ↓
      Resolved HTTPS URL
                 ↓
            ModelLoader
```

---

## 4. Security Boundaries & URL Validation

- **URL Validation is NOT Authorization**: The `validateAssetLocation` helper verifies URL syntax, protocol policies (HTTPS-only for remote assets), and path safety rules. It does not perform user authentication, entitlement checks, or signed URL creation.
- **No Credentials or Secrets**: Asset location metadata never contains API keys, storage bucket access keys, authorization headers, or database IDs.
- **Scheme Neutralization**: Executable or inline protocols (`javascript:`, `data:`) are strictly blocked at validation time to prevent script injection vulnerabilities.

---

## 5. Verification & Testing

Platform storage and delivery functionality is verified via:

```bash
node scripts/test-asset-delivery.js
```

This test suite covers local path resolution, remote HTTPS URLs, malformed/unsafe scheme rejection, registry delivery lookup integration, and asset location validation rules.
