# MakeHuman / MPFB2 Base Avatar Models & License Documentation

This directory contains the runtime 3D GLB assets for the Phase 2 Base Avatar System, generated and exported directly from the **MakeHuman / MPFB2 (MakeHuman Plugin for Blender)** open-source ecosystem.

## Supported Base Avatars

### 1. Adult Male Base Avatar (`male`)
- **Asset Identifier**: `male`
- **File Path**: `public/models/avatar/male/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)
- **Generator Parameters**: Adult Male (`gender: 0.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **File Size**: ~911 KB
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height 15.91 decimeters. Normalized in avatar registry with scale `0.11` to achieve ~1.75m adult human height.

### 2. Adult Female Base Avatar (`female`)
- **Asset Identifier**: `female`
- **File Path**: `public/models/avatar/female/base-avatar.glb`
- **Source Ecosystem**: MakeHuman / MPFB2 (MakeHuman Plugin for Blender v2)
- **Generator Parameters**: Adult Female (`gender: 1.0, age: 0.5, muscle: 0.5, weight: 0.5, height: 0.5`)
- **Format**: Binary glTF 2.0 (`.glb`)
- **File Size**: ~3.1 MB
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **License URL**: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Scale Normalization**: Native height 17.29 decimeters. Normalized in avatar registry with scale `0.10` to achieve ~1.73m adult human height.

## MakeHuman Licensing Policy Summary
Under the official MakeHuman Licensing Policy, all mesh geometry, base meshes, skeletal rigs, and exported character models produced by MakeHuman / MPFB2 are released under the **CC0 1.0 Universal (CC0 1.0) Public Domain Dedication**. There are no copyright restrictions on exported character models.

## Coordinate & Skeleton Specification
- **Origin**: Center-bottom aligned at floor level (`X=0, Y=0, Z=0`).
- **Orientation**: `+Y` is UP, `+Z` is FORWARD.
- **Pose**: Neutral standing rest pose suitable for fashion model visualization and garment attachment.
- **Armature / Skeleton**: Preserves full 53-joint skeletal rig (`pelvis`, `spine_01..03`, `neck_01`, `head`, `clavicle_l/r`, `upperarm_l/r`, `lowerarm_l/r`, `hand_l/r`, `thigh_l/r`, `calf_l/r`, `foot_l/r`, `ball_l/r`, finger/thumb joints).
