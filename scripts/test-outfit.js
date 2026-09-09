const fs = require('fs');
const assert = require('assert');
const THREE = require('three');
const ts = require('typescript');

// Enable direct loading of TypeScript / TSX modules via native node scripts/test-outfit.js
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
  createEmptyOutfitState,
  validateGarmentEquip,
  equipGarment,
  unequipGarment,
  syncOutfitForAvatar,
  OutfitManager,
} = require('../src/lib/3d/outfitManager');

const {
  resolveGarmentTransform,
  resolveAttachmentAnchor,
  findAvatarJoint,
  attachGarmentToAnchor,
  detachGarmentFromAnchor,
  ATTACHMENT_ANCHORS,
} = require('../src/lib/3d/attachmentResolver');

const { CANONICAL_GARMENT_SLOTS } = require('../src/types/garment');

function createFixtureAvatarSkeleton(avatarId = 'male', missingJoints = []) {
  const avatarRoot = new THREE.Object3D();
  avatarRoot.name = `avatar-root-${avatarId}`;

  const rootBone = new THREE.Bone();
  rootBone.name = 'Root';
  avatarRoot.add(rootBone);

  const pelvisBone = new THREE.Bone();
  pelvisBone.name = 'pelvis';
  if (!missingJoints.includes('pelvis')) {
    rootBone.add(pelvisBone);
  }

  const spine1Bone = new THREE.Bone();
  spine1Bone.name = 'spine_01';
  if (!missingJoints.includes('spine_01')) {
    pelvisBone.add(spine1Bone);
  }

  const spine2Bone = new THREE.Bone();
  spine2Bone.name = 'spine_02';
  if (!missingJoints.includes('spine_02')) {
    spine1Bone.add(spine2Bone);
  }

  const spine3Bone = new THREE.Bone();
  spine3Bone.name = 'spine_03';
  if (!missingJoints.includes('spine_03')) {
    if (!missingJoints.includes('spine_02')) {
      spine2Bone.add(spine3Bone);
    } else {
      spine1Bone.add(spine3Bone); // Attached directly to spine_01 if spine_02 is omitted
    }
  }

  const footLBone = new THREE.Bone();
  footLBone.name = 'foot_l';
  if (!missingJoints.includes('foot_l')) {
    pelvisBone.add(footLBone);
  }

  const handRBone = new THREE.Bone();
  handRBone.name = 'hand_r';
  if (!missingJoints.includes('hand_r')) {
    spine3Bone.add(handRBone);
  }

  avatarRoot.updateMatrixWorld(true);
  return avatarRoot;
}

