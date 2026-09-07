# 3D Fashion Platform — Phase 2 Avatar System Foundation

A clean, lightweight, open-source-first web foundation for a standalone 3D fashion visualization platform.

## Project Overview

This project establishes the 3D runtime and avatar foundation for the **3D Fashion Platform**.
- **Phase 0:** High-performance 3D scene engine, dynamic camera controls, studio three-point lighting, and procedural mannequin avatar placeholder.
- **Phase 1:** Reusable GLB/glTF model loading infrastructure, generic 3D asset contracts, and safe Three.js memory disposal lifecycle management.
- **Phase 2:** Base Avatar Foundation — Replaces the procedural mannequin placeholder with a real, license-safe open-source base avatar system supporting dual adult base avatars (`male` and `female`). Both models are generated from the **MakeHuman / MPFB2** ecosystem under **CC0 1.0 Universal Public Domain Dedication**, encapsulated in a unified, reusable `<Avatar />` component driven by `AVATAR_REGISTRY` configuration, and backed by a 53-joint humanoid skeletal structure ready for future garment attachments.

## Base Avatar Specifications & Licenses

### 1. Male Base Avatar (`male`)
- **Asset Identifier**: `male`
- **Asset Location**: `public/models/avatar/male/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (`makehumancommunity`)
- **Generator Tools**: Blender 4.0.2 with `mpfb2` addon
- **Exact File Size**: 933,328 bytes (911.45 KB)
- **Armature / Joint Count**: 53 skinned humanoid joints
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~15.91 decimeters. Normalized in avatar registry with scale factor `0.11` to achieve standard ~1.75m adult human fashion avatar height.

### 2. Female Base Avatar (`female`)
- **Asset Identifier**: `female`
- **Asset Location**: `public/models/avatar/female/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (`makehumancommunity`)
- **Generator Tools**: Blender 4.0.2 with `mpfb2` addon
- **Exact File Size**: 932,920 bytes (911.05 KB)
- **Armature / Joint Count**: 53 skinned humanoid joints
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~17.29 decimeters. Normalized in avatar registry with scale factor `0.10` to achieve standard ~1.73m adult human fashion avatar height.

### Coordinate System & Alignment Assumptions

- **Origin**: Centered on origin `[0, 0, 0]` at floor/ground level (contact point).
- **Vertical Orientation**: `+Y` is UP, `+Z` is FORWARD (facing camera at `[0, 1.0, 2.8]`).
- **Pose**: Neutral standing rest A-pose suitable as a fashion mannequin and base figure.
- **Skeletal Joints**: Preserves 53-joint hierarchy covering root, pelvis, spine_01..03, neck_01, head, clavicles, upper arms, lower arms, hands, fingers, thumbs, thighs, calves, feet, and ball joints.

## Technology Foundation & Stack

- **Framework:** Next.js (App Router)
- **UI Library:** React 19
- **Language:** TypeScript (Strict)
- **3D Graphics Engine:** Three.js
- **React 3D Renderer:** React Three Fiber (`@react-three/fiber`)
- **3D Helpers & Utilities:** `@react-three/drei`

## Free & Open-Source-First Dependency Principle

This project adheres strictly to an open-source first philosophy:
- Permissive open-source licenses (MIT/Apache-2.0 / CC0 1.0 Universal).
- Zero paid SaaS dependencies, proprietary visualization SDKs, or commercial 3D engine licenses.
- Zero external network requests or paid asset APIs at runtime.

For a full breakdown of third-party dependencies and asset licenses, see [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Project Architecture

```
app/
├── page.tsx            # Clean Landing Page
└── studio/
    └── page.tsx        # 3D Studio Viewer Page with Male / Female Avatar Selector

public/
└── models/
    ├── avatar/
    │   ├── female/
    │   │   └── base-avatar.glb # MakeHuman CC0 1.0 female base avatar asset (911 KB)
    │   ├── male/
    │   │   └── base-avatar.glb # MakeHuman CC0 1.0 male base avatar asset (911 KB)
    │   └── README.md           # Avatar asset specs & license documentation
    └── test-cube.glb           # Procedurally generated open-source dev test GLB asset

scripts/
├── test-avatar.js      # Unit test verifying dual avatar GLB presence, skinning, and 53-joint hierarchy
└── test-ownership.js   # Unit test verifying Three.js resource lifecycle & ownership

src/
├── components/
│   └── 3d/
│       ├── Avatar.tsx             # Reusable Base Avatar component (Scene -> Avatar -> ModelLoader -> GLB)
│       ├── AvatarPlaceholder.tsx  # Fallback procedural mannequin built from Three.js primitives
│       ├── CameraControls.tsx     # OrbitControls with limits & camera reset capability
│       ├── Lighting.tsx           # Studio three-point lighting & hemisphere ambient light
│       ├── ModelLoader.tsx        # Reusable GLB/glTF asset loader with isolation & cleanup
│       ├── Scene.tsx              # Modular 3D scene composition
│       ├── ThreeErrorBoundary.tsx # WebGL error handling & fallback
│       └── ViewerCanvas.tsx       # R3F Canvas container with WebGL detection & SSR bypass
├── lib/
│   └── 3d/
│       ├── constants.ts           # Camera defaults, limits, and scene configuration
│       ├── disposal.ts            # Three.js geometry/material resource disposal rules
│       └── webgl.ts               # WebGL browser support detector
└── types/
    └── 3d.ts                      # TypeScript definitions & generic 3D asset interfaces
```

### Multi-Avatar Architecture Flow & Normalization

Each 3D component has clear single responsibilities:
- **Architecture Flow**: `Scene → Avatar (resolves avatarId) → ModelLoader → useGLTF → GLB`.
- **`Avatar` Component & Registry**: Maps `avatarId` (`'male'` | `'female'`) through `AVATAR_REGISTRY` to determine model path and scale normalization without scattering hardcoded constants in scene code.
- **Extensibility**: Additional avatar IDs (e.g. `'boy'`, `'girl'`, body variants) can be registered in `AVATAR_REGISTRY` in future phases without modifying scene or loader code.
- **`ModelLoader` Scene Isolation**: Always clones the Object3D scene graph (`gltf.scene.clone(true)`), ensuring instance transform isolation.
- **`useGLTF` Cache Ownership**: GPU memory allocations (`BufferGeometry`, base `Material`, `Texture`) are owned by the loader cache and preserved during instance unmounts and avatar switching.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
npm install
```

### Development Server

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Type Checking & Linting

Run TypeScript type-checking:
```bash
npx tsc --noEmit
```

Run ESLint:
```bash
npm run lint
```

Run Unit & Resource Ownership Tests:
```bash
node scripts/test-avatar.js
node scripts/test-ownership.js
```

### Production Build

Build the application for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Intentionally NOT Implemented Yet (Phase 2 Scope Boundary)

To keep the codebase modular, the following systems remain intentionally deferred to future phases:
- Garment attachment / cloth simulation / soft body physics
- Product catalog / pricing / store / checkout / commerce logic
- Databases / Prisma / ORM
- User Authentication & Account management
- Cloud storage (AWS S3, Cloudflare R2)
- Body measurement / fitting / multiple body types / customization UI / body sliders
- AI garment generation
- Kids / child avatars
