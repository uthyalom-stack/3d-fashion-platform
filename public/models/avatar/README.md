# MakeHuman / MPFB2 Base Avatar Models & License Documentation

This directory contains the runtime 3D GLB assets for the Phase 2 Base Avatar System, generated and exported directly from the **MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)** open-source ecosystem.

## Supported Base Avatars

### 1. Adult Male Base Avatar (`male`)
- **Asset Identifier**: `male`
- **File Path**: `public/models/avatar/male/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)
- **Generator Software**: Blender 4.0.2 with `mpfb2` addon
- **Generator Parameters**: Adult Male body targets (`gender: 0.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **Exact File Size**: 933,328 bytes (911.45 KB)
- **Armature / Rig**: Game Engine Humanoid Rig (53 skinned joints)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~15.91 decimeters. Normalized in `Avatar.tsx` / `AVATAR_REGISTRY` with `scale={0.11}` to achieve ~1.75m adult human height grounded at `Y=0`.

### 2. Adult Female Base Avatar (`female`)
- **Asset Identifier**: `female`
- **File Path**: `public/models/avatar/female/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)
- **Generator Software**: Blender 4.0.2 with `mpfb2` addon
- **Generator Parameters**: Adult Female body targets (`gender: 1.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **Exact File Size**: 932,920 bytes (911.05 KB)
- **Armature / Rig**: Game Engine Humanoid Rig (53 skinned joints)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height ~17.29 decimeters. Normalized in `Avatar.tsx` / `AVATAR_REGISTRY` with `scale={0.10}` to achieve ~1.73m adult human height grounded at `Y=0`.

## MakeHuman Licensing Policy Summary
Under the official MakeHuman Licensing Policy, all mesh geometry, base meshes, skeletal rigs, and exported character models produced by MakeHuman / MPFB2 are released under the **CC0 1.0 Universal (CC0 1.0) Public Domain Dedication**. There are no copyright restrictions or royalties on exported character models or their redistribution in open-source software repositories.

## Coordinate & Skeleton Specification
- **Origin**: Center-bottom aligned at floor level (`X=0, Y=0, Z=0`).
- **Orientation**: `+Y` is UP, `+Z` is FORWARD (facing camera at `[0, 1.0, 2.8]`).
- **Pose**: Neutral standing A-pose suitable for fashion model visualization and future garment attachment.
- **Armature / Skeleton**: Preserves full 53-joint humanoid skeletal hierarchy:
  - `Root` -> `pelvis` -> `spine_01` -> `spine_02` -> `spine_03`
  - `spine_03` -> `neck_01` -> `head`
  - `spine_03` -> `clavicle_l` / `clavicle_r` -> `upperarm_l` / `upperarm_r` -> `lowerarm_l` / `lowerarm_r` -> `hand_l` / `hand_r` (plus finger/thumb joints)
  - `pelvis` -> `thigh_l` / `thigh_r` -> `calf_l` / `calf_r` -> `foot_l` / `foot_r` -> `ball_l` / `ball_r`
