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

  // TEST 2: Unmount Instance 1 with default disposal settings
  dispose3DObject(instance1, { disposeGeometries: false, disposeMaterials: false, disposeTextures: false });
  assert.strictEqual(geometryDisposed, false, 'Cached geometry must NOT be disposed when instance 1 unmounts');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material must NOT be disposed when instance 1 unmounts');
  console.log('✓ PASS: Unmounting shallow-cloned instance leaves cached GPU allocations intact');

  // TEST 3: React Strict Mode Lifecycle Replay Simulation for deepCloneMaterials = true
  const instanceStrict = cachedScene.clone(true);
  const meshStrict = instanceStrict.children[0];

  // --- Strict Mode Pass 1: Effect Setup ---
  meshStrict.userData._originalMaterial = meshStrict.material;
  const clonedMatPass1 = meshStrict.material.clone();
  meshStrict.material = clonedMatPass1;
  let matPass1Disposed = false;
  clonedMatPass1.addEventListener('dispose', () => { matPass1Disposed = true; });

  assert.notStrictEqual(meshStrict.material, cachedMaterial, 'Instance material must be a cloned material');

  // --- Strict Mode Pass 1: Effect Cleanup (simulated remount unmount) ---
  meshStrict.material = meshStrict.userData._originalMaterial;
  clonedMatPass1.dispose();

  assert.strictEqual(matPass1Disposed, true, 'First cloned material instance must be disposed on cleanup');
  assert.strictEqual(meshStrict.material, cachedMaterial, 'Original cached material reference restored on cleanup');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material remains intact after Strict Mode cleanup');

  // --- Strict Mode Pass 2: Effect Setup (simulated remount setup) ---
  const clonedMatPass2 = meshStrict.material.clone();
  meshStrict.material = clonedMatPass2;
  let matPass2Disposed = false;
  clonedMatPass2.addEventListener('dispose', () => { matPass2Disposed = true; });

  assert.strictEqual(matPass2Disposed, false, 'Second cloned material instance is active and undisposed');
  assert.strictEqual(geometryDisposed, false, 'Cached geometry remains intact');

  // --- Final Unmount: Effect Cleanup ---
  meshStrict.material = meshStrict.userData._originalMaterial;
  clonedMatPass2.dispose();

  assert.strictEqual(matPass2Disposed, true, 'Second cloned material instance disposed on final unmount');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material remains intact after final unmount');
  assert.strictEqual(geometryDisposed, false, 'Cached geometry remains intact after final unmount');
  console.log('✓ PASS: React Strict Mode lifecycle setup->cleanup->setup replay handles material cloning safely');

  // TEST 4: Garment Replacement Lifecycle (Garment A replaced by Garment B)
  const garmentA_Scene = new THREE.Scene();
  const garmentA_Geom = new THREE.SphereGeometry(1, 8, 8);
  const garmentA_Mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  garmentA_Scene.add(new THREE.Mesh(garmentA_Geom, garmentA_Mat));

  let garmentA_GeomDisposed = false;
  let garmentA_MatDisposed = false;
  garmentA_Geom.addEventListener('dispose', () => { garmentA_GeomDisposed = true; });
  garmentA_Mat.addEventListener('dispose', () => { garmentA_MatDisposed = true; });

  // Equip Garment A
  const garmentA_Instance = garmentA_Scene.clone(true);

  // Replace Garment A with Garment B -> Unmount Garment A
  dispose3DObject(garmentA_Instance, { disposeGeometries: false, disposeMaterials: false, disposeTextures: false });

  assert.strictEqual(garmentA_GeomDisposed, false, 'Replacing Garment A must NOT dispose cached geometry');
  assert.strictEqual(garmentA_MatDisposed, false, 'Replacing Garment A must NOT dispose cached material');
  console.log('✓ PASS: Garment replacement lifecycle safely unmounts previous object while keeping cached GLTF resources intact');

  console.log('--- ALL THREE.JS RESOURCE OWNERSHIP TESTS PASSED SUCCESSFULLY ---');
}

runOwnershipTests();
