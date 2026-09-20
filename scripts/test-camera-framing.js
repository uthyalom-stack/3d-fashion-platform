const THREE = require('three');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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

const { calculateCameraFraming, resolveAvatarRoot } = require('../src/lib/3d/cameraFraming.ts');

function isFiniteArray(arr) {
  return Array.isArray(arr) && arr.every((val) => typeof val === 'number' && Number.isFinite(val));
}

function runCameraFramingTests() {
  console.log('--- Starting Camera Framing Unit Tests ---');

  // Test 1: Null or undefined object produces default safe framing
  const nullFraming = calculateCameraFraming(null);
  assert.ok(isFiniteArray(nullFraming.target), 'Null input target must be finite numbers');
  assert.ok(isFiniteArray(nullFraming.position), 'Null input position must be finite numbers');
  assert.ok(Number.isFinite(nullFraming.minDistance), 'Null input minDistance must be finite');
  assert.ok(Number.isFinite(nullFraming.maxDistance), 'Null input maxDistance must be finite');
  console.log('✓ PASS: Null/undefined object handles safely with default framing');

  // Test 2: Empty object / zero size object produces safe fallback
  const emptyGroup = new THREE.Group();
  const emptyFraming = calculateCameraFraming(emptyGroup);
  assert.ok(isFiniteArray(emptyFraming.target), 'Empty group target must be finite');
  assert.ok(isFiniteArray(emptyFraming.position), 'Empty group position must be finite');
  console.log('✓ PASS: Empty object handles safely');

  // Test 3: Standard adult human mannequin mesh bounds (height ~1.75m)
  const avatarMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.75, 0.3),
    new THREE.MeshBasicMaterial()
  );
  avatarMesh.position.set(0, 0.875, 0); // Grounded at Y=0
  avatarMesh.updateMatrixWorld(true);

  const desktopFraming = calculateCameraFraming(avatarMesh, { fov: 45, aspect: 16 / 9 });
  assert.ok(isFiniteArray(desktopFraming.target), 'Desktop target must be finite');
  assert.ok(isFiniteArray(desktopFraming.position), 'Desktop position must be finite');

  // Verify target is centered near torso (around Y=0.875)
  assert.ok(Math.abs(desktopFraming.target[1] - 0.875) < 0.001, 'Target Y must match torso center Y');
  assert.ok(desktopFraming.position[2] > desktopFraming.target[2], 'Camera Z must be in front of target');
  assert.ok(desktopFraming.minDistance < desktopFraming.defaultDistance, 'minDistance must be less than default distance');
  assert.ok(desktopFraming.maxDistance > desktopFraming.defaultDistance, 'maxDistance must be greater than default distance');
  console.log('✓ PASS: Standard mannequin produces valid finite framing and distance limits');

  // Test 4: Larger avatar produces appropriately larger framing distance
  const largeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 3.5, 0.6),
    new THREE.MeshBasicMaterial()
  );
  largeMesh.position.set(0, 1.75, 0);
  largeMesh.updateMatrixWorld(true);

  const largeFraming = calculateCameraFraming(largeMesh, { fov: 45, aspect: 16 / 9 });
  assert.ok(largeFraming.defaultDistance > desktopFraming.defaultDistance, 'Larger avatar must produce larger distance');
  assert.ok(largeFraming.minDistance > desktopFraming.minDistance, 'Larger avatar must produce larger minDistance');
  console.log('✓ PASS: Scaling avatar larger increases camera distance proportionally');

  // Test 5: Smaller avatar produces appropriately smaller framing distance
  const smallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.875, 0.15),
    new THREE.MeshBasicMaterial()
  );
  smallMesh.position.set(0, 0.4375, 0);
  smallMesh.updateMatrixWorld(true);

  const smallFraming = calculateCameraFraming(smallMesh, { fov: 45, aspect: 16 / 9 });
  assert.ok(smallFraming.defaultDistance < desktopFraming.defaultDistance, 'Smaller avatar must produce smaller distance');
  assert.ok(smallFraming.minDistance < desktopFraming.minDistance, 'Smaller avatar must produce smaller minDistance');
  console.log('✓ PASS: Scaling avatar smaller decreases camera distance proportionally');

  // Test 6: Mobile portrait viewport aspect ratio (390x844 -> aspect ~0.462)
  const mobileFraming = calculateCameraFraming(avatarMesh, { fov: 45, aspect: 390 / 844 });
  assert.ok(mobileFraming.defaultDistance > desktopFraming.defaultDistance, 'Narrow mobile viewport requires slightly greater distance to fit width');
  assert.ok(isFiniteArray(mobileFraming.position), 'Mobile position must be finite');
  console.log('✓ PASS: Mobile narrow aspect ratio calculates appropriate increased distance without distortion');

  // Test 7: Both Male and Female base avatar GLB geometry bounds fit cleanly
  // Simulate male avatar bounds (Scale 0.11 -> size Y ~ 1.75)
  const maleSim = new THREE.Mesh(new THREE.BoxGeometry(0.534 * 2, 1.75, 0.422), new THREE.MeshBasicMaterial());
  maleSim.position.set(0, 0.875, 0);
  maleSim.updateMatrixWorld(true);

  // Simulate female avatar bounds (Scale 0.10 -> size Y ~ 1.73)
  const femaleSim = new THREE.Mesh(new THREE.BoxGeometry(0.565 * 2, 1.729, 0.476), new THREE.MeshBasicMaterial());
  femaleSim.position.set(0, 0.8645, 0);
  femaleSim.updateMatrixWorld(true);

  const maleFraming = calculateCameraFraming(maleSim, { fov: 45, aspect: 1.5 });
  const femaleFraming = calculateCameraFraming(femaleSim, { fov: 45, aspect: 1.5 });

  assert.ok(Math.abs(maleFraming.defaultDistance - femaleFraming.defaultDistance) < 0.5, 'Male and female avatar framing distances should be close and reasonable');
  assert.ok(maleFraming.minDistance > 0.4 && maleFraming.minDistance < 2.0, 'Male minDistance within valid bounds');
  assert.ok(femaleFraming.minDistance > 0.4 && femaleFraming.minDistance < 2.0, 'Female minDistance within valid bounds');
  console.log('✓ PASS: Both male and female adult avatars use the same framing algorithm successfully');

  // Test 8: Distance limits prevention
  assert.ok(desktopFraming.minDistance >= 0.4, 'minDistance prevents entering body');
  assert.ok(desktopFraming.maxDistance <= 15.0, 'maxDistance prevents absurd far distance');
  console.log('✓ PASS: Distance limits enforce safety bounds');

  // Test 9: resolveAvatarRoot traverses parent hierarchy for avatar-root-* container
  const parentRoot = new THREE.Group();
  parentRoot.name = 'avatar-root-male';
  const childGroup = new THREE.Group();
  const deepChildMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.75, 0.3));
  parentRoot.add(childGroup);
  childGroup.add(deepChildMesh);

  const resolved = resolveAvatarRoot(deepChildMesh);
  assert.strictEqual(resolved, parentRoot, 'resolveAvatarRoot must resolve parent avatar-root-* container');
  console.log('✓ PASS: resolveAvatarRoot cleanly extracts avatar-root container');

  console.log('--- ALL CAMERA FRAMING UNIT TESTS PASSED SUCCESSFULLY ---');
}

runCameraFramingTests();
