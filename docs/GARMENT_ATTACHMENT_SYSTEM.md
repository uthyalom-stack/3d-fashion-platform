# Garment Attachment & Outfit State System Specification

This document defines the Phase 4 runtime contract for garment attachment, outfit state management, skeletal anchor resolution, and Three.js object lifecycle management for the 3D Fashion Platform.

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
* The previous garment is unmounted, and the new garment is rendered. There is never a state where `slot = [garmentA, garmentB]`.

### Unequip
* `unequip(slot)` sets `slot` to `null`. The rendered 3D object for that slot is unmounted from the scene graph.

### Multi-Slot Coexistence
* Different slots are completely independent and may be occupied simultaneously:
  ```text
  top    = GARMENT_top_basic_tshirt
  bottom = GARMENT_bottom_denim_jeans
  feet   = GARMENT_feet_sneakers
  ```

---

## 4. Avatar Compatibility & Avatar Switching

Avatars supported in Phase 4 are `male` and `female` adult base avatars.

### Validation at Equip
Garment asset configs specify `supportedAvatarIds: string[]`. Equipping a garment on an unsupported avatar fails deterministically.

### Behavior on Avatar Switch
When switching the active base avatar in Studio (e.g., `male` → `female`):
1. The system inspects every currently equipped garment in `OutfitState`.
2. Each garment is re-validated against the new avatar ID.
3. Garments compatible with the new avatar remain equipped.
4. Garments incompatible with the new avatar are deterministically unequipped (`slot` set to `null`).
5. Incompatible garments are never rendered on the new avatar.

---

## 5. Attachment Anchor Strategy & Skeletal Mapping

Rather than positioning garments via scattered UI transform offsets, Phase 4 establishes a centralized attachment mapping from canonical slots to the real 53-joint humanoid skeleton (`Human.rig`):

```typescript
export const ATTACHMENT_ANCHORS: Record<GarmentSlot, AttachmentAnchor> = {
  top: { slot: 'top', primaryJoint: 'spine_02', secondaryJoints: ['spine_03', 'clavicle_l', 'clavicle_r'] },
  bottom: { slot: 'bottom', primaryJoint: 'pelvis', secondaryJoints: ['thigh_l', 'thigh_r'] },
  feet: { slot: 'feet', primaryJoint: 'foot_l', secondaryJoints: ['foot_r', 'ball_l', 'ball_r'] },
  waist: { slot: 'waist', primaryJoint: 'spine_01', secondaryJoints: ['pelvis'] },
  hand: { slot: 'hand', primaryJoint: 'hand_r', secondaryJoints: ['hand_l'] },
};
```

---

## 6. Single Source of Truth for Transform Ownership

All attachment transform calculations are centralized in `src/lib/3d/attachmentResolver.ts`:

```typescript
export function resolveGarmentTransform(
  garment: GarmentAssetConfig,
  avatarId: AvatarId = 'male'
): ResolvedGarmentTransform
```

### Resolution Logic:
1. **Scale**: Resolves numeric scale factor by combining avatar base scale (`scale: 0.11` for male, `scale: 0.10` for female) with explicit garment scale overrides (`garment.scale`).
2. **Position Offset**: Combines avatar root position offset with `garment.positionOffset`.
3. **Rotation Offset**: Combines avatar root rotation offset with `garment.rotationOffset`.
4. **Anchor Joint**: Derives primary skeletal joint reference from `ATTACHMENT_ANCHORS[garment.slot]`.

No individual React component or scene overlay is permitted to inject arbitrary transform hacks.

---

## 7. Garment Asset Authoring Contract (Static & Future Skinned Garments)

### A. Static Pre-Authored Garments
* Authored directly against the canonical base avatar GLB mesh in Blender in neutral standing A-pose.
* Ground plane contact at `(0, 0, 0)` with standard decimeter/meter scale matching MPFB2 specifications.
* Attached as rigid hierarchical group objects normalized via `resolveGarmentTransform`.

### B. Future Skinned Garments
* Skinned garments will bind directly to the avatar's 53-joint armature (`Root`, `pelvis`, `spine_01`, `spine_02`, `spine_03`, etc.).
* Because the attachment contract resolves primary anchor joints, future skinned garments can bind to the target avatar armature seamlessly without breaking the `OutfitState` or `Garment` layer architecture.

---

## 8. Safe Three.js Object Lifecycle & Disposal Rules

The system follows strict resource ownership rules (`src/lib/3d/disposal.ts`):

1. **Cached GLTF Resources**:
   * Shared geometries, materials, and textures cached by `@react-three/drei` (`useGLTF`) MUST NEVER be disposed when an individual garment unmounts or is replaced.
2. **Component-Owned Resources**:
   * Cloned material instances created explicitly by `ModelLoader` when `deepCloneMaterials = true` belong to that component instance and are disposed on unmount.
3. **Garment Replacement Unmounting**:
   * When `Garment A` is replaced by `Garment B`, React reconciliation unmounts `Garment A` using its unique component key (`garment-render-${slot}-${garmentId}`). `ModelLoader` cleanup safely unmounts the Object3D node tree without destroying cached GPU allocations.

---

## 9. Guidelines for Conforming a New Blender Garment

To add a new garment asset to the platform:

1. **Model in Blender**: Model garment over `/public/models/avatar/male/base-avatar.glb` in neutral A-pose.
2. **Apply Transforms**: `Ctrl + A → All Transforms` in Blender (`Origin` at ground `0,0,0`).
3. **Naming**: Name root object and mesh node `GARMENT_<slot>_<name>` (e.g. `GARMENT_bottom_denim_jeans`).
4. **Export GLB**: Binary glTF 2.0 with Y-Up enabled to `/public/models/garment/<slot>/`.
5. **Register Asset**: Add entry to `src/lib/3d/garments.json` with correct `slot`, `supportedAvatarIds`, and measured `metadata` (triCount, vertexCount, materialCount).
6. **Validate**: Run `node scripts/test-garment.js` and `npx tsx scripts/test-outfit.js`.
