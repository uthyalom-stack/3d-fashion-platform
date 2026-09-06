# Third-Party Notices and License Information

This project relies on open-source software libraries and license-safe 3D assets. Below is a summary of the primary third-party dependencies and media assets used in the project:

## Software Dependencies

| Package | Version | License | Description / Purpose |
| :--- | :--- | :--- | :--- |
| `next` | 16.3.4 | MIT | React Framework for App Router & Server Infrastructure |
| `react` | 19.2.8 | MIT | Core UI Library |
| `react-dom` | 19.2.8 | MIT | DOM Rendering Engine for React |
| `three` | 0.185.1 | MIT | 3D WebGL Rendering Engine |
| `@react-three/fiber` | 9.7.0 | MIT | React Renderer for Three.js |
| `@react-three/drei` | 10.7.8 | MIT | Functional helpers and OrbitControls for React Three Fiber |
| `typescript` | 5.x | Apache-2.0 | Type System and Compiler |
| `eslint` | 9.x | MIT | Code Quality and Linter |

## 3D Models & Media Assets

| Asset Name | Path | License | Origin / Author |
| :--- | :--- | :--- | :--- |
| Male Base Avatar (`RiggedFigure`) | `public/models/avatar/male/base-avatar.glb` | CC-BY 4.0 | Donated by Cesium to Khronos Group glTF Sample Models repository |
| Female Base Avatar (`Michelle`) | `public/models/avatar/female/base-avatar.glb` | MIT | Three.js Examples Repository (`mrdoob/three.js`) |
| `test-cube.glb` | `public/models/test-cube.glb` | MIT / Public Domain | Procedurally generated open-source dev test GLB asset |

## License Compliance Considerations

1. **Permissive Licensing:** All runtime dependencies, devDependencies, and 3D assets use highly permissive open-source licenses (MIT, Apache-2.0, CC-BY 4.0).
2. **Zero Commercial Lock-in:** No proprietary 3D engine SDKs, paid cloud services, or restrictive copyleft dependencies (e.g. GPL-3.0) are present in the repository.
3. **Open 3D Asset Provenance:**
   - Male Avatar (`RiggedFigure`): CC-BY 4.0 (Donated by Cesium to Khronos Group).
   - Female Avatar (`Michelle`): MIT License (Three.js repository).
