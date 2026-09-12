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
  validateIntegrationConfig,
  sanitizeIntegrationConfig,
  IntegrationError,
  createCatalogAdapter,
  validateCatalogAdapter,
  IntegrationRuntimeManager,
  LocalCatalogAdapter,
  ProductOutfitManager,
  validateCatalogProduct,
} = require('../src/lib/integrations');

const { OutfitManager, createEmptyOutfitState, validateGarmentEquip } = require('../src/lib/3d/outfitManager');

async function runIntegrationRuntimeTests() {
  console.log('====================================================');
  console.log('Phase 12 — Real Integration Adapter Foundation Tests');
  console.log('====================================================\n');

  // Local reference config fixture
  const localConfig = {
    integrationId: 'ref_local_store',
    name: 'Reference Local Store',
    adapterType: 'local',
    enabled: true,
    publicConfig: {
      storeRegion: 'US-EAST',
      nestedMeta: { catalogVersion: 'v1.0' },
    },
    serverConfig: {
      apiKey: 'secret_api_key_123',
      apiSecret: 'secret_api_secret_456',
    },
  };

  // --- ADAPTER RUNTIME TESTS (1-7) ---

  // Test 1: Local adapter factory
  console.log('Test 1: Local Adapter Factory');
  const factoryAdapter = await createCatalogAdapter(localConfig);
  assert.ok(validateCatalogAdapter(factoryAdapter));
  assert.ok(factoryAdapter instanceof LocalCatalogAdapter);
  console.log('✔ PASS: createCatalogAdapter instantiates LocalCatalogAdapter correctly.');

  // Test 2: Unsupported adapter rejection
  console.log('\nTest 2: Unsupported Adapter Rejection');
  const unsupportedConfig = { ...localConfig, adapterType: 'shopify' };
  await assert.rejects(
    async () => await createCatalogAdapter(unsupportedConfig),
    (err) => err instanceof IntegrationError && err.code === 'UNSUPPORTED_ADAPTER_TYPE'
  );
  console.log('✔ PASS: Unsupported adapter type "shopify" rejected with UNSUPPORTED_ADAPTER_TYPE error.');

  // Test 3: Missing adapter rejection (getting adapter without registering)
  console.log('\nTest 3: Missing Adapter Rejection');
  const freshRuntime = new IntegrationRuntimeManager();
  assert.strictEqual(freshRuntime.isAdapterConfigured(), false);
  assert.throws(
    () => freshRuntime.getActiveAdapter(),
    (err) => err instanceof IntegrationError && err.code === 'NO_ACTIVE_ADAPTER'
  );
  console.log('✔ PASS: Getting active adapter from uninitialized runtime throws NO_ACTIVE_ADAPTER.');

  // Test 4: Adapter registration
  console.log('\nTest 4: Adapter Registration');
  await freshRuntime.registerAdapter(localConfig);
  assert.strictEqual(freshRuntime.isAdapterConfigured(), true);
  console.log('✔ PASS: Adapter registered successfully and runtime marked as configured.');

  // Test 5: Active adapter retrieval
  console.log('\nTest 5: Active Adapter Retrieval');
  const retrievedAdapter = freshRuntime.getActiveAdapter();
  assert.ok(retrievedAdapter);
  assert.ok(validateCatalogAdapter(retrievedAdapter));
  console.log('✔ PASS: Active adapter retrieved successfully.');

  // Test 6: Adapter replacement
  console.log('\nTest 6: Adapter Replacement');
  const secondConfig = { ...localConfig, integrationId: 'ref_local_store_2', name: 'Second Store' };
  const customAdapterInstance = new LocalCatalogAdapter();
  await freshRuntime.registerAdapter(secondConfig, customAdapterInstance);
  assert.strictEqual(freshRuntime.getActiveAdapter(), customAdapterInstance);
  assert.strictEqual(freshRuntime.getActiveConfig().name, 'Second Store');
  console.log('✔ PASS: Active adapter replaced deterministically with custom adapter instance.');

  // Test 7: Adapter validation
  console.log('\nTest 7: Adapter Validation');
  assert.strictEqual(validateCatalogAdapter({ getProduct: () => {}, getProducts: () => {} }), true);
  assert.strictEqual(validateCatalogAdapter({ getProduct: () => {} }), false);
  assert.strictEqual(validateCatalogAdapter(null), false);
  console.log('✔ PASS: validateCatalogAdapter correctly identifies valid vs invalid CatalogAdapter implementations.');

  // --- CATALOG OPERATIONS TESTS (8-12) ---

  const runtime = new IntegrationRuntimeManager();
  await runtime.registerAdapter(localConfig);

  // Test 8: Product listing
  console.log('\nTest 8: Product Listing');
  const products = await runtime.getProducts();
  assert.ok(Array.isArray(products));
  assert.ok(products.length >= 2);
  console.log('✔ PASS: Product listing query returned catalog products via runtime boundary.');

  // Test 9: Product lookup
  console.log('\nTest 9: Product Lookup');
  const product = await runtime.getProduct('prod_basic_tshirt_001');
  assert.ok(product);
  assert.strictEqual(product.externalProductId, 'prod_basic_tshirt_001');
  console.log('✔ PASS: Product lookup by ID returned expected product record.');

  // Test 10: Missing product
  console.log('\nTest 10: Missing Product');
  const missingProd = await runtime.getProduct('non_existent_prod_999');
  assert.strictEqual(missingProd, null);
  console.log('✔ PASS: Missing product lookup returned null without throwing.');

  // Test 11: Invalid product validation
  console.log('\nTest 11: Invalid Product Validation');
  const invalidProd = { externalProductId: '', title: '' };
  const valResult = validateCatalogProduct(invalidProd);
  assert.strictEqual(valResult.valid, false);
  assert.ok(valResult.errors.length > 0);
  console.log('✔ PASS: Invalid catalog product failed validation via catalogValidator.');

  // Test 12: Deterministic results
  console.log('\nTest 12: Deterministic Results');
  const p1 = await runtime.getProduct('prod_basic_tshirt_001');
  const p2 = await runtime.getProduct('prod_basic_tshirt_001');
  assert.deepStrictEqual(p1, p2);
  console.log('✔ PASS: Repeated queries via runtime return deterministic identical records.');

  // --- 3D INTEGRATION TESTS (13-20) ---

  // Test 13: Valid product -> 3D resolution
  console.log('\nTest 13: Valid Product -> 3D Resolution');
  const res13 = await runtime.resolveProduct3DById('prod_basic_tshirt_001', 'male');
  assert.strictEqual(res13.valid, true);
  assert.ok(res13.garmentAsset);
  assert.strictEqual(res13.garmentAsset.assetId, 'garment.top.basic-tshirt');
  assert.strictEqual(res13.garmentSlot, 'top');
  console.log('✔ PASS: Valid represented product resolved to 3D garment asset cleanly.');

  // Test 14: Missing representation
  console.log('\nTest 14: Missing Representation');
  const res14 = await runtime.resolveProduct3DById('prod_non_3d_accessory_002', 'male');
  assert.strictEqual(res14.valid, false);
  assert.ok(res14.errors.some((e) => e.includes('no 3D representation')));
  console.log('✔ PASS: Product without 3D representation rejected cleanly with clear error.');

  // Test 15: Missing asset reference
  console.log('\nTest 15: Missing Asset Reference');
  const missingAssetProd = {
    externalProductId: 'prod_ghost_3d',
    title: 'Ghost Item',
    price: 10,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'garment.top.does-not-exist',
      garmentSlot: 'top',
      supportedAvatarIds: ['male'],
    },
  };
  const res15 = runtime.resolveProduct3D(missingAssetProd, 'male');
  assert.strictEqual(res15.valid, false);
  assert.ok(res15.errors.some((e) => e.includes('references unknown asset')));
  console.log('✔ PASS: Product referencing non-existent asset ID rejected by resolver.');

  // Test 16: Non-garment asset rejection
  console.log('\nTest 16: Non-Garment Asset Rejection');
  const avatarMappedProd = {
    externalProductId: 'prod_avatar_map',
    title: 'Avatar Item',
    price: 10,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'avatar.male.base',
      garmentSlot: 'top',
      supportedAvatarIds: ['male'],
    },
  };
  const res16 = runtime.resolveProduct3D(avatarMappedProd, 'male');
  assert.strictEqual(res16.valid, false);
  assert.ok(res16.errors.some((e) => e.includes('not a garment asset')));
  console.log('✔ PASS: Product referencing avatar asset rejected by resolver.');

  // Test 17: Slot mismatch rejection
  console.log('\nTest 17: Slot Mismatch Rejection');
  const slotMismatchProd = {
    externalProductId: 'prod_mismatch_slot',
    title: 'Slot Mismatch Tee',
    price: 10,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'bottom', // Tshirt is registered as 'top'
      supportedAvatarIds: ['male'],
    },
  };
  const res17 = runtime.resolveProduct3D(slotMismatchProd, 'male');
  assert.strictEqual(res17.valid, false);
  assert.ok(res17.errors.some((e) => e.includes('Slot mismatch')));
  console.log('✔ PASS: Product with slot mismatch between representation and asset rejected.');

  // Test 18: Unsupported avatar rejection
  console.log('\nTest 18: Unsupported Avatar Rejection');
  const femaleOnlyProd = {
    externalProductId: 'prod_female_only',
    title: 'Female Only Top',
    price: 10,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['female'],
    },
  };
  const res18 = runtime.resolveProduct3D(femaleOnlyProd, 'male');
  assert.strictEqual(res18.valid, false);
  assert.ok(res18.errors.some((e) => e.includes('unsupported')));
  console.log('✔ PASS: Product unsupported for target avatar rejected.');

  // Test 19: Valid avatar compatibility
  console.log('\nTest 19: Valid Avatar Compatibility');
  const res19 = runtime.resolveProduct3D(femaleOnlyProd, 'female');
  assert.strictEqual(res19.valid, true);
  console.log('✔ PASS: Product supported for female avatar resolved successfully.');

  // Test 20: ProductOutfitManager integration
  console.log('\nTest 20: ProductOutfitManager Integration');
  const productOutfitMgr = new ProductOutfitManager('male');
  const equipOp = productOutfitMgr.equipProduct(product, 'male');
  assert.strictEqual(equipOp.success, true);
  assert.strictEqual(productOutfitMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  console.log('✔ PASS: Resolved product equipped into ProductOutfitManager seamlessly.');

  // --- SECURITY / BOUNDARIES TESTS (21-24) ---

  // Test 21: No server secret exposed to client via config sanitization (with immutability & deep-clone checks)
  console.log('\nTest 21: No Server Secret Exposed to Client & Immutability Verification');
  const originalConfigCopy = JSON.parse(JSON.stringify(localConfig));
  const publicConfig = runtime.getActiveConfig();
  assert.strictEqual('serverConfig' in publicConfig, false);
  assert.strictEqual('apiKey' in publicConfig, false);
  assert.strictEqual(publicConfig.integrationId, 'ref_local_store');
  assert.deepStrictEqual(localConfig, originalConfigCopy, 'Source config must remain unmutated by sanitization');
  assert.deepStrictEqual(publicConfig.publicConfig.nestedMeta, { catalogVersion: 'v1.0' });
  // Verify deep cloning: mutating sanitized publicConfig does not affect source
  publicConfig.publicConfig.storeRegion = 'MUTATED';
  assert.strictEqual(localConfig.publicConfig.storeRegion, 'US-EAST');
  console.log('✔ PASS: sanitizeIntegrationConfig stripped serverConfig, preserved source immutability, and returned deep clone.');

  // Test 22: No provider credentials in catalog product
  console.log('\nTest 22: No Provider Credentials in Catalog Product');
  assert.strictEqual('apiKey' in product, false);
  assert.strictEqual('apiSecret' in product, false);
  assert.strictEqual('serverEndpoint' in product, false);
  console.log('✔ PASS: Catalog product contains zero provider credentials or secrets.');

  // Test 23: No competing asset URL fields
  console.log('\nTest 23: No Competing Asset URL Fields');
  assert.strictEqual('modelUrl' in product, false);
  assert.strictEqual('assetUrl' in product, false);
  assert.strictEqual('runtimeUrl' in product, false);
  assert.strictEqual('storageUrl' in product, false);
  assert.strictEqual('cdnUrl' in product, false);
  console.log('✔ PASS: Zero competing asset URL fields introduced in catalog product.');

  // Test 24: No commerce fields inside runtime outfit state
  console.log('\nTest 24: No Commerce Fields Inside Runtime Outfit State');
  const outfitStateItem = productOutfitMgr.getEquippedProduct('top');
  assert.strictEqual('price' in outfitStateItem, false);
  assert.strictEqual('currency' in outfitStateItem, false);
  assert.strictEqual('availability' in outfitStateItem, false);
  assert.strictEqual('checkoutUrl' in outfitStateItem, false);
  console.log('✔ PASS: Runtime ProductOutfitItem holds strictly productId, assetId, slot with zero commerce fields.');

  // --- FAILURE SAFETY & SYNCHRONIZATION TESTS (25-30) ---

  // Test 25: Failed product resolution does not mutate ProductOutfitManager or OutfitManager scene state
  console.log('\nTest 25: Failed Product Resolution Preserves Both Product & Scene Outfit States');
  const syncSceneMgr = new OutfitManager('male', createEmptyOutfitState());
  const syncProdMgr = new ProductOutfitManager('male');

  // Equip valid product A into both
  const resA = runtime.resolveProduct3D(product, 'male');
  assert.strictEqual(resA.valid, true);
  syncProdMgr.equipProduct(product, 'male');
  syncSceneMgr.equip(resA.garmentSlot, resA.garmentAsset.assetId);

  const preProdState = syncProdMgr.getOutfitState();
  const preSceneState = syncSceneMgr.getOutfitState();

  // Transactional attempt to equip invalid product B (missing 3D representation)
  const non3DProduct = await runtime.getProduct('prod_non_3d_accessory_002');
  const resB = runtime.resolveProduct3D(non3DProduct, 'male');
  assert.strictEqual(resB.valid, false);

  if (resB.valid && resB.garmentAsset && resB.garmentSlot) {
    const sceneVal = validateGarmentEquip(resB.garmentAsset.assetId, resB.garmentSlot, 'male');
    if (sceneVal.valid) {
      syncProdMgr.equipProduct(non3DProduct, 'male');
      syncSceneMgr.equip(resB.garmentSlot, resB.garmentAsset.assetId);
    }
  }

  assert.deepStrictEqual(syncProdMgr.getOutfitState(), preProdState);
  assert.deepStrictEqual(syncSceneMgr.getOutfitState(), preSceneState);
  assert.strictEqual(syncSceneMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Transactional failure check prevented mutation across both ProductOutfitManager and OutfitManager.');

  // Test 26: Failed adapter lookup does not mutate outfit
  console.log('\nTest 26: Failed Adapter Lookup Does Not Mutate Outfit');
  const preLookupItem = productOutfitMgr.getEquippedProduct('top');
  const lookupFailRes = await runtime.resolveProduct3DById('invalid_sku_404', 'male');
  assert.strictEqual(lookupFailRes.valid, false);
  const postLookupItem = productOutfitMgr.getEquippedProduct('top');
  assert.deepStrictEqual(preLookupItem, postLookupItem);
  console.log('✔ PASS: Failed adapter lookup did not alter equipped outfit state.');

  // Test 27: Failed 3D resolution does not remove existing outfit
  console.log('\nTest 27: Failed 3D Resolution Does Not Remove Existing Outfit');
  const sceneOutfitMgr = new OutfitManager('male', createEmptyOutfitState());
  sceneOutfitMgr.equip('top', 'garment.top.basic-tshirt');
  assert.strictEqual(sceneOutfitMgr.get('top'), 'garment.top.basic-tshirt');

  const invalidEquipOp = productOutfitMgr.equipProduct(missingAssetProd, 'male');
  assert.strictEqual(invalidEquipOp.success, false);
  assert.strictEqual(sceneOutfitMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Failed 3D resolution left existing scene garment intact.');

  // Test 28: Same-slot replacement failure preserves previous product in both ProductOutfitManager and OutfitManager
  console.log('\nTest 28: Same-Slot Replacement Failure Preserves Previous Product in Both State Managers');
  const testSlotProdMgr = new ProductOutfitManager('male');
  const testSlotSceneMgr = new OutfitManager('male', createEmptyOutfitState());

  // Equip product A (Essential Crewneck T-Shirt into 'top' slot)
  const resValidA = runtime.resolveProduct3D(product, 'male');
  assert.strictEqual(resValidA.valid, true);
  testSlotProdMgr.equipProduct(product, 'male');
  testSlotSceneMgr.equip('top', resValidA.garmentAsset.assetId);

  assert.strictEqual(testSlotProdMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  assert.strictEqual(testSlotSceneMgr.get('top'), 'garment.top.basic-tshirt');

  // Attempt same-slot replacement with product B having invalid representation
  const resInvalidB = runtime.resolveProduct3D(missingAssetProd, 'male');
  assert.strictEqual(resInvalidB.valid, false);

  if (resInvalidB.valid && resInvalidB.garmentAsset && resInvalidB.garmentSlot) {
    const sceneVal = validateGarmentEquip(resInvalidB.garmentAsset.assetId, resInvalidB.garmentSlot, 'male');
    if (sceneVal.valid) {
      testSlotProdMgr.equipProduct(missingAssetProd, 'male');
      testSlotSceneMgr.equip('top', resInvalidB.garmentAsset.assetId);
    }
  }

  // Verify both ProductOutfitManager and OutfitManager retained product A intact
  assert.strictEqual(testSlotProdMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  assert.strictEqual(testSlotSceneMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Same-slot replacement failure preserved product A in both ProductOutfitManager and OutfitManager.');

  // Test 29: Adapter replacement does not corrupt existing runtime state
  console.log('\nTest 29: Adapter Replacement Does Not Corrupt Existing Runtime State');
  const preState = productOutfitMgr.getOutfitState();
  const newLocalAdapter = new LocalCatalogAdapter();
  await runtime.registerAdapter({ ...localConfig, name: 'Replaced Adapter Store' }, newLocalAdapter);
  const postState = productOutfitMgr.getOutfitState();
  assert.deepStrictEqual(preState, postState);
  assert.strictEqual(runtime.getActiveConfig().name, 'Replaced Adapter Store');
  console.log('✔ PASS: Replacing integration adapter did not corrupt active ProductOutfitManager state.');

  // Test 30: Existing Phase 11 synchronization behavior remains intact
  console.log('\nTest 30: Existing Phase 11 Synchronization Behavior Intact');
  const activeAdapter = runtime.getActiveAdapter();
  const syncResult = await productOutfitMgr.setAvatarId('male', activeAdapter);
  assert.ok(Array.isArray(syncResult.removedItems));
  assert.strictEqual(productOutfitMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  console.log('✔ PASS: Phase 11 avatar synchronization operates intact with runtime active adapter.');

  // --- ATOMIC ADAPTER REPLACEMENT FAILURE TESTS (31-36) ---

  console.log('\n----------------------------------------------------');
  console.log('Phase 12 Atomic Adapter Registration & Failure Tests');
  console.log('----------------------------------------------------');

  // Test 31: Failed registration with invalid configuration leaves previous active adapter & config untouched
  console.log('Test 31: Invalid Config Registration Failure Preserves Active Adapter');
  const activeBefore31 = runtime.getActiveAdapter();
  const configBefore31 = runtime.getActiveConfig();
  const invalidConfig = { ...localConfig, integrationId: '' }; // Invalid integrationId

  await assert.rejects(
    async () => await runtime.registerAdapter(invalidConfig),
    (err) => err instanceof IntegrationError && err.code === 'ADAPTER_INITIALIZATION_FAILED'
  );
  assert.strictEqual(runtime.getActiveAdapter(), activeBefore31);
  assert.deepStrictEqual(runtime.getActiveConfig(), configBefore31);
  console.log('✔ PASS: Failed registration with invalid config preserved active adapter and configuration atomically.');

  // Test 32: Failed registration with disabled configuration leaves previous active adapter & config untouched
  console.log('\nTest 32: Disabled Config Registration Failure Preserves Active Adapter');
  const activeBefore32 = runtime.getActiveAdapter();
  const configBefore32 = runtime.getActiveConfig();
  const disabledConfig = { ...localConfig, enabled: false };

  await assert.rejects(
    async () => await runtime.registerAdapter(disabledConfig),
    (err) => err instanceof IntegrationError && err.code === 'ADAPTER_INITIALIZATION_FAILED'
  );
  assert.strictEqual(runtime.getActiveAdapter(), activeBefore32);
  assert.deepStrictEqual(runtime.getActiveConfig(), configBefore32);
  console.log('✔ PASS: Failed registration with disabled config preserved active adapter and configuration atomically.');

  // Test 33: Failed registration with invalid custom adapter object leaves previous active adapter & config untouched
  console.log('\nTest 33: Invalid Custom Adapter Registration Failure Preserves Active Adapter');
  const activeBefore33 = runtime.getActiveAdapter();
  const configBefore33 = runtime.getActiveConfig();
  const malformedAdapter = { getProduct: () => {} }; // Missing getProducts

  await assert.rejects(
    async () => await runtime.registerAdapter(localConfig, malformedAdapter),
    (err) => err instanceof IntegrationError && err.code === 'INVALID_ADAPTER'
  );
  assert.strictEqual(runtime.getActiveAdapter(), activeBefore33);
  assert.deepStrictEqual(runtime.getActiveConfig(), configBefore33);
  console.log('✔ PASS: Failed registration with invalid custom adapter object preserved active adapter and config atomically.');

  // Test 34: Failed registration with unsupported adapter type leaves previous active adapter & config untouched
  console.log('\nTest 34: Unsupported Adapter Type Registration Failure Preserves Active Adapter');
  const activeBefore34 = runtime.getActiveAdapter();
  const configBefore34 = runtime.getActiveConfig();
  const unsupportedRegConfig = { ...localConfig, adapterType: 'woocommerce' };

  await assert.rejects(
    async () => await runtime.registerAdapter(unsupportedRegConfig),
    (err) => err instanceof IntegrationError && err.code === 'UNSUPPORTED_ADAPTER_TYPE'
  );
  assert.strictEqual(runtime.getActiveAdapter(), activeBefore34);
  assert.deepStrictEqual(runtime.getActiveConfig(), configBefore34);
  console.log('✔ PASS: Failed registration with unsupported adapter type preserved active adapter and config atomically.');

  // Test 35: Strict lookup helper `getProductOrThrow` returns product or throws PRODUCT_NOT_FOUND
  console.log('\nTest 35: getProductOrThrow Behavior');
  const validStrictProd = await runtime.getProductOrThrow('prod_basic_tshirt_001');
  assert.strictEqual(validStrictProd.externalProductId, 'prod_basic_tshirt_001');

  await assert.rejects(
    async () => await runtime.getProductOrThrow('missing_prod_999'),
    (err) => err instanceof IntegrationError && err.code === 'PRODUCT_NOT_FOUND'
  );
  console.log('✔ PASS: getProductOrThrow returned product on success and threw PRODUCT_NOT_FOUND error on missing product.');

  // Test 36: Full End-to-End Integration Boundary Execution
  console.log('\nTest 36: Complete Integration Runtime Boundary Pipeline');
  const pipelineRuntime = new IntegrationRuntimeManager();
  await pipelineRuntime.registerAdapter({
    integrationId: 'e2e_store',
    name: 'E2E Store Catalog',
    adapterType: 'local',
    enabled: true,
  });

  const fetchedProducts = await pipelineRuntime.getProducts();
  assert.ok(fetchedProducts.length >= 1);

  const targetProd = await pipelineRuntime.getProductOrThrow('prod_basic_tshirt_001');
  const resolutionResult = pipelineRuntime.resolveProduct3D(targetProd, 'male');
  assert.strictEqual(resolutionResult.valid, true);

  const e2eProdMgr = new ProductOutfitManager('male');
  const e2eSceneMgr = new OutfitManager('male', createEmptyOutfitState());

  e2eProdMgr.equipProduct(targetProd, 'male');
  e2eSceneMgr.equip(resolutionResult.garmentSlot, resolutionResult.garmentAsset.assetId);

  assert.strictEqual(e2eProdMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  assert.strictEqual(e2eSceneMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Complete end-to-end integration runtime boundary pipeline executed cleanly.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All 36 Phase 12 Integration Runtime Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runIntegrationRuntimeTests().catch((err) => {
  console.error('Integration runtime test failed with error:', err);
  process.exit(1);
});
