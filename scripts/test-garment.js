/**
 * Comprehensive Garment Asset & Registry Integrity Validator
 * Validates 3D GLB garment assets and registry configurations without WebGL browser runtime.
 *
 * Defensive & Safe: Never crashes on malformed GLB structures; fails with controlled status 1.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit ? ts.JsxEmit.React : 2,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
}

if (!require.extensions['.ts']) {
  require.extensions['.ts'] = loadTsModule;
}
if (!require.extensions['.tsx']) {
  require.extensions['.tsx'] = loadTsModule;
}

const { GARMENT_REGISTRY } = require('../src/lib/3d/garmentRegistry');

const GLB_HEADER_MAGIC = 0x46546c67; // 'glTF'
const JSON_CHUNK_TYPE = 0x4e4f534a; // 'JSON'
const BIN_CHUNK_TYPE = 0x004e4942;  // 'BIN'

const VALID_INDEX_COMPONENT_TYPES = [5121, 5123, 5125];

// Map component types to byte sizes
const COMPONENT_BYTE_SIZES = {
  5120: 1, // BYTE
  5121: 1, // UNSIGNED_BYTE
  5122: 2, // SHORT
  5123: 2, // UNSIGNED_SHORT
  5125: 4, // UNSIGNED_INT
  5126: 4, // FLOAT
};

// Map accessor types to component count
const TYPE_ELEMENT_COUNTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

let totalErrors = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  totalErrors++;
}

// Safe Type Check Helpers
function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isArray(val) {
  return Array.isArray(val);
}

function isInteger(val) {
  return Number.isInteger(val);
}

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Validates the complete glTF buffer -> bufferView -> accessor reference and byte range chain.
 */
function validateAccessorAndBufferView(accessorName, accIdx, gltf, binLength) {
  const accessors = isArray(gltf.accessors) ? gltf.accessors : [];
  const bufferViews = isArray(gltf.bufferViews) ? gltf.bufferViews : [];
  const buffers = isArray(gltf.buffers) ? gltf.buffers : [];

  if (!isInteger(accIdx) || accIdx < 0 || accIdx >= accessors.length) {
    logFail(`${accessorName} accessor index ${accIdx} is invalid or out of range.`);
    return false;
  }

  const accessor = accessors[accIdx];
  if (!isObject(accessor)) {
    logFail(`${accessorName} accessor ${accIdx} is not a valid object.`);
    return false;
  }

  if (!isInteger(accessor.count) || accessor.count <= 0) {
    logFail(`${accessorName} accessor ${accIdx} count is invalid or non-positive (${accessor.count}).`);
    return false;
  }

  const accByteOffset = accessor.byteOffset !== undefined ? accessor.byteOffset : 0;
  if (!isInteger(accByteOffset) || accByteOffset < 0) {
    logFail(`${accessorName} accessor ${accIdx} has invalid byteOffset (${accessor.byteOffset}).`);
    return false;
  }

  if (accessor.bufferView === undefined) {
    logFail(`${accessorName} accessor ${accIdx} missing required bufferView reference.`);
    return false;
  }

  if (!isInteger(accessor.bufferView) || accessor.bufferView < 0 || accessor.bufferView >= bufferViews.length) {
    logFail(`${accessorName} accessor ${accIdx} references invalid bufferView index ${accessor.bufferView}.`);
    return false;
  }

  const bv = bufferViews[accessor.bufferView];
  if (!isObject(bv)) {
    logFail(`bufferView ${accessor.bufferView} referenced by ${accessorName} accessor ${accIdx} is not a valid object.`);
    return false;
  }

  if (!isInteger(bv.buffer) || bv.buffer < 0 || bv.buffer >= buffers.length) {
    logFail(`bufferView ${accessor.bufferView} references invalid buffer index ${bv.buffer}.`);
    return false;
  }

  const refBuffer = buffers[bv.buffer];
  if (!isObject(refBuffer) || !isInteger(refBuffer.byteLength) || refBuffer.byteLength < 0) {
    logFail(`bufferView ${accessor.bufferView} references invalid buffer ${bv.buffer}.`);
    return false;
  }

  const bvByteOffset = bv.byteOffset !== undefined ? bv.byteOffset : 0;
  if (!isInteger(bvByteOffset) || bvByteOffset < 0) {
    logFail(`bufferView ${accessor.bufferView} has invalid byteOffset (${bv.byteOffset}).`);
    return false;
  }

  if (!isInteger(bv.byteLength) || bv.byteLength <= 0) {
    logFail(`bufferView ${accessor.bufferView} has invalid byteLength (${bv.byteLength}).`);
    return false;
  }

  if (bvByteOffset + bv.byteLength > refBuffer.byteLength) {
    logFail(`bufferView ${accessor.bufferView} byte range (${bvByteOffset} + ${bv.byteLength}) exceeds declared buffer ${bv.buffer} byteLength (${refBuffer.byteLength}).`);
    return false;
  }

  if (bvByteOffset + bv.byteLength > binLength) {
    logFail(`bufferView ${accessor.bufferView} byte range (${bvByteOffset} + ${bv.byteLength}) exceeds BIN payload length (${binLength}).`);
    return false;
  }

  const compByteSize = COMPONENT_BYTE_SIZES[accessor.componentType];
  const typeElemCount = TYPE_ELEMENT_COUNTS[accessor.type];
  if (!compByteSize || !typeElemCount) {
    logFail(`${accessorName} accessor ${accIdx} has invalid componentType (${accessor.componentType}) or type ("${accessor.type}").`);
    return false;
  }

  const elementSize = compByteSize * typeElemCount;

  if (bv.byteStride !== undefined) {
    if (!isInteger(bv.byteStride) || bv.byteStride <= 0) {
      logFail(`bufferView ${accessor.bufferView} has non-positive or non-integer byteStride (${bv.byteStride}).`);
      return false;
    }
    if (bv.byteStride % 4 !== 0) {
      logFail(`bufferView ${accessor.bufferView} byteStride (${bv.byteStride}) is not a multiple of 4.`);
      return false;
    }
    if (bv.byteStride < elementSize) {
      logFail(`bufferView ${accessor.bufferView} byteStride (${bv.byteStride}) is smaller than element size (${elementSize}).`);
      return false;
    }
  }

  let requiredBytes = 0;
  if (bv.byteStride !== undefined) {
    requiredBytes = (accessor.count - 1) * bv.byteStride + elementSize;
  } else {
    requiredBytes = accessor.count * elementSize;
  }

  if (accByteOffset + requiredBytes > bv.byteLength) {
    logFail(`${accessorName} accessor ${accIdx} required byte range (${accByteOffset} + ${requiredBytes}) exceeds bufferView ${accessor.bufferView} byteLength (${bv.byteLength}).`);
    return false;
  }

  return true;
}

