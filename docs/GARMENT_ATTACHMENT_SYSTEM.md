# Garment Attachment & Outfit State System Specification

This document defines the Phase 4 runtime contract for garment attachment, outfit state management, skeletal anchor resolution, real Three.js bone parenting, and object lifecycle management for the 3D Fashion Platform.

---

## 1. Canonical Garment Slots

The platform enforces strictly 5 canonical garment slots (`GarmentSlot` in `src/types/garment.ts`):

```typescript
type GarmentSlot = 'top' | 'bottom' | 'feet' | 'waist' | 'hand';
```

### Slot Definitions
1. **`top`**: Torso garments (T-shirts, shirts, jackets, sweaters, hoodies).
2. **`bottom`**: Lower body garments (Pants, denim jeans, shorts, skirts).
3. **`feet`**: Footwear (Shoes, sneakers, boots).
4. **`waist`**: Belts, waistbands, sash attachments.
5. **`hand`**: Gloves, wrist accessories.

> **Rule:** Every garment in the platform MUST declare exactly one canonical slot. Duplicate or arbitrary string slot identifiers are strictly prohibited.

---

## 2. Outfit State Structure

Outfit state (`OutfitState`) is a clean, serializable runtime representation mapping each canonical slot to at most one active garment identifier:

```typescript
type OutfitState = {
  top: string | null;
  bottom: string | null;
  feet: string | null;
  waist: string | null;
  hand: string | null;
};
```

### Key Principles:
* **Serializable & Pure**: Independent of React rendering, WebGL context, commerce databases, or external APIs.
* **Maximum One Active Garment Per Slot**: A slot contains either `null` (empty) or `garmentId` (a string matching `GARMENT_REGISTRY`). Multiple garments CANNOT occupy the same slot simultaneously.
* **Deterministic**: Operations on identical outfit states produce identical results across all runtime environments.

---

## 3. Operations & Semantics (Equip / Unequip / Replace)

Outfit state mutations are managed through centralized pure operations (`src/lib/3d/outfitManager.ts`):

### Equip
* If a slot is empty (`null`), `equip(slot, garmentId)` assigns the garment ID to that slot.
* Before equipping, validation confirms:
  1. Garment exists in `GARMENT_REGISTRY`.
  2. Garment's declared slot matches the target slot (`garment.slot === targetSlot`).
  3. Garment supports the currently active avatar (`garment.supportedAvatarIds.includes(activeAvatarId)`).
  4. Garment metadata is structurally valid.
* If validation fails, state remains unchanged and an explicit error result is returned.

### Replace
* If a slot already contains an active garment, `equip(slot, newGarmentId)` or `replace(slot, newGarmentId)` replaces the old garment with `newGarmentId`.
* The previous garment is unmounted and detached from the skeletal bone, and the new garment is attached. There is never a state where `slot = [garmentA, garmentB]`.

### Unequip
* `unequip(slot)` sets `slot` to `null`. The rendered 3D object for that slot is detached from the avatar skeleton bone and unmounted from the scene graph.

---

## 4. Real Runtime Skeletal Attachment Architecture

Rather than rendering garments as independent root-level scene objects, Phase 4 attaches garments directly into the avatar's real `THREE.Bone` / `THREE.Object3D` skeletal hierarchy (`src/lib/3d/attachmentResolver.ts`).

```text
Avatar GLB Loaded Scene
    ↓
findAvatarJoint(avatarScene, 'spine_02')
    ↓
resolveAttachmentAnchor(avatarScene, slot, avatarId)
    ↓
THREE.Bone Anchor Node
    ↓
attachGarmentToAnchor(garmentGroup, anchorNode, transform)
    ↓
garmentGroup.parent === anchorNode (True)
```

### Primary Skeletal Anchor Mapping:
```typescript
export const ATTACHMENT_ANCHORS: Record<GarmentSlot, AttachmentAnchor> = {
  top: { slot: 'top', primaryJoint: 'spine_02', secondaryJoints: ['spine_03', 'clavicle_l', 'clavicle_r'] },
  bottom: { slot: 'bottom', primaryJoint: 'pelvis', secondaryJoints: ['thigh_l', 'thigh_r'] },
  feet: { slot: 'feet', primaryJoint: 'foot_l', secondaryJoints: ['foot_r', 'ball_l', 'ball_r'] },
  waist: { slot: 'waist', primaryJoint: 'spine_01', secondaryJoints: ['pelvis'] },
  hand: { slot: 'hand', primaryJoint: 'hand_r', secondaryJoints: ['hand_l'] },
};
```

> **Strict Primary Joint Policy:**
> Attachment anchor resolution strictly requires the designated `primaryJoint` (e.g., `spine_02` for `top`). Secondary joints are documented purely as reference points for future multi-bone skinned garments and MUST NOT silently replace a missing primary joint in the Phase 4 runtime.

