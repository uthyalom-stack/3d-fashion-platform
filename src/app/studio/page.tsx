'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ViewerCanvas } from '@/components/3d/ViewerCanvas';
import { Scene } from '@/components/3d/Scene';
import { CameraControlsRef, AvatarId } from '@/types/3d';
import styles from '../page.module.css';

export default function StudioPage() {
  const [avatarId, setAvatarId] = useState<AvatarId>('male');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>('GARMENT_top_basic_tshirt');
  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(null);
  const cameraControlsRef = useRef<CameraControlsRef>(null);

  const handleResetCamera = () => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.resetCamera();
    }
  };

  const handleLoadTestModel = () => {
    setActiveModelUrl((prev) => (prev ? null : '/models/test-cube.glb'));
  };

  const handleToggleGarment = () => {
    setActiveGarmentId((prev) => (prev ? null : 'GARMENT_top_basic_tshirt'));
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
              style={{
                backgroundColor: avatarId === 'male' ? '#ffffff' : 'transparent',
                boxShadow: avatarId === 'male' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '0.4rem 0.8rem',
              }}
              onClick={() => setAvatarId('male')}
            >
              Male
            </button>
            <button
              className={styles.button}
              style={{
                backgroundColor: avatarId === 'female' ? '#ffffff' : 'transparent',
                boxShadow: avatarId === 'female' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '0.4rem 0.8rem',
              }}
              onClick={() => setAvatarId('female')}
            >
              Female
            </button>
          </div>

          {/* Garment Toggle Control (Phase 3 Developer Control) */}
          <button
            className={styles.button}
            onClick={handleToggleGarment}
            style={{
              borderColor: activeGarmentId ? '#34c759' : '#d1d1d6',
              color: activeGarmentId ? '#248a3d' : '#1c1c1e',
              backgroundColor: activeGarmentId ? '#eafda6' : '#ffffff',
            }}
          >
            {activeGarmentId ? 'Remove Garment (T-Shirt)' : 'Equip Garment (T-Shirt)'}
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
            activeGarmentId={activeGarmentId}
          />
        </ViewerCanvas>

        {/* Informational overlay */}
        <div className={styles.overlay}>
          <div>
            <strong>Avatar:</strong> {avatarId === 'male' ? 'Male Base' : 'Female Base'}
          </div>
          <div>
            <strong>Garment:</strong> {activeGarmentId ? 'Basic Short-Sleeve T-Shirt' : 'None'}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#8e8e93' }}>
            Drag / Touch: Rotate Camera
            <br />
            Scroll / Pinch: Zoom
          </div>
        </div>
      </main>
    </div>
  );
}
