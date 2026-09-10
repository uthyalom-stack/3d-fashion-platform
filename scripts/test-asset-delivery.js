const assert = require('assert');
const path = require('path');
const fs = require('fs');
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

const { validateAssetLocation, resolveAssetLocation, resolveAssetUrl } = require('../src/lib/3d/assetDelivery');
const { getAsset, getAssets, getGarmentAsset, getAvatarAsset, getAssetDeliveryUrl } = require('../src/lib/3d/assetRegistry');
const { validateAsset, validateAssetRegistry } = require('../src/lib/3d/assetValidator');

console.log('====================================================');
console.log('Phase 6 — Asset Storage & Delivery Foundation Unit Tests');
console.log('====================================================\n');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${name}`);
    passCount++;
  } catch (err) {
    console.error(`\x1b[31m✘ FAIL:\x1b[0m ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Local Asset Location Resolution & Validation
test('Local Asset: valid local paths resolve deterministically', () => {
  const loc1 = { source: 'local', path: '/models/avatar/male/base-avatar.glb' };
  const res1 = validateAssetLocation(loc1);
  assert.strictEqual(res1.valid, true);
  assert.strictEqual(res1.errors.length, 0);

  const url1 = resolveAssetUrl(loc1);
  assert.strictEqual(url1, '/models/avatar/male/base-avatar.glb');

  // Relative string path
  const url2 = resolveAssetUrl('models/garment/top/GARMENT_top_basic_tshirt.glb');
  assert.strictEqual(url2, '/models/garment/top/GARMENT_top_basic_tshirt.glb');
});

test('Local Asset: invalid or malformed paths rejected strictly', () => {
  // Empty path
  assert.strictEqual(validateAssetLocation({ source: 'local', path: '' }).valid, false);
  assert.strictEqual(validateAssetLocation({ source: 'local', path: '   ' }).valid, false);

  // Unsafe directory traversal
  const traversalRes = validateAssetLocation({ source: 'local', path: '/../etc/passwd' });
  assert.strictEqual(traversalRes.valid, false);
  assert.ok(traversalRes.errors.some(e => e.includes('directory traversal')));

  // Executable / inline schemes on local source
  assert.strictEqual(validateAssetLocation({ source: 'local', path: 'javascript:alert(1)' }).valid, false);
  assert.strictEqual(validateAssetLocation({ source: 'local', path: 'data:text/html,test' }).valid, false);

  // Absolute HTTP/HTTPS URLs under 'local' source
  assert.strictEqual(validateAssetLocation({ source: 'local', path: 'https://cdn.example.com/model.glb' }).valid, false);
});

// 2. Remote Asset Location Resolution & Validation
test('Remote Asset: valid HTTPS URLs resolve deterministically unchanged', () => {
  const remoteLoc = { source: 'remote', path: 'https://cdn.fashion-platform.org/assets/avatar.glb' };
  const val = validateAssetLocation(remoteLoc);
  assert.strictEqual(val.valid, true);

  const url = resolveAssetUrl(remoteLoc);
  assert.strictEqual(url, 'https://cdn.fashion-platform.org/assets/avatar.glb');

  // Direct string resolution
  const urlDirect = resolveAssetUrl('https://cdn.fashion-platform.org/assets/garment.glb');
  assert.strictEqual(urlDirect, 'https://cdn.fashion-platform.org/assets/garment.glb');
});

test('Remote Asset: insecure protocols, executable schemes, and malformed URLs rejected', () => {
  // Insecure HTTP protocol rejected (HTTPS only)
  const httpRes = validateAssetLocation({ source: 'remote', path: 'http://cdn.example.com/asset.glb' });
  assert.strictEqual(httpRes.valid, false);
  assert.ok(httpRes.errors.some(e => e.includes('HTTP protocol is rejected')));

  // Executable / inline schemes rejected
  assert.strictEqual(validateAssetLocation({ source: 'remote', path: 'javascript:void(0)' }).valid, false);
  assert.strictEqual(validateAssetLocation({ source: 'remote', path: 'data:application/json;base64,1234' }).valid, false);

  // Malformed URL
  assert.strictEqual(validateAssetLocation({ source: 'remote', path: 'https://' }).valid, false);
  assert.strictEqual(validateAssetLocation({ source: 'remote', path: 'not-a-url' }).valid, false);
});

// 3. Asset Registry Integration
test('Registry Integration: registered male avatar resolves location and delivery URL', () => {
  const asset = getAsset('avatar.male.base');
  assert.ok(asset);
  assert.ok(asset.location);
  assert.strictEqual(asset.location.source, 'local');
  assert.strictEqual(asset.location.path, '/models/avatar/male/base-avatar.glb');

  const deliveryUrl = getAssetDeliveryUrl('avatar.male.base');
  assert.strictEqual(deliveryUrl, '/models/avatar/male/base-avatar.glb');
});

test('Registry Integration: registered female avatar resolves location and delivery URL', () => {
  const asset = getAsset('avatar.female.base');
  assert.ok(asset);
  assert.ok(asset.location);
  assert.strictEqual(asset.location.source, 'local');
  assert.strictEqual(asset.location.path, '/models/avatar/female/base-avatar.glb');

  const deliveryUrl = getAssetDeliveryUrl('female'); // using alias
  assert.strictEqual(deliveryUrl, '/models/avatar/female/base-avatar.glb');
});

test('Registry Integration: registered T-Shirt garment resolves location and delivery URL', () => {
  const garment = getGarmentAsset('garment.top.basic-tshirt');
  assert.ok(garment);
  assert.ok(garment.location);
  assert.strictEqual(garment.location.source, 'local');
  assert.strictEqual(garment.location.path, '/models/garment/top/GARMENT_top_basic_tshirt.glb');

  const deliveryUrl = getAssetDeliveryUrl('garment.top.basic-tshirt');
  assert.strictEqual(deliveryUrl, '/models/garment/top/GARMENT_top_basic_tshirt.glb');
});

test('Registry Integration: missing asset or invalid location fails clearly', () => {
  assert.throws(() => {
    getAssetDeliveryUrl('non.existent.asset.id');
  }, /not found in Asset Registry/);

  assert.throws(() => {
    resolveAssetUrl({
      assetId: 'invalid.location.asset',
      assetType: 'prop',
      schemaVersion: '1.0',
      version: '1.0.0',
      displayName: 'Invalid Asset',
      modelUrl: '/invalid.glb',
      location: { source: 'remote', path: 'http://insecure.com/asset.glb' },
    });
  }, /Insecure HTTP protocol is rejected/);
});

// 4. Asset Registry Validator Integration (Phase 5 + Phase 6 location checks)
test('Asset Validator: full registry validation verifies all asset locations', () => {
  const allAssets = getAssets();
  const valResult = validateAssetRegistry(allAssets);
  assert.strictEqual(valResult.valid, true);
  assert.strictEqual(valResult.errors.length, 0);
});

test('Asset Validator: invalid location attached to asset triggers validator error', () => {
  const badAsset = {
    assetId: 'test.bad.asset',
    assetType: 'prop',
    schemaVersion: '1.0',
    version: '1.0.0',
    displayName: 'Bad Location Asset',
    modelUrl: '/test.glb',
    location: { source: 'local', path: '../relative/unsafe.glb' },
  };

  const valResult = validateAsset(badAsset);
  assert.strictEqual(valResult.valid, false);
  assert.ok(valResult.errors.some(e => e.includes('directory traversal')));
});

console.log('\n====================================================');
console.log(`\x1b[32mSUCCESS: All ${passCount} Phase 6 Asset Storage & Delivery tests passed!\x1b[0m`);
console.log('====================================================\n');
