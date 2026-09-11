'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Platform3DAsset, Garment3DAsset, Avatar3DAsset, AssetType, AssetSourceType } from '@/types/asset';
import { GarmentSlot, CANONICAL_GARMENT_SLOTS } from '@/types/garment';
import { getAssetRecordAction, updateAssetAction, deleteAssetAction } from '@/app/admin/actions';
import { resolveAssetUrl } from '@/lib/3d/assetDelivery';
import { ViewerCanvas } from '@/components/3d/ViewerCanvas';
import { ModelLoader } from '@/components/3d/ModelLoader';
import { AdminHeader, AdminNotice } from '@/app/admin/AdminComponents';
import styles from '@/app/admin/admin.module.css';

export default function EditAssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const resolvedParams = use(params);
  const rawAssetId = decodeURIComponent(resolvedParams.assetId);

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Asset fields
  const [assetId, setAssetId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('garment');
  const [displayName, setDisplayName] = useState('');
  const [schemaVersion, setSchemaVersion] = useState('1.0');
  const [version, setVersion] = useState('1.0.0');

  // Garment
  const [slot, setSlot] = useState<GarmentSlot>('top');
  const [supportedAvatarIdsText, setSupportedAvatarIdsText] = useState('');

  // Avatar
  const [avatarId, setAvatarId] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('male');

  // Location
  const [source, setSource] = useState<AssetSourceType>('local');
  const [path, setPath] = useState('');
  const [provider, setProvider] = useState('');
  const [objectKey, setObjectKey] = useState('');

  // Aliases
  const [aliasesText, setAliasesText] = useState('');

  // 3D Runtime Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /**
   * Single authoritative asset data loader.
   */
  const loadAssetData = useCallback(async () => {
    const record = await getAssetRecordAction(rawAssetId);
    if (!record) {
      setError(`Asset record "${rawAssetId}" not found.`);
      setLoading(false);
      return;
    }

    setError(null);
    const { asset, aliasIds } = record;
    setAssetId(asset.assetId);
    setAssetType(asset.assetType);
    setDisplayName(asset.displayName);
    setSchemaVersion(asset.schemaVersion);
    setVersion(asset.version);

    if (asset.assetType === 'garment') {
      const g = asset as Garment3DAsset;
      setSlot(g.slot);
      setSupportedAvatarIdsText((g.supportedAvatarIds || []).join(', '));
    } else if (asset.assetType === 'avatar') {
      const a = asset as Avatar3DAsset;
      setAvatarId(a.avatarId);
      setGender(a.gender);
    }

    setSource(asset.location.source);
    setPath(asset.location.path || '');
    setProvider(asset.location.provider || '');
    setObjectKey(asset.location.objectKey || '');

    setAliasesText((aliasIds || []).join(', '));

    try {
      const url = resolveAssetUrl(asset);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    }
    setLoading(false);
  }, [rawAssetId]);

  useEffect(() => {
    let mounted = true;

    Promise.resolve().then(() => {
      if (!mounted) return;
      loadAssetData().catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error loading asset record.');
          setLoading(false);
        }
      });
    });

    return () => {
      mounted = false;
    };
  }, [loadAssetData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const trimmedAssetId = assetId.trim();
      const trimmedDisplayName = displayName.trim();

      const aliasIds = aliasesText
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const location = {
        source,
        ...(path.trim() ? { path: path.trim() } : {}),
        ...(provider.trim() ? { provider: provider.trim() } : {}),
        ...(objectKey.trim() ? { objectKey: objectKey.trim() } : {}),
      };

      let updatedAsset: Platform3DAsset;

      if (assetType === 'garment') {
        const supportedAvatarIds = supportedAvatarIdsText
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0);

        updatedAsset = {
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
        updatedAsset = {
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
        updatedAsset = {
          assetId: trimmedAssetId,
          assetType,
          displayName: trimmedDisplayName,
          schemaVersion: schemaVersion.trim(),
          version: version.trim(),
          location,
        };
      }

      await updateAssetAction(rawAssetId, updatedAsset, aliasIds);
      setSuccess(`Asset "${trimmedAssetId}" updated successfully.`);
      await loadAssetData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating asset record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const deleted = await deleteAssetAction(rawAssetId);
      if (deleted) {
        router.push('/admin/assets');
      } else {
        setError(`Failed to delete asset "${rawAssetId}". Record not found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting asset.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  return (
    <div className={styles.container}>
      <AdminHeader />

      <main className={styles.content}>
        <AdminNotice />

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link href="/admin/assets" className={styles.button}>
            ← Back to Asset List
          </Link>

          <button className={styles.dangerButton} onClick={() => setShowDeleteModal(true)}>
            Delete Asset Record
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success && <div className={styles.successBanner}>{success}</div>}

        {loading ? (
          <div className={styles.loadingState}>Loading asset record data...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* 3D Asset Preview Section */}
            {previewUrl && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>3D Asset Model Preview</h3>
                  <span style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
                    Resolved URL: <code style={{ color: '#0071e3' }}>{previewUrl}</code>
                  </span>
                </div>
                <div className={styles.previewContainer}>
                  <ViewerCanvas>
                    <ambientLight intensity={1.2} />
                    <directionalLight position={[2, 4, 3]} intensity={1.5} />
                    <ModelLoader url={previewUrl} />
                  </ViewerCanvas>
                </div>
              </div>
            )}

            {/* Form */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Inspect & Edit Asset Record ({rawAssetId})</h2>
              </div>

              <form onSubmit={handleSubmit} className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asset ID</label>
                  <input type="text" disabled className={styles.input} value={assetId} style={{ backgroundColor: '#f2f2f7' }} />
                  <span className={styles.helperText}>Primary identifier (read-only on edit).</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Display Name *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Asset Type *</label>
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

                {assetType === 'garment' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Garment Slot *</label>
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
                      <label className={styles.label}>Supported Avatar IDs *</label>
                      <input
                        type="text"
                        required
                        className={styles.input}
                        value={supportedAvatarIdsText}
                        onChange={(e) => setSupportedAvatarIdsText(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {assetType === 'avatar' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Avatar ID *</label>
                      <input
                        type="text"
                        required
                        className={styles.input}
                        value={avatarId}
                        onChange={(e) => setAvatarId(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Gender *</label>
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>Schema Version *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={schemaVersion}
                    onChange={(e) => setSchemaVersion(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Asset Version *</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>

                <div className={styles.formGroupFull} style={{ marginTop: '1rem', borderTop: '1px solid #e5e5ea', paddingTop: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>AssetLocation Specification</h3>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Source Type *</label>
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
                      <label className={styles.label}>Provider ID *</label>
                      <input
                        type="text"
                        required
                        className={styles.input}
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Object Key *</label>
                      <input
                        type="text"
                        required
                        className={styles.input}
                        value={objectKey}
                        onChange={(e) => setObjectKey(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Path / URL *</label>
                    <input
                      type="text"
                      required
                      className={styles.input}
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.formGroupFull} style={{ marginTop: '1rem', borderTop: '1px solid #e5e5ea', paddingTop: '1rem' }}>
                  <label className={styles.label}>Lookup Aliases</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={aliasesText}
                    onChange={(e) => setAliasesText(e.target.value)}
                  />
                  <span className={styles.helperText}>Comma-separated lookup identifiers.</span>
                </div>

                <div className={styles.formGroupFull} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                  <button type="submit" className={styles.primaryButton} disabled={submitting}>
                    {submitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                  <Link href="/admin/assets" className={styles.button}>
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 style={{ marginTop: 0, color: '#d70015' }}>Confirm Destructive Deletion</h3>
            <p style={{ fontSize: '0.9rem', color: '#1d1d1f' }}>
              Are you sure you want to delete the 3D asset record for <strong>{rawAssetId}</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
              This operation removes the metadata record and all associated lookup aliases from the AssetRepository. It does NOT delete physical GLB files or binary storage objects.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className={styles.button} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className={styles.dangerButton} onClick={handleDeleteConfirm}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
