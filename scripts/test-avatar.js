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
    },
    {
      id: 'female',
      name: 'Female Base Avatar',
      path: path.join(__dirname, '../public/models/avatar/female/base-avatar.glb'),
    },
  ];

  avatars.forEach((avatar) => {
    console.log(`Testing avatar [${avatar.id}]: ${avatar.name}`);

    // 1. Verify file exists
    assert.strictEqual(
      fs.existsSync(avatar.path),
      true,
      `Avatar GLB file must exist at ${avatar.path}`
    );

    // 2. Verify file size
    const stats = fs.statSync(avatar.path);
    console.log(`  File size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
    assert.ok(stats.size > 10000, `Avatar [${avatar.id}] size must be > 10 KB`);

    // 3. Verify GLB header magic
    const buffer = fs.readFileSync(avatar.path);
    const magic = buffer.toString('ascii', 0, 4);
    assert.strictEqual(magic, 'glTF', `Avatar [${avatar.id}] must have valid glTF magic header`);

    const version = buffer.readUInt32LE(4);
    assert.strictEqual(version, 2, `Avatar [${avatar.id}] glTF version must be 2`);

    // 4. Parse JSON chunk to verify skeleton & nodes
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    assert.strictEqual(jsonChunkType, 0x4E4F534A, `Avatar [${avatar.id}] first chunk must be JSON`);

    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    const gltf = JSON.parse(jsonStr);

    assert.ok(gltf.nodes && gltf.nodes.length > 0, `Avatar [${avatar.id}] must contain scene nodes`);
    assert.ok(gltf.meshes && gltf.meshes.length > 0, `Avatar [${avatar.id}] must contain meshes`);

    const nodeNames = gltf.nodes.map((n) => n.name).filter(Boolean);
    console.log(`  Found ${nodeNames.length} named nodes/joints in ${avatar.id} model`);
    console.log(`✓ PASS: Avatar [${avatar.id}] verified successfully`);
  });

  console.log('--- ALL DUAL AVATAR ASSET TESTS PASSED SUCCESSFULLY ---');
}

testAvatarAssets();
