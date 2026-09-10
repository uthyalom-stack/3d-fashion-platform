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

const {
  LocalAssetPersistenceAdapter,
  seedAssetRepository,
} = require('../src/lib/3d/persistence');

async function runAssetPersistenceTests() {
  console.log('====================================================');
  console.log('Phase 8 — 3D Asset Metadata Persistence Unit Tests');
  console.log('====================================================\n');

  // Test 1: Repository Creation
  console.log('Test 1: Repository Creation');
  const repo = new LocalAssetPersistenceAdapter();
  assert.ok(repo, 'Repository instance created successfully');
  console.log('✔ PASS: LocalAssetPersistenceAdapter initialized cleanly.');

  // Test 2: Empty Repository
  console.log('\nTest 2: Empty Repository Behavior');
  assert.strictEqual(await repo.count(), 0, 'Initial count must be 0');
  assert.deepStrictEqual(await repo.getAssets(), [], 'getAssets on empty repo returns empty array');
  assert.strictEqual(await repo.getAsset('male'), null, 'getAsset on empty repo returns null');
  assert.strictEqual(await repo.hasAsset('male'), false, 'hasAsset on empty repo returns false');
  console.log('✔ PASS: Empty repository methods behave deterministically.');

  // Test 3: Seed / Import of Current Manifest
  console.log('\nTest 3: Seed / Import Current Manifest');
  const countSeeded = await seedAssetRepository(repo);
  assert.ok(countSeeded >= 3, `Seeded ${countSeeded} assets from manifest`);
  assert.strictEqual(await repo.count(), countSeeded, 'Repo count matches seeded count');
  console.log(`✔ PASS: Seeded ${countSeeded} assets from assets.json manifest successfully.`);

  // Test 4: getAsset (Primary ID & Alias)
  console.log('\nTest 4: getAsset (Primary ID & Alias)');
  const maleByPrimary = await repo.getAsset('avatar.male.base');
  assert.ok(maleByPrimary, 'Must find male avatar by primary ID');
  assert.strictEqual(maleByPrimary.assetId, 'avatar.male.base');

  const maleByAlias = await repo.getAsset('male');
  assert.ok(maleByAlias, 'Must find male avatar by alias');
  assert.strictEqual(maleByAlias.assetId, 'avatar.male.base');
  console.log('✔ PASS: getAsset retrieved assets cleanly by primary ID and alias.');

  // Test 5: getAssets
  console.log('\nTest 5: getAssets');
  const allAssets = await repo.getAssets();
  assert.strictEqual(allAssets.length, countSeeded);
  console.log('✔ PASS: getAssets returned all persisted asset metadata records.');

  // Test 6: getAssetsByType
  console.log('\nTest 6: getAssetsByType');
  const avatarAssets = await repo.getAssetsByType('avatar');
  assert.ok(avatarAssets.length >= 2);
  avatarAssets.forEach((a) => assert.strictEqual(a.assetType, 'avatar'));

  const garmentAssets = await repo.getAssetsByType('garment');
  assert.ok(garmentAssets.length >= 1);
  garmentAssets.forEach((g) => assert.strictEqual(g.assetType, 'garment'));
  console.log('✔ PASS: getAssetsByType filtered assets deterministically.');

  // Test 7: hasAsset
  console.log('\nTest 7: hasAsset');
  assert.strictEqual(await repo.hasAsset('avatar.male.base'), true);
  assert.strictEqual(await repo.hasAsset('male'), true);
  assert.strictEqual(await repo.hasAsset('non.existent.id'), false);
  console.log('✔ PASS: hasAsset returned expected boolean status for primary and alias IDs.');

  // Test 8: saveAsset
  console.log('\nTest 8: saveAsset');
  const newGarment = {
    assetId: 'garment.bottom.test-jeans',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Test Denim Jeans',
    location: {
      source: 'local',
      path: '/models/garment/bottom/GARMENT_bottom_test_jeans.glb',
    },
    slot: 'bottom',
    supportedAvatarIds: ['male', 'female'],
    scale: 1.0,
    positionOffset: [0, 0, 0],
    rotationOffset: [0, 0, 0],
  };

  await repo.saveAsset(newGarment, ['test_jeans']);
  assert.strictEqual(await repo.count(), countSeeded + 1);
  const fetchedJeans = await repo.getAsset('test_jeans');
  assert.ok(fetchedJeans);
  assert.strictEqual(fetchedJeans.assetId, 'garment.bottom.test-jeans');
  console.log('✔ PASS: saveAsset persisted new valid asset with aliases successfully.');

  // Test 9: Update Existing Asset
  console.log('\nTest 9: Update Existing Asset');
  const updatedJeans = {
    ...newGarment,
    displayName: 'Test Denim Jeans Updated',
  };
  await repo.saveAsset(updatedJeans);
  assert.strictEqual(await repo.count(), countSeeded + 1, 'Count remains unchanged on update');
  const refetchedJeans = await repo.getAsset('garment.bottom.test-jeans');
  assert.strictEqual(refetchedJeans.displayName, 'Test Denim Jeans Updated');
  console.log('✔ PASS: Updated existing asset record cleanly in place.');

  // Test 10: deleteAsset
  console.log('\nTest 10: deleteAsset');
  const deleteResult = await repo.deleteAsset('garment.bottom.test-jeans');
  assert.strictEqual(deleteResult, true, 'deleteAsset returns true on success');
  assert.strictEqual(await repo.count(), countSeeded);
  assert.strictEqual(await repo.getAsset('garment.bottom.test-jeans'), null);
  assert.strictEqual(await repo.getAsset('test_jeans'), null, 'Alias also removed on delete');
  console.log('✔ PASS: deleteAsset removed primary asset and alias mappings cleanly.');

  // Test 11: Missing Asset Behavior
  console.log('\nTest 11: Missing Asset Behavior');
  assert.strictEqual(await repo.getAsset('missing.asset.id'), null);
  assert.strictEqual(await repo.deleteAsset('missing.asset.id'), false);
  console.log('✔ PASS: Missing asset queries return null/false with no exceptions.');

  // Test 12: Duplicate Asset Handling
  console.log('\nTest 12: Duplicate Asset Handling');
  const countBefore = await repo.count();
  await repo.saveAsset(maleByPrimary);
  assert.strictEqual(await repo.count(), countBefore, 'Saving duplicate assetId updates in place');
  console.log('✔ PASS: Duplicate asset ID handled as clean update in place.');

  // Test 13: Invalid Asset Rejection
  console.log('\nTest 13: Invalid Asset Rejection');
  const invalidAsset = {
    assetId: 'invalid asset id spaces',
    assetType: 'garment',
  };
  await assert.rejects(
    async () => repo.saveAsset(invalidAsset),
    /Validation failed/
  );
  console.log('✔ PASS: Invalid asset ID format rejected on saveAsset.');

  // Test 14: Invalid Location Rejection
  console.log('\nTest 14: Invalid Location Rejection');
  const invalidLocAsset = {
    ...newGarment,
    assetId: 'garment.test.badloc',
    location: {
      source: 'remote',
      path: 'http://insecure-http-url.com/model.glb', // rejected (must be https)
    },
  };
  await assert.rejects(
    async () => repo.saveAsset(invalidLocAsset),
    /Insecure HTTP protocol is rejected/
  );
  console.log('✔ PASS: Insecure or invalid location rejected on saveAsset.');

  // Test 15: Invalid Transform Rejection
  console.log('\nTest 15: Invalid Transform Rejection');
  const invalidTransformAsset = {
    ...newGarment,
    assetId: 'garment.test.badtransform',
    positionOffset: [NaN, 0, 0],
  };
  await assert.rejects(
    async () => repo.saveAsset(invalidTransformAsset),
    /positionOffset must be a 3-element tuple of finite numbers/
  );
  console.log('✔ PASS: NaN transform offset rejected on saveAsset.');

  // Test 16: Provider / Object-Key Validation
  console.log('\nTest 16: Provider / Object-Key Validation');
  const invalidKeyAsset = {
    ...newGarment,
    assetId: 'garment.test.badkey',
    location: {
      source: 'provider',
      provider: 'local',
      objectKey: 'garments/../../traversal.glb', // path traversal
    },
  };
  await assert.rejects(
    async () => repo.saveAsset(invalidKeyAsset),
    /Invalid storage object key/
  );
  console.log('✔ PASS: Object key with path traversal rejected on saveAsset.');

  // Test 17: Preservation of AssetLocation
  console.log('\nTest 17: Preservation of AssetLocation');
  const maleAss = await repo.getAsset('avatar.male.base');
  assert.ok(maleAss.location);
  assert.strictEqual(maleAss.location.source, 'local');
  assert.strictEqual(maleAss.location.path, '/models/avatar/male/base-avatar.glb');
  assert.strictEqual('modelUrl' in maleAss, false, 'No competing modelUrl property permitted');
  console.log('✔ PASS: Authoritative AssetLocation contract preserved cleanly.');

  // Test 18: Preservation of Avatar Metadata
  console.log('\nTest 18: Preservation of Avatar Metadata');
  assert.strictEqual(maleAss.assetType, 'avatar');
  assert.strictEqual(maleAss.avatarId, 'male');
  assert.strictEqual(maleAss.gender, 'male');
  assert.strictEqual(maleAss.scale, 0.11);
  assert.deepStrictEqual(maleAss.positionOffset, [0, 0, 0]);
  assert.deepStrictEqual(maleAss.rotationOffset, [0, 0, 0]);
  console.log('✔ PASS: All avatar-specific metadata properties preserved.');

  // Test 19: Preservation of Garment Metadata
  console.log('\nTest 19: Preservation of Garment Metadata');
  const tShirtAss = await repo.getAsset('garment.top.basic-tshirt');
  assert.ok(tShirtAss);
  assert.strictEqual(tShirtAss.assetType, 'garment');
  assert.strictEqual(tShirtAss.slot, 'top');
  assert.deepStrictEqual(tShirtAss.supportedAvatarIds, ['male', 'female']);
  console.log('✔ PASS: All garment-specific metadata properties preserved.');

  // Test 20: Prevention of Internal State Mutation
  console.log('\nTest 20: Prevention of Internal State Mutation');
  const asset1 = await repo.getAsset('avatar.male.base');
  asset1.displayName = 'MUTATED DISPLAY NAME';
  const asset2 = await repo.getAsset('avatar.male.base');
  assert.strictEqual(asset2.displayName, 'Adult Male Base Avatar', 'Internal repo state was protected against mutation');
  console.log('✔ PASS: Deep-cloning prevents external mutation of internal repository state.');

  // Test 21: No Three.js Runtime Objects Persisted
  console.log('\nTest 21: No Three.js Runtime Objects Persisted');
  const allPersisted = await repo.getAssets();
  allPersisted.forEach((a) => {
    assert.strictEqual('isObject3D' in a, false, 'Must not contain THREE.Object3D');
    assert.strictEqual('isMesh' in a, false, 'Must not contain THREE.Mesh');
    assert.strictEqual('isBufferGeometry' in a, false, 'Must not contain THREE.BufferGeometry');
    assert.strictEqual('isMaterial' in a, false, 'Must not contain THREE.Material');
  });
  console.log('✔ PASS: Persisted metadata contains zero Three.js WebGL runtime objects.');

  // Test 22: Persistence Round-Trip
  console.log('\nTest 22: Persistence Round-Trip');
  const roundTripRepo = new LocalAssetPersistenceAdapter();
  await roundTripRepo.saveAsset(newGarment, ['rt_jeans']);
  const retrieved = await roundTripRepo.getAsset('rt_jeans');
  assert.deepStrictEqual(retrieved.location, newGarment.location);
  assert.strictEqual(retrieved.displayName, newGarment.displayName);
  console.log('✔ PASS: Asset save and retrieval round-trip verified.');

  // Test 23: Deterministic Ordering
  console.log('\nTest 23: Deterministic Ordering');
  const orderedRepo = new LocalAssetPersistenceAdapter();
  await orderedRepo.saveAsset(newGarment);
  await orderedRepo.saveAsset(maleByPrimary);
  const orderedAssets = await orderedRepo.getAssets();
  assert.strictEqual(orderedAssets[0].assetId, newGarment.assetId);
  assert.strictEqual(orderedAssets[1].assetId, maleByPrimary.assetId);
  console.log('✔ PASS: Repository insertion order preserved deterministically.');

  // Test 24: Compatibility with Existing Manifest
  console.log('\nTest 24: Compatibility with Existing Manifest');
  const manifestRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/3d/assets.json'), 'utf8'));
  assert.ok(Array.isArray(manifestRaw.assets));
  for (const mAsset of manifestRaw.assets) {
    const fromRepo = await repo.getAsset(mAsset.assetId);
    assert.ok(fromRepo, `Manifest asset "${mAsset.assetId}" present in repo`);
    assert.strictEqual(fromRepo.displayName, mAsset.displayName);
  }
  console.log('✔ PASS: Repository fully compatible with existing static assets.json manifest.');

  // Test 25: No Commerce Fields Introduced
  console.log('\nTest 25: No Commerce Fields Introduced');
  const forbiddenCommerceFields = ['price', 'pricing', 'inventory', 'sku', 'cart', 'checkout', 'product_id', 'productId'];
  allPersisted.forEach((a) => {
    forbiddenCommerceFields.forEach((field) => {
      assert.strictEqual(field in a, false, `Field "${field}" must not exist on asset record`);
    });
  });
  console.log('✔ PASS: Verified ZERO commerce or product fields exist in persistence records.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All Phase 8 Asset Metadata Persistence Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runAssetPersistenceTests().catch((err) => {
  console.error('\n❌ TEST FAILED with error:', err);
  process.exit(1);
});
