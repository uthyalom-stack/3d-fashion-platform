# 3D Garment Asset Pipeline & Authoring Guide

This document defines the canonical standards, conventions, and workflow for authoring, preparing, and exporting 3D fashion garments for the 3D Fashion Platform.

---

## 1. Canonical Coordinate System & Scale Conventions

Garments intended for the platform must conform strictly to the platform's coordinate and scale standards:

* **Up Vector:** `+Y` is Up.
* **Forward Vector:** `+Z` is Forward (facing camera by default).
* **Origin Reference:** `(0, 0, 0)` is located at the avatar ground contact plane (between the feet).
* **Reference Pose:** Neutral standing A-Pose matching the canonical adult base avatars.
* **Unit System:** Decimeters / Meters (1 Blender Unit = 1 Decimeter in raw MakeHuman/MPFB2 space; normalized at runtime via `scale: 0.11` for Male and `scale: 0.10` for Female to standard ~1.73m - 1.75m adult height).

> **Rule:** All transformations (Location, Rotation, Scale) MUST be applied in Blender before GLB export (`Ctrl + A -> All Transforms`).

---

## 2. Garment Naming Conventions

All garment assets and internal Blender nodes must follow a deterministic, predictable naming convention:

### Asset File & Registry Identifier
```text
GARMENT_<slot>_<descriptive_name>
```
* **Examples:**
  * `GARMENT_top_basic_tshirt`
  * `GARMENT_bottom_denim_jeans`
  * `GARMENT_feet_leather_sneakers`

### Blender Scene & Mesh Hierarchy
```text
GARMENT_<slot>_<name> (Root Object / Group)
  └── GARMENT_<slot>_<name>_mesh (Mesh Geometry Node)
```

---

## 3. Canonical Garment Slots

The platform enforces strict union slot classification (`GarmentSlot` in `src/types/garment.ts`):

1. `top` — Torso garments (T-shirts, shirts, jackets, sweaters)
2. `bottom` — Lower body garments (Pants, shorts, skirts)
3. `feet` — Footwear (Shoes, boots, sneakers)
4. `waist` — Belt / Waist attachments
5. `hand` — Gloves / Wrist items

---

## 4. Asset Provenance & Licensing Standards

All garments in the repository must have explicit, auditable provenance and licensing:
* **Provenance:** Authored completely from scratch for this project or derived from an explicitly documented permissive open-source source.
* **License:** Single, unambiguous permissive license (e.g., `MIT`). Dual/ambiguous license statements (such as `CC0 / MIT`) are disallowed.

---

## 5. Blender Preparation Guidelines

### Modeling & Topology
* Model garments directly against the platform base avatar GLB mesh (`/public/models/avatar/male/base-avatar.glb` or female equivalent).
* Maintain clean, quad-dominant topology with edge loops following anatomical curvature (shoulders, armpits, neckline, waist).
* Keep geometry reasonable for web rendering (target 1,000 – 5,000 triangles for standard garments).
* Ensure face normals are outward-facing (`Shift + N` in Blender Edit mode).
* Ensure no accidental duplicate meshes or hidden internal faces.

### Materials & Textures
* Use standard PBR (Physically Based Rendering) materials via Blender's Principled BSDF shader node.
* **Material Count:** Maximum 1-2 materials per garment to minimize WebGL draw calls.
* **Textures:** Use compressed PNG or WebP textures at reasonable dimensions (1024x1024 or 2048x2048 max).
* Avoid custom cycles nodes or procedural noise nodes that do not export to standard glTF/GLB PBR.

---

## 6. Deformation Strategy

For Phase 3, the platform uses a **pre-authored static/rigged garment strategy**:
* Garments are authored specifically against the canonical base avatar proportions in neutral A-Pose.
* Real-time browser cloth physics, procedural fitting, or body-shape morphing are strictly out of scope.
* If rigging/skinning is required, the garment armature MUST bind to the canonical avatar bone hierarchy (`root`, `pelvis`, `spine_01`, `chest`, `clavicle_l`, `upperarm_l`, etc.).

---

## 7. GLB Export Settings (Blender)

When exporting the final asset from Blender to `.glb`:

1. Select the garment object/armature.
2. Go to **File → Export → glTF 2.0 (.glb)**.
3. Apply settings:
   * **Format:** `glTF Binary (.glb)`
   * **Include:** Check `Selected Objects`
   * **Transform:** `Y Up` checked
   * **Geometry:** `Apply Modifiers` checked, `UVs` checked, `Normals` checked, `Tangents` checked if using normal maps.
   * **Animation:** Check `Skins` if skinned to avatar armature.
