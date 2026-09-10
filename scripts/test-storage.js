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

const { validateAssetLocation, resolveAssetUrl } = require('../src/lib/3d/assetDelivery');
const { providerRegistry } = require('../src/lib/storage/providerRegistry');
const { R2StorageProvider } = require('../src/lib/storage/r2Provider');
const { LocalStorageProvider } = require('../src/lib/storage/localProvider');
const { normalizeObjectKey, buildDeterministicObjectKey } = require('../src/lib/storage/objectKey');
const { validateAsset, validateAssetRegistry } = require('../src/lib/3d/assetValidator');
const { getAssets } = require('../src/lib/3d/assetRegistry');

console.log('====================================================');
console.log('Phase 7 — Object Storage Provider Unit Tests');
console.log('====================================================\n');

let testsPassed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`\x1b[31m✖ FAIL:\x1b[0m ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ----------------------------------------------------
// 1. Location & Key Validation Tests
// ----------------------------------------------------

runTest('Valid local location passes validation', () => {
  const result = validateAssetLocation({ source: 'local', path: '/models/avatar/male/base-avatar.glb' });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

runTest('Valid remote HTTPS location passes validation', () => {
  const result = validateAssetLocation({ source: 'remote', path: 'https://cdn.example.com/model.glb' });
  assert.strictEqual(result.valid, true);
});

runTest('Valid provider location passes validation', () => {
  const result = validateAssetLocation({
    source: 'provider',
    provider: 'r2',
    objectKey: 'avatars/male/v1.0.0/base-avatar.glb',
  });
  assert.strictEqual(result.valid, true);
});

runTest('Provider location missing provider identifier fails with explicit error', () => {
  const result = validateAssetLocation({
    source: 'provider',
    objectKey: 'avatars/male/v1.0.0/base-avatar.glb',
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('missing required "provider"')));
});

runTest('Provider location referencing unknown provider fails cleanly', () => {
  const result = validateAssetLocation({
    source: 'provider',
    provider: 'unsupported-cloud-vendor',
    objectKey: 'avatars/male/v1.0.0/base-avatar.glb',
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Unsupported storage provider')));
});

runTest('Object key with directory traversal (including terminal .. and backslashes) is strictly rejected', () => {
  assert.throws(() => {
    normalizeObjectKey('../../etc/passwd');
  }, /Illegal directory traversal/);

  assert.throws(() => {
    normalizeObjectKey('avatars/../male/model.glb');
  }, /Illegal directory traversal/);

  // Terminal .. regression test (Fix 2)
  assert.throws(() => {
    normalizeObjectKey('avatars/male/..');
  }, /Illegal directory traversal/);

  // Backslash variant regression tests (Fix 2)
  assert.throws(() => {
    normalizeObjectKey('avatars\\male\\..\\model.glb');
  }, /Illegal directory traversal/);

  assert.throws(() => {
    normalizeObjectKey('avatars\\male\\..');
  }, /Illegal directory traversal/);
});

runTest('Object key with query parameters or URL fragments is rejected', () => {
  assert.throws(() => {
    normalizeObjectKey('avatars/male/model.glb?token=secret');
  }, /cannot contain query parameters/);
});

runTest('Object key with executable schemes is rejected', () => {
  assert.throws(() => {
    normalizeObjectKey('javascript:alert(1)');
  }, /cannot use executable/);
});

// ----------------------------------------------------
// 2. Deterministic Key Building
// ----------------------------------------------------

runTest('Deterministic object key formatting for avatars and garments', () => {
  const avatarKey = buildDeterministicObjectKey({
    assetType: 'avatar',
    assetId: 'avatar.male.base',
    version: '1.0.0',
    filename: 'base-avatar.glb',
  });
  assert.strictEqual(avatarKey, 'avatars/avatar.male.base/v1.0.0/base-avatar.glb');

  const garmentKey = buildDeterministicObjectKey({
    assetType: 'garment',
    assetId: 'garment.top.basic-tshirt',
    slot: 'top',
    version: '1.0.0',
    filename: 'model.glb',
  });
  assert.strictEqual(garmentKey, 'garments/top/garment.top.basic-tshirt/v1.0.0/model.glb');
});

// ----------------------------------------------------
// 3. Provider Resolution & Error Handling Tests
// ----------------------------------------------------

runTest('Local provider resolves relative path correctly', () => {
  const localProvider = new LocalStorageProvider();
  const url = localProvider.resolveObjectUrl('models/avatar/male/base-avatar.glb');
  assert.strictEqual(url, '/models/avatar/male/base-avatar.glb');
});

runTest('R2 provider throws clear error when public delivery URL is missing', () => {
  const unconfiguredR2 = new R2StorageProvider({ publicDomain: '' });
  assert.strictEqual(unconfiguredR2.isConfigured(), false);

  assert.throws(() => {
    unconfiguredR2.resolveObjectUrl('avatars/male/v1.0.0/base-avatar.glb');
  }, /STORAGE_R2_PUBLIC_DOMAIN/);
});

runTest('R2 provider resolves deterministic HTTPS URL when configured', () => {
  const configuredR2 = new R2StorageProvider({ publicDomain: 'https://cdn.fashionplatform.io' });
  assert.strictEqual(configuredR2.isConfigured(), true);

  const resolved = configuredR2.resolveObjectUrl('avatars/male/v1.0.0/base-avatar.glb');
  assert.strictEqual(resolved, 'https://cdn.fashionplatform.io/avatars/male/v1.0.0/base-avatar.glb');
});

runTest('R2 provider rejects insecure HTTP public domain', () => {
  const insecureR2 = new R2StorageProvider({ publicDomain: 'http://insecure.example.com' });
  assert.throws(() => {
    insecureR2.resolveObjectUrl('avatars/male/v1.0.0/base-avatar.glb');
  }, /Insecure HTTP protocol is rejected/);
});

// ----------------------------------------------------
// 4. Delivery Resolver Integration Tests
// ----------------------------------------------------

runTest('Delivery Resolver resolves local asset location', () => {
  const resolved = resolveAssetUrl({
    source: 'local',
    path: '/models/avatar/female/base-avatar.glb',
  });
  assert.strictEqual(resolved, '/models/avatar/female/base-avatar.glb');
});

runTest('Delivery Resolver resolves provider-backed location using registered R2 adapter', () => {
  // Register custom configured R2 provider for test
  const customR2 = new R2StorageProvider({ publicDomain: 'https://assets.fashion.com' });
  providerRegistry.registerProvider(customR2);

  const resolved = resolveAssetUrl({
    source: 'provider',
    provider: 'r2',
    objectKey: 'garments/top/tshirt/v1.0.0/GARMENT_top_basic_tshirt.glb',
  });

  assert.strictEqual(
    resolved,
    'https://assets.fashion.com/garments/top/tshirt/v1.0.0/GARMENT_top_basic_tshirt.glb'
  );
});

runTest('Unknown provider in delivery resolver throws explicit error with no silent fallback', () => {
  assert.throws(() => {
    resolveAssetUrl({
      source: 'provider',
      provider: 'unknown-vendor',
      objectKey: 'some/key.glb',
    });
  }, /Unsupported storage provider: "unknown-vendor"/);
});

// ----------------------------------------------------
// 5. Security & Client Import Graph Boundaries (Fix 1)
// ----------------------------------------------------

runTest('Client delivery graph does NOT transitively import server credentials module', () => {
  const clientConfigPath = path.join(__dirname, '../src/lib/storage/clientConfig.ts');
  const providerRegistryPath = path.join(__dirname, '../src/lib/storage/providerRegistry.ts');
  const r2ProviderPath = path.join(__dirname, '../src/lib/storage/r2Provider.ts');

  const clientConfigSrc = fs.readFileSync(clientConfigPath, 'utf8');
  const registrySrc = fs.readFileSync(providerRegistryPath, 'utf8');
  const r2Src = fs.readFileSync(r2ProviderPath, 'utf8');

  // Verify none of the client-reachable files import serverConfig or secret key names
  assert.strictEqual(clientConfigSrc.includes('serverConfig'), false);
  assert.strictEqual(clientConfigSrc.includes('SECRET_ACCESS_KEY'), false);
  assert.strictEqual(registrySrc.includes('serverConfig'), false);
  assert.strictEqual(registrySrc.includes('SECRET_ACCESS_KEY'), false);
  assert.strictEqual(r2Src.includes('serverConfig'), false);
  assert.strictEqual(r2Src.includes('SECRET_ACCESS_KEY'), false);
});

runTest('Asset registry locations validate cleanly with zero credential exposure', () => {
  const assets = getAssets();
  const result = validateAssetRegistry(assets);
  assert.strictEqual(result.valid, true);

  assets.forEach((asset) => {
    const stringified = JSON.stringify(asset);
    assert.strictEqual(stringified.includes('R2_SECRET'), false);
    assert.strictEqual(stringified.includes('ACCESS_KEY'), false);
  });
});

console.log('\n====================================================');
console.log(`\x1b[32mSUCCESS: All ${testsPassed} Phase 7 Storage Provider tests passed!\x1b[0m`);
console.log('====================================================\n');