function runOutfitTests() {
  console.log('====================================================');
  console.log('Phase 4 — Outfit State & Garment Attachment Unit Tests');
  console.log('====================================================\n');

  const MOCK_REGISTRY = {
    GARMENT_top_shirt: {
      id: 'GARMENT_top_shirt',
      name: 'Mock Short Sleeve Shirt',
      slot: 'top',
      modelUrl: '/models/garment/top/GARMENT_top_basic_tshirt.glb',
      supportedAvatarIds: ['male', 'female'],
      version: '1.0.0',
    },
    GARMENT_top_female_blouse: {
      id: 'GARMENT_top_female_blouse',
      name: 'Female Only Blouse',
      slot: 'top',
      modelUrl: '/models/garment/top/GARMENT_top_female_blouse.glb',
      supportedAvatarIds: ['female'],
      version: '1.0.0',
    },
    GARMENT_bottom_jeans: {
      id: 'GARMENT_bottom_jeans',
      name: 'Denim Jeans',
      slot: 'bottom',
      modelUrl: '/models/garment/bottom/GARMENT_bottom_denim_jeans.glb',
      supportedAvatarIds: ['male', 'female'],
      version: '1.0.0',
    },
    GARMENT_feet_sneakers: {
      id: 'GARMENT_feet_sneakers',
      name: 'Leather Sneakers',
      slot: 'feet',
      modelUrl: '/models/garment/feet/GARMENT_feet_sneakers.glb',
      supportedAvatarIds: ['male', 'female'],
      version: '1.0.0',
    },
    GARMENT_waist_belt: {
      id: 'GARMENT_waist_belt',
      name: 'Leather Belt',
      slot: 'waist',
      modelUrl: '/models/garment/waist/GARMENT_waist_belt.glb',
      supportedAvatarIds: ['male', 'female'],
      version: '1.0.0',
    },
    GARMENT_hand_gloves: {
      id: 'GARMENT_hand_gloves',
      name: 'Riding Gloves',
      slot: 'hand',
      modelUrl: '/models/garment/hand/GARMENT_hand_gloves.glb',
      supportedAvatarIds: ['male', 'female'],
      version: '1.0.0',
    },
  };

  // 1. Initial State Test
  console.log('Test 1: Initial State (All canonical slots empty)');
  const initial = createEmptyOutfitState();
  CANONICAL_GARMENT_SLOTS.forEach((slot) => {
    assert.strictEqual(initial[slot], null, `Slot "${slot}" must be initialised as null`);
  });
  console.log('✔ PASS: Initial state verified cleanly across all 5 canonical slots.');

  // 2. Equip Test
  console.log('\nTest 2: Equip into empty slot');
  const equipRes = equipGarment(initial, 'top', 'GARMENT_top_shirt', 'male', MOCK_REGISTRY);
  assert.strictEqual(equipRes.result.valid, true, 'Equip operation must be valid');
  assert.strictEqual(equipRes.state.top, 'GARMENT_top_shirt', 'Top slot must contain "GARMENT_top_shirt"');
  console.log('✔ PASS: Empty slot equipped successfully.');

  // 3. Replace Test
  console.log('\nTest 3: Replace active garment in slot');
  const replaceRes = equipGarment(
    equipRes.state,
    'top',
    'GARMENT_top_female_blouse',
    'female',
    MOCK_REGISTRY
  );
  assert.strictEqual(replaceRes.result.valid, true, 'Replace operation must be valid');
  assert.strictEqual(replaceRes.state.top, 'GARMENT_top_female_blouse', 'Top slot must now contain "GARMENT_top_female_blouse"');
  assert.notStrictEqual(replaceRes.state.top, 'GARMENT_top_shirt', 'Previous garment must no longer be active');
  console.log('✔ PASS: Active garment replaced cleanly with 1 active garment maximum per slot.');

  // 4. Unequip Test
  console.log('\nTest 4: Unequip garment');
  const unequipState = unequipGarment(replaceRes.state, 'top');
  assert.strictEqual(unequipState.top, null, 'Top slot must be empty after unequip');
  console.log('✔ PASS: Unequip operation cleared slot successfully.');

  // 5. Multiple Slots Coexisting
  console.log('\nTest 5: Multiple slots coexisting simultaneously');
  let multiState = createEmptyOutfitState();
  multiState = equipGarment(multiState, 'top', 'GARMENT_top_shirt', 'male', MOCK_REGISTRY).state;
  multiState = equipGarment(multiState, 'bottom', 'GARMENT_bottom_jeans', 'male', MOCK_REGISTRY).state;
  multiState = equipGarment(multiState, 'feet', 'GARMENT_feet_sneakers', 'male', MOCK_REGISTRY).state;
  multiState = equipGarment(multiState, 'waist', 'GARMENT_waist_belt', 'male', MOCK_REGISTRY).state;
  multiState = equipGarment(multiState, 'hand', 'GARMENT_hand_gloves', 'male', MOCK_REGISTRY).state;

  assert.strictEqual(multiState.top, 'GARMENT_top_shirt');
  assert.strictEqual(multiState.bottom, 'GARMENT_bottom_jeans');
  assert.strictEqual(multiState.feet, 'GARMENT_feet_sneakers');
  assert.strictEqual(multiState.waist, 'GARMENT_waist_belt');
  assert.strictEqual(multiState.hand, 'GARMENT_hand_gloves');
  console.log('✔ PASS: All 5 canonical slots occupied simultaneously without interference.');

  // 6. Unknown Garment ID Validation
  console.log('\nTest 6: Invalid / Unknown Garment ID rejection');
  const invalidIdRes = equipGarment(multiState, 'top', 'GARMENT_unknown_123', 'male', MOCK_REGISTRY);
  assert.strictEqual(invalidIdRes.result.valid, false);
  assert.strictEqual(invalidIdRes.state, multiState, 'State must remain unchanged when validation fails');
  console.log('✔ PASS: Unknown garment ID rejected deterministically.');

  // 7. Invalid Slot Validation
  console.log('\nTest 7: Invalid Slot rejection');
  const invalidSlotVal = validateGarmentEquip('GARMENT_top_shirt', 'invalid_slot', 'male', MOCK_REGISTRY);
  assert.strictEqual(invalidSlotVal.valid, false);
  console.log('✔ PASS: Invalid canonical slot rejected cleanly.');

  // 8. Slot Mismatch Validation
  console.log('\nTest 8: Slot Mismatch rejection');
  const mismatchRes = equipGarment(initial, 'top', 'GARMENT_bottom_jeans', 'male', MOCK_REGISTRY);
  assert.strictEqual(mismatchRes.result.valid, false);
  assert.ok(mismatchRes.result.error.includes('Slot mismatch'));
  console.log('✔ PASS: Equipping "bottom" garment into "top" slot rejected with explicit error message.');

  // 9. Avatar Incompatibility Validation
  console.log('\nTest 9: Avatar Compatibility rejection');
  const incompRes = equipGarment(initial, 'top', 'GARMENT_top_female_blouse', 'male', MOCK_REGISTRY);
  assert.strictEqual(incompRes.result.valid, false);
  assert.ok(incompRes.result.error.includes('Avatar incompatibility'));
  console.log('✔ PASS: Incompatible garment for active male avatar rejected cleanly.');

  // 10. Avatar Switch Auto-Purge
  console.log('\nTest 10: Avatar Switch auto-purge of incompatible garments');
  let femaleState = createEmptyOutfitState();
  femaleState = equipGarment(femaleState, 'top', 'GARMENT_top_female_blouse', 'female', MOCK_REGISTRY).state;
  femaleState = equipGarment(femaleState, 'bottom', 'GARMENT_bottom_jeans', 'female', MOCK_REGISTRY).state;

  assert.strictEqual(femaleState.top, 'GARMENT_top_female_blouse');
  assert.strictEqual(femaleState.bottom, 'GARMENT_bottom_jeans');

  const syncRes = syncOutfitForAvatar(femaleState, 'male', MOCK_REGISTRY);
  assert.strictEqual(syncRes.state.top, null, 'Female-only blouse must be purged on switch to male avatar');
  assert.strictEqual(syncRes.state.bottom, 'GARMENT_bottom_jeans', 'Unisex jeans must remain equipped');
  assert.strictEqual(syncRes.removedGarments.length, 1);
  assert.strictEqual(syncRes.removedGarments[0].garmentId, 'GARMENT_top_female_blouse');
  console.log('✔ PASS: Avatar switch retained compatible garments and purged incompatible ones.');

  // 11. Duplicate Prevention
  console.log('\nTest 11: Duplicate Prevention');
  const manager = new OutfitManager('male', createEmptyOutfitState(), MOCK_REGISTRY);
  manager.equip('top', 'GARMENT_top_shirt');
  manager.equip('top', 'GARMENT_top_shirt');
  manager.equip('top', 'GARMENT_top_shirt');

  const stateFromManager = manager.getOutfitState();
  assert.strictEqual(stateFromManager.top, 'GARMENT_top_shirt');
  assert.strictEqual(Object.keys(stateFromManager).length, 5);
  console.log('✔ PASS: Repeatedly equipping same slot maintains exactly 1 active garment entry.');

  // 12. Determinism Test
  console.log('\nTest 12: Determinism check');
  const seq1 = equipGarment(
    equipGarment(createEmptyOutfitState(), 'top', 'GARMENT_top_shirt', 'male', MOCK_REGISTRY).state,
    'bottom',
    'GARMENT_bottom_jeans',
    'male',
    MOCK_REGISTRY
  ).state;

  const seq2 = equipGarment(
    equipGarment(createEmptyOutfitState(), 'top', 'GARMENT_top_shirt', 'male', MOCK_REGISTRY).state,
    'bottom',
    'GARMENT_bottom_jeans',
    'male',
    MOCK_REGISTRY
  ).state;

  assert.deepStrictEqual(seq1, seq2, 'Identical operation sequence must yield identical output state');
  console.log('✔ PASS: State transitions are completely deterministic.');

  // 13. Attachment Resolver Test (Anchor-Local Transform Contract)
  console.log('\nTest 13: Attachment Resolver (Anchor-Local Transform Contract)');
  const transformMale = resolveGarmentTransform(MOCK_REGISTRY.GARMENT_top_shirt, 'male');
  assert.strictEqual(transformMale.garmentScale, 1.0, 'Male garment authored scale factor must resolve to 1.0');
  assert.strictEqual(transformMale.anchorJoint, ATTACHMENT_ANCHORS.top.primaryJoint);
  assert.strictEqual(transformMale.anchorJoint, 'spine_02');
  assert.deepStrictEqual(transformMale.localPosition, [0, 0, 0], 'Default localPosition must resolve to [0,0,0]');

  const transformFemale = resolveGarmentTransform(MOCK_REGISTRY.GARMENT_top_shirt, 'female');
  assert.strictEqual(transformFemale.garmentScale, 1.0, 'Female garment authored scale factor must resolve to 1.0');
  assert.strictEqual(transformFemale.anchorJoint, 'spine_02');
  console.log('✔ PASS: Attachment transforms resolved cleanly to anchor-local properties.');

  // --- SKELETAL ATTACHMENT ARCHITECTURE TESTS ---

  // 14. Existing Primary Joint Resolution
  console.log('\nTest 14: Existing Primary Joint Resolution from Avatar Scene');
  const maleSkeleton = createFixtureAvatarSkeleton('male');
  const resolvedBone = resolveAttachmentAnchor(maleSkeleton, 'top', 'male');
  assert.ok(resolvedBone, 'Must resolve a valid bone node');
  assert.strictEqual(resolvedBone.name, 'spine_02', 'Resolved bone name must match canonical primary joint "spine_02"');
  console.log('✔ PASS: Resolved expected primary THREE.Bone node from avatar skeleton hierarchy.');

  // 15. Strict Primary Joint Failure (Secondary Joints MUST NOT replace missing primary joint)
  console.log('\nTest 15: Strict Primary Joint Failure');
  // Skeleton missing primary joint "spine_02", but secondary joints ("spine_03") ARE present
  const skeletonWithSecondaryOnly = createFixtureAvatarSkeleton('male', ['spine_02']);
  assert.throws(
    () => resolveAttachmentAnchor(skeletonWithSecondaryOnly, 'top', 'male'),
    /Attachment Error: Required skeletal joint "spine_02" for slot "top" on avatar "male" was not found/,
    'Must throw explicit controlled Error when required primary joint is missing, even if secondary joints exist'
  );
  console.log('✔ PASS: Missing primary joint strictly failed without silent fallback to secondary joints.');

  // 15b. Non-Origin Anchor Bone Transform Test ([0, 1.25, 0])
  console.log('\nTest 15b: Non-Origin Anchor Bone Transform Test');
  const nonOriginAvatarRoot = new THREE.Group();
  const nonOriginBone = new THREE.Bone();
  nonOriginBone.name = 'spine_02';
  nonOriginBone.position.set(0, 1.25, 0); // Bone positioned away from origin
  nonOriginAvatarRoot.add(nonOriginBone);
  nonOriginAvatarRoot.updateMatrixWorld(true);

  const zeroOffsetGarmentGroup = new THREE.Group();
  attachGarmentToAnchor(zeroOffsetGarmentGroup, nonOriginBone, {
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0],
    garmentScale: 1.0,
    anchorJoint: 'spine_02',
  });
  nonOriginAvatarRoot.updateMatrixWorld(true);

  const zeroOffsetWorldPos = new THREE.Vector3();
  zeroOffsetGarmentGroup.getWorldPosition(zeroOffsetWorldPos);
  assert.strictEqual(zeroOffsetWorldPos.x, 0);
  assert.strictEqual(zeroOffsetWorldPos.y, 1.25, 'Garment world Y must equal anchor bone world Y [1.25]');
  assert.strictEqual(zeroOffsetWorldPos.z, 0);
  console.log('✔ PASS: Zero-offset garment world position matches non-origin anchor bone [0, 1.25, 0].');

  // 15c. Local Offset Test on Non-Origin Anchor
  console.log('\nTest 15c: Local Offset Test on Non-Origin Anchor');
  const offsetGarmentGroup = new THREE.Group();
  attachGarmentToAnchor(offsetGarmentGroup, nonOriginBone, {
    localPosition: [0, 0.10, 0],
    localRotation: [0, 0, 0],
    garmentScale: 1.0,
    anchorJoint: 'spine_02',
  });
  nonOriginAvatarRoot.updateMatrixWorld(true);

  const offsetWorldPos = new THREE.Vector3();
  offsetGarmentGroup.getWorldPosition(offsetWorldPos);
  assert.strictEqual(offsetWorldPos.y, 1.35, 'Garment world Y must equal 1.25 + 0.10 = 1.35');
  console.log('✔ PASS: Local position offset [0, 0.10, 0] added correctly relative to anchor bone.');

  // 15d. Scale Inheritance Test
  console.log('\nTest 15d: Scale Inheritance Test');
  const scaledAvatarRoot = new THREE.Group();
  scaledAvatarRoot.scale.setScalar(0.10); // Avatar root normalization scale
  const scaledBone = new THREE.Bone();
  scaledBone.name = 'spine_02';
  scaledAvatarRoot.add(scaledBone);
  scaledAvatarRoot.updateMatrixWorld(true);

  // Garment local scale = 1.0
  const scale1Garment = new THREE.Group();
  attachGarmentToAnchor(scale1Garment, scaledBone, {
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0],
    garmentScale: 1.0,
    anchorJoint: 'spine_02',
  });
  scaledAvatarRoot.updateMatrixWorld(true);

  const worldScale1 = new THREE.Vector3();
  scale1Garment.getWorldScale(worldScale1);
  assert.ok(Math.abs(worldScale1.x - 0.10) < 0.0001, 'Garment inherits avatar root scale (0.10 * 1.0 = 0.10)');

  // Garment local scale = 0.5
  const scaleHalfGarment = new THREE.Group();
  attachGarmentToAnchor(scaleHalfGarment, scaledBone, {
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0],
    garmentScale: 0.5,
    anchorJoint: 'spine_02',
  });
  scaledAvatarRoot.updateMatrixWorld(true);

  const worldScaleHalf = new THREE.Vector3();
  scaleHalfGarment.getWorldScale(worldScaleHalf);
  assert.ok(Math.abs(worldScaleHalf.x - 0.05) < 0.0001, 'Garment scale is 0.10 * 0.5 = 0.05');
  console.log('✔ PASS: Scale inheritance verified cleanly (0.10 * 1.0 = 0.10; 0.10 * 0.5 = 0.05).');

  // 16. Real Parent Relationship Check
  console.log('\nTest 16: Parent Relationship Check (garment.parent === anchorNode)');
  const garmentAGroup = new THREE.Group();
  garmentAGroup.name = 'garment-root-GARMENT_top_shirt';

  attachGarmentToAnchor(garmentAGroup, resolvedBone, transformMale);
  assert.strictEqual(garmentAGroup.parent, resolvedBone, 'Garment group must be parented inside resolvedBone');
  assert.ok(resolvedBone.children.includes(garmentAGroup), 'Garment group must exist in bone.children array');
  console.log('✔ PASS: Garment group genuinely parented inside avatar bone Object3D hierarchy.');

  // 17. Garment Replacement Hierarchy Test
  console.log('\nTest 17: Garment Replacement Hierarchy (A detached, B attached)');
  const garmentBGroup = new THREE.Group();
  garmentBGroup.name = 'garment-root-GARMENT_top_female_blouse';

  // Replace Garment A with Garment B
  detachGarmentFromAnchor(garmentAGroup);
  attachGarmentToAnchor(garmentBGroup, resolvedBone, transformFemale);

  assert.strictEqual(garmentAGroup.parent, null, 'Garment A must no longer be attached');
  assert.strictEqual(garmentBGroup.parent, resolvedBone, 'Garment B must be attached to bone');
  assert.strictEqual(resolvedBone.children.includes(garmentAGroup), false, 'Garment A removed from bone children');
  assert.strictEqual(resolvedBone.children.includes(garmentBGroup), true, 'Garment B present in bone children');
  console.log('✔ PASS: Garment replacement detached previous garment and attached new garment to bone.');

  // 18. Unequip Detachment Test
  console.log('\nTest 18: Unequip Detachment');
  detachGarmentFromAnchor(garmentBGroup);
  assert.strictEqual(garmentBGroup.parent, null, 'Unequipped garment must have null parent');
  assert.strictEqual(resolvedBone.children.includes(garmentBGroup), false, 'Unequipped garment removed from bone children');
  console.log('✔ PASS: Unequip detached garment cleanly from avatar skeleton.');

  // 19. Avatar Switching Re-parenting Test
  console.log('\nTest 19: Avatar Switch Re-parenting across Skeleton Graphs');
  const femaleSkeleton = createFixtureAvatarSkeleton('female');
  const femaleBone = resolveAttachmentAnchor(femaleSkeleton, 'top', 'female');

  // Attach to Male Skeleton
  attachGarmentToAnchor(garmentAGroup, resolvedBone, transformMale);
  assert.strictEqual(garmentAGroup.parent, resolvedBone);

  // Switch to Female Skeleton
  detachGarmentFromAnchor(garmentAGroup);
  attachGarmentToAnchor(garmentAGroup, femaleBone, transformFemale);

  assert.notStrictEqual(garmentAGroup.parent, resolvedBone, 'Must no longer be parented to male bone');
  assert.strictEqual(garmentAGroup.parent, femaleBone, 'Must be parented to female bone');
  assert.strictEqual(resolvedBone.children.includes(garmentAGroup), false);
  assert.strictEqual(femaleBone.children.includes(garmentAGroup), true);
  console.log('✔ PASS: Garment re-parented cleanly from male skeleton to female skeleton on avatar switch.');

  // 20. All 5 Canonical Primary Joints Tested on Non-Origin Bones
  console.log('\nTest 20: All 5 Canonical Primary Joints Tested on Non-Origin Bones');
  const multiJointSkeleton = new THREE.Group();
  multiJointSkeleton.scale.setScalar(0.11);

  const jointsDef = [
    { slot: 'top', jointName: 'spine_02', pos: [0, 1.2, 0] },
    { slot: 'bottom', jointName: 'pelvis', pos: [0, 0.8, 0] },
    { slot: 'feet', jointName: 'foot_l', pos: [-0.15, 0.1, 0] },
    { slot: 'waist', jointName: 'spine_01', pos: [0, 0.9, 0] },
    { slot: 'hand', jointName: 'hand_r', pos: [0.4, 1.0, 0] },
  ];

  jointsDef.forEach(({ slot, jointName, pos }) => {
    const bone = new THREE.Bone();
    bone.name = jointName;
    bone.position.set(...pos);
    multiJointSkeleton.add(bone);
  });
  multiJointSkeleton.updateMatrixWorld(true);

  jointsDef.forEach(({ slot, jointName, pos }) => {
    const resolved = resolveAttachmentAnchor(multiJointSkeleton, slot, 'male');
    assert.strictEqual(resolved.name, jointName);

    const garmentGrp = new THREE.Group();
    attachGarmentToAnchor(garmentGrp, resolved, {
      localPosition: [0, 0, 0],
      localRotation: [0, 0, 0],
      garmentScale: 1.0,
      anchorJoint: jointName,
    });
    multiJointSkeleton.updateMatrixWorld(true);

    assert.strictEqual(garmentGrp.parent, resolved, `Garment for slot "${slot}" must be parented to bone "${jointName}"`);
    assert.strictEqual(garmentGrp.position.y, 0, 'Local Y position must be 0 relative to bone');

    const gWorldPos = new THREE.Vector3();
    garmentGrp.getWorldPosition(gWorldPos);
    const expectedWorldY = pos[1] * 0.11;
    assert.ok(Math.abs(gWorldPos.y - expectedWorldY) < 0.0001, `World Y position (${gWorldPos.y}) must equal bone world Y (${expectedWorldY})`);
  });
  console.log('✔ PASS: All 5 canonical primary joints verified on non-origin bones.');

  // 21. Real T-Shirt Asset Verification
  console.log('\nTest 21: Real T-Shirt Asset Verification');
  const tshirtGlbPath = 'public/models/garment/top/GARMENT_top_basic_tshirt.glb';
  assert.ok(fs.existsSync(tshirtGlbPath), 'GARMENT_top_basic_tshirt.glb must exist on disk');

  const tshirtBuf = fs.readFileSync(tshirtGlbPath);
  assert.ok(tshirtBuf.length > 0, 'GARMENT_top_basic_tshirt.glb must not be empty');

  // Parse GLB header and verify bone-local bounds
  const jsonLen = tshirtBuf.readUInt32LE(12);
  const jsonStr = tshirtBuf.toString('utf8', 20, 20 + jsonLen);
  const tshirtGlTF = JSON.parse(jsonStr);

  const posAccessor = tshirtGlTF.accessors[0];
  assert.ok(posAccessor.min[1] < 0 && posAccessor.min[1] > -5, 'T-shirt local Y min must be centered around bone origin [0,0,0]');
  assert.ok(posAccessor.max[1] > 0 && posAccessor.max[1] < 5, 'T-shirt local Y max must be centered around bone origin [0,0,0]');
  console.log(`✔ PASS: Real T-shirt GLB asset bounds verified as bone-local: Min ${JSON.stringify(posAccessor.min)}, Max ${JSON.stringify(posAccessor.max)}.`);

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All Outfit State & Attachment Unit Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runOutfitTests();
