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

    // 2. Verify file size
    const stats = fs.statSync(avatar.path);
    console.log(`  File size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
    assert.ok(stats.size > 10000, `Avatar [${avatar.id}] size must be > 10 KB`);

    // 3. Verify GLB header structure (magic, version, JSON chunk)
    const buffer = fs.readFileSync(avatar.path);
    const magic = buffer.toString('ascii', 0, 4);
    assert.strictEqual(magic, 'glTF', `Avatar [${avatar.id}] must have valid glTF magic header`);

    const version = buffer.readUInt32LE(4);
    assert.strictEqual(version, 2, `Avatar [${avatar.id}] glTF version must be 2`);

    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    assert.strictEqual(jsonChunkType, 0x4E4F534A, `Avatar [${avatar.id}] first chunk must be JSON`);

    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    const gltf = JSON.parse(jsonStr);

    assert.ok(gltf.scenes && gltf.scenes.length > 0, `Avatar [${avatar.id}] must contain scenes`);
    assert.ok(gltf.nodes && gltf.nodes.length > 0, `Avatar [${avatar.id}] must contain scene nodes`);
    assert.ok(gltf.meshes && gltf.meshes.length > 0, `Avatar [${avatar.id}] must contain meshes`);

    // 4. Validate Skin / Skeleton structure
    assert.ok(
      gltf.skins && gltf.skins.length > 0,
      `Avatar [${avatar.id}] must contain at least one skin definition`
    );

    const skin = gltf.skins[0];
    assert.ok(
      Array.isArray(skin.joints) && skin.joints.length > 0,
      `Skin in [${avatar.id}] must contain a non-empty joints array`
    );

    // 5. Verify joint indices reference valid nodes
    skin.joints.forEach((jointIndex, idx) => {
      assert.ok(
        jointIndex >= 0 && jointIndex < gltf.nodes.length,
        `Joint index ${jointIndex} at position ${idx} in [${avatar.id}] must point to an existing node`
      );
    });

    // 6. Verify exact skin joint count matches armature spec (53 joints)
    console.log(`  Actual joint count in skin: ${skin.joints.length}`);
    assert.strictEqual(
      skin.joints.length,
      avatar.expectedJointCount,
      `Avatar [${avatar.id}] skin must contain exactly ${avatar.expectedJointCount} joints`
    );

    // 7. Verify skinned mesh node association
    const skinnedNode = gltf.nodes.find((n) => n.skin === 0 && n.mesh !== undefined);
    assert.ok(
      skinnedNode,
      `Avatar [${avatar.id}] must contain a mesh node associated with skin index 0`
    );

    // 8. Validate parent-child skeletal hierarchy linkage
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

    console.log(`✓ PASS: Avatar [${avatar.id}] GLB structure, skinning, and hierarchy verified successfully`);
  });

  console.log('--- ALL DUAL AVATAR ASSET TESTS PASSED SUCCESSFULLY ---');
}

testAvatarAssets();
