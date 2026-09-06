# Avatar System Models & License Documentation

This directory contains the runtime 3D GLB assets for the Phase 2 Base Avatar System.

## Supported Avatars

### 1. Male Base Avatar (`male`)
- **Asset Identifier**: `male`
- **File Path**: `public/models/avatar/male/base-avatar.glb`
- **Asset Name**: RiggedFigure
- **Format**: Binary glTF 2.0 (`.glb`)
- **File Size**: ~50 KB (48.9 KB)
- **Original Source**: Khronos Group glTF Sample Models (`KhronosGroup/glTF-Sample-Models`)
- **Donor / Author**: Donated by [Cesium](https://cesium.com/) for glTF testing and open 3D standard compliance.
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0)
- **Required Attribution Notice**:
  > "RiggedFigure 3D Model donated by Cesium to the Khronos Group glTF Sample Models repository, licensed under Creative Commons Attribution 4.0 International (CC-BY 4.0)."
- **Scale Normalization**: Native height ~1.45m. Normalized in avatar registry with scale factor `1.18` to achieve standard ~1.71m fashion avatar height.

### 2. Female Base Avatar (`female`)
- **Asset Identifier**: `female`
- **File Path**: `public/models/avatar/female/base-avatar.glb`
- **Asset Name**: Michelle
- **Format**: Binary glTF 2.0 (`.glb`)
- **File Size**: ~2.8 MB
- **Original Source**: Three.js Examples Repository (`mrdoob/three.js/examples/models/gltf/Michelle.glb`)
- **License**: MIT License (Three.js Repository)
- **Required Attribution Notice**:
  > "Michelle 3D Model from Three.js Examples repository, licensed under MIT License."
- **Scale Normalization**: Native height ~1.72m. Normalized in avatar registry with scale factor `1.0`.

## Coordinate System Assumptions
- **Origin**: Center-bottom aligned at floor level (`X=0, Y=0, Z=0`).
- **Orientation**: `+Y` is UP, `+Z` is FORWARD.
- **Pose**: Neutral rest pose (T-pose / A-pose) suitable for fashion mannequin visualization.
- **Skeleton & Joints**: Both models maintain full joint hierarchies covering head, neck, shoulders, arms, hands, torso, hips, legs, and feet.
