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
  validateCatalogProduct,
} = require('../src/lib/integrations/catalogValidator');

const {
  normalizeCatalogProduct,
} = require('../src/lib/integrations/catalogNormalizer');

const {
  LocalCatalogAdapter,
} = require('../src/lib/integrations/localCatalogAdapter');

const {
  getAsset,
  hasAsset,
  getAssetDeliveryUrl,
} = require('../src/lib/3d/assetRegistry');

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('Phase 10 — Integration Contract & Catalog Handoff Tests');
  console.log('====================================================\n');

  const validBaseProduct = {
    externalProductId: 'ext_prod_100',
    title: 'Classic Cotton Tee',
    brand: 'Studio Brand',
    price: 29.99,
    currency: 'USD',
    availability: 'available',
    representation: {
      assetId: 'garment.top.basic-tshirt',
      garmentSlot: 'top',
      supportedAvatarIds: ['male', 'female'],
    },
  };

  // 1. Valid product contract
  console.log('Test 1: Valid Product Contract');
  const res1 = validateCatalogProduct(validBaseProduct);
  assert.strictEqual(res1.valid, true, `Valid product must pass validation: ${res1.errors.join('; ')}`);
  console.log('✔ PASS: Valid product contract passed validation.');

  // 2. Invalid product ID
  console.log('\nTest 2: Invalid External Product ID');
  const invalidIdProd = { ...validBaseProduct, externalProductId: '' };
  const res2 = validateCatalogProduct(invalidIdProd);
  assert.strictEqual(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('externalProductId must be a non-empty string')));
  console.log('✔ PASS: Empty externalProductId rejected.');

  // 3. Invalid title
  console.log('\nTest 3: Invalid Title');
  const invalidTitleProd = { ...validBaseProduct, title: '   ' };
  const res3 = validateCatalogProduct(invalidTitleProd);
  assert.strictEqual(res3.valid, false);
  assert.ok(res3.errors.some((e) => e.includes('title must be a non-empty string')));
  console.log('✔ PASS: Empty/whitespace title rejected.');

  // 4. Invalid price
  console.log('\nTest 4: Invalid Price');
  const invalidPriceProd = { ...validBaseProduct, price: -10 };
  const res4 = validateCatalogProduct(invalidPriceProd);
  assert.strictEqual(res4.valid, false);
  assert.ok(res4.errors.some((e) => e.includes('price must be a finite number greater than or equal to 0')));
  console.log('✔ PASS: Negative price rejected.');

  // 5. Invalid currency
  console.log('\nTest 5: Invalid Currency');
  const invalidCurrProd = { ...validBaseProduct, currency: '' };
  const res5 = validateCatalogProduct(invalidCurrProd);
  assert.strictEqual(res5.valid, false);
  assert.ok(res5.errors.some((e) => e.includes('currency must be a non-empty string')));
  console.log('✔ PASS: Empty currency string rejected.');

  // 6. Invalid availability
  console.log('\nTest 6: Invalid Availability');
  const invalidAvailProd = { ...validBaseProduct, availability: 'in_stock_now' };
  const res6 = validateCatalogProduct(invalidAvailProd);
  assert.strictEqual(res6.valid, false);
  assert.ok(res6.errors.some((e) => e.includes('availability must be one of')));
  console.log('✔ PASS: Invalid availability status rejected.');

  // 7. Valid 3D representation
  console.log('\nTest 7: Valid 3D Representation');
  const res7 = validateCatalogProduct(validBaseProduct);
  assert.strictEqual(res7.valid, true);
  assert.strictEqual(validBaseProduct.representation.assetId, 'garment.top.basic-tshirt');
  console.log('✔ PASS: Valid 3D representation validated cleanly.');

  // 8. Invalid garment slot
  console.log('\nTest 8: Invalid Garment Slot');
  const invalidSlotProd = {
    ...validBaseProduct,
    representation: { ...validBaseProduct.representation, garmentSlot: 'backpack' },
  };
  const res8 = validateCatalogProduct(invalidSlotProd);
  assert.strictEqual(res8.valid, false);
  assert.ok(res8.errors.some((e) => e.includes('garmentSlot "backpack" is invalid')));
  console.log('✔ PASS: Invalid garment slot rejected.');

  // 9. Invalid avatar ID
  console.log('\nTest 9: Invalid Avatar ID');
  const invalidAvatarProd = {
    ...validBaseProduct,
    representation: { ...validBaseProduct.representation, supportedAvatarIds: ['alien_body'] },
  };
  const res9 = validateCatalogProduct(invalidAvatarProd);
  assert.strictEqual(res9.valid, false);
  assert.ok(res9.errors.some((e) => e.includes('references unknown avatar ID "alien_body"')));
  console.log('✔ PASS: Unknown avatar ID in 3D representation rejected.');

  // 10. Missing asset ID
  console.log('\nTest 10: Missing Asset ID');
  const missingAssetIdProd = {
    ...validBaseProduct,
    representation: { ...validBaseProduct.representation, assetId: '' },
  };
  const res10 = validateCatalogProduct(missingAssetIdProd);
  assert.strictEqual(res10.valid, false);
  assert.ok(res10.errors.some((e) => e.includes('representation.assetId must be a non-empty string')));
  console.log('✔ PASS: Missing asset ID rejected.');

  // 11. Unknown asset reference
  console.log('\nTest 11: Unknown Asset Reference');
  const unknownAssetProd = {
    ...validBaseProduct,
    representation: { ...validBaseProduct.representation, assetId: 'non.existent.asset.123' },
  };
  const res11 = validateCatalogProduct(unknownAssetProd);
  assert.strictEqual(res11.valid, false);
  assert.ok(res11.errors.some((e) => e.includes('referenced by product does not exist in AssetRegistry')));
  console.log('✔ PASS: Asset ID reference to non-existent registry asset rejected strictly.');

  // 12. Product lookup
  console.log('\nTest 12: Product Lookup via Adapter');
  const adapter = new LocalCatalogAdapter();
  const fetchedProd = await adapter.getProduct('prod_basic_tshirt_001');
  assert.ok(fetchedProd);
  assert.strictEqual(fetchedProd.title, 'Essential Crewneck T-Shirt');
  const missingProd = await adapter.getProduct('unknown_prod_id');
  assert.strictEqual(missingProd, null);
  console.log('✔ PASS: Product lookup via LocalCatalogAdapter returned expected product or null.');

  // 13. Product listing
  console.log('\nTest 13: Product Listing');
  const allProds = await adapter.getProducts();
  assert.ok(allProds.length >= 3);
  const availProds = await adapter.getProducts({ availability: 'available' });
  assert.ok(availProds.length >= 3);
  const only3DProds = await adapter.getProducts({ has3D: true });
  assert.ok(only3DProds.every((p) => p.representation !== null));
  console.log('✔ PASS: Product listing with filtering query criteria verified.');

  // 14. Deterministic results
  console.log('\nTest 14: Deterministic Results');
  const p1 = await adapter.getProduct('prod_basic_tshirt_001');
  const p2 = await adapter.getProduct('prod_basic_tshirt_001');
  assert.deepStrictEqual(p1, p2);
  console.log('✔ PASS: Repeated queries return identical results.');

  // 15. Normalization
  console.log('\nTest 15: Catalog Record Normalization');
  const rawVendorData = {
    id: 'SKU_9988',
    name: '   Overpriced Hoodie  ',
    vendor: ' Streetwear Co ',
    price: '89.95',
    currencyCode: 'usd',
    status: 'IN_STOCK',
    threeD: {
      asset_id: ' garment.top.basic-tshirt ',
      slot: 'TOP',
      supportedAvatarIds: ['male', 'female'],
    },
    internalVendorSecret: 'secret_key_123',
  };

  const normalized = normalizeCatalogProduct(rawVendorData);
  assert.strictEqual(normalized.externalProductId, 'SKU_9988');
  assert.strictEqual(normalized.title, 'Overpriced Hoodie');
  assert.strictEqual(normalized.brand, 'Streetwear Co');
  assert.strictEqual(normalized.price, 89.95);
  assert.strictEqual(normalized.currency, 'USD');
  assert.strictEqual(normalized.availability, 'available');
  assert.strictEqual(normalized.representation.assetId, 'garment.top.basic-tshirt');
  assert.strictEqual(normalized.representation.garmentSlot, 'top');
  assert.strictEqual('internalVendorSecret' in normalized, false, 'Provider extra internal fields must be stripped');
  console.log('✔ PASS: Raw external catalog data normalized cleanly into canonical contract.');

  // 16. Product → Asset Mapping
  console.log('\nTest 16: Product -> Asset Mapping Resolution');
  const mappedAssetId = fetchedProd.representation.assetId;
  assert.ok(hasAsset(mappedAssetId), `Asset ID ${mappedAssetId} must exist in AssetRegistry`);
  const assetRecord = getAsset(mappedAssetId);
  assert.strictEqual(assetRecord.assetId, 'garment.top.basic-tshirt');
  console.log('✔ PASS: Product maps deterministically to valid platform 3D asset ID.');

  // 17. Asset Registry Integration
  console.log('\nTest 17: Asset Registry Integration');
  const resolvedUrl = getAssetDeliveryUrl(mappedAssetId);
  assert.ok(resolvedUrl.startsWith('/models/'));
  console.log('✔ PASS: Product -> Asset ID -> AssetRegistry -> AssetLocation delivery URL resolved.');

  // 18. No Competing Asset URL Fields
  console.log('\nTest 18: Rejection of Competing Asset URL Fields');
  const competingUrlProd = {
    ...validBaseProduct,
    modelUrl: '/models/direct/file.glb',
  };
  const res18 = validateCatalogProduct(competingUrlProd);
  assert.strictEqual(res18.valid, false);
  assert.ok(res18.errors.some((e) => e.includes('contains forbidden competing URL fields')));
  console.log('✔ PASS: Catalog product with competing modelUrl rejected strictly.');

  // 19. Separation of Commerce Metadata from Asset Metadata
  console.log('\nTest 19: Separation of Commerce Metadata from Asset Metadata');
  assert.strictEqual('triCount' in fetchedProd, false);
  assert.strictEqual('vertexCount' in fetchedProd, false);
  assert.strictEqual('location' in fetchedProd, false);

  assert.strictEqual('price' in assetRecord, false);
  assert.strictEqual('currency' in assetRecord, false);
  assert.strictEqual('availability' in assetRecord, false);
  assert.strictEqual('externalProductId' in assetRecord, false);
  console.log('✔ PASS: Strictly verified complete isolation of commerce data from 3D asset metadata.');

  // 20. Local Adapter Behavior
  console.log('\nTest 20: Local Catalog Adapter Instantiation & Seeding');
  const customAdapter = new LocalCatalogAdapter([
    {
      externalProductId: 'custom_001',
      title: 'Custom Product',
      price: 10,
      currency: 'USD',
      availability: 'available',
      representation: null,
    },
  ]);
  const customProd = await customAdapter.getProduct('custom_001');
  assert.ok(customProd);
  assert.strictEqual(customProd.title, 'Custom Product');
  console.log('✔ PASS: LocalCatalogAdapter handles custom fixtures deterministically.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All 20 Phase 10 Integration Contract Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runIntegrationTests().catch((err) => {
  console.error('Integration test failed with error:', err);
  process.exit(1);
});
