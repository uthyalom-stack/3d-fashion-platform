# 3D Fashion Platform — Phase 0 Foundation

A clean, lightweight, open-source-first web foundation for a future standalone 3D fashion visualization platform.

## Project Overview

This project establishes Phase 0 of the **3D Fashion Platform**. It provides a high-performance 3D scene engine, dynamic camera controls, studio three-point lighting, and a procedural mannequin avatar placeholder built entirely with web-native 3D primitives.

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
3. **High-Performance Rendering:** R3F handles the animation loop, frame scheduling, and canvas lifecycle efficiently without memory leaks or heavy overhead.

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
    └── page.tsx        # 3D Studio Viewer Page

src/
├── components/
│   └── 3d/
│       ├── AvatarPlaceholder.tsx  # Procedural mannequin built from Three.js primitives
│       ├── CameraControls.tsx     # OrbitControls with limits & camera reset capability
│       ├── Lighting.tsx           # Studio three-point lighting & hemisphere ambient light
│       ├── Scene.tsx              # Modular 3D scene composition
│       ├── ThreeErrorBoundary.tsx # WebGL error handling & fallback
│       └── ViewerCanvas.tsx       # R3F Canvas container with WebGL detection & SSR bypass
├── lib/
│   └── 3d/
│       ├── constants.ts           # Camera defaults, limits, and scene configuration
│       └── webgl.ts               # WebGL browser support detector
└── types/
    └── 3d.ts                      # TypeScript definitions & garment slot interfaces
```

### Architectural Decoupling
Each 3D concern is independently replaceable:
- `ViewerCanvas` wraps WebGL detection and dynamic Canvas initialization.
- `AvatarPlaceholder` renders the base mannequin and accepts `garmentSlots` interface props, allowing future GLB garment models to attach without changing the page structure.
- `CameraControls` exposes an imperative `resetCamera` handle to parent controls.

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

### Production Build

Build the application for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Intentionally NOT Implemented Yet (Phase 0 Scope Boundary)

To keep the codebase lean and modular, the following systems are intentionally deferred to future phases:
- Databases / Prisma ORM
- User Authentication & Account management
- Billing / Subscriptions / E-commerce cart & checkout
- External APIs or Cloud Storage (AWS S3, Cloudflare R2)
- Multi-tenancy / Admin dashboards
- AI pipelines / Automatic garment generation
- Cloth physics / Soft body simulation
- External heavy GLB/glTF 3D downloads
