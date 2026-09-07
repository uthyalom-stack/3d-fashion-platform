/**
 * Comprehensive Garment Asset & Registry Integrity Validator
 * Validates 3D GLB garment assets and registry configurations without WebGL browser runtime.
 *
 * Validates:
 * 1. GLB Container Structure (Header, Version, File Length, JSON chunk bounds, BIN chunk bounds)
 * 2. glTF Structural Integrity & Indices (Scenes, Nodes, Meshes, Primitives, Accessors, BufferViews)
 * 3. Canonical Garment Naming Conventions (GARMENT_<slot>_<name> pattern enforced on Nodes & Meshes)
 * 4. Geometry Metrics & Bounds (POSITION accessor VEC3 type, valid min/max, positive volume, non-zero tris/verts)
 * 5. Registry Integrity (Matching IDs, modelUrl path verification, avatar compatibility, metadata consistency)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const GLB_HEADER_MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON'
const BIN_CHUNK_TYPE = 0x004e4942;  // 'BIN'

let totalErrors = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  totalErrors++;
}

console.log('====================================================');
console.log('Phase 3 — Garment Pipeline Asset & Registry Validator');
console.log('====================================================\n');

// 1. Parse GARMENT_REGISTRY statically from src/lib/3d/garmentRegistry.ts
const registryFilePath = path.join(__dirname, '../src/lib/3d/garmentRegistry.ts');
let garmentRegistry = {};

if (!fs.existsSync(registryFilePath)) {
  logFail(`Registry file not found at ${registryFilePath}`);
} else {
  try {
    const registryContent = fs.readFileSync(registryFilePath, 'utf8');
    // Extract registry object using Function constructor or regex parsing
    const objectMatch = registryContent.match(/export const GARMENT_REGISTRY[^{]*=([\s\S]*?);\n\nexport const/);
    if (objectMatch && objectMatch[1]) {
      // Evaluate extracted object in isolated scope
      const evalString = `return ${objectMatch[1]}`;
      garmentRegistry = new Function(evalString)();
      logPass(`Parsed GARMENT_REGISTRY cleanly with ${Object.keys(garmentRegistry).length} registered asset(s).`);
    } else {
      logFail('Could not extract GARMENT_REGISTRY object from file.');
    }
  } catch (err) {
    logFail(`Failed to parse GARMENT_REGISTRY statically: ${err.message}`);
  }
}

const registeredGarmentIds = Object.keys(garmentRegistry);
if (registeredGarmentIds.length === 0) {
  logFail('No garment entries found in GARMENT_REGISTRY.');
}

registeredGarmentIds.forEach((garmentId) => {
  const config = garmentRegistry[garmentId];
  console.log(`\n----------------------------------------------------`);
  console.log(`Validating Garment ID: ${garmentId}`);
  console.log(`Declared Name: "${config.name}", Slot: "${config.slot}"`);

  // --- REGISTRY BASIC CONTRACT VALIDATION ---
  if (config.id !== garmentId) {
    logFail(`Registry key "${garmentId}" does not match internal id field "${config.id}".`);
  } else {
    logPass('Registry key matches internal asset ID.');
  }

  const validSlots = ['top', 'bottom', 'feet', 'waist', 'hand'];
  if (!validSlots.includes(config.slot)) {
    logFail(`Invalid GarmentSlot "${config.slot}". Must be one of: ${validSlots.join(', ')}`);
  } else {
    logPass(`Valid GarmentSlot union member: "${config.slot}".`);
  }

  if (!config.supportedAvatarIds || !Array.isArray(config.supportedAvatarIds)) {
    logFail('supportedAvatarIds must be an array.');
  } else {
    if (!config.supportedAvatarIds.includes('male') || !config.supportedAvatarIds.includes('female')) {
      logFail(`supportedAvatarIds missing required base adult avatars ('male', 'female'). Got: ${config.supportedAvatarIds.join(', ')}`);
    } else {
      logPass(`Avatar compatibility verified: supports [${config.supportedAvatarIds.join(', ')}].`);
    }
  }

  const relativeModelPath = config.modelUrl.replace(/^\//, '');
  const absoluteModelPath = path.join(__dirname, '../public', relativeModelPath);

  if (!fs.existsSync(absoluteModelPath)) {
    logFail(`Model file referenced in registry does not exist: ${absoluteModelPath}`);
    return;
  }
  logPass(`Model file exists at ${absoluteModelPath}`);

  // --- GLB BINARY & CHUNK VALIDATION ---
  const buffer = fs.readFileSync(absoluteModelPath);
  const stats = fs.statSync(absoluteModelPath);

  if (stats.size < 20) {
    logFail(`File size too small (${stats.size} bytes).`);
    return;
  }

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
    logFail(`Header declared length (${fileLength}) does not match actual byte count (${stats.size}).`);
  } else {
    logPass(`Header declared length matches actual file size (${stats.size} bytes).`);
  }

  // First chunk: JSON
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);

  if (jsonChunkType !== JSON_CHUNK_TYPE) {
    logFail(`First chunk type is not JSON: 0x${jsonChunkType.toString(16)}`);
    return;
  }

  if (20 + jsonChunkLength > stats.size) {
    logFail(`JSON chunk exceeds total GLB byte length.`);
    return;
  }
  logPass(`JSON chunk bounds verified (Offset: 20, Length: ${jsonChunkLength}).`);

  const jsonBuffer = buffer.subarray(20, 20 + jsonChunkLength);
  let gltf;
  try {
    gltf = JSON.parse(jsonBuffer.toString('utf8'));
    logPass('glTF JSON chunk parsed successfully.');
  } catch (e) {
    logFail(`Failed to parse JSON chunk: ${e.message}`);
    return;
  }

  // Second chunk: BIN (optional in glTF specs, but required for embedded GLB geometry)
  let binOffset = 20 + jsonChunkLength;
  let binLength = 0;
  if (binOffset < stats.size) {
    binLength = buffer.readUInt32LE(binOffset);
    const binType = buffer.readUInt32LE(binOffset + 4);
    if (binType !== BIN_CHUNK_TYPE) {
      logFail(`Second chunk type is not BIN: 0x${binType.toString(16)}`);
    } else {
      if (binOffset + 8 + binLength > stats.size) {
        logFail(`BIN chunk exceeds total GLB byte length.`);
      } else {
        logPass(`BIN chunk bounds verified (Offset: ${binOffset + 8}, Length: ${binLength}).`);
      }
    }
  }

  // --- GLTF REFERENCES & INDEX INTEGRITY ---
  if (!gltf.scenes || gltf.scenes.length === 0) {
    logFail('glTF missing default scene array.');
  } else {
    logPass(`glTF contains ${gltf.scenes.length} scene(s).`);
  }

  if (!gltf.nodes || gltf.nodes.length === 0) {
    logFail('glTF missing node graph.');
  }

  if (!gltf.meshes || gltf.meshes.length === 0) {
    logFail('glTF missing meshes array.');
  } else {
    logPass(`glTF contains ${gltf.meshes.length} mesh(es).`);
  }

  // Validate scene -> node references
  gltf.scenes.forEach((scene, sIdx) => {
    if (scene.nodes) {
      scene.nodes.forEach((nIdx) => {
        if (nIdx < 0 || nIdx >= gltf.nodes.length) {
          logFail(`Scene ${sIdx} references invalid node index ${nIdx}.`);
        }
      });
    }
  });

  // Validate node -> mesh references
  gltf.nodes.forEach((node, nIdx) => {
    if (node.mesh !== undefined) {
      if (node.mesh < 0 || node.mesh >= gltf.meshes.length) {
        logFail(`Node ${nIdx} references invalid mesh index ${node.mesh}.`);
      }
    }
  });

  // --- STRICT CANONICAL NAMING ENFORCEMENT ---
  const canonicalPrefix = `GARMENT_${config.slot}_`;
  if (!garmentId.startsWith(canonicalPrefix)) {
    logFail(`Garment ID "${garmentId}" violates required prefix pattern "${canonicalPrefix}<name>".`);
  } else {
    logPass(`Garment ID "${garmentId}" conforms to canonical naming convention.`);
  }

  // Enforce glTF node / mesh naming
  let nodeNamingValid = false;
  let meshNamingValid = false;

  gltf.nodes.forEach((node) => {
    if (node.name && node.name.startsWith(canonicalPrefix)) {
      nodeNamingValid = true;
    }
  });

  gltf.meshes.forEach((mesh) => {
    if (mesh.name && mesh.name.startsWith(canonicalPrefix)) {
      meshNamingValid = true;
    }
  });

  if (!nodeNamingValid) {
    logFail(`No glTF node found with canonical name prefix "${canonicalPrefix}".`);
  } else {
    logPass(`glTF node hierarchy contains canonical node name matching "${canonicalPrefix}*".`);
  }

  if (!meshNamingValid) {
    logFail(`No glTF mesh found with canonical name prefix "${canonicalPrefix}".`);
  } else {
    logPass(`glTF mesh geometry contains canonical mesh name matching "${canonicalPrefix}*".`);
  }

  // --- GEOMETRY, ACCESSOR & BUFFERVIEW VALIDATION ---
  let totalTriangles = 0;
  let totalVertices = 0;
  let materialCount = gltf.materials ? gltf.materials.length : 0;

  gltf.meshes.forEach((mesh, mIdx) => {
    if (!mesh.primitives || mesh.primitives.length === 0) {
      logFail(`Mesh ${mIdx} has no primitives.`);
      return;
    }

    mesh.primitives.forEach((primitive, pIdx) => {
      // Validate POSITION attribute
      const posAccIdx = primitive.attributes ? primitive.attributes.POSITION : undefined;
      if (posAccIdx === undefined) {
        logFail(`Mesh ${mIdx} primitive ${pIdx} missing POSITION attribute.`);
        return;
      }

      if (posAccIdx < 0 || posAccIdx >= gltf.accessors.length) {
        logFail(`Mesh ${mIdx} primitive ${pIdx} references invalid POSITION accessor index ${posAccIdx}.`);
        return;
      }

      const posAccessor = gltf.accessors[posAccIdx];
      if (posAccessor.type !== 'VEC3') {
        logFail(`POSITION accessor ${posAccIdx} type is "${posAccessor.type}" (Expected "VEC3").`);
      } else {
        logPass('POSITION accessor type is VEC3.');
      }

      if (posAccessor.count <= 0) {
        logFail(`POSITION accessor count is non-positive (${posAccessor.count}).`);
      }
      totalVertices += posAccessor.count;

      // Validate bufferView for POSITION accessor
      if (posAccessor.bufferView !== undefined) {
        if (posAccessor.bufferView < 0 || posAccessor.bufferView >= gltf.bufferViews.length) {
          logFail(`Accessor ${posAccIdx} references invalid bufferView index ${posAccessor.bufferView}.`);
        } else {
          const bv = gltf.bufferViews[posAccessor.bufferView];
          if (bv.byteOffset + bv.byteLength > binLength) {
            logFail(`bufferView ${posAccessor.bufferView} range exceeds BIN buffer length.`);
          }
        }
      }

      // Validate POSITION min/max bounds
      if (posAccessor.min && posAccessor.max) {
        const dx = posAccessor.max[0] - posAccessor.min[0];
        const dy = posAccessor.max[1] - posAccessor.min[1];
        const dz = posAccessor.max[2] - posAccessor.min[2];

        if (dx <= 0 || dy <= 0 || dz <= 0) {
          logFail(`Invalid zero or negative 3D volume dimensions: dx=${dx}, dy=${dy}, dz=${dz}`);
        } else {
          logPass(`Non-zero 3D geometry volume verified (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}, dz=${dz.toFixed(2)}).`);
        }
      } else {
        logFail(`POSITION accessor missing min/max bounds array.`);
      }

      // Validate INDICES accessor if present
      if (primitive.indices !== undefined) {
        if (primitive.indices < 0 || primitive.indices >= gltf.accessors.length) {
          logFail(`Primitive references invalid indices accessor index ${primitive.indices}.`);
        } else {
          const idxAccessor = gltf.accessors[primitive.indices];
          totalTriangles += idxAccessor.count / 3;
        }
      }
    });
  });

  logPass(`Measured GLB geometry metrics -> Triangles: ${totalTriangles}, Vertices: ${totalVertices}, Materials: ${materialCount}`);

  // --- CROSS-CHECK WITH REGISTRY METADATA ---
  if (config.metadata) {
    if (config.metadata.triCount !== undefined && config.metadata.triCount !== totalTriangles) {
      logFail(`Registry metadata triCount (${config.metadata.triCount}) does not match measured GLB count (${totalTriangles}).`);
    } else if (config.metadata.triCount !== undefined) {
      logPass(`Registry declared triCount matches measured GLB count (${totalTriangles}).`);
    }

    if (config.metadata.vertexCount !== undefined && config.metadata.vertexCount !== totalVertices) {
      logFail(`Registry metadata vertexCount (${config.metadata.vertexCount}) does not match measured GLB count (${totalVertices}).`);
    } else if (config.metadata.vertexCount !== undefined) {
      logPass(`Registry declared vertexCount matches measured GLB count (${totalVertices}).`);
    }

    if (config.metadata.materialCount !== undefined && config.metadata.materialCount !== materialCount) {
      logFail(`Registry metadata materialCount (${config.metadata.materialCount}) does not match measured GLB count (${materialCount}).`);
    } else if (config.metadata.materialCount !== undefined) {
      logPass(`Registry declared materialCount matches measured GLB count (${materialCount}).`);
    }
  }
});

console.log('\n====================================================');
if (totalErrors === 0) {
  console.log('\x1b[32mSUCCESS: All Garment Pipeline asset & registry integrity checks passed!\x1b[0m');
  process.exit(0);
} else {
  console.error(`\x1b[31mFAILURE: ${totalErrors} check(s) failed.\x1b[0m`);
  process.exit(1);
}