console.log('====================================================');
console.log('Phase 3 — Garment Pipeline Asset & Registry Validator');
console.log('====================================================\n');

// Load derived GARMENT_REGISTRY
const garmentRegistry = GARMENT_REGISTRY;
logPass(`Loaded static garment registry data cleanly with ${Object.keys(garmentRegistry).length} registered asset entry/entries.`);

const registeredGarmentIds = Object.keys(garmentRegistry);
if (registeredGarmentIds.length === 0) {
  logFail('No garment entries found in garment registry.');
}

registeredGarmentIds.forEach((garmentId) => {
  const config = garmentRegistry[garmentId];
  if (!isObject(config)) {
    logFail(`Garment registry entry for "${garmentId}" is not a valid object.`);
    return;
  }

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

  if (!isArray(config.supportedAvatarIds)) {
    logFail('supportedAvatarIds must be an array.');
  } else {
    if (!config.supportedAvatarIds.includes('male') || !config.supportedAvatarIds.includes('female')) {
      logFail(`supportedAvatarIds missing required base adult avatars ('male', 'female'). Got: ${config.supportedAvatarIds.join(', ')}`);
    } else {
      logPass(`Avatar compatibility verified: supports [${config.supportedAvatarIds.join(', ')}].`);
    }
  }

  if (typeof config.modelUrl !== 'string' || !config.modelUrl) {
    logFail('modelUrl must be a non-empty string.');
    return;
  }

  const relativeModelPath = config.modelUrl.replace(/^\//, '');
  const absoluteModelPath = path.join(__dirname, '../public', relativeModelPath);

  if (!fs.existsSync(absoluteModelPath)) {
    logFail(`Model file referenced in registry does not exist: ${absoluteModelPath}`);
    return;
  }
  logPass(`Model file exists at ${absoluteModelPath}`);

  // --- GLB BINARY & CHUNK VALIDATION ---
  let buffer;
  let stats;
  try {
    buffer = fs.readFileSync(absoluteModelPath);
    stats = fs.statSync(absoluteModelPath);
  } catch (err) {
    logFail(`Failed to read model file: ${err.message}`);
    return;
  }

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
  if (buffer.length < 20) {
    logFail('GLB container too short to read JSON chunk header.');
    return;
  }

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

  if (!isObject(gltf)) {
    logFail('Parsed glTF JSON root is not an object.');
    return;
  }

  // Second chunk: BIN
  let binOffset = 20 + jsonChunkLength;
  let binLength = 0;
  if (binOffset < stats.size) {
    if (binOffset + 8 > stats.size) {
      logFail('BIN chunk header extends beyond GLB file boundary.');
    } else {
      binLength = buffer.readUInt32LE(binOffset);
      const binType = buffer.readUInt32LE(binOffset + 4);
      if (binType !== BIN_CHUNK_TYPE) {
        logFail(`Second chunk type is not BIN: 0x${binType.toString(16)}`);
      } else {
        if (binOffset + 8 + binLength > stats.size) {
          logFail(`BIN chunk payload exceeds total GLB byte length.`);
        } else {
          logPass(`BIN chunk bounds verified (Offset: ${binOffset + 8}, Length: ${binLength}).`);
        }
      }
    }
  }

  // --- DEFENSIVE GLTF STRUCTURAL & INDEX VALIDATION ---
  if (!isArray(gltf.scenes) || gltf.scenes.length === 0) {
    logFail('glTF missing or invalid scenes array.');
  } else {
    logPass(`glTF contains ${gltf.scenes.length} scene(s).`);
  }

  if (!isArray(gltf.nodes) || gltf.nodes.length === 0) {
    logFail('glTF missing or invalid nodes array.');
  }

  if (!isArray(gltf.meshes) || gltf.meshes.length === 0) {
    logFail('glTF missing or invalid meshes array.');
  } else {
    logPass(`glTF contains ${gltf.meshes.length} mesh(es).`);
  }

  const scenes = isArray(gltf.scenes) ? gltf.scenes : [];
  const nodes = isArray(gltf.nodes) ? gltf.nodes : [];
  const meshes = isArray(gltf.meshes) ? gltf.meshes : [];
  const accessors = isArray(gltf.accessors) ? gltf.accessors : [];
  const bufferViews = isArray(gltf.bufferViews) ? gltf.bufferViews : [];

  // Validate gltf.buffers array
  if (bufferViews.length > 0 || accessors.length > 0) {
    if (!isArray(gltf.buffers) || gltf.buffers.length === 0) {
      logFail('glTF missing required buffers array for declared bufferViews/accessors.');
    } else {
      gltf.buffers.forEach((buf, bIdx) => {
        if (!isObject(buf)) {
          logFail(`Buffer ${bIdx} is not a valid object.`);
          return;
        }
        if (!isInteger(buf.byteLength) || buf.byteLength < 0) {
          logFail(`Buffer ${bIdx} has invalid byteLength (${buf.byteLength}).`);
          return;
        }
        if (buf.byteLength > binLength) {
          logFail(`Buffer ${bIdx} byteLength (${buf.byteLength}) exceeds available BIN payload length (${binLength}).`);
        } else {
          logPass(`Buffer ${bIdx} validated (byteLength: ${buf.byteLength}).`);
        }
      });
    }
  }

  // Validate scene -> node references
  scenes.forEach((scene, sIdx) => {
    if (isObject(scene) && isArray(scene.nodes)) {
      scene.nodes.forEach((nIdx) => {
        if (!isInteger(nIdx) || nIdx < 0 || nIdx >= nodes.length) {
          logFail(`Scene ${sIdx} references invalid node index ${nIdx}.`);
        }
      });
    }
  });

  // Validate node -> mesh references
  nodes.forEach((node, nIdx) => {
    if (isObject(node) && node.mesh !== undefined) {
      if (!isInteger(node.mesh) || node.mesh < 0 || node.mesh >= meshes.length) {
        logFail(`Node ${nIdx} references invalid mesh index ${node.mesh}.`);
      }
    }
  });

  // --- STRICT CANONICAL NAMING ENFORCEMENT ---
  const canonicalPrefix = `GARMENT_${config.slot}_`;
  let nodeNamingValid = false;
  let meshNamingValid = false;

  nodes.forEach((node) => {
    if (isObject(node) && typeof node.name === 'string' && node.name.startsWith(canonicalPrefix)) {
      nodeNamingValid = true;
    }
  });

  meshes.forEach((mesh) => {
    if (isObject(mesh) && typeof mesh.name === 'string' && mesh.name.startsWith(canonicalPrefix)) {
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

  // --- PRIMITIVE & GEOMETRY VALIDATION ---
  let totalTriangles = 0;
  let totalVertices = 0;
  let validRenderablePrimitiveCount = 0;
  let materialCount = isArray(gltf.materials) ? gltf.materials.length : 0;

  meshes.forEach((mesh, mIdx) => {
    if (!isObject(mesh) || !isArray(mesh.primitives) || mesh.primitives.length === 0) {
      logFail(`Mesh ${mIdx} has missing or empty primitives array.`);
      return;
    }

    mesh.primitives.forEach((primitive, pIdx) => {
      if (!isObject(primitive)) {
        logFail(`Mesh ${mIdx} primitive ${pIdx} is not an object.`);
        return;
      }

      // Check primitive mode (default 4 = TRIANGLES)
      const mode = primitive.mode !== undefined ? primitive.mode : 4;
      if (mode !== 4) {
        logFail(`Mesh ${mIdx} primitive ${pIdx} uses unsupported rendering mode ${mode} (Expected 4 = TRIANGLES).`);
        return;
      }

      // Validate attributes object
      if (!isObject(primitive.attributes)) {
        logFail(`Mesh ${mIdx} primitive ${pIdx} missing or invalid attributes object.`);
        return;
      }

      // 1. POSITION Accessor Validation
      const posAccIdx = primitive.attributes.POSITION;
      if (!validateAccessorAndBufferView('POSITION', posAccIdx, gltf, binLength)) {
        return;
      }

      const posAccessor = accessors[posAccIdx];

      if (posAccessor.type !== 'VEC3') {
        logFail(`POSITION accessor ${posAccIdx} type is "${posAccessor.type}" (Expected "VEC3").`);
        return;
      }

      if (posAccessor.componentType !== 5126) {
        logFail(`POSITION accessor ${posAccIdx} componentType is ${posAccessor.componentType} (Expected 5126 = FLOAT).`);
        return;
      }

      // Validate POSITION min/max bounds
      if (!isArray(posAccessor.min) || posAccessor.min.length !== 3 || !isArray(posAccessor.max) || posAccessor.max.length !== 3) {
        logFail(`POSITION accessor ${posAccIdx} missing or invalid min/max 3D bounds array.`);
        return;
      }

      const [minX, minY, minZ] = posAccessor.min;
      const [maxX, maxY, maxZ] = posAccessor.max;

      if (!isFiniteNumber(minX) || !isFiniteNumber(minY) || !isFiniteNumber(minZ) ||
          !isFiniteNumber(maxX) || !isFiniteNumber(maxY) || !isFiniteNumber(maxZ)) {
        logFail(`POSITION accessor ${posAccIdx} min/max bounds contain non-finite numbers.`);
        return;
      }

      const dx = maxX - minX;
      const dy = maxY - minY;
      const dz = maxZ - minZ;

      if (dx <= 0 || dy <= 0 || dz <= 0) {
        logFail(`POSITION bounds have non-positive volume dimensions: dx=${dx}, dy=${dy}, dz=${dz}`);
        return;
      }

      let primitiveTriCount = 0;

      // 2. Indices Accessor Validation (if indexed primitive)
      if (primitive.indices !== undefined) {
        const idxAccIdx = primitive.indices;
        if (!validateAccessorAndBufferView('Indices', idxAccIdx, gltf, binLength)) {
          return;
        }

        const idxAccessor = accessors[idxAccIdx];

        if (idxAccessor.type !== 'SCALAR') {
          logFail(`Indices accessor ${idxAccIdx} type is "${idxAccessor.type}" (Expected "SCALAR").`);
          return;
        }

        if (!VALID_INDEX_COMPONENT_TYPES.includes(idxAccessor.componentType)) {
          logFail(`Indices accessor ${idxAccIdx} componentType is ${idxAccessor.componentType} (Expected UNSIGNED_BYTE, UNSIGNED_SHORT, or UNSIGNED_INT).`);
          return;
        }

        if (idxAccessor.count % 3 !== 0) {
          logFail(`Indices accessor ${idxAccIdx} count (${idxAccessor.count}) is not divisible by 3 for TRIANGLES mode.`);
          return;
        }

        primitiveTriCount = idxAccessor.count / 3;
      } else {
        // Non-indexed primitive calculation
        if (posAccessor.count % 3 !== 0) {
          logFail(`Non-indexed primitive POSITION accessor count (${posAccessor.count}) is not divisible by 3 for TRIANGLES mode.`);
          return;
        }
        primitiveTriCount = posAccessor.count / 3;
      }

      totalVertices += posAccessor.count;
      totalTriangles += primitiveTriCount;
      validRenderablePrimitiveCount++;
      logPass(`Mesh ${mIdx} primitive ${pIdx} validated successfully (${primitiveTriCount} tris, ${posAccessor.count} verts).`);
    });
  });

  // Verify at least one valid renderable primitive was found
  if (validRenderablePrimitiveCount === 0) {
    logFail('No valid renderable garment geometry was found.');
  } else {
    logPass(`Valid renderable geometry confirmed across ${validRenderablePrimitiveCount} primitive(s).`);
  }

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
