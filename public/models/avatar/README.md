# MakeHuman / MPFB2 Base Avatar Models & License Documentation

This directory contains the runtime 3D GLB assets for the Phase 2 Base Avatar System, generated and exported directly from the **MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)** open-source ecosystem.

## Provenance & Generation Specifications

- **3D Creation Tool**: Blender 4.0.2
- **Generator Addon**: MPFB2 (MakeHuman Plugin for Blender v2) v2.0.17 (commit `437dd513888a92399d1d3200d2e80859fae55abc`)
- **Source Repository**: [makehumancommunity/mpfb2](https://github.com/makehumancommunity/mpfb2)
- **Armature / Rig Selected**: Game Engine Humanoid Rig (`Human.rig` with 53 joints)
- **Pose**: Neutral standing rest A-pose suitable for fashion design and future garment attachment
- **Export Format**: Binary glTF 2.0 (`.glb`) via Blender native glTF exporter (`export_skins=True`, `export_animations=False`, `export_morph=False`)
- **Software vs Asset License Distinction**: The MPFB2 Python plugin code is licensed under AGPL-3.0. However, all core MakeHuman graphical base meshes, target geometries, skeletal armatures, and resulting exported 3D character models are released under the **CC0 1.0 Universal (CC0 1.0) Public Domain Dedication**.

---

## Supported Base Avatars

### 1. Adult Male Base Avatar (`male`)
- **Asset Identifier**: `male`
- **File Path**: `public/models/avatar/male/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 v2.0.17 Core Assets
- **Generator Parameters**: Adult Male body targets (`gender: 0.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **Exact File Size**: 933,328 bytes (911.45 KB)
- **Armature / Rig**: 53-joint Game Engine Rig (`Human.rig`)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~15.91 decimeters. Normalized in `Avatar.tsx` / `AVATAR_REGISTRY` with `scale={0.11}` to achieve ~1.75m adult human height grounded at `Y=0`.

### 2. Adult Female Base Avatar (`female`)
- **Asset Identifier**: `female`
- **File Path**: `public/models/avatar/female/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 v2.0.17 Core Assets
- **Generator Parameters**: Adult Female body targets (`gender: 1.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **Exact File Size**: 932,920 bytes (911.05 KB)
- **Armature / Rig**: 53-joint Game Engine Rig (`Human.rig`)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~17.29 decimeters. Normalized in `Avatar.tsx` / `AVATAR_REGISTRY` with `scale={0.10}` to achieve ~1.73m adult human height grounded at `Y=0`.

---

## Coordinate & Skeleton Specification

- **Origin**: Center-bottom aligned at floor level (`X=0, Y=0, Z=0`).
- **Orientation**: `+Y` is UP, `+Z` is FORWARD (facing camera at `[0, 1.0, 2.8]`).
- **Pose**: Neutral standing A-pose.
- **Armature / Skeleton**: Preserves full 53-joint humanoid skeletal hierarchy:
  - `Root` -> `pelvis` -> `spine_01` -> `spine_02` -> `spine_03`
  - `spine_03` -> `neck_01` -> `head`
  - `spine_03` -> `clavicle_l` / `clavicle_r` -> `upperarm_l` / `upperarm_r` -> `lowerarm_l` / `lowerarm_r` -> `hand_l` / `hand_r` (plus finger/thumb joints)
  - `pelvis` -> `thigh_l` / `thigh_r` -> `calf_l` / `calf_r` -> `foot_l` / `foot_r` -> `ball_l` / `ball_r`
