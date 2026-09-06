# 3D Fashion Platform — Phase 2 Avatar System Foundation

A clean, lightweight, open-source-first web foundation for a standalone 3D fashion visualization platform.

## Project Overview

This project establishes the 3D runtime and avatar foundation for the **3D Fashion Platform**.
- **Phase 0:** High-performance 3D scene engine, dynamic camera controls, studio three-point lighting, and procedural mannequin avatar placeholder.
- **Phase 1:** Reusable GLB/glTF model loading infrastructure, generic 3D asset contracts, and safe Three.js memory disposal lifecycle management.
- **Phase 2:** Base Avatar Foundation — Replaces the procedural mannequin placeholder with a real, license-safe open-source GLB/glTF avatar asset (`base-avatar.glb`), encapsulated in a clean, reusable `<Avatar />` component and backed by skeletal joint contracts ready for future garment attachments.

## Base Avatar Specifications & License

- **Asset Name**: RiggedFigure (Base Avatar)
- **Asset Location**: `public/models/avatar/base-avatar.glb`
- **Original Source**: Khronos Group glTF Sample Models (`KhronosGroup/glTF-Sample-Models`)
- **Donor / Author**: Donated by [Cesium](https://cesium.com/) for glTF testing and open 3D standard compliance.
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0)
- **Attribution Notice**: "RiggedFigure 3D Model donated by Cesium to the Khronos Group glTF Sample Models repository, licensed under Creative Commons Attribution 4.0 International (CC-BY 4.0)."

### Coordinate System & Alignment Assumptions

- **Origin**: Centered on origin `[0, 0, 0]` at floor/ground level (contact point).
- **Vertical Orientation**: `+Y` is UP, `+Z` is FORWARD.
- **Height & Scale**: Native GLB height is ~1.45m. The `<Avatar />` component defaults to `scale={1.18}`, producing a standard ~1.71m tall fashion avatar that fits standard studio camera framing.
- **Pose**: Neutral rest pose suitable as a fashion mannequin and base figure.
- **Skeletal Joints**: Preserves a 19-bone joint hierarchy for future garment anchor points:
  - Torso & Waist: `torso_joint_1`, `torso_joint_2`, `torso_joint_3`
  - Head & Neck: `neck_joint_1`, `neck_joint_2`
  - Arms & Hands: `arm_joint_L_1` to `3` (Left), `arm_joint_R_1` to `3` (Right)
  - Legs & Feet: `leg_joint_L_1` to `5` (Left), `leg_joint_R_1` to `5` (Right)

## Technology Foundation & Stack

- **Framework:** Next.js (App Router)
- **UI Library:** React 19
- **Language:** TypeScript (Strict)
- **3D Graphics Engine:** Three.js
- **React 3D Renderer:** React Three Fiber (`@react-three/fiber`)
- **3D Helpers & Utilities:** `@react-three/drei`

## Free & Open-Source-First Dependency Principle

This project adheres strictly to an open-source first philosophy:
- Permissive open-source licenses (MIT/Apache-2.0 / CC-BY 4.0).
- Zero paid SaaS dependencies, proprietary visualization SDKs, or commercial 3D engine licenses.
- Zero external network requests or paid asset APIs at runtime.

For a full breakdown of third-party dependencies and asset licenses, see [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Project Architecture

```
app/
├── page.tsx            # Clean Landing Page
└── studio/
    └── page.tsx        # 3D Studio Viewer Page with Asset Test Controls

public/
└── models/
    ├── avatar/
    │   ├── README.md           # Avatar asset specs & CC-BY 4.0 license documentation
    │   └── base-avatar.glb     # Real open-source runtime GLB base avatar asset
    └── test-cube.glb           # Procedurally generated open-source dev test GLB asset

scripts/
├── test-avatar.js      # Unit test verifying avatar GLB presence, format & joint hierarchy
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

### 3D Component Flow & Resource Ownership

Each 3D component has clear single responsibilities:
- **Architecture Flow**: `Scene → Avatar → ModelLoader → useGLTF → GLB`.
- **`Avatar` Component**: Encapsulates avatar model path, default scale/offset transforms, and attachment slot group containers.
- **`ModelLoader` Scene Isolation**: Always clones the Object3D scene graph (`gltf.scene.clone(true)`), ensuring instance transform isolation.
- **`useGLTF` Cache Ownership**: GPU memory allocations (`BufferGeometry`, base `Material`, `Texture`) are owned by the loader cache and preserved during instance unmounts.

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
- Body measurement / fitting / multiple body types / customization UI
- AI garment generation
