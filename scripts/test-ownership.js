const THREE = require('three');
const assert = require('assert');

/**
 * Three.js Resource Disposal Logic
 * Exactly matches src/lib/3d/disposal.ts
 */
function disposeMaterial(material, options) {
  if (!options.disposeMaterials && !options.disposeTextures) return;

  if (options.disposeTextures) {
    for (const key of Object.keys(material)) {
      const prop = material[key];
      if (prop && typeof prop === 'object' && prop.isTexture) {
        prop.dispose();
      }
    }
  }

  if (options.disposeMaterials) {
    material.dispose();
  }
}

function dispose3DObject(object, options = { disposeGeometries: false, disposeMaterials: false, disposeTextures: false }) {
  if (!object) return;

  object.traverse((child) => {
    if (child.isMesh) {
      if (options.disposeGeometries && child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => disposeMaterial(mat, options));
        } else {
          disposeMaterial(child.material, options);
        }
      }
    }
  });
}

function runOwnershipTests() {
  console.log('--- Starting Three.js Resource Ownership Unit Tests ---');

  // 1. Simulate cached GLTF scene graph from Drei/useGLTF loader cache
  const cachedScene = new THREE.Scene();
  const cachedGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cachedMaterial = new THREE.MeshStandardMaterial({ color: 0x0071e3 });
  const cachedMesh = new THREE.Mesh(cachedGeometry, cachedMaterial);
  cachedScene.add(cachedMesh);

  let geometryDisposed = false;
  let cachedMaterialDisposed = false;
  cachedGeometry.addEventListener('dispose', () => { geometryDisposed = true; });
  cachedMaterial.addEventListener('dispose', () => { cachedMaterialDisposed = true; });

  // 2. Simulate ModelLoader Instance 1 (default shallow clone)
  const instance1 = cachedScene.clone(true);
  const mesh1 = instance1.children[0];

  // 3. Simulate ModelLoader Instance 2 (default shallow clone)
  const instance2 = cachedScene.clone(true);
  const mesh2 = instance2.children[0];

  // TEST 1: Reference Equality & Scene Graph Isolation
  assert.strictEqual(mesh1.geometry, cachedGeometry, 'Instance 1 geometry must share reference with cache');
  assert.strictEqual(mesh2.geometry, cachedGeometry, 'Instance 2 geometry must share reference with cache');
  assert.strictEqual(mesh1.material, cachedMaterial, 'Instance 1 material must share reference with cache');
  assert.strictEqual(mesh2.material, cachedMaterial, 'Instance 2 material must share reference with cache');
  assert.notStrictEqual(instance1, cachedScene, 'Instance 1 Object3D scene tree must be an isolated clone');
  assert.notStrictEqual(instance2, cachedScene, 'Instance 2 Object3D scene tree must be an isolated clone');
  console.log('✓ PASS: Shared geometry/material references verified for shallow clones');

  // TEST 2: Unmount Instance 1 with default disposal settings (disposeGeometries: false, disposeMaterials: false)
  dispose3DObject(instance1, { disposeGeometries: false, disposeMaterials: false, disposeTextures: false });
  assert.strictEqual(geometryDisposed, false, 'Cached geometry must NOT be disposed when instance 1 unmounts');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material must NOT be disposed when instance 1 unmounts');
  console.log('✓ PASS: Unmounting shallow-cloned instance leaves cached GPU allocations intact');

  // TEST 3: ModelLoader Instance 3 with deepCloneMaterials = true
  const instance3 = cachedScene.clone(true);
  const mesh3 = instance3.children[0];
  mesh3.material = mesh3.material.clone();

  let clonedMaterialDisposed = false;
  mesh3.material.addEventListener('dispose', () => { clonedMaterialDisposed = true; });

  assert.strictEqual(mesh3.geometry, cachedGeometry, 'Instance 3 must still share geometry with cache');
  assert.notStrictEqual(mesh3.material, cachedMaterial, 'Instance 3 material must be an independent clone');

  // Mutate instance 3 material
  mesh3.material.color.setHex(0xff0000);
  assert.strictEqual(cachedMaterial.color.getHex(), 0x0071e3, 'Mutating instance 3 material color must NOT affect cached material');
  console.log('✓ PASS: deepCloneMaterials isolates material mutations without corrupting cache');

  // TEST 4: Unmount Instance 3 (disposes instance-owned material)
  dispose3DObject(instance3, { disposeGeometries: false, disposeMaterials: true, disposeTextures: false });
  assert.strictEqual(clonedMaterialDisposed, true, 'Instance-owned cloned material MUST be disposed on unmount');
  assert.strictEqual(geometryDisposed, false, 'Cached geometry must STILL remain intact after instance 3 unmounts');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material must STILL remain intact after instance 3 unmounts');
  console.log('✓ PASS: Instance-owned materials are safely disposed on unmount while leaving shared resources intact');

  console.log('--- ALL THREE.JS RESOURCE OWNERSHIP TESTS PASSED SUCCESSFULLY ---');
}

runOwnershipTests();
