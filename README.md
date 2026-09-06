# 3D Fashion Platform — Phase 1 Real 3D Engine Foundation

A clean, lightweight, open-source-first web foundation for a future standalone 3D fashion visualization platform.

## Project Overview

This project establishes the 3D runtime foundation for the **3D Fashion Platform**.
- **Phase 0:** Provided high-performance 3D scene engine, dynamic camera controls, studio three-point lighting, and procedural mannequin avatar placeholder built with web-native 3D primitives.
- **Phase 1:** Establishes reusable GLB/glTF model loading infrastructure, generic 3D asset contracts, and safe Three.js memory disposal lifecycle management.

## Technology Foundation & Stack

- **Framework:** Next.js (App Router)
- **UI Library:** React 19
- **Language:** TypeScript (Strict)
- **3D Graphics Engine:** Three.js
- **React 3D Renderer:** React Three Fiber (`@react-three/fiber`)
- **3D Helpers & Utilities:** `@react-three/drei`

### Why React Three Fiber + Three.js?

1. **Declarative Component Architecture:** React Three Fiber enables modular 3D scene composition using standard React component trees and state management, separating 3D rendering concerns cleanly from standard web UI.
2. **Industry Standard & Open Source:** Three.js is the premier open-source WebGL/WebGPU library with active community support, extensive asset format compatibility (glTF/GLB), and zero proprietary license locks.
3. **High-Performance Rendering & Asset Isolation:** R3F handles the animation loop, frame scheduling, and canvas lifecycle efficiently, while custom lifecycle utilities prevent WebGL memory leaks during model updates and unmounting.

## Free & Open-Source-First Dependency Principle

This project adheres strictly to an open-source first philosophy:
- Uses permissive open-source licenses (MIT/Apache-2.0).
- Zero paid SaaS dependencies, proprietary visualization SDKs, or commercial 3D engine licenses.
- Zero external network requests or paid asset APIs at this stage.

For a full breakdown of third-party dependencies and licenses, see [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Project Architecture

```
app/
├── page.tsx            # Clean Landing Page
└── studio/
    └── page.tsx        # 3D Studio Viewer Page with Asset Test Controls

public/
└── models/
    └── test-cube.glb   # Procedurally generated open-source dev test GLB asset

scripts/
└── test-ownership.js   # Unit test suite verifying Three.js resource lifecycle & ownership

src/
├── components/
│   └── 3d/
│       ├── AvatarPlaceholder.tsx  # Procedural mannequin built from Three.js primitives
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

### Architectural Decoupling & Resource Ownership Rules

Each 3D concern is independently replaceable and follows strict resource ownership principles:
- **`useGLTF` Cache Ownership:** The `@react-three/drei` loader cache retains primary ownership of loaded `BufferGeometry`, base `Material`, and `Texture` GPU allocations.
- **`ModelLoader` Scene Isolation:** `ModelLoader` always clones the Object3D scene hierarchy (`gltf.scene.clone(true)`), giving every component instance an isolated transform tree.
- **Instance Material Ownership (`deepCloneMaterials`):** When `deepCloneMaterials` is enabled, `ModelLoader` creates instance-owned material clones so material edits do not mutate the shared cache. Upon unmounting, `dispose3DObject` cleans up instance-owned materials (`disposeMaterials: true`) while leaving shared geometries and textures untouched (`disposeGeometries: false`).
- **`ViewerCanvas`:** Wraps WebGL detection and dynamic Canvas initialization.
- **`AvatarPlaceholder`:** Renders the base mannequin and accepts `garmentSlots` interface props, allowing future GLB garment models to attach without changing page structure.
- **`CameraControls`:** Exposes an imperative `resetCamera` handle to parent controls.

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

Run Resource Ownership Tests:
```bash
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

## Intentionally NOT Implemented Yet (Phase 1 Scope Boundary)

To keep the codebase lean and modular, the following systems are intentionally deferred to future phases:
- Real production garment systems / product catalogs
- Databases / Prisma ORM
- User Authentication & Account management
- Billing / Subscriptions / E-commerce cart & checkout
- External APIs or Cloud Storage (AWS S3, Cloudflare R2)
- Multi-tenancy / Admin dashboards
- AI pipelines / Automatic garment generation
- Cloth physics / Soft body simulation
