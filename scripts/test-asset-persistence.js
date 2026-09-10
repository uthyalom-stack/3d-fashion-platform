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

const {
  setAssetRepository,
  getAssetRepository,
  getAsset: getRegistryAsset,
  hasAsset: hasRegistryAsset,
  resolveAssetId: resolveRegistryAssetId,
} = require('../src/lib/3d/assetRegistry');

async function runAssetPersistenceTests() {
  console.log('====================================================');
  console.log('Phase 8 — 3D Asset Metadata Persistence Unit Tests');
  console.log('====================================================\n');

  // Test 1: Repository implements seed()
  console.log('Test 1: Repository Implements seed() Method');
  const repo = new LocalAssetPersistenceAdapter();
  assert.ok(typeof repo.seed === 'function', 'Repository must implement seed()');
  console.log('✔ PASS: LocalAssetPersistenceAdapter implements seed() method cleanly.');

  // Test 2: seed() imports all manifest records
  console.log('\nTest 2: seed() Imports All Manifest Records');
  const manifestData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/3d/assets.json'), 'utf8'));
  const seededCount = await seedAssetRepository(repo);
  assert.strictEqual(seededCount, manifestData.assets.length, 'Seeded count must match manifest records count');
  assert.strictEqual(await repo.count(), manifestData.assets.length, 'Repository count matches seeded records count');
  console.log(`✔ PASS: seed() imported all ${seededCount} manifest records.`);

  // Test 3: seed() preserves aliases
  console.log('\nTest 3: seed() Preserves Aliases');
  const maleRecord = await repo.getRecord('avatar.male.base');
  assert.ok(maleRecord, 'Must retrieve male record');
  assert.ok(Array.isArray(maleRecord.aliasIds));
  assert.ok(maleRecord.aliasIds.includes('male'), 'Male record must preserve alias "male"');
  console.log('✔ PASS: seed() preserved alias mappings cleanly.');

  // Test 4: getAsset(primary ID)
  console.log('\nTest 4: getAsset(primary ID)');
  const maleByPrimary = await repo.getAsset('avatar.male.base');
  assert.ok(maleByPrimary);
  assert.strictEqual(maleByPrimary.assetId, 'avatar.male.base');
  console.log('✔ PASS: getAsset(primary ID) returned expected Platform3DAsset.');

  // Test 5: getAsset(alias)
  console.log('\nTest 5: getAsset(alias)');
  const maleByAlias = await repo.getAsset('male');
  assert.ok(maleByAlias);
  assert.strictEqual(maleByAlias.assetId, 'avatar.male.base');
  console.log('✔ PASS: getAsset(alias) resolved and returned expected primary Platform3DAsset.');

  // Test 6: hasAsset(primary ID)
  console.log('\nTest 6: hasAsset(primary ID)');
  assert.strictEqual(await repo.hasAsset('avatar.male.base'), true);
  console.log('✔ PASS: hasAsset(primary ID) returned true.');

  // Test 7: hasAsset(alias)
  console.log('\nTest 7: hasAsset(alias)');
  assert.strictEqual(await repo.hasAsset('male'), true);
  console.log('✔ PASS: hasAsset(alias) returned true.');

  // Test 8: Save with aliases
  console.log('\nTest 8: Save with Aliases');
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
  await repo.saveAsset(newGarment, ['test_jeans_alias']);
  assert.strictEqual(await repo.hasAsset('test_jeans_alias'), true);
  const jeansByAlias = await repo.getAsset('test_jeans_alias');
  assert.ok(jeansByAlias);
  assert.strictEqual(jeansByAlias.assetId, 'garment.bottom.test-jeans');
  console.log('✔ PASS: saveAsset persisted asset and alias mappings successfully.');

  // Test 9: Update asset without losing aliases
  console.log('\nTest 9: Update Asset Without Losing Aliases');
  const updatedJeans = { ...newGarment, displayName: 'Test Denim Jeans v2' };
  await repo.saveAsset(updatedJeans, ['test_jeans_alias']);
  assert.strictEqual(await repo.hasAsset('test_jeans_alias'), true);
  const reJeans = await repo.getAsset('test_jeans_alias');
  assert.strictEqual(reJeans.displayName, 'Test Denim Jeans v2');
  console.log('✔ PASS: Updated asset while preserving alias mappings.');

  // Test 10: Replace aliases correctly on update
  console.log('\nTest 10: Replace Aliases Correctly on Update');
  await repo.saveAsset(updatedJeans, ['new_jeans_alias']);
  assert.strictEqual(await repo.hasAsset('new_jeans_alias'), true);
  assert.strictEqual(await repo.hasAsset('test_jeans_alias'), false, 'Old alias must be replaced on update with new alias array');
  console.log('✔ PASS: Old aliases cleaned up and replaced on asset update.');

  // Test 11: Delete by primary ID removes aliases
  console.log('\nTest 11: Delete by Primary ID Removes Aliases');
  await repo.saveAsset(newGarment, ['delete_primary_alias']);
  assert.strictEqual(await repo.hasAsset('delete_primary_alias'), true);
  const delPrimResult = await repo.deleteAsset('garment.bottom.test-jeans');
  assert.strictEqual(delPrimResult, true);
  assert.strictEqual(await repo.hasAsset('garment.bottom.test-jeans'), false);
  assert.strictEqual(await repo.hasAsset('delete_primary_alias'), false, 'Alias must be removed when primary asset deleted');
  console.log('✔ PASS: Deleting by primary ID removed asset and associated aliases.');

  // Test 12: Delete by alias removes asset
  console.log('\nTest 12: Delete by Alias Removes Asset');
  await repo.saveAsset(newGarment, ['del_alias_trigger']);
  assert.strictEqual(await repo.hasAsset('garment.bottom.test-jeans'), true);
  const delAliasResult = await repo.deleteAsset('del_alias_trigger');
  assert.strictEqual(delAliasResult, true);
  assert.strictEqual(await repo.hasAsset('garment.bottom.test-jeans'), false, 'Deleting by alias removes underlying asset');
  assert.strictEqual(await repo.hasAsset('del_alias_trigger'), false);
  console.log('✔ PASS: Deleting by alias removed underlying asset and all associated aliases.');

  // Test 13: Clear removes aliases
  console.log('\nTest 13: Clear Removes Aliases');
  await repo.saveAsset(newGarment, ['clear_alias']);
  assert.strictEqual(await repo.hasAsset('clear_alias'), true);
  await repo.clear();
  assert.strictEqual(await repo.count(), 0);
  assert.strictEqual(await repo.hasAsset('clear_alias'), false);
  console.log('✔ PASS: clear() removed all asset records and alias mappings.');

  // Test 14: Repository replacement preserves aliases
  console.log('\nTest 14: Repository Replacement Preserves Aliases');
  const sourceRepo = new LocalAssetPersistenceAdapter();
  await seedAssetRepository(sourceRepo);
  await sourceRepo.saveAsset(newGarment, ['repo_swap_alias']);

  const targetRepo = new LocalAssetPersistenceAdapter();
  const recordsToCopy = await sourceRepo.getRecords();
  await targetRepo.seed(recordsToCopy);

  assert.strictEqual(await targetRepo.hasAsset('repo_swap_alias'), true);
  const targetJeans = await targetRepo.getAsset('repo_swap_alias');
  assert.ok(targetJeans);
  assert.strictEqual(targetJeans.assetId, 'garment.bottom.test-jeans');
  console.log('✔ PASS: Seeding target repository with getRecords() preserved alias mappings across repository swap.');

  // Test 15: Synchronous AssetRegistry alias lookup after repository replacement
  console.log('\nTest 15: Synchronous AssetRegistry Alias Lookup After Repository Replacement');
  const customRegistryRepo = new LocalAssetPersistenceAdapter();
  await seedAssetRepository(customRegistryRepo);
  await customRegistryRepo.saveAsset(newGarment, ['custom_registry_alias']);

  await setAssetRepository(customRegistryRepo);

  assert.strictEqual(hasRegistryAsset('custom_registry_alias'), true);
  assert.strictEqual(hasRegistryAsset('male'), true);
  assert.strictEqual(resolveRegistryAssetId('male'), 'avatar.male.base');
  const syncRegJeans = getRegistryAsset('custom_registry_alias');
  assert.ok(syncRegJeans);
  assert.strictEqual(syncRegJeans.assetId, 'garment.bottom.test-jeans');
  console.log('✔ PASS: Synchronous AssetRegistry functions work cleanly after setAssetRepository().');

  // Test 16: Deep-clone protection of alias arrays
  console.log('\nTest 16: Deep-Clone Protection of Alias Arrays');
  const rec1 = await customRegistryRepo.getRecord('garment.bottom.test-jeans');
  assert.ok(rec1);
  rec1.aliasIds.push('HACKED_ALIAS');
  const rec2 = await customRegistryRepo.getRecord('garment.bottom.test-jeans');
  assert.strictEqual(rec2.aliasIds.includes('HACKED_ALIAS'), false, 'Alias array mutation must not affect stored state');
  console.log('✔ PASS: Deep-cloning protected stored alias arrays against external mutation.');

  // Test 17: Invalid aliases rejected
  console.log('\nTest 17: Invalid Aliases Rejected');
  await assert.rejects(
    async () => customRegistryRepo.saveAsset(newGarment, ['invalid alias with spaces!']),
    /Invalid alias ID/
  );
  console.log('✔ PASS: Invalid non-filesystem-safe alias string rejected with explicit error.');

  // Test 18: Malformed assets rejected
  console.log('\nTest 18: Malformed Assets Rejected');
  const malformedAsset = {
    assetId: 'bad id with spaces',
    assetType: 'garment',
  };
  await assert.rejects(
    async () => customRegistryRepo.saveAsset(malformedAsset),
    /Validation failed/
  );
  console.log('✔ PASS: Malformed asset rejected by validator before saving.');

  // Test 19: AssetLocation preserved
  console.log('\nTest 19: AssetLocation Preserved');
  const maleAsset = await customRegistryRepo.getAsset('male');
  assert.ok(maleAsset.location);
  assert.strictEqual(maleAsset.location.source, 'local');
  assert.strictEqual(maleAsset.location.path, '/models/avatar/male/base-avatar.glb');
  assert.strictEqual('modelUrl' in maleAsset, false, 'No competing modelUrl property');
  console.log('✔ PASS: Authoritative AssetLocation preserved without competing location fields.');

  // Test 20: No commerce fields
  console.log('\nTest 20: No Commerce Fields');
  const forbiddenFields = ['price', 'pricing', 'inventory', 'sku', 'cart', 'checkout', 'productId'];
  const allAssets = await customRegistryRepo.getAssets();
  allAssets.forEach((a) => {
    forbiddenFields.forEach((field) => {
      assert.strictEqual(field in a, false, `Field "${field}" forbidden on asset record`);
    });
  });
  console.log('✔ PASS: Confirmed zero commerce fields exist in persistence model.');

  // Test 21: Persistence does not contain Three.js objects
  console.log('\nTest 21: Persistence Does Not Contain Three.js Objects');
  allAssets.forEach((a) => {
    assert.strictEqual('isObject3D' in a, false);
    assert.strictEqual('isMesh' in a, false);
    assert.strictEqual('isBufferGeometry' in a, false);
  });
  console.log('✔ PASS: Persisted metadata contains zero WebGL runtime objects.');

  // Test 22: Deterministic ordering
  console.log('\nTest 22: Deterministic Ordering');
  const testOrderRepo = new LocalAssetPersistenceAdapter();
  await testOrderRepo.saveAsset(newGarment);
  await testOrderRepo.saveAsset(maleByPrimary);
  const orderedList = await testOrderRepo.getAssets();
  assert.strictEqual(orderedList[0].assetId, newGarment.assetId);
  assert.strictEqual(orderedList[1].assetId, maleByPrimary.assetId);
  console.log('✔ PASS: Repository insertion ordering preserved deterministically.');

  // Test 23: Repeated seed behavior
  console.log('\nTest 23: Repeated Seed Behavior');
  const repeatRepo = new LocalAssetPersistenceAdapter();
  await seedAssetRepository(repeatRepo);
  const count1 = await repeatRepo.count();
  await seedAssetRepository(repeatRepo);
  const count2 = await repeatRepo.count();
  assert.strictEqual(count1, count2, 'Repeated seed must clear and re-populate deterministically');
  console.log('✔ PASS: Repeated seed operation executed cleanly and deterministically.');

  // Test 24: Empty repository
  console.log('\nTest 24: Empty Repository');
  const emptyRepo = new LocalAssetPersistenceAdapter();
  assert.strictEqual(await emptyRepo.count(), 0);
  assert.deepStrictEqual(await emptyRepo.getAssets(), []);
  assert.deepStrictEqual(await emptyRepo.getRecords(), []);
  assert.strictEqual(await emptyRepo.getAsset('male'), null);
  console.log('✔ PASS: Empty repository queries behave predictably.');

  // Test 25: Missing asset behavior
  console.log('\nTest 25: Missing Asset Behavior');
  assert.strictEqual(await emptyRepo.getAsset('non_existent_999'), null);
  assert.strictEqual(await emptyRepo.hasAsset('non_existent_999'), false);
  assert.strictEqual(await emptyRepo.deleteAsset('non_existent_999'), false);
  console.log('✔ PASS: Missing asset operations return null/false without throwing.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All 25 Phase 8 Asset Metadata Persistence Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runAssetPersistenceTests().catch((err) => {
  console.error('\n❌ TEST FAILED with error:', err);
  process.exit(1);
});
