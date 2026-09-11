'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PersistedAssetRecord } from '@/lib/3d/persistence/types';
import { listAssetRecordsAction, deleteAssetAction } from '@/app/admin/actions';
import { resolveAssetUrl } from '@/lib/3d/assetDelivery';
import { AdminHeader, AdminNotice } from '../AdminComponents';
import styles from '../admin.module.css';

export default function AdminAssetsPage() {
  const [records, setRecords] = useState<PersistedAssetRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAssetRecordsAction();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchAssets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAssetRecordsAction();
        if (!ignore) {
          setRecords(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load asset records.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchAssets();
    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    setDeletingAssetId(assetToDelete);
    setError(null);
    setSuccess(null);

    try {
      const deleted = await deleteAssetAction(assetToDelete);
      if (deleted) {
        setSuccess(`Asset "${assetToDelete}" deleted successfully.`);
        await loadAssets();
      } else {
        setError(`Failed to delete asset "${assetToDelete}". Record not found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting asset record.');
    } finally {
      setDeletingAssetId(null);
      setAssetToDelete(null);
    }
  };

  return (
    <div className={styles.container}>
      <AdminHeader />

      <main className={styles.content}>
        <AdminNotice />

        {error && <div className={styles.errorBanner}>{error}</div>}
        {success && <div className={styles.successBanner}>{success}</div>}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Registered 3D Assets ({records.length})</h2>
              <p className={styles.helperText}>
                3D asset metadata records, locations, aliases, and compatibility specifications.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={styles.button} onClick={loadAssets} disabled={loading}>
                {loading ? 'Refreshing...' : '↻ Refresh'}
              </button>
              <Link href="/admin/assets/new" className={styles.primaryButton}>
                + New Asset Record
              </Link>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading 3D asset metadata records...</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No 3D asset metadata records found in repository.</p>
              <Link href="/admin/assets/new" className={styles.primaryButton} style={{ marginTop: '0.5rem' }}>
                Register First Asset
              </Link>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Asset ID & Name</th>
                    <th>Type / Slot</th>
                    <th>Avatar Compatibility</th>
                    <th>Location & Provider</th>
                    <th>Aliases</th>
                    <th>Version</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const { asset, aliasIds } = rec;
                    const isGarment = asset.assetType === 'garment';
                    const isAvatar = asset.assetType === 'avatar';

                    let badgeStyle = styles.badgeOther;
                    if (isGarment) badgeStyle = styles.badgeGarment;
                    if (isAvatar) badgeStyle = styles.badgeAvatar;

                    let deliveryUrl = '';
                    try {
                      deliveryUrl = resolveAssetUrl(asset);
                    } catch {
                      deliveryUrl = 'Invalid location';
                    }

                    return (
                      <tr key={asset.assetId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{asset.displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6e6e73', fontFamily: 'monospace' }}>
                            {asset.assetId}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${badgeStyle}`}>{asset.assetType}</span>
                          {isGarment && 'slot' in asset && (
                            <div style={{ fontSize: '0.75rem', color: '#1d1d1f', marginTop: '2px' }}>
                              Slot: <strong>{asset.slot}</strong>
                            </div>
                          )}
                        </td>
                        <td>
                          {isGarment && 'supportedAvatarIds' in asset ? (
                            <div style={{ fontSize: '0.8rem' }}>
                              {asset.supportedAvatarIds.join(', ')}
                            </div>
                          ) : isAvatar && 'avatarId' in asset ? (
                            <div style={{ fontSize: '0.8rem' }}>
                              Avatar: {asset.avatarId} ({asset.gender})
                            </div>
                          ) : (
                            <span style={{ color: '#8e8e93', fontSize: '0.8rem' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem' }}>
                            <strong>Source:</strong> {asset.location.source}
                            {asset.location.provider && ` (${asset.location.provider})`}
                          </div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: '#6e6e73',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={deliveryUrl}
                          >
                            {asset.location.objectKey || asset.location.path || deliveryUrl}
                          </div>
                        </td>
                        <td>
                          {aliasIds && aliasIds.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                              {aliasIds.map((alias) => (
                                <span
                                  key={alias}
                                  style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: '#e5e5ea',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {alias}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#8e8e93', fontSize: '0.75rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem' }}>v{asset.version}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <Link href={`/admin/assets/${encodeURIComponent(asset.assetId)}`} className={styles.button}>
                              Inspect / Edit
                            </Link>
                            <button
                              className={styles.dangerButton}
                              onClick={() => setAssetToDelete(asset.assetId)}
                              disabled={deletingAssetId === asset.assetId}
                            >
                              {deletingAssetId === asset.assetId ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal before Destructive Deletion */}
      {assetToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 style={{ marginTop: 0, color: '#d70015' }}>Confirm Destructive Deletion</h3>
            <p style={{ fontSize: '0.9rem', color: '#1d1d1f' }}>
              Are you sure you want to delete the 3D asset record for <strong>{assetToDelete}</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
              This operation removes the metadata record and all associated lookup aliases from the AssetRepository. It does NOT delete physical GLB files or binary storage objects.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className={styles.button} onClick={() => setAssetToDelete(null)}>
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
