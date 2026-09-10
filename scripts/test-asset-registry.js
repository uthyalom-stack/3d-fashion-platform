const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ts = require('typescript');

// Enable direct loading of TypeScript modules in Node.js
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

const {
  getAsset,
  getAssets,
  getAssetsByType,
  getGarmentAsset,
  getAvatarAsset,
  hasAsset,
  resolveAssetId,
  DEFAULT_AVATAR_ASSET_ID,
  DEFAULT_GARMENT_ASSET_ID,
} = require('../src/lib/3d/assetRegistry');

const {
  validateAsset,
  validateAssetRegistry,
} = require('../src/lib/3d/assetValidator');

const { GARMENT_REGISTRY } = require('../src/lib/3d/garmentRegistry');
const { AVATAR_REGISTRY } = require('../src/components/3d/Avatar');

function runAssetRegistryTests() {
  console.log('====================================================');
  console.log('Phase 5 — 3D Asset Registry & Validation Unit Tests');
  console.log('====================================================\n');

  // 1. Empty/Valid Registry Test
  console.log('Test 1: Empty / Valid Registry Validation');
  const emptyRes = validateAssetRegistry([]);
  assert.strictEqual(emptyRes.valid, true, 'Empty array must validate cleanly');

  const loadedAssets = getAssets();
  assert.ok(loadedAssets.length >= 3, `Registry must load at least 3 default assets, found ${loadedAssets.length}`);

  const registryValidation = validateAssetRegistry(loadedAssets);
  assert.strictEqual(registryValidation.valid, true, `Default registry must validate with zero errors: ${registryValidation.errors.join(', ')}`);
  console.log('✔ PASS: Empty and populated default asset registry validated successfully.');

  // 2. Asset Lookup Test
  console.log('\nTest 2: Asset Lookup (getAsset)');
  const maleAsset = getAsset('avatar.male.base');
  assert.ok(maleAsset, 'Must find asset by primary ID "avatar.male.base"');
  assert.strictEqual(maleAsset.assetId, 'avatar.male.base');
  assert.strictEqual(maleAsset.assetType, 'avatar');

  // Lookup by alias
  const maleByAlias = getAsset('male');
  assert.ok(maleByAlias, 'Must find asset by alias ID "male"');
  assert.strictEqual(maleByAlias.assetId, 'avatar.male.base');
  console.log('✔ PASS: Asset lookup succeeded by primary ID and alias ID.');

  // 3. Unknown Asset Lookup Test
  console.log('\nTest 3: Unknown Asset Lookup');
  const unknownAsset = getAsset('unknown.asset.id');
  assert.strictEqual(unknownAsset, null, 'Unknown asset ID must return null');
  assert.strictEqual(hasAsset('unknown.asset.id'), false, 'hasAsset for unknown ID must return false');
  console.log('✔ PASS: Unknown asset lookup returned null cleanly without crashing or silent fallback.');

  // 4. Asset Type Filtering Test
  console.log('\nTest 4: Asset Type Filtering (getAssetsByType)');
  const avatars = getAssetsByType('avatar');
  assert.ok(avatars.length >= 2, 'Must find at least 2 avatar assets');
  avatars.forEach((a) => assert.strictEqual(a.assetType, 'avatar'));

  const garments = getAssetsByType('garment');
  assert.ok(garments.length >= 1, 'Must find at least 1 garment asset');
  garments.forEach((g) => assert.strictEqual(g.assetType, 'garment'));

  const props = getAssetsByType('prop');
  assert.strictEqual(props.length, 0, 'No prop assets currently registered');
  console.log('✔ PASS: Filtering by AssetType works deterministically.');

  // 5. Unique IDs Validation (Rejecting Duplicates)
  console.log('\nTest 5: Unique IDs Validation');
  const duplicateAsset = { ...maleAsset };
  const dupRegistryRes = validateAssetRegistry([maleAsset, duplicateAsset]);
  assert.strictEqual(dupRegistryRes.valid, false, 'Registry with duplicate IDs must fail validation');
  assert.ok(dupRegistryRes.errors.some((e) => e.includes('Duplicate asset ID detected')));
  console.log('✔ PASS: Duplicate asset IDs rejected deterministically.');

  // 6. Invalid IDs Validation
  console.log('\nTest 6: Invalid IDs Validation');
  const invalidIdAsset = { ...maleAsset, assetId: 'invalid ID with spaces!' };
  const invalidIdRes = validateAsset(invalidIdAsset);
  assert.strictEqual(invalidIdRes.valid, false);
  assert.ok(invalidIdRes.errors.some((e) => e.includes('filesystem-safe')));
  console.log('✔ PASS: Invalid asset ID format rejected.');

  // 7. Invalid Asset Types Validation
  console.log('\nTest 7: Invalid Asset Types Validation');
  const invalidTypeAsset = { ...maleAsset, assetId: 'test.invalid.type', assetType: 'magic_wand' };
  const invalidTypeRes = validateAsset(invalidTypeAsset);
  assert.strictEqual(invalidTypeRes.valid, false);
  assert.ok(invalidTypeRes.errors.some((e) => e.includes('assetType "magic_wand" is invalid')));
  console.log('✔ PASS: Invalid AssetType rejected.');

  // 8. Invalid Versions Validation
  console.log('\nTest 8: Invalid Versions Validation');
  const invalidVerAsset = { ...maleAsset, assetId: 'test.invalid.ver', version: '' };
  const invalidVerRes = validateAsset(invalidVerAsset);
  assert.strictEqual(invalidVerRes.valid, false);
  assert.ok(invalidVerRes.errors.some((e) => e.includes('version must be specified')));
  console.log('✔ PASS: Empty version string rejected.');

  // 9. Garment Slot Validation
  console.log('\nTest 9: Garment Slot Validation');
  const garmentAsset = getGarmentAsset('garment.top.basic-tshirt');
  assert.ok(garmentAsset);
  const invalidSlotGarment = { ...garmentAsset, assetId: 'garment.invalid.slot', slot: 'hat' };
  const invalidSlotRes = validateAsset(invalidSlotGarment);
  assert.strictEqual(invalidSlotRes.valid, false);
  assert.ok(invalidSlotRes.errors.some((e) => e.includes('invalid slot "hat"')));
  console.log('✔ PASS: Non-canonical garment slot "hat" rejected.');

  // 10. Invalid Avatar References Validation
  console.log('\nTest 10: Invalid Avatar References Validation');
  const invalidAvatarGarment = {
    ...garmentAsset,
    assetId: 'garment.invalid.avatar',
    supportedAvatarIds: ['non_existent_avatar_999'],
  };
  const invalidAvatarRes = validateAsset(invalidAvatarGarment, new Set(['male', 'female']));
  assert.strictEqual(invalidAvatarRes.valid, false);
  assert.ok(invalidAvatarRes.errors.some((e) => e.includes('unknown supported avatar ID')));
  console.log('✔ PASS: Reference to unknown avatar ID rejected.');

  // 11. Supported Avatar Validation
  console.log('\nTest 11: Supported Avatar Validation');
  const emptyAvatarGarment = {
    ...garmentAsset,
    assetId: 'garment.empty.avatar',
    supportedAvatarIds: [],
  };
  const emptyAvatarRes = validateAsset(emptyAvatarGarment);
  assert.strictEqual(emptyAvatarRes.valid, false);
  assert.ok(emptyAvatarRes.errors.some((e) => e.includes('at least one supported avatar ID')));
  console.log('✔ PASS: Empty supportedAvatarIds array rejected.');

  // 12. Garment Lookup (getGarmentAsset)
  console.log('\nTest 12: Garment Lookup (getGarmentAsset)');
  const gByPrimary = getGarmentAsset('garment.top.basic-tshirt');
  assert.ok(gByPrimary);
  assert.strictEqual(gByPrimary.slot, 'top');

  const gByAlias = getGarmentAsset('GARMENT_top_basic_tshirt');
  assert.ok(gByAlias);
  assert.strictEqual(gByAlias.assetId, 'garment.top.basic-tshirt');

  const avatarAsGarment = getGarmentAsset('avatar.male.base');
  assert.strictEqual(avatarAsGarment, null, 'getGarmentAsset for an avatar asset must return null');
  console.log('✔ PASS: Garment lookup returned Garment3DAsset for garments and null for non-garments.');

  // 13. Deterministic Registry Behavior
  console.log('\nTest 13: Deterministic Registry Behavior');
  const a1 = getAsset('garment.top.basic-tshirt');
  const a2 = getAsset('garment.top.basic-tshirt');
  assert.strictEqual(a1, a2, 'Repeated getAsset calls must return identical reference/object');
  console.log('✔ PASS: Deterministic registry behavior confirmed.');

  // 14. Model URL Resolution
  console.log('\nTest 14: Model URL Resolution');
  loadedAssets.forEach((asset) => {
    assert.ok(asset.modelUrl.startsWith('/models/'), `Model URL "${asset.modelUrl}" must start with /models/`);
    const relPath = asset.modelUrl.replace(/^\//, '');
    const absPath = path.join(__dirname, '../public', relPath);
    assert.ok(fs.existsSync(absPath), `Target GLB file must exist on disk at ${absPath}`);
  });
  console.log('✔ PASS: All registered model URLs resolve to existing local repository files.');

  // 15. Schema / Version Validation
  console.log('\nTest 15: Schema & Version Validation');
  loadedAssets.forEach((asset) => {
    assert.strictEqual(asset.schemaVersion, '1.0');
    assert.ok(/^[0-9]+\.[0-9]+\.[0-9]+$/.test(asset.version));
  });
  console.log('✔ PASS: Schema and semantic version strings verified across all registered assets.');

  // 16. Compatibility with existing Avatar Registry
  console.log('\nTest 16: Compatibility with existing Avatar Registry');
  assert.ok(AVATAR_REGISTRY.male, 'AVATAR_REGISTRY.male must exist');
  assert.ok(AVATAR_REGISTRY.female, 'AVATAR_REGISTRY.female must exist');
  assert.strictEqual(AVATAR_REGISTRY.male.modelUrl, '/models/avatar/male/base-avatar.glb');
  assert.strictEqual(AVATAR_REGISTRY.male.scale, 0.11);
  assert.strictEqual(AVATAR_REGISTRY.female.scale, 0.10);
  console.log('✔ PASS: Existing AVATAR_REGISTRY maintains complete compatibility.');

  // 17. Compatibility with existing Garment Registry
  console.log('\nTest 17: Compatibility with existing Garment Registry');
  assert.ok(GARMENT_REGISTRY['GARMENT_top_basic_tshirt'], 'GARMENT_REGISTRY["GARMENT_top_basic_tshirt"] must exist');
  assert.strictEqual(GARMENT_REGISTRY['GARMENT_top_basic_tshirt'].slot, 'top');
  assert.ok(GARMENT_REGISTRY['GARMENT_top_basic_tshirt'].supportedAvatarIds.includes('male'));
  console.log('✔ PASS: Existing GARMENT_REGISTRY maintains complete compatibility.');

  // 18. GLB Asset Binary Inspection & Performance Metrics Reporting
  console.log('\n----------------------------------------------------');
  console.log('GLB Asset Binary Inspection & Performance Metrics Reporting');
  console.log('----------------------------------------------------');

  loadedAssets.forEach((asset) => {
    const relPath = asset.modelUrl.replace(/^\//, '');
    const absPath = path.join(__dirname, '../public', relPath);
    const buffer = fs.readFileSync(absPath);
    const stats = fs.statSync(absPath);

    const magic = buffer.toString('ascii', 0, 4);
    assert.strictEqual(magic, 'glTF', `Asset [${asset.assetId}] magic header must be glTF`);

    const version = buffer.readUInt32LE(4);
    assert.strictEqual(version, 2, `Asset [${asset.assetId}] glTF version must be 2`);

    const jsonChunkLen = buffer.readUInt32LE(12);
    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLen);
    const gltf = JSON.parse(jsonStr);

    let triCount = 0;
    let vertCount = 0;
    let materialCount = Array.isArray(gltf.materials) ? gltf.materials.length : 0;
    let textureCount = Array.isArray(gltf.textures) ? gltf.textures.length : 0;

    if (Array.isArray(gltf.meshes)) {
      gltf.meshes.forEach((mesh) => {
        if (Array.isArray(mesh.primitives)) {
          mesh.primitives.forEach((prim) => {
            if (prim.attributes && prim.attributes.POSITION !== undefined) {
              const posAcc = gltf.accessors[prim.attributes.POSITION];
              if (posAcc) vertCount += posAcc.count;
            }
            if (prim.indices !== undefined) {
              const idxAcc = gltf.accessors[prim.indices];
              if (idxAcc) triCount += idxAcc.count / 3;
            }
          });
        }
      });
    }

    console.log(`Asset ID: ${asset.assetId}`);
    console.log(`  File Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
    console.log(`  Triangles: ${triCount}`);
    console.log(`  Vertices: ${vertCount}`);
    console.log(`  Materials: ${materialCount}`);
    console.log(`  Textures: ${textureCount}`);

    // Verify metrics in metadata match derived metrics if specified
    if (asset.metadata) {
      if (asset.metadata.triCount !== undefined) {
        assert.strictEqual(asset.metadata.triCount, triCount, `Asset [${asset.assetId}] metadata triCount must match GLB binary count`);
      }
      if (asset.metadata.vertexCount !== undefined) {
        assert.strictEqual(asset.metadata.vertexCount, vertCount, `Asset [${asset.assetId}] metadata vertexCount must match GLB binary count`);
      }
    }
  });

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All 3D Asset Registry & Validation Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runAssetRegistryTests();
