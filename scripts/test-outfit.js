const assert = require('assert');
const path = require('path');

// Register ts-node with extensions so Node can resolve `.ts` files
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      moduleResolution: 'node',
    },
  });
} catch (e) {
  // Fallback
}

// Ensure .ts extensions are tried during CJS module resolution
if (require.extensions) {
  ['.ts', '.tsx'].forEach((ext) => {
    if (!require.extensions[ext]) {
      require.extensions[ext] = require.extensions['.js'];
    }
  });
}

try {
  const tsconfigPaths = require('tsconfig-paths');
  tsconfigPaths.register({
    baseUrl: path.resolve(__dirname, '..'),
    paths: { '@/*': ['./src/*'] },
  });
} catch (e) {
  // Fallback
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
  ATTACHMENT_ANCHORS,
} = require('../src/lib/3d/attachmentResolver');

const { CANONICAL_GARMENT_SLOTS } = require('../src/types/garment');

function runOutfitTests() {
  console.log('====================================================');
  console.log('Phase 4 — Outfit State & Garment Attachment Unit Tests');
  console.log('====================================================\n');

  // Mock Garment Registry Fixtures for WebGL-independent state testing
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

  // 13. Attachment Resolver Test
  console.log('\nTest 13: Attachment Resolver');
  const transformMale = resolveGarmentTransform(MOCK_REGISTRY.GARMENT_top_shirt, 'male');
  assert.strictEqual(transformMale.scale, 0.11, 'Male scale factor resolved correctly');
  assert.strictEqual(transformMale.anchorJoint, ATTACHMENT_ANCHORS.top.primaryJoint);
  assert.strictEqual(transformMale.anchorJoint, 'spine_02');

  const transformFemale = resolveGarmentTransform(MOCK_REGISTRY.GARMENT_top_shirt, 'female');
  assert.strictEqual(transformFemale.scale, 0.10, 'Female scale factor resolved correctly');
  assert.strictEqual(transformFemale.anchorJoint, 'spine_02');

  console.log('✔ PASS: Attachment transforms and skeletal anchor points resolved correctly.');

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: All Outfit State & Attachment Unit Tests Passed!\x1b[0m');
  console.log('====================================================');
}

runOutfitTests();
