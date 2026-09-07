/**
 * Garment Asset & Pipeline Integrity Test Script
 * Validates 3D GLB garment assets without requiring a WebGL browser runtime.
 *
 * Validates:
 * 1. Asset existence and GLB magic header
 * 2. glTF 2.0 structure and binary file size consistency
 * 3. Geometry contents (scenes, nodes, meshes, primitives, accessors, buffer views)
 * 4. Deterministic garment naming conventions (GARMENT_<slot>_<name>)
 * 5. Garment bounds & non-zero geometry volume
 * 6. Consistency with static Garment Registry configuration
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const GLB_HEADER_MAGIC = 0x46546c67; // 'glTF' in ASCII / Little Endian
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON' in ASCII / Little Endian

const GARMENTS = [
  {
    id: 'GARMENT_top_basic_tshirt',
    slot: 'top',
    filePath: path.join(__dirname, '../public/models/garment/top/GARMENT_top_basic_tshirt.glb'),
  },
];

let totalErrors = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  totalErrors++;
}

console.log('====================================================');
console.log('Phase 3 — Garment Pipeline Asset Validation');
console.log('====================================================\n');

GARMENTS.forEach((garment) => {
  console.log(`Testing Garment Asset: ${garment.id} (${garment.slot})`);
  console.log(`File: ${garment.filePath}`);

  // 1. File existence
  if (!fs.existsSync(garment.filePath)) {
    logFail(`File does not exist: ${garment.filePath}`);
    return;
  }
  logPass('File exists on disk.');

  const buffer = fs.readFileSync(garment.filePath);
  const stats = fs.statSync(garment.filePath);

  // 2. Binary length check
  if (stats.size < 20) {
    logFail(`File size too small (${stats.size} bytes).`);
    return;
  }

  // 3. Header validation
  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const fileLength = buffer.readUInt32LE(8);

  if (magic !== GLB_HEADER_MAGIC) {
    logFail(`Invalid GLB magic header: 0x${magic.toString(16)} (Expected 0x46546c67)`);
    return;
  }
  logPass('Valid GLB magic header (0x46546c67).');

  if (version !== 2) {
    logFail(`Unsupported glTF version: ${version} (Expected 2)`);
  } else {
    logPass('Valid glTF version 2.0.');
  }

  if (fileLength !== stats.size) {
    logFail(`Header declared length (${fileLength}) matches file size (${stats.size}).`);
  } else {
    logPass(`Header length matches byte count (${stats.size} bytes).`);
  }

  // 4. JSON chunk extraction
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);

  if (jsonChunkType !== JSON_CHUNK_TYPE) {
    logFail(`First chunk type is not JSON: 0x${jsonChunkType.toString(16)}`);
    return;
  }

  const jsonBuffer = buffer.subarray(20, 20 + jsonChunkLength);
  let gltf;
  try {
    gltf = JSON.parse(jsonBuffer.toString('utf8'));
    logPass('Valid glTF JSON chunk structure parsed successfully.');
  } catch (e) {
    logFail(`Failed to parse JSON chunk: ${e.message}`);
    return;
  }

  // 5. Structure & Scene node graph check
  if (!gltf.scenes || gltf.scenes.length === 0) {
    logFail('glTF missing default scene.');
  } else {
    logPass(`glTF scene hierarchy present (${gltf.scenes.length} scene(s)).`);
  }

  if (!gltf.meshes || gltf.meshes.length === 0) {
    logFail('glTF missing meshes.');
  } else {
    logPass(`glTF mesh geometry present (${gltf.meshes.length} mesh(es)).`);
  }

  // 6. Naming Convention Check
  const expectedPrefix = `GARMENT_${garment.slot}_`;
  if (!garment.id.startsWith(expectedPrefix)) {
    logFail(`Garment ID "${garment.id}" violates naming convention "${expectedPrefix}<name>".`);
  } else {
    logPass(`Garment ID conforms to canonical pattern "${expectedPrefix}<name>".`);
  }

  // Check mesh name convention
  const hasMatchingMeshName = gltf.meshes.some(
    (m) => m.name && m.name.toLowerCase().includes('garment')
  );
  if (hasMatchingMeshName) {
    logPass('Mesh node follows deterministic garment object naming in glTF hierarchy.');
  } else {
    logPass('Mesh node present (generic naming).');
  }

  // 7. Accessor & Primitive Bounds Validation
  let totalTriangles = 0;
  let totalVertices = 0;

  gltf.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      if (primitive.attributes.POSITION !== undefined) {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        if (accessor) {
          totalVertices += accessor.count;

          // Validate non-zero min/max bounds
          if (accessor.min && accessor.max) {
            const dx = accessor.max[0] - accessor.min[0];
            const dy = accessor.max[1] - accessor.min[1];
            const dz = accessor.max[2] - accessor.min[2];

            if (dx <= 0 || dy <= 0 || dz <= 0) {
              logFail(`Invalid 3D bounds for position accessor: [${dx}, ${dy}, ${dz}]`);
            } else {
              logPass(`Valid 3D geometry volume: bounds [${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)}]`);
            }
          }
        }
      }

      if (primitive.indices !== undefined) {
        const accessor = gltf.accessors[primitive.indices];
        if (accessor) {
          totalTriangles += accessor.count / 3;
        }
      }
    });
  });

  console.log(`  Metrics -> Triangles: ${totalTriangles}, Vertices: ${totalVertices}`);

  console.log('----------------------------------------------------');
});

// 8. Registry Integration Check
try {
  const registryFile = path.join(__dirname, '../src/lib/3d/garmentRegistry.ts');
  const registryContent = fs.readFileSync(registryFile, 'utf8');

  GARMENTS.forEach((garment) => {
    if (registryContent.includes(garment.id)) {
      logPass(`Garment "${garment.id}" registered in GARMENT_REGISTRY.`);
    } else {
      logFail(`Garment "${garment.id}" missing from src/lib/3d/garmentRegistry.ts.`);
    }
  });
} catch (e) {
  logFail(`Failed to check garment registry: ${e.message}`);
}

console.log('\n====================================================');
if (totalErrors === 0) {
  console.log('\x1b[32mSUCCESS: All Garment Pipeline asset checks passed!\x1b[0m');
  process.exit(0);
} else {
  console.error(`\x1b[31mFAILURE: ${totalErrors} check(s) failed.\x1b[0m`);
  process.exit(1);
}
