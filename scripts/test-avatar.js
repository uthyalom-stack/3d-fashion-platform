const fs = require('fs');
const path = require('path');
const assert = require('assert');

function testAvatarAssets() {
  console.log('--- Starting Dual Avatar Assets Unit Tests ---');

  const avatars = [
    {
      id: 'male',
      name: 'Male Base Avatar',
      path: path.join(__dirname, '../public/models/avatar/male/base-avatar.glb'),
      expectedJointCount: 53,
    },
    {
      id: 'female',
      name: 'Female Base Avatar',
      path: path.join(__dirname, '../public/models/avatar/female/base-avatar.glb'),
      expectedJointCount: 53,
    },
  ];

  avatars.forEach((avatar) => {
    console.log(`Testing avatar [${avatar.id}]: ${avatar.name}`);

    // 1. Verify file existence
    assert.strictEqual(
      fs.existsSync(avatar.path),
      true,
      `Avatar GLB file must exist at ${avatar.path}`
    );

    const stats = fs.statSync(avatar.path);
    console.log(`  File size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);

    // 2. GLB Structural Sanity & Bounds Checks
    assert.ok(stats.size >= 20, `Avatar [${avatar.id}] buffer too small to contain valid GLB header`);

    const buffer = fs.readFileSync(avatar.path);

    const magic = buffer.toString('ascii', 0, 4);
    assert.strictEqual(magic, 'glTF', `Avatar [${avatar.id}] must have valid 'glTF' magic header`);

    const version = buffer.readUInt32LE(4);
    assert.strictEqual(version, 2, `Avatar [${avatar.id}] glTF version must be 2`);

    const declaredTotalLength = buffer.readUInt32LE(8);
    assert.strictEqual(
      declaredTotalLength,
      stats.size,
      `Avatar [${avatar.id}] declared total GLB length (${declaredTotalLength}) must match file size (${stats.size})`
    );

    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);

    assert.strictEqual(
      jsonChunkType,
      0x4E4F534A,
      `Avatar [${avatar.id}] first chunk must be JSON (0x4E4F534A)`
    );

    assert.ok(
      20 + jsonChunkLength <= declaredTotalLength,
      `Avatar [${avatar.id}] JSON chunk extends beyond file boundary`
    );

    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    let gltf;
    try {
      gltf = JSON.parse(jsonStr);
    } catch (err) {
      assert.fail(`Avatar [${avatar.id}] JSON chunk parsing failed: ${err.message}`);
    }

    assert.ok(gltf.scenes && gltf.scenes.length > 0, `Avatar [${avatar.id}] must contain scenes`);
    assert.ok(gltf.nodes && gltf.nodes.length > 0, `Avatar [${avatar.id}] must contain scene nodes`);
    assert.ok(gltf.meshes && gltf.meshes.length > 0, `Avatar [${avatar.id}] must contain meshes`);

    // 3. Mesh / Skin Association Checks
    const skinnedMeshNode = gltf.nodes.find(
      (node) => node.mesh !== undefined && node.skin !== undefined
    );

    assert.ok(
      skinnedMeshNode,
      `Avatar [${avatar.id}] must contain at least one mesh node associated with skinning (node.skin)`
    );

    const skinIndex = skinnedMeshNode.skin;
    assert.ok(
      gltf.skins && Array.isArray(gltf.skins) && skinIndex >= 0 && skinIndex < gltf.skins.length,
      `Avatar [${avatar.id}] skinned mesh node references invalid skin index: ${skinIndex}`
    );

    const skin = gltf.skins[skinIndex];

    // 4. Skin & Inverse Bind Matrices Validation
    assert.ok(
      Array.isArray(skin.joints) && skin.joints.length > 0,
      `Skin in [${avatar.id}] must contain a non-empty joints array`
    );

    // Verify exact skin joint count matches armature spec (53 joints)
    console.log(`  Actual joint count in skin index ${skinIndex}: ${skin.joints.length}`);
    assert.strictEqual(
      skin.joints.length,
      avatar.expectedJointCount,
      `Avatar [${avatar.id}] skin must contain exactly ${avatar.expectedJointCount} joints`
    );

    // Verify every joint index in skin references an existing node
    skin.joints.forEach((jointIndex, idx) => {
      assert.ok(
        jointIndex >= 0 && jointIndex < gltf.nodes.length,
        `Joint index ${jointIndex} at position ${idx} in [${avatar.id}] must point to an existing node`
      );
    });

    // Validate inverseBindMatrices accessor if present
    if (skin.inverseBindMatrices !== undefined) {
      assert.ok(
        gltf.accessors && skin.inverseBindMatrices >= 0 && skin.inverseBindMatrices < gltf.accessors.length,
        `Avatar [${avatar.id}] inverseBindMatrices index ${skin.inverseBindMatrices} is out of accessors bounds`
      );

      const ibmAccessor = gltf.accessors[skin.inverseBindMatrices];
      assert.strictEqual(
        ibmAccessor.type,
        'MAT4',
        `Avatar [${avatar.id}] inverseBindMatrices accessor type must be MAT4`
      );
      assert.strictEqual(
        ibmAccessor.componentType,
        5126,
        `Avatar [${avatar.id}] inverseBindMatrices accessor componentType must be FLOAT (5126)`
      );
      assert.strictEqual(
        ibmAccessor.count,
        skin.joints.length,
        `Avatar [${avatar.id}] inverseBindMatrices accessor count (${ibmAccessor.count}) must match joint count (${skin.joints.length})`
      );
    }

    // Validate skeleton root node reference if present
    if (skin.skeleton !== undefined) {
      assert.ok(
        skin.skeleton >= 0 && skin.skeleton < gltf.nodes.length,
        `Avatar [${avatar.id}] skin skeleton root node index ${skin.skeleton} is invalid`
      );
    }

    // 5. Parent-Child Skeletal Hierarchy Linkage Checks
    const parentMap = {};
    gltf.nodes.forEach((node, nodeIdx) => {
      if (node.children) {
        node.children.forEach((childIdx) => {
          parentMap[childIdx] = nodeIdx;
        });
      }
    });

    const nameToNodeIdx = {};
    gltf.nodes.forEach((n, idx) => {
      if (n.name) nameToNodeIdx[n.name] = idx;
    });

    function assertParentChild(parentName, childName) {
      const parentIdx = nameToNodeIdx[parentName];
      const childIdx = nameToNodeIdx[childName];
      assert.ok(parentIdx !== undefined, `Parent node '${parentName}' missing in [${avatar.id}]`);
      assert.ok(childIdx !== undefined, `Child node '${childName}' missing in [${avatar.id}]`);
      assert.strictEqual(
        parentMap[childIdx],
        parentIdx,
        `Joint '${childName}' must be a direct child of '${parentName}' in [${avatar.id}]`
      );
    }

    // Verify key skeletal relationships
    assertParentChild('Root', 'pelvis');
    assertParentChild('pelvis', 'spine_01');
    assertParentChild('spine_01', 'spine_02');
    assertParentChild('spine_02', 'spine_03');
    assertParentChild('spine_03', 'clavicle_l');
    assertParentChild('spine_03', 'clavicle_r');
    assertParentChild('spine_03', 'neck_01');
    assertParentChild('neck_01', 'head');
    assertParentChild('clavicle_l', 'upperarm_l');
    assertParentChild('clavicle_r', 'upperarm_r');
    assertParentChild('upperarm_l', 'lowerarm_l');
    assertParentChild('upperarm_r', 'lowerarm_r');
    assertParentChild('lowerarm_l', 'hand_l');
    assertParentChild('lowerarm_r', 'hand_r');
    assertParentChild('pelvis', 'thigh_l');
    assertParentChild('pelvis', 'thigh_r');
    assertParentChild('thigh_l', 'calf_l');
    assertParentChild('thigh_r', 'calf_r');
    assertParentChild('calf_l', 'foot_l');
    assertParentChild('calf_r', 'foot_r');
    assertParentChild('foot_l', 'ball_l');
    assertParentChild('foot_r', 'ball_r');

    console.log(`✓ PASS: Avatar [${avatar.id}] GLB bounds, skinning, accessors, and skeletal hierarchy verified successfully`);
  });

  console.log('--- ALL DUAL AVATAR ASSET TESTS PASSED SUCCESSFULLY ---');
}

testAvatarAssets();
