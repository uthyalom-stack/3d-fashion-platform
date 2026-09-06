import { Scene, BoxGeometry, MeshStandardMaterial, Mesh, Material } from 'three';
import assert from 'assert';
import { dispose3DObject } from '../src/lib/3d/disposal';

function runOwnershipTests() {
  console.log('--- Starting Three.js Resource Ownership Unit Tests ---');

  // 1. Create simulated cached GLTF scene from Drei/useGLTF
  const cachedScene = new Scene();
  const cachedGeometry = new BoxGeometry(1, 1, 1);
  const cachedMaterial = new MeshStandardMaterial({ color: 0x0071e3 });
  const cachedMesh = new Mesh(cachedGeometry, cachedMaterial);
  cachedScene.add(cachedMesh);

  // Track dispose calls
  let geometryDisposed = false;
  let cachedMaterialDisposed = false;
  cachedGeometry.addEventListener('dispose', () => {
    geometryDisposed = true;
  });
  cachedMaterial.addEventListener('dispose', () => {
    cachedMaterialDisposed = true;
  });

  // 2. Simulate ModelLoader Instance 1 (default shallow clone)
  const instance1 = cachedScene.clone(true);
  const mesh1 = instance1.children[0] as Mesh;

  // 3. Simulate ModelLoader Instance 2 (default shallow clone)
  const instance2 = cachedScene.clone(true);
  const mesh2 = instance2.children[0] as Mesh;

  // TEST 1: Reference Equality
  assert.strictEqual(mesh1.geometry, cachedGeometry, 'Instance 1 geometry must share reference with cache');
  assert.strictEqual(mesh2.geometry, cachedGeometry, 'Instance 2 geometry must share reference with cache');
  assert.strictEqual(mesh1.material, cachedMaterial, 'Instance 1 material must share reference with cache');
  assert.strictEqual(mesh2.material, cachedMaterial, 'Instance 2 material must share reference with cache');
  assert.notStrictEqual(instance1, cachedScene, 'Instance 1 Object3D scene tree must be isolated clone');
  assert.notStrictEqual(instance2, cachedScene, 'Instance 2 Object3D scene tree must be isolated clone');
  console.log('✓ PASS: Shared geometry/material references verified for shallow clones');

  // TEST 2: Unmount Instance 1 with safe disposal rules
  dispose3DObject(instance1, { disposeGeometries: false, disposeMaterials: false, disposeTextures: false });
  assert.strictEqual(geometryDisposed, false, 'Cached geometry must NOT be disposed when instance 1 unmounts');
  assert.strictEqual(cachedMaterialDisposed, false, 'Cached material must NOT be disposed when instance 1 unmounts');
  console.log('✓ PASS: Unmounting shallow-cloned instance leaves cached GPU allocations intact');

  // TEST 3: ModelLoader Instance 3 with deepCloneMaterials = true
  const instance3 = cachedScene.clone(true);
  const mesh3 = instance3.children[0] as Mesh;
  mesh3.material = (mesh3.material as Material).clone();

  let clonedMaterialDisposed = false;
  (mesh3.material as Material).addEventListener('dispose', () => {
    clonedMaterialDisposed = true;
  });

  assert.strictEqual(mesh3.geometry, cachedGeometry, 'Instance 3 must still share geometry');
  assert.notStrictEqual(mesh3.material, cachedMaterial, 'Instance 3 material must be independent clone');

  // Mutate instance 3 material
  (mesh3.material as MeshStandardMaterial).color.setHex(0xff0000);
  assert.strictEqual(
    cachedMaterial.color.getHex(),
    0x0071e3,
    'Mutating instance 3 material color must NOT affect cached material'
  );
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
