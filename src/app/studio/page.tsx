'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ViewerCanvas } from '@/components/3d/ViewerCanvas';
import { Scene } from '@/components/3d/Scene';
import { CameraControlsRef, AvatarId } from '@/types/3d';
import { GarmentSlot, OutfitState, CANONICAL_GARMENT_SLOTS } from '@/types/garment';
import { OutfitManager, createEmptyOutfitState } from '@/lib/3d/outfitManager';
import { GARMENT_REGISTRY, DEFAULT_GARMENT_ID } from '@/lib/3d/garmentRegistry';
import { getAssets, getAsset } from '@/lib/3d/assetRegistry';
import { resolveAssetUrl } from '@/lib/3d/assetDelivery';
import { Platform3DAsset, Garment3DAsset } from '@/types/asset';
import styles from './studio.module.css';

function getInitialOutfitState(): OutfitState {
  return {
    ...createEmptyOutfitState(),
    top: DEFAULT_GARMENT_ID,
  };
}

export default function StudioPage() {
  const [avatarId, setAvatarId] = useState<AvatarId>('male');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Asset Registry Developer Inspection State
  const allRegistryAssets = getAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    allRegistryAssets[0]?.assetId || 'garment.top.basic-tshirt'
  );

  const selectedAsset: Platform3DAsset | null = getAsset(selectedAssetId);

  // Initialize Outfit Manager instance lazily
  const [outfitManager] = useState<OutfitManager>(
    () => new OutfitManager('male', getInitialOutfitState())
  );

  const [outfitState, setOutfitState] = useState<OutfitState>(getInitialOutfitState);

  const cameraControlsRef = useRef<CameraControlsRef>(null);

  const handleResetCamera = () => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.resetCamera();
    }
  };

  const handleLoadTestModel = () => {
    setActiveModelUrl((prev) => (prev ? null : '/models/test-cube.glb'));
  };

  const handleAvatarChange = (newAvatarId: AvatarId) => {
    setAvatarId(newAvatarId);
    const { state: newOutfitState, removedGarments } = outfitManager.setAvatarId(newAvatarId);
    setOutfitState(newOutfitState);

    if (removedGarments.length > 0) {
      const removedNames = removedGarments
        .map((g) => GARMENT_REGISTRY[g.garmentId]?.name || g.garmentId)
        .join(', ');
      setStatusMessage(`Auto-unequipped incompatible garment(s) for ${newAvatarId}: ${removedNames}`);
    } else {
      setStatusMessage(`Switched active avatar to ${newAvatarId}.`);
    }
  };

  const handleToggleTopGarment = () => {
    const currentTop = outfitManager.get('top');

    if (currentTop) {
      outfitManager.unequip('top');
      setOutfitState(outfitManager.getOutfitState());
      setStatusMessage('Unequipped top garment.');
    } else {
      const result = outfitManager.equip('top', DEFAULT_GARMENT_ID);
      if (result.valid) {
        setOutfitState(outfitManager.getOutfitState());
        setStatusMessage(`Equipped ${GARMENT_REGISTRY[DEFAULT_GARMENT_ID]?.name || DEFAULT_GARMENT_ID}`);
      } else {
        setStatusMessage(`Equip failed: ${result.error}`);
      }
    }
  };

  const handleReplaceTopGarment = () => {
    const result = outfitManager.replace('top', DEFAULT_GARMENT_ID);
    if (result.valid) {
      setOutfitState(outfitManager.getOutfitState());
      setStatusMessage(`Replaced top garment with ${GARMENT_REGISTRY[DEFAULT_GARMENT_ID]?.name || DEFAULT_GARMENT_ID}`);
    } else {
      setStatusMessage(`Replace failed: ${result.error}`);
    }
  };

  const handleUnequipSlot = (slot: GarmentSlot) => {
    outfitManager.unequip(slot);
    setOutfitState(outfitManager.getOutfitState());
    setStatusMessage(`Unequipped garment from slot "${slot}".`);
  };

  const handleLoadSelectedRegistryAsset = () => {
    if (!selectedAsset) return;

    if (selectedAsset.assetType === 'garment') {
      const gAsset = selectedAsset as Garment3DAsset;
      const result = outfitManager.equip(gAsset.slot, gAsset.assetId);
      if (result.valid) {
        setOutfitState(outfitManager.getOutfitState());
        setStatusMessage(`Equipped asset "${gAsset.displayName}" into slot "${gAsset.slot}".`);
      } else {
        setStatusMessage(`Registry load failed: ${result.error}`);
      }
    } else if (selectedAsset.assetType === 'avatar') {
      handleAvatarChange(selectedAsset.assetId.includes('female') ? 'female' : 'male');
    } else {
      const deliveryUrl = resolveAssetUrl(selectedAsset);
      setActiveModelUrl(deliveryUrl);
      setStatusMessage(`Loaded asset model URL: ${deliveryUrl}`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" className={styles.backButton}>
            ← Back
          </Link>
          <h1 className={styles.title}>3D Studio</h1>
        </div>

        <div className={styles.controls}>
          {/* Avatar Switcher */}
          <div style={{ display: 'flex', background: '#e5e5ea', borderRadius: '8px', padding: '2px' }}>
            <button
              className={styles.button}
              aria-pressed={avatarId === 'male'}
              style={{
                backgroundColor: avatarId === 'male' ? '#ffffff' : 'transparent',
                boxShadow: avatarId === 'male' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '0.4rem 0.8rem',
              }}
              onClick={() => handleAvatarChange('male')}
            >
              Male
            </button>
            <button
              className={styles.button}
              aria-pressed={avatarId === 'female'}
              style={{
                backgroundColor: avatarId === 'female' ? '#ffffff' : 'transparent',
                boxShadow: avatarId === 'female' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '0.4rem 0.8rem',
              }}
              onClick={() => handleAvatarChange('female')}
            >
              Female
            </button>
          </div>

          {/* Top Slot Controls (Phase 4 Outfit State Operations) */}
          <button
            className={styles.button}
            onClick={handleToggleTopGarment}
            style={{
              borderColor: outfitState.top ? '#34c759' : '#d1d1d6',
              color: outfitState.top ? '#248a3d' : '#1c1c1e',
              backgroundColor: outfitState.top ? '#eafda6' : '#ffffff',
            }}
          >
            {outfitState.top ? 'Remove Top Garment' : 'Equip Top Garment'}
          </button>

          <button
            className={styles.button}
            onClick={handleReplaceTopGarment}
            style={{ borderColor: '#0071e3', color: '#0071e3' }}
          >
            Replace Top
          </button>

          {/* Test Asset Loader Toggle */}
          <button
            className={styles.button}
            onClick={handleLoadTestModel}
            style={{
              borderColor: activeModelUrl ? '#0071e3' : '#d1d1d6',
              color: activeModelUrl ? '#0071e3' : '#1c1c1e',
            }}
          >
            {activeModelUrl ? 'Remove Test Asset' : 'Load Test Asset'}
          </button>

          {/* Grid Toggle */}
          <button
            className={styles.button}
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>

          {/* Camera Reset */}
          <button className={styles.primaryButton} onClick={handleResetCamera}>
            Reset Camera
          </button>
        </div>
      </header>

      <main className={styles.canvasContainer}>
        <ViewerCanvas>
          <Scene
            ref={cameraControlsRef}
            avatarId={avatarId}
            showGrid={showGrid}
            activeModelUrl={activeModelUrl}
            outfitState={outfitState}
          />
        </ViewerCanvas>

        {/* Developer overlay */}
        <div className={styles.overlay} style={{ pointerEvents: 'auto', maxWidth: '340px' }}>
          <div>
            <strong>Active Avatar:</strong> {avatarId === 'male' ? 'Male Base' : 'Female Base'}
          </div>

          {/* 3D Asset Registry Developer Inspection */}
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e5e5ea', paddingTop: '0.5rem' }}>
            <strong style={{ fontSize: '0.8rem', color: '#0071e3' }}>3D Asset Registry:</strong>
            <div style={{ display: 'flex', gap: '4px', marginTop: '0.25rem' }}>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: '#ffffff',
                }}
              >
                {allRegistryAssets.map((asset) => (
                  <option key={asset.assetId} value={asset.assetId}>
                    [{asset.assetType}] {asset.displayName}
                  </option>
                ))}
              </select>

              <button
                onClick={handleLoadSelectedRegistryAsset}
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #0071e3',
                  backgroundColor: '#0071e3',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Load
              </button>
            </div>

            {selectedAsset && (
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem', lineHeight: 1.3 }}>
                <div><strong>ID:</strong> {selectedAsset.assetId}</div>
                <div><strong>Type:</strong> {selectedAsset.assetType} | <strong>Ver:</strong> v{selectedAsset.version}</div>
                <div><strong>Source:</strong> {selectedAsset.location.source} | <strong>Provider:</strong> {selectedAsset.location.provider || 'local'}</div>
                {selectedAsset.location.objectKey && (
                  <div style={{ wordBreak: 'break-all' }}><strong>Object Key:</strong> {selectedAsset.location.objectKey}</div>
                )}
                {selectedAsset.metadata?.triCount !== undefined && (
                  <div>
                    <strong>Tris:</strong> {selectedAsset.metadata.triCount} | <strong>Verts:</strong> {selectedAsset.metadata.vertexCount}
                  </div>
                )}
                {selectedAsset.metadata?.fileSizeBytes !== undefined && (
                  <div><strong>Size:</strong> {(selectedAsset.metadata.fileSizeBytes / 1024).toFixed(1)} KB</div>
                )}
                <div style={{ wordBreak: 'break-all', color: '#0071e3', marginTop: '2px' }}>
                  <strong>Resolved URL:</strong> {resolveAssetUrl(selectedAsset)}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e5e5ea', paddingTop: '0.5rem' }}>
            <strong>Active Outfit State:</strong>
            <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
              {CANONICAL_GARMENT_SLOTS.map((slot) => {
                const equippedId = outfitState[slot];
                const itemConfig = equippedId ? GARMENT_REGISTRY[equippedId] : null;

                return (
                  <li key={slot} style={{ marginBottom: '0.2rem' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{slot}:</span>{' '}
                    {equippedId ? (
                      <span>
                        {itemConfig?.name || equippedId}{' '}
                        <button
                          onClick={() => handleUnequipSlot(slot)}
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 4px',
                            marginLeft: '4px',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            border: '1px solid #ccc',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ) : (
                      <span style={{ color: '#8e8e93' }}>[Empty]</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {statusMessage && (
            <div
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#0071e3',
                background: '#eef6ff',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              {statusMessage}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#8e8e93' }}>
            Drag / Touch: Rotate Camera
            <br />
            Scroll / Pinch: Zoom
          </div>
        </div>
      </main>
    </div>
  );
}
