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
  listAssets,
  listAssetsByType,
  getAsset,
  getAssetRecord,
  listAssetRecords,
  hasAsset,
  createAsset,
  updateAsset,
  deleteAsset,
} = require('../src/lib/admin/assetAdminService');

const {
  LocalAssetPersistenceAdapter,
  seedAssetRepository,
} = require('../src/lib/3d/persistence');

const { setAssetRepository, getAssetRepository } = require('../src/lib/3d/assetRegistry');

async function runAssetAdminTests() {
  console.log('====================================================');
  console.log('Phase 9 — Platform Admin Asset Service Unit & Integration Tests');
  console.log('====================================================\n');

  // Reset backing repository with seed data before tests
  const repo = new LocalAssetPersistenceAdapter();
  await seedAssetRepository(repo);
  await setAssetRepository(repo);

  // 1. Asset Listing Test
  console.log('Test 1: Asset Listing (listAssets)');
  const assets = await listAssets();
  assert.ok(Array.isArray(assets));
  assert.ok(assets.length >= 3, `Expected at least 3 seeded assets, found ${assets.length}`);
  console.log(`✔ PASS: Listed ${assets.length} registered 3D assets in deterministic order.`);

  // 2. Asset Record Retrieval Test
  console.log('\nTest 2: Asset Retrieval (getAsset & getAssetRecord)');
  const maleAsset = await getAsset('avatar.male.base');
  assert.ok(maleAsset);
  assert.strictEqual(maleAsset.assetId, 'avatar.male.base');

  const maleRecord = await getAssetRecord('avatar.male.base');
  assert.ok(maleRecord);
  assert.strictEqual(maleRecord.asset.assetId, 'avatar.male.base');
  assert.ok(maleRecord.aliasIds.includes('male'));
  console.log('✔ PASS: Retrieved asset and PersistedAssetRecord by primary ID.');

  // 3. Asset Creation Test
  console.log('\nTest 3: Asset Creation (createAsset)');
  const newGarment = {
    assetId: 'garment.hand.gloves',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Leather Gloves',
    location: {
      source: 'local',
      path: '/models/garment/hand/GARMENT_hand_gloves.glb',
    },
    slot: 'hand',
    supportedAvatarIds: ['male', 'female'],
  };

  await createAsset(newGarment, ['gloves_alias']);
  assert.strictEqual(await hasAsset('garment.hand.gloves'), true);
  assert.strictEqual(await hasAsset('gloves_alias'), true);

  const fetchedGloves = await getAsset('gloves_alias');
  assert.ok(fetchedGloves);
  assert.strictEqual(fetchedGloves.assetId, 'garment.hand.gloves');
  assert.strictEqual(fetchedGloves.displayName, 'Leather Gloves');
  console.log('✔ PASS: Created new 3D asset record with aliases via Admin Service.');

  // 4. Duplicate Primary Asset Creation Rejection Test
  console.log('\nTest 4: Duplicate Asset Creation Rejection');
  await assert.rejects(
    async () => createAsset(newGarment, ['another_alias']),
    /already exists/
  );
  console.log('✔ PASS: Attempting to create existing asset ID rejected with explicit error.');

  // 5. Asset Update Test
  console.log('\nTest 5: Asset Update (updateAsset)');
  const updatedGloves = {
    ...newGarment,
    displayName: 'Thermal Leather Gloves v2',
  };
  await updateAsset('garment.hand.gloves', updatedGloves, ['gloves_v2_alias']);

  const reFetchedGloves = await getAsset('garment.hand.gloves');
  assert.strictEqual(reFetchedGloves.displayName, 'Thermal Leather Gloves v2');
  assert.strictEqual(await hasAsset('gloves_v2_alias'), true);
  assert.strictEqual(await hasAsset('gloves_alias'), false, 'Old alias replaced on update');
  console.log('✔ PASS: Updated asset metadata and aliases cleanly.');

  // 6. Asset Deletion Test
  console.log('\nTest 6: Asset Deletion (deleteAsset)');
  const deleted = await deleteAsset('garment.hand.gloves');
  assert.strictEqual(deleted, true);
  assert.strictEqual(await hasAsset('garment.hand.gloves'), false);
  assert.strictEqual(await hasAsset('gloves_v2_alias'), false);
  const remainingAssets = await listAssets();
  assert.ok(!remainingAssets.some((a) => a.assetId === 'garment.hand.gloves'));
  console.log('✔ PASS: Deleted asset metadata record and verified disappearance from repository reads.');

  // 7. Invalid Metadata Rejection Test
  console.log('\nTest 7: Invalid Asset Metadata Rejection');
  const invalidAsset = {
    assetId: 'garment.invalid.slot',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Invalid Slot Garment',
    location: { source: 'local', path: '/models/invalid.glb' },
    slot: 'magic_hat', // Non-canonical slot
    supportedAvatarIds: ['male'],
  };
  await assert.rejects(
    async () => createAsset(invalidAsset),
    /invalid slot "magic_hat"/
  );
  console.log('✔ PASS: Domain validation rejected malformed metadata before persistence.');

  // 8. AssetLocation Preservation Test
  console.log('\nTest 8: AssetLocation Preservation');
  const currentRecords = await listAssetRecords();
  currentRecords.forEach((rec) => {
    assert.ok(rec.asset.location, `Asset "${rec.asset.assetId}" missing location`);
    assert.ok(['local', 'provider', 'remote'].includes(rec.asset.location.source));
    assert.strictEqual('modelUrl' in rec.asset, false, 'No competing modelUrl property');
    assert.strictEqual('assetUrl' in rec.asset, false, 'No competing assetUrl property');
    assert.strictEqual('runtimeUrl' in rec.asset, false, 'No competing runtimeUrl property');
  });
  console.log('✔ PASS: AssetLocation preserved as single authoritative location contract with zero competing fields.');

  // 9. Alias Creation / Update / Reassignment Test
  console.log('\nTest 9: Alias Creation, Update & Atomic Reassignment');
  const assetA = {
    assetId: 'garment.top.admin-item-a',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Admin Item A',
    location: { source: 'local', path: '/models/item-a.glb' },
    slot: 'top',
    supportedAvatarIds: ['male'],
  };

  const assetB = {
    assetId: 'garment.top.admin-item-b',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Admin Item B',
    location: { source: 'local', path: '/models/item-b.glb' },
    slot: 'top',
    supportedAvatarIds: ['male'],
  };

  await createAsset(assetA, ['admin_shared_alias']);
  assert.strictEqual((await getAsset('admin_shared_alias')).assetId, 'garment.top.admin-item-a');

  // Reassign alias to B
  await createAsset(assetB, ['admin_shared_alias']);
  assert.strictEqual((await getAsset('admin_shared_alias')).assetId, 'garment.top.admin-item-b');

  // Verify A lost ownership of admin_shared_alias
  const recA = await getAssetRecord('garment.top.admin-item-a');
  assert.ok(!recA.aliasIds.includes('admin_shared_alias'));

  // Clean up
  await deleteAsset('garment.top.admin-item-a');
  await deleteAsset('garment.top.admin-item-b');
  console.log('✔ PASS: Alias creation and atomic reassignment verified.');

  // 10. Supported Avatar Validation Test
  console.log('\nTest 10: Supported Avatar Validation');
  const badAvatarGarment = {
    assetId: 'garment.top.bad-avatar',
    assetType: 'garment',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Bad Avatar Garment',
    location: { source: 'local', path: '/models/garment.glb' },
    slot: 'top',
    supportedAvatarIds: ['non_existent_avatar_999'],
  };
  await assert.rejects(
    async () => createAsset(badAvatarGarment),
    /references unknown supported avatar ID/
  );
  console.log('✔ PASS: Reference to unknown avatar ID rejected.');

  // 11. Garment Slot Validation Test
  console.log('\nTest 11: Garment Slot Validation');
  const badSlotGarment = {
    ...badAvatarGarment,
    slot: 'shoes_hat',
    supportedAvatarIds: ['male'],
  };
  await assert.rejects(
    async () => createAsset(badSlotGarment),
    /invalid slot/
  );
  console.log('✔ PASS: Non-canonical garment slot rejected.');

  // 12. Repository-Backed Persistence & Deep-Clone Protection Test
  console.log('\nTest 12: Repository-Backed Persistence & Deep-Clone Protection');
  const originalAsset = await getAsset('avatar.male.base');
  originalAsset.displayName = 'MUTATED DISPLAY NAME';

  const freshFetch = await getAsset('avatar.male.base');
  assert.notStrictEqual(freshFetch.displayName, 'MUTATED DISPLAY NAME');
  assert.strictEqual(freshFetch.displayName, 'Adult Male Base Avatar');
  console.log('✔ PASS: Deep-clone protection verified on Admin Service read boundary.');

  // 13. Admin Service Persistence Boundary Check
  console.log('\nTest 13: Admin Service Does Not Bypass Repository');
  assert.strictEqual(getAssetRepository(), repo, 'Admin service uses active backing AssetRepository');
  console.log('✔ PASS: Admin service strictly uses AssetRepository persistence boundary.');

  // 14. Existing Seed Behavior Remains Intact
  console.log('\nTest 14: Existing Phase 8 Seed Behavior Intact');
  const freshRepo = new LocalAssetPersistenceAdapter();
  const seededCount = await seedAssetRepository(freshRepo);
  assert.ok(seededCount >= 3);
  console.log('✔ PASS: Phase 8 seed behavior operates intact.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All Phase 9 Platform Admin Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runAssetAdminTests().catch((err) => {
  console.error('\n❌ TEST FAILED with error:', err);
  process.exit(1);
});