When the avatar rotates, moves, or animates, the attached garment transforms automatically with the avatar skeleton because `garmentGroup.parent === anchorNode`.

---

## 5. Controlled Missing Joint Error Handling

If a required primary skeletal bone (e.g. `spine_02`) cannot be located in the loaded avatar scene graph:
* `resolveAttachmentAnchor` DOES NOT silently fall back to secondary joints, `(0,0,0)`, or arbitrary world coordinates.
* It throws an explicit controlled Error:
  ```text
  Attachment Error: Required skeletal joint "spine_02" for slot "top" on avatar "male" was not found in avatar hierarchy.
  ```
* The error is caught safely by `ThreeErrorBoundary` and logged, keeping the application stable.

---

## 6. Avatar Compatibility & Avatar Switching Re-parenting

When switching the active base avatar in Studio (e.g., `male` → `female`):
1. `Garment` instances detach from the old avatar's skeletal bones (`detachGarmentFromAnchor`).
2. `syncOutfitForAvatar` inspects every currently equipped garment.
3. Incompatible garments are auto-purged from `OutfitState` (`slot` set to `null`).
4. Compatible garments resolve the corresponding bone on the NEW avatar's skeletal graph and re-parent cleanly (`attachGarmentToAnchor`).

---

## 7. Explicit Anchor-Local Transform Contract & Scale Inheritance

The platform enforces a direct, explicit anchor-local transform contract:

1. **Anchor-Local Coordinate Space**:
   * All garment position and rotation offsets (`localPosition`, `localRotation`) are defined **directly relative to the resolved primary attachment bone** (`anchorNode`).
   * A zero local position offset `[0, 0, 0]` means the garment origin coincides directly with the resolved attachment bone (`anchorNode`).
   * Do NOT interpret garment offsets as world-space coordinates or convert them from a fake world-origin target.

2. **Avatar Normalization & Scale Inheritance**:
   * Avatar normalization (`scale = 0.11` for male, `0.10` for female) is applied **exactly once at the avatar root level**.
   * Garments reparented under an avatar bone (`garmentGroup.parent === anchorNode`) inherit the avatar root normalization scale naturally through the Three.js Object3D parent hierarchy.
   * The garment local scale (`garmentScale`, defaulting to `1.0`) is set directly on `garmentGroup.scale.setScalar(garmentScale)`.
   * Garment local scale is NOT multiplied by `avatarNormScale` (`0.11` or `0.10`), eliminating double-scaling risks (`0.1 * 0.1 = 0.01`).

3. **Conceptual Scene Hierarchy**:
   ```text
   Avatar Root Group (scale = avatarNormScale [0.11 / 0.10])
     └── Avatar Skeleton (Game Engine Rig)
           └── spine_02 (Primary Attachment Bone)
                 └── Garment Group (scale = garmentScale [1.0])
   ```

Transform resolution is centralized in `resolveGarmentTransform(garment, avatarId)` and `attachGarmentToAnchor`. No component or UI overlay injects arbitrary transform hacks.

---

## 8. Safe Three.js Object Lifecycle & Disposal Rules

The system follows strict resource ownership rules (`src/lib/3d/disposal.ts`):

1. **Cached GLTF Resources**:
   * Shared geometries, materials, and textures cached by `@react-three/drei` (`useGLTF`) MUST NEVER be disposed when an individual garment unmounts or is replaced.
2. **Component-Owned Resources**:
   * Cloned material instances created explicitly by `ModelLoader` when `deepCloneMaterials = true` belong to that component instance and are disposed on unmount.
3. **Skeletal Detachment on Unmount**:
   * When `Garment A` is replaced by `Garment B` or unequipped, `Garment`'s `useEffect` cleanup calls `detachGarmentFromAnchor(garmentGroup)`. `garmentGroup` is removed from `anchorBone.children` before React unmounts the component.

---

## 9. Guidelines for Conforming a New Blender Garment

To add a new garment asset to the platform:

1. **Model in Blender**: Model garment over `/public/models/avatar/male/base-avatar.glb` in neutral A-pose.
2. **Apply Transforms**: `Ctrl + A → All Transforms` in Blender (`Origin` at ground `0,0,0`).
3. **Naming**: Name root object and mesh node `GARMENT_<slot>_<name>` (e.g. `GARMENT_bottom_denim_jeans`).
4. **Export GLB**: Binary glTF 2.0 with Y-Up enabled to `/public/models/garment/<slot>/`.
5. **Register Asset**: Add entry to `src/lib/3d/garments.json` with correct `slot`, `supportedAvatarIds`, and measured `metadata` (triCount, vertexCount, materialCount).
6. **Validate**: Run `node scripts/test-garment.js` and `npx tsx scripts/test-outfit.js`.
