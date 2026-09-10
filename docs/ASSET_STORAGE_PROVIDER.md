# Phase 7 — Object Storage Provider Foundation Architecture

## 1. Overview & Architecture

The Phase 7 Object Storage Provider Foundation introduces a vendor-neutral storage provider abstraction to the 3D fashion platform without coupling core 3D systems (`ModelLoader`, `Avatar`, `Garment`, `Scene`, `AssetRegistry`) to Cloudflare R2 or any specific cloud vendor.

### Architecture Diagram

```text
Asset Registry (assets.json)
      ↓
AssetLocation (`source: 'provider'`, `provider: 'r2'`, `objectKey: '...'`)
      ↓
Storage Provider Registry (`providerRegistry`)
      ↓
Concrete Provider Adapter (`R2StorageProvider` / `LocalStorageProvider`)
      ↓
Browser-Safe Resolved Public Asset URL (`https://<public-domain>/<object-key>`)
      ↓
Asset Delivery Resolver (`resolveAssetUrl`)
      ↓
ModelLoader (`useGLTF`)
      ↓
Three.js Scene Graph
```

---

## 2. Vendor Neutrality & Abstraction

The core platform remains vendor-agnostic. All concrete storage operations implement the minimalist `AssetStorageProvider` contract:

```ts
export interface AssetStorageProvider {
  readonly providerId: string;
  isConfigured(): boolean;
  resolveObjectUrl(objectKey: string): string;
}
```

The system avoids unnecessary SDK bloat and heavyweight cloud storage frameworks, relying on deterministic URL resolution and native HTTP standard APIs.

---

## 3. Authoritative `AssetLocation` Contract

`AssetLocation` remains the single authoritative representation of where a 3D asset binary lives. No parallel URL properties (e.g. `modelUrl`, `runtimeUrl`, `storageUrl`) exist.

```ts
export interface AssetLocation {
  source: 'local' | 'remote' | 'provider';
  path?: string; // For 'local' (/models/...) or 'remote' (https://...)
  provider?: string; // e.g., 'r2', 'local'
  objectKey?: string; // e.g., 'avatars/male/v1.0.0/base-avatar.glb'
  providerMetadata?: Record<string, unknown>;
}
```

---

## 4. Client/Server Dependency Boundary & Security

To guarantee that storage credentials never leak into client JavaScript bundles:

1. **Client Public Config (`clientConfig.ts`)**: Used by browser-facing 3D delivery paths (`assetDelivery.ts`, `providerRegistry.ts`, `r2Provider.ts`). Resolves only public delivery settings (e.g., `STORAGE_R2_PUBLIC_DOMAIN`).
2. **Server-Only Credentials (`serverConfig.ts`)**: Contains administrative storage credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, etc.). Kept strictly behind server boundaries and never imported by browser-facing modules.
3. **No `NEXT_PUBLIC_` Secrets**: Enforced by security checks (`enforceServerSecurityBoundaries()`), preventing accidental bundling of secrets into client JavaScript.
4. **No Client SDK**: The browser never initializes an S3 client or communicates directly using R2 access keys.

---

## 5. Storage Providers

### Local Provider (`local`)
* Handles static local public assets (e.g. `/models/avatar/male/base-avatar.glb`).
* Requires zero external credentials or network configuration.

### Cloudflare R2 Provider (`r2`)
* Formats deterministic browser-safe HTTPS asset delivery URLs using configured public domains (`STORAGE_R2_PUBLIC_DOMAIN`).
* Separates storage API credentials from browser public delivery endpoints.
* Throws explicit configuration errors when public delivery settings are missing or insecure (HTTP rejected).

---

## 6. Deterministic Object Key Convention & Hardened Traversal Sanitization

Keys must be filesystem-safe, predictable, and free of path traversal (`..`), query parameters (`?`), or executable schemes (`javascript:`, `data:`).

Standard formatting:
* **Avatars**: `avatars/<assetId>/v<version>/<filename>`
* **Garments**: `garments/<slot>/<assetId>/v<version>/<filename>`
* **Others**: `<assetType>s/<assetId>/v<version>/<filename>`

### Traversal Sanitization Rules
`normalizeObjectKey` normalizes backslashes to forward slashes and splits path segments, strictly rejecting keys if any segment equals `..` or `.`, including terminal traversal cases (`avatars/male/..`).

---

## 7. Explicit Error Handling

The storage layer distinguishes between distinct failure modes without silent fallbacks:
* `Unsupported storage provider`: Unregistered provider ID specified.
* `Storage provider is not configured`: R2 public delivery configuration missing.
* `Invalid storage object key`: Illegal key format or traversal attempt.
* `Storage public delivery URL is not configured`: Missing public domain setting.

---

## 8. Development & Local Behavior

Local assets remain fully operational out of the box without R2 credentials:
```bash
npm install
npm run dev
```

Developers can switch or inspect providers seamlessly in the 3D Studio inspection panel.

---

## 9. Out-of-Scope Responsibilities

Storage providers do **NOT** own or manage:
* Asset metadata or product definitions
* Commerce / pricing / inventory
* Three.js resources or WebGL contexts
* User authentication or dashboards
* Automatic 3D model generation / cloth simulation
