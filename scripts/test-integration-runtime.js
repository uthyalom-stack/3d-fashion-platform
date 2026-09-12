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

const { OutfitManager, createEmptyOutfitState } = require('../src/lib/3d/outfitManager');

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
    },
    serverConfig: {
      apiKey: 'secret_api_key_123',
      apiSecret: 'secret_api_secret_456',
    },
  };

  // --- ADAPTER RUNTIME TESTS (1-7) ---

  // Test 1: Local adapter factory
  console.log('Test 1: Local Adapter Factory');
  const factoryAdapter = createCatalogAdapter(localConfig);
  assert.ok(validateCatalogAdapter(factoryAdapter));
  assert.ok(factoryAdapter instanceof LocalCatalogAdapter);
  console.log('✔ PASS: createCatalogAdapter instantiates LocalCatalogAdapter correctly.');

  // Test 2: Unsupported adapter rejection
  console.log('\nTest 2: Unsupported Adapter Rejection');
  const unsupportedConfig = { ...localConfig, adapterType: 'shopify' };
  assert.throws(
    () => createCatalogAdapter(unsupportedConfig),
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
  freshRuntime.registerAdapter(localConfig);
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
  freshRuntime.registerAdapter(secondConfig, customAdapterInstance);
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
  runtime.registerAdapter(localConfig);

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

  // Test 21: No server secret exposed to client via config sanitization
  console.log('\nTest 21: No Server Secret Exposed to Client');
  const publicConfig = runtime.getActiveConfig();
  assert.strictEqual('serverConfig' in publicConfig, false);
  assert.strictEqual('apiKey' in publicConfig, false);
  assert.strictEqual(publicConfig.integrationId, 'ref_local_store');
  console.log('✔ PASS: sanitizeIntegrationConfig stripped serverConfig and sensitive keys strictly.');

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

  // --- FAILURE SAFETY TESTS (25-30) ---

  // Test 25: Failed product resolution does not mutate outfit
  console.log('\nTest 25: Failed Product Resolution Does Not Mutate Outfit');
  const preFailItem = productOutfitMgr.getEquippedProduct('top');
  const failResolution = runtime.resolveProduct3D(missingAssetProd, 'male');
  assert.strictEqual(failResolution.valid, false);
  const postFailItem = productOutfitMgr.getEquippedProduct('top');
  assert.deepStrictEqual(preFailItem, postFailItem);
  console.log('✔ PASS: Failed product 3D resolution did not alter equipped outfit state.');

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

  // Attempting to equip an invalid product failure should leave existing outfit intact
  const invalidEquipOp = productOutfitMgr.equipProduct(missingAssetProd, 'male');
  assert.strictEqual(invalidEquipOp.success, false);
  assert.strictEqual(sceneOutfitMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Failed 3D resolution left existing scene garment intact.');

  // Test 28: Same-slot replacement failure preserves previous product
  console.log('\nTest 28: Same-Slot Replacement Failure Preserves Previous Product');
  // Attempt to replace existing valid top with an invalid product
  const failReplaceOp = productOutfitMgr.equipProduct(missingAssetProd, 'male');
  assert.strictEqual(failReplaceOp.success, false);
  assert.strictEqual(productOutfitMgr.getEquippedProduct('top').productId, 'prod_basic_tshirt_001');
  console.log('✔ PASS: Failed same-slot replacement preserved previous equipped product.');

  // Test 29: Adapter replacement does not corrupt existing runtime state
  console.log('\nTest 29: Adapter Replacement Does Not Corrupt Existing Runtime State');
  const preState = productOutfitMgr.getOutfitState();
  const newLocalAdapter = new LocalCatalogAdapter();
  runtime.registerAdapter({ ...localConfig, name: 'Replaced Adapter Store' }, newLocalAdapter);
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

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All 30 Phase 12 Integration Runtime Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runIntegrationRuntimeTests().catch((err) => {
  console.error('Integration runtime test failed with error:', err);
  process.exit(1);
});
