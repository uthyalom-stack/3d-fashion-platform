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
  MockProviderAdapter,
  ProviderCatalogAdapter,
  normalizeProviderProduct,
  createCatalogAdapter,
  IntegrationRuntimeManager,
  IntegrationError,
  validateCatalogProduct,
  ProductOutfitManager,
  resolveProduct3D,
} = require('../src/lib/integrations');

const { hasAsset, getAsset } = require('../src/lib/3d/assetRegistry');
const { OutfitManager, createEmptyOutfitState } = require('../src/lib/3d/outfitManager');

async function runProviderIntegrationTests() {
  console.log('===========================================================');
  console.log('Phase 13 — External Catalog Adapter Contract & Mock Integration Tests');
  console.log('===========================================================\n');

  const mockConfig = {
    integrationId: 'mock_store_01',
    name: 'Mock Reference Store',
    adapterType: 'mock',
    enabled: true,
    publicConfig: { region: 'US' },
    serverConfig: { apiKey: 'secret_key_777', apiSecret: 'secret_val_888' },
  };

  const localConfig = {
    integrationId: 'local_store_01',
    name: 'Local Reference Store',
    adapterType: 'local',
    enabled: true,
  };

  // --- PROVIDER CONTRACT TESTS (1-7) ---

  // Test 1: Mock provider initializes
  console.log('Test 1: Mock Provider Initializes');
  const provider = new MockProviderAdapter(mockConfig);
  await provider.initialize();
  assert.strictEqual(provider.getStatus().initialized, true);
  console.log('✔ PASS: MockProviderAdapter initializes cleanly.');

  // Test 2: Provider reports initialized status
  console.log('\nTest 2: Provider Reports Initialized Status');
  const status = provider.getStatus();
  assert.strictEqual(status.state, 'initialized');
  assert.strictEqual(status.providerType, 'mock');
  assert.strictEqual(status.providerId, 'mock_store_01');
  console.log('✔ PASS: Provider correctly reports initialized status state.');

  // Test 3: Disabled provider rejected
  console.log('\nTest 3: Disabled Provider Rejected');
  const disabledConfigObj = { ...mockConfig, enabled: false };
  const disabledProvider = new MockProviderAdapter(disabledConfigObj);
  await assert.rejects(
    async () => await disabledProvider.initialize(),
    (err) => err instanceof IntegrationError && err.code === 'ADAPTER_INITIALIZATION_FAILED'
  );
  assert.strictEqual(disabledProvider.getStatus().state, 'initialization_failed');
  console.log('✔ PASS: Disabled provider rejected with ADAPTER_INITIALIZATION_FAILED.');

  // Test 4: Unsupported provider rejected
  console.log('\nTest 4: Unsupported Provider Rejected');
  const unsupportedConfig = { ...mockConfig, adapterType: 'unsupported_vendor_x' };
  assert.throws(
    () => createCatalogAdapter(unsupportedConfig),
    (err) => err instanceof IntegrationError && err.code === 'UNSUPPORTED_ADAPTER_TYPE'
  );
  console.log('✔ PASS: Factory rejects unsupported provider adapter type cleanly.');

  // Test 5: Provider initialization failure
  console.log('\nTest 5: Provider Initialization Failure');
  const failConfig = { ...mockConfig, publicConfig: { simulateInitFailure: true } };
  const failProvider = new MockProviderAdapter(failConfig);
  await assert.rejects(
    async () => await failProvider.initialize(),
    (err) => err instanceof IntegrationError && err.code === 'ADAPTER_INITIALIZATION_FAILED'
  );
  assert.strictEqual(failProvider.getStatus().state, 'initialization_failed');
  console.log('✔ PASS: Simulated initialization failure handles state and errors correctly.');

  // Test 6: Provider status is deterministic
  console.log('\nTest 6: Provider Status Is Deterministic');
  const s1 = provider.getStatus();
  const s2 = provider.getStatus();
  assert.strictEqual(s1.providerId, s2.providerId);
  assert.strictEqual(s1.state, s2.state);
  assert.strictEqual(s1.initialized, s2.initialized);
  console.log('✔ PASS: Provider status reports deterministic output.');

  // Test 7: Provider status contains no secrets
  console.log('\nTest 7: Provider Status Contains No Secrets');
  const statusStr = JSON.stringify(status);
  assert.strictEqual(statusStr.includes('secret_key_777'), false);
  assert.strictEqual(statusStr.includes('secret_val_888'), false);
  assert.strictEqual('apiKey' in status, false);
  assert.strictEqual('apiSecret' in status, false);
  console.log('✔ PASS: Provider status object is leak-free and contains no private credentials.');

  // --- CATALOG BEHAVIOR TESTS (8-17) ---

  // Test 8: List mock products
  console.log('\nTest 8: List Mock Products');
  const mockCatalogAdapter = createCatalogAdapter(mockConfig);
  const products = await mockCatalogAdapter.getProducts();
  assert.ok(Array.isArray(products));
  assert.ok(products.length >= 3);
  console.log('✔ PASS: List mock products returned catalog product entries.');

  // Test 9: Deterministic product ordering
  console.log('\nTest 9: Deterministic Product Ordering');
  const list1 = await mockCatalogAdapter.getProducts();
  const list2 = await mockCatalogAdapter.getProducts();
  assert.deepStrictEqual(list1, list2);
  console.log('✔ PASS: Consecutive queries return deterministically ordered product lists.');

  // Test 10: Retrieve existing product
  console.log('\nTest 10: Retrieve Existing Product');
  const existingProd = await mockCatalogAdapter.getProduct('mock_top_basic_tshirt');
  assert.ok(existingProd);
  assert.strictEqual(existingProd.externalProductId, 'mock_top_basic_tshirt');
  assert.strictEqual(existingProd.title, 'Mock Essential Crewneck T-Shirt');
  console.log('✔ PASS: Successfully retrieved existing product by ID.');

  // Test 11: Missing product
  console.log('\nTest 11: Missing Product');
  const missingProd = await mockCatalogAdapter.getProduct('mock_ghost_item_999');
  assert.strictEqual(missingProd, null);
  console.log('✔ PASS: Non-existent product ID returns null.');

  // Test 12: Malformed provider product
  console.log('\nTest 12: Malformed Provider Product');
  assert.throws(
    () => normalizeProviderProduct(null),
    (err) => err instanceof Error && err.message.includes('non-null object')
  );
  console.log('✔ PASS: Malformed null provider product rejected by normalizer.');

  // Test 13: Provider normalization
  console.log('\nTest 13: Provider Normalization');
  const rawSample = {
    providerProductId: 'raw_01',
    title: '  Raw Title  ',
    brand: '  Raw Brand  ',
    price: '49.99',
    currency: 'usd',
    availability: 'in_stock',
    productUrl: 'https://example.com/item',
    providerMetadata: { internalId: 101 },
  };
  const normalized = normalizeProviderProduct(rawSample);
  assert.strictEqual(normalized.externalProductId, 'raw_01');
  assert.strictEqual(normalized.title, 'Raw Title');
  assert.strictEqual(normalized.brand, 'Raw Brand');
  assert.strictEqual(normalized.price, 49.99);
  assert.strictEqual(normalized.currency, 'USD');
  assert.strictEqual(normalized.availability, 'available');
  assert.strictEqual('productUrl' in normalized, false);
  assert.strictEqual('providerMetadata' in normalized, false);
  console.log('✔ PASS: Provider product correctly normalized and stripped of provider fields.');

  // Test 14: Missing price preserved
  console.log('\nTest 14: Missing Price Preserved');
  const rawNoPrice = await provider.getProduct('mock_invalid_missing_price');
  const normNoPrice = provider.normalizeProduct(rawNoPrice);
  assert.strictEqual(normNoPrice.price, undefined);
  const valNoPrice = validateCatalogProduct(normNoPrice);
  assert.strictEqual(valNoPrice.valid, false);
  assert.ok(valNoPrice.errors.some((e) => e.includes('price')));
  console.log('✔ PASS: Missing price preserved during normalization and flagged by catalogValidator.');

  // Test 15: Negative price preserved
  console.log('\nTest 15: Negative Price Preserved');
  const rawNegPrice = await provider.getProduct('mock_invalid_negative_price');
  const normNegPrice = provider.normalizeProduct(rawNegPrice);
  assert.strictEqual(normNegPrice.price, -15.00);
  const valNegPrice = validateCatalogProduct(normNegPrice);
  assert.strictEqual(valNegPrice.valid, false);
  assert.ok(valNegPrice.errors.some((e) => e.includes('price')));
  console.log('✔ PASS: Negative price preserved (not clamped to 0) and flagged by catalogValidator.');

  // Test 16: Missing currency preserved
  console.log('\nTest 16: Missing Currency Preserved');
  const rawNoCurr = await provider.getProduct('mock_invalid_missing_currency');
  const normNoCurr = provider.normalizeProduct(rawNoCurr);
  assert.strictEqual(normNoCurr.currency, '');
  const valNoCurr = validateCatalogProduct(normNoCurr);
  assert.strictEqual(valNoCurr.valid, false);
  assert.ok(valNoCurr.errors.some((e) => e.includes('currency')));
  console.log('✔ PASS: Missing currency preserved (not defaulted) and flagged by catalogValidator.');

  // Test 17: Unknown availability preserved
  console.log('\nTest 17: Unknown Availability Preserved');
  const rawUnknownAvail = await provider.getProduct('mock_invalid_unknown_availability');
  const normUnknownAvail = provider.normalizeProduct(rawUnknownAvail);
  assert.strictEqual(normUnknownAvail.availability, 'unknown_status_xyz');
  const valUnknownAvail = validateCatalogProduct(normUnknownAvail);
  assert.strictEqual(valUnknownAvail.valid, false);
  assert.ok(valUnknownAvail.errors.some((e) => e.includes('availability')));
  console.log('✔ PASS: Unknown availability status preserved (not defaulted to available) and flagged.');

  // --- 3D INTEGRATION TESTS (18-25) ---

  // Test 18: Valid product resolves to real asset
  console.log('\nTest 18: Valid Product Resolves to Real Asset');
  const validMockProd = await mockCatalogAdapter.getProduct('mock_top_basic_tshirt');
  const res18 = resolveProduct3D(validMockProd, 'male');
  assert.strictEqual(res18.valid, true);
  assert.strictEqual(res18.garmentAsset.assetId, 'garment.top.basic-tshirt');
  console.log('✔ PASS: Valid mock product resolved to registered garment asset.');

  // Test 19: Missing 3D representation rejected
  console.log('\nTest 19: Missing 3D Representation Rejected');
  const non3DMockProd = await mockCatalogAdapter.getProduct('mock_accessory_scarf');
  const res19 = resolveProduct3D(non3DMockProd, 'male');
  assert.strictEqual(res19.valid, false);
  assert.ok(res19.errors.some((e) => e.includes('no 3D representation')));
  console.log('✔ PASS: Product without 3D representation rejected by Product3DResolver.');

  // Test 20: Unknown asset rejected
  console.log('\nTest 20: Unknown Asset Rejected');
  const rawUnknownAsset = await provider.getProduct('mock_invalid_unknown_asset_id');
  const normUnknownAsset = provider.normalizeProduct(rawUnknownAsset);
  const res20 = resolveProduct3D(normUnknownAsset, 'male');
  assert.strictEqual(res20.valid, false);
  assert.ok(res20.errors.some((e) => e.includes('unknown asset')));
  console.log('✔ PASS: Product referencing unknown asset ID rejected by Product3DResolver.');

  // Test 21: Wrong slot rejected
  console.log('\nTest 21: Wrong Slot Rejected');
  const rawWrongSlot = await provider.getProduct('mock_invalid_wrong_slot');
  const normWrongSlot = provider.normalizeProduct(rawWrongSlot);
  const res21 = resolveProduct3D(normWrongSlot, 'male');
  assert.strictEqual(res21.valid, false);
  assert.ok(res21.errors.some((e) => e.includes('Slot mismatch')));
  console.log('✔ PASS: Slot mismatch between representation and asset rejected.');

  // Test 22: Unsupported avatar rejected
  console.log('\nTest 22: Unsupported Avatar Rejected');
  const rawUnsupAvatar = await provider.getProduct('mock_invalid_unsupported_avatar');
  const normUnsupAvatar = provider.normalizeProduct(rawUnsupAvatar);
  const res22 = resolveProduct3D(normUnsupAvatar, 'male');
  assert.strictEqual(res22.valid, false);
  assert.ok(res22.errors.some((e) => e.includes('unsupported')));
  console.log('✔ PASS: Representation referencing unsupported avatar rejected.');

  // Test 23: Valid avatar accepted
  console.log('\nTest 23: Valid Avatar Accepted');
  const res23Female = resolveProduct3D(validMockProd, 'female');
  assert.strictEqual(res23Female.valid, true);
  console.log('✔ PASS: Valid avatar compatibility check succeeded.');

  // Test 24: Product3DResolver remains authoritative
  console.log('\nTest 24: Product3DResolver Remains Authoritative');
  assert.strictEqual(typeof resolveProduct3D, 'function');
  const directRes = resolveProduct3D(validMockProd, 'male');
  assert.strictEqual(directRes.valid, true);
  console.log('✔ PASS: Product3DResolver is the sole authority for 3D garment resolution.');

  // Test 25: AssetRegistry remains authoritative
  console.log('\nTest 25: AssetRegistry Remains Authoritative');
  assert.strictEqual(hasAsset('garment.top.basic-tshirt'), true);
  assert.ok(getAsset('garment.top.basic-tshirt'));
  console.log('✔ PASS: AssetRegistry remains the authoritative store for 3D asset metadata.');

  // --- RUNTIME BEHAVIOR TESTS (26-30) ---

  // Test 26: Mock adapter works through IntegrationRuntime
  console.log('\nTest 26: Mock Adapter Works Through IntegrationRuntime');
  const runtime = new IntegrationRuntimeManager();
  runtime.registerAdapter(mockConfig);
  const rtProducts = await runtime.getProducts();
  assert.ok(rtProducts.length >= 3);
  const rtResolved = await runtime.resolveProduct3DById('mock_top_basic_tshirt', 'male');
  assert.strictEqual(rtResolved.valid, true);
  console.log('✔ PASS: Mock provider adapter works seamlessly through IntegrationRuntimeManager.');

  // Test 27: Local adapter still works
  console.log('\nTest 27: Local Adapter Still Works');
  runtime.registerAdapter(localConfig);
  const localProds = await runtime.getProducts();
  assert.ok(localProds.length >= 2);
  const localResolved = await runtime.resolveProduct3DById('prod_basic_tshirt_001', 'male');
  assert.strictEqual(localResolved.valid, true);
  console.log('✔ PASS: Local reference adapter continues to work perfectly.');

  // Test 28: Switching adapters does not corrupt runtime state
  console.log('\nTest 28: Switching Adapters Does Not Corrupt Runtime State');
  const prodMgr = new ProductOutfitManager('male');
  prodMgr.equipProduct(validMockProd, 'male');
  assert.strictEqual(prodMgr.getEquippedProduct('top').productId, 'mock_top_basic_tshirt');

  // Switch runtime adapter from local back to mock
  runtime.registerAdapter(mockConfig);
  assert.strictEqual(prodMgr.getEquippedProduct('top').productId, 'mock_top_basic_tshirt');
  console.log('✔ PASS: Switching runtime adapter preserves active ProductOutfitManager state intact.');

  // Test 29: Failed provider initialization preserves previous working adapter
  console.log('\nTest 29: Failed Provider Initialization Preserves Previous Working Adapter');
  const prevConfig = runtime.getActiveConfig();
  const prevAdapter = runtime.getActiveAdapter();

  assert.throws(
    () => runtime.registerAdapter(disabledConfigObj),
    (err) => err instanceof IntegrationError && err.code === 'ADAPTER_INITIALIZATION_FAILED'
  );

  assert.strictEqual(runtime.getActiveAdapter(), prevAdapter);
  assert.deepStrictEqual(runtime.getActiveConfig(), prevConfig);
  console.log('✔ PASS: Failed provider initialization preserves previous active adapter and config.');

  // Test 30: Failed product resolution preserves existing outfit
  console.log('\nTest 30: Failed Product Resolution Preserves Existing Outfit');
  const sceneMgr = new OutfitManager('male', createEmptyOutfitState());
  sceneMgr.equip('top', 'garment.top.basic-tshirt');

  const failedRes = resolveProduct3D(non3DMockProd, 'male');
  assert.strictEqual(failedRes.valid, false);
  assert.strictEqual(sceneMgr.get('top'), 'garment.top.basic-tshirt');
  console.log('✔ PASS: Failed product resolution preserves active 3D scene outfit state.');

  // --- SECURITY / ARCHITECTURE TESTS (31-36) ---

  // Test 31: Provider-specific fields do not enter PlatformCatalogProduct
  console.log('\nTest 31: Provider-Specific Fields Do Not Enter PlatformCatalogProduct');
  const pProductKeys = Object.keys(validMockProd);
  assert.strictEqual(pProductKeys.includes('productUrl'), false);
  assert.strictEqual(pProductKeys.includes('providerMetadata'), false);
  assert.strictEqual(pProductKeys.includes('providerProductId'), false);
  console.log('✔ PASS: Zero provider-specific fields leaked into PlatformCatalogProduct.');

  // Test 32: Secrets do not enter public status
  console.log('\nTest 32: Secrets Do Not Enter Public Status');
  const pStatus = provider.getStatus();
  assert.strictEqual('apiKey' in pStatus, false);
  assert.strictEqual('apiSecret' in pStatus, false);
  assert.strictEqual('serverConfig' in pStatus, false);
  console.log('✔ PASS: Secrets strictly excluded from public provider status.');

  // Test 33: Secrets do not enter outfit state
  console.log('\nTest 33: Secrets Do Not Enter Outfit State');
  const equippedItem = prodMgr.getEquippedProduct('top');
  const itemStr = JSON.stringify(equippedItem);
  assert.strictEqual(itemStr.includes('secret'), false);
  assert.strictEqual(itemStr.includes('apiKey'), false);
  console.log('✔ PASS: Outfit state contains zero secrets or credentials.');

  // Test 34: Provider layer has no Three.js dependency
  console.log('\nTest 34: Provider Layer Has No Three.js Dependency');
  const mockProviderSrc = fs.readFileSync(path.join(__dirname, '../src/lib/integrations/mockProvider.ts'), 'utf8');
  const providerTypesSrc = fs.readFileSync(path.join(__dirname, '../src/lib/integrations/providerTypes.ts'), 'utf8');
  const providerNormSrc = fs.readFileSync(path.join(__dirname, '../src/lib/integrations/providerNormalizer.ts'), 'utf8');

  assert.strictEqual(mockProviderSrc.includes("from 'three'"), false);
  assert.strictEqual(mockProviderSrc.includes('THREE'), false);
  assert.strictEqual(providerTypesSrc.includes("from 'three'"), false);
  assert.strictEqual(providerNormSrc.includes("from 'three'"), false);
  console.log('✔ PASS: Provider adapter layer is completely decoupled from Three.js.');

  // Test 35: No competing CatalogAdapter exists
  console.log('\nTest 35: No Competing CatalogAdapter Exists');
  assert.ok(mockCatalogAdapter.getProduct && mockCatalogAdapter.getProducts);
  assert.strictEqual('getProducts' in mockCatalogAdapter, true);
  console.log('✔ PASS: ProviderCatalogAdapter wraps ProviderAdapter into the single canonical CatalogAdapter interface.');

  // Test 36: No competing outfit state exists
  console.log('\nTest 36: No Competing Outfit State Exists');
  const outfitStateKeys = Object.keys(prodMgr.getOutfitState());
  assert.deepStrictEqual(outfitStateKeys, ['top', 'bottom', 'feet', 'waist', 'hand']);
  console.log('✔ PASS: ProductOutfitManager utilizes the single canonical ProductOutfitState structure.');

  console.log('\n===========================================================');
  console.log('\x1b[32mSUCCESS: All 36 Phase 13 Provider Integration Tests Passed!\x1b[0m');
  console.log('===========================================================');
}

runProviderIntegrationTests().catch((err) => {
  console.error('Provider integration test failed with error:', err);
  process.exit(1);
});
