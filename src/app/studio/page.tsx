'use client';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ViewerCanvas } from '@/components/3d/ViewerCanvas';
import { CameraControlsRef } from '@/types/3d';

export default function StudioPage() {
  const controlsRef = useRef<CameraControlsRef>(null);
  const [showGrid, setShowGrid] = useState(true);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.resetCamera();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#f5f5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.25rem',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e5ea',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/"
            style={{
              fontSize: '0.875rem',
              color: '#6e6e73',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            ← Back
          </Link>
          <span style={{ color: '#d2d2d7' }}>|</span>
          <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>
            3D Studio
          </h1>
        </div>

        {/* Action Controls Header Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.825rem',
              fontWeight: 500,
              backgroundColor: showGrid ? '#e8e8ed' : '#f2f2f7',
              color: '#1d1d1f',
              border: '1px solid #d1d1d6',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>

          <button
            onClick={handleResetCamera}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.825rem',
              fontWeight: 500,
              backgroundColor: '#0071e3',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reset Camera
          </button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <main style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <ViewerCanvas ref={controlsRef} showGrid={showGrid} />

        {/* Viewport Overlay Controls/Info */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#3a3a3c',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div><strong>Drag:</strong> Rotate Camera</div>
          <div><strong>Scroll / Pinch:</strong> Zoom</div>
          <div><strong>Right Drag / Touch:</strong> Pan</div>
        </div>
      </main>
    </div>
  );
}
