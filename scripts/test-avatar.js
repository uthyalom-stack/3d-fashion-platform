const fs = require('fs');
const path = require('path');
const assert = require('assert');

function testAvatarAsset() {
  console.log('--- Starting Avatar Asset Unit Tests ---');

  const avatarPath = path.join(__dirname, '../public/models/avatar/base-avatar.glb');

  // 1. Verify file exists
  assert.strictEqual(fs.existsSync(avatarPath), true, 'Avatar GLB file must exist at public/models/avatar/base-avatar.glb');

  // 2. Verify file size is reasonable
  const stats = fs.statSync(avatarPath);
  console.log(`Avatar GLB File Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
  assert.ok(stats.size > 10000, 'Avatar GLB file size must be greater than 10 KB');
  assert.ok(stats.size < 5000000, 'Avatar GLB file size must be less than 5 MB');

  // 3. Verify GLB header magic
  const buffer = fs.readFileSync(avatarPath);
  const magic = buffer.toString('ascii', 0, 4);
  assert.strictEqual(magic, 'glTF', 'File must have valid glTF header magic');

  const version = buffer.readUInt32LE(4);
  assert.strictEqual(version, 2, 'glTF format version must be 2');

  // 4. Parse JSON chunk to verify skeleton & joints
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  assert.strictEqual(jsonChunkType, 0x4E4F534A, 'First GLB chunk must be JSON');

  const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
  const gltf = JSON.parse(jsonStr);

  assert.ok(gltf.nodes && gltf.nodes.length > 0, 'GLTF must contain scene nodes');
  assert.ok(gltf.meshes && gltf.meshes.length > 0, 'GLTF must contain meshes');

  // Verify key joints exist in node list
  const nodeNames = gltf.nodes.map((n) => n.name).filter(Boolean);
  console.log(`Found ${nodeNames.length} named nodes/joints in Avatar model`);

  const requiredJoints = [
    'torso_joint_1',
    'arm_joint_L_1',
    'arm_joint_R_1',
    'leg_joint_L_1',
    'leg_joint_R_1',
  ];

  requiredJoints.forEach((joint) => {
    assert.ok(
      nodeNames.includes(joint),
      `Avatar skeletal node hierarchy must contain joint '${joint}'`
    );
  });

  console.log('✓ PASS: All required skeletal joints present in Avatar model');
  console.log('--- ALL AVATAR ASSET TESTS PASSED SUCCESSFULLY ---');
}

testAvatarAsset();
