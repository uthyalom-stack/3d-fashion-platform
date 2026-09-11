'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Platform3DAsset, AssetType, AssetSourceType } from '@/types/asset';
import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '@/types/garment';
import { createAssetAction } from '@/app/admin/actions';
import { AdminHeader, AdminNotice } from '@/app/admin/AdminComponents';
import styles from '@/app/admin/admin.module.css';

export default function NewAssetPage() {
  const router = useRouter();

  const [assetId, setAssetId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('garment');
  const [displayName, setDisplayName] = useState('');
  const [schemaVersion, setSchemaVersion] = useState('1.0');
  const [version, setVersion] = useState('1.0.0');

  // Garment specific
  const [slot, setSlot] = useState<GarmentSlot>('top');
  const [supportedAvatarIdsText, setSupportedAvatarIdsText] = useState('male, female');

  // Avatar specific
  const [avatarId, setAvatarId] = useState('male');
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('male');

  // AssetLocation
  const [source, setSource] = useState<AssetSourceType>('local');
  const [path, setPath] = useState('');
  const [provider, setProvider] = useState('');
  const [objectKey, setObjectKey] = useState('');

  // Aliases
  const [aliasesText, setAliasesText] = useState('');

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const trimmedAssetId = assetId.trim();
      const trimmedDisplayName = displayName.trim();

      // Parse aliases
      const aliasIds = aliasesText
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      // Build AssetLocation
      const location = {
        source,
        ...(path.trim() ? { path: path.trim() } : {}),
        ...(provider.trim() ? { provider: provider.trim() } : {}),
        ...(objectKey.trim() ? { objectKey: objectKey.trim() } : {}),
      };

      let newAsset: Platform3DAsset;

      if (assetType === 'garment') {
        const supportedAvatarIds = supportedAvatarIdsText
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0);

        newAsset = {
          assetId: trimmedAssetId,
          assetType: 'garment',
          displayName: trimmedDisplayName,
          schemaVersion: schemaVersion.trim(),
          version: version.trim(),
          location,
          slot,
          supportedAvatarIds,
        };
      } else if (assetType === 'avatar') {
        newAsset = {
          assetId: trimmedAssetId,
          assetType: 'avatar',
          displayName: trimmedDisplayName,
          schemaVersion: schemaVersion.trim(),
          version: version.trim(),
          location,
          avatarId: avatarId.trim() as 'male' | 'female',
          gender,
          scale: 1.0,
          positionOffset: [0, 0, 0],
          rotationOffset: [0, 0, 0],
        };
      } else {
        newAsset = {
          assetId: trimmedAssetId,
          assetType,
          displayName: trimmedDisplayName,
          schemaVersion: schemaVersion.trim(),
          version: version.trim(),
          location,
        };
      }

      await createAssetAction(newAsset, aliasIds);
      router.push('/admin/assets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred creating asset record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <AdminHeader />

      <main className={styles.content}>
        <AdminNotice />

        <div style={{ marginBottom: '1rem' }}>
          <Link href="/admin/assets" className={styles.button}>
            ← Back to Asset List
          </Link>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Register New 3D Asset Record</h2>
          </div>

          <form onSubmit={handleSubmit} className={styles.formGrid}>
            {/* Asset ID */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Asset ID <span style={{ color: '#d70015' }}>*</span>
              </label>
              <input
                type="text"
                required
                className={styles.input}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g. garment.top.linen-shirt"
              />
              <span className={styles.helperText}>
                Filesystem-safe identifier (alphanumeric, dot, dash, underscore).
              </span>
            </div>

            {/* Display Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Display Name <span style={{ color: '#d70015' }}>*</span>
              </label>
              <input
                type="text"
                required
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Linen Short-Sleeve Shirt"
              />
            </div>

            {/* Asset Type */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Asset Type <span style={{ color: '#d70015' }}>*</span>
              </label>
              <select
                className={styles.select}
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
              >
                <option value="garment">Garment</option>
                <option value="avatar">Avatar</option>
                <option value="accessory">Accessory</option>
                <option value="prop">Prop</option>
                <option value="environment">Environment</option>
              </select>
            </div>

            {/* Garment Specific Options */}
            {assetType === 'garment' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Garment Slot <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={slot}
                    onChange={(e) => setSlot(e.target.value as GarmentSlot)}
                  >
                    {CANONICAL_GARMENT_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Supported Avatar IDs <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={supportedAvatarIdsText}
                    onChange={(e) => setSupportedAvatarIdsText(e.target.value)}
                    placeholder="e.g. male, female"
                  />
                  <span className={styles.helperText}>Comma-separated list of compatible avatar IDs.</span>
                </div>
              </>
            )}

            {/* Avatar Specific Options */}
            {assetType === 'avatar' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Avatar ID <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={avatarId}
                    onChange={(e) => setAvatarId(e.target.value)}
                    placeholder="e.g. male or female"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Gender <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'unisex')}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
              </>
            )}

            {/* Schema & Version */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Schema Version <span style={{ color: '#d70015' }}>*</span>
              </label>
              <input
                type="text"
                required
                className={styles.input}
                value={schemaVersion}
                onChange={(e) => setSchemaVersion(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Asset Version <span style={{ color: '#d70015' }}>*</span>
              </label>
              <input
                type="text"
                required
                className={styles.input}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
              />
            </div>

            {/* AssetLocation Contract Section */}
            <div className={styles.formGroupFull} style={{ marginTop: '1rem', borderTop: '1px solid #e5e5ea', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>AssetLocation Specification</h3>
              <p className={styles.helperText} style={{ marginTop: '2px' }}>
                Authoritative vendor-neutral location metadata pointing to the 3D GLB binary.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Source Type <span style={{ color: '#d70015' }}>*</span>
              </label>
              <select
                className={styles.select}
                value={source}
                onChange={(e) => setSource(e.target.value as AssetSourceType)}
              >
                <option value="local">Local (/models/...)</option>
                <option value="provider">Managed Storage Provider</option>
                <option value="remote">Remote HTTPS URL</option>
              </select>
            </div>

            {source === 'provider' ? (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Provider ID <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. local or r2"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Object Key <span style={{ color: '#d70015' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={objectKey}
                    onChange={(e) => setObjectKey(e.target.value)}
                    placeholder="e.g. garments/top/v1.0.0/linen-shirt.glb"
                  />
                </div>
              </>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Path / URL <span style={{ color: '#d70015' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder={
                    source === 'local'
                      ? '/models/garment/top/GARMENT_top_linen_shirt.glb'
                      : 'https://cdn.example.com/models/linen-shirt.glb'
                  }
                />
              </div>
            )}

            {/* Aliases */}
            <div className={styles.formGroupFull} style={{ marginTop: '1rem', borderTop: '1px solid #e5e5ea', paddingTop: '1rem' }}>
              <label className={styles.label}>Lookup Aliases</label>
              <input
                type="text"
                className={styles.input}
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
                placeholder="e.g. linen_shirt_v1, GARMENT_top_linen_shirt"
              />
              <span className={styles.helperText}>
                Comma-separated secondary lookup identifiers. Reassignment across assets is atomic.
              </span>
            </div>

            {/* Actions */}
            <div className={styles.formGroupFull} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button type="submit" className={styles.primaryButton} disabled={submitting}>
                {submitting ? 'Persisting Asset...' : 'Save & Register Asset'}
              </button>
              <Link href="/admin/assets" className={styles.button}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
