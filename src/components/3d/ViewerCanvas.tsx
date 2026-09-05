'use client';
import React, { forwardRef, useSyncExternalStore, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { isWebGLAvailable } from '@/lib/3d/webgl';
import { DEFAULT_CAMERA_CONFIG } from '@/lib/3d/constants';
import { CameraControlsRef } from '@/types/3d';

export interface ViewerCanvasProps {
  className?: string;
  showGrid?: boolean;
}

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      color: '#666',
      fontSize: '0.9rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      Loading 3D Engine...
    </div>
  );
}

function WebGLUnsupportedFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: '#f5f5f7',
      color: '#1d1d1f',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>WebGL Not Available</h3>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#86868b', maxWidth: '360px' }}>
        Your browser or hardware environment does not support WebGL standard graphics acceleration.
      </p>
    </div>
  );
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => isWebGLAvailable();
const getServerSnapshot = () => true;

export const ViewerCanvas = forwardRef<CameraControlsRef, ViewerCanvasProps>(
  ({ className = '', showGrid = true }, ref) => {
    const isSupported = useSyncExternalStore(
      emptySubscribe,
      getClientSnapshot,
      getServerSnapshot
    );

    if (!isSupported) {
      return <WebGLUnsupportedFallback />;
    }

    return (
      <ThreeErrorBoundary>
        <div style={{ width: '100%', height: '100%', position: 'relative' }} className={className}>
          <Suspense fallback={<LoadingFallback />}>
            <Canvas
              shadows
              dpr={[1, 2]} // Performance optimization for high-DPI/mobile displays
              camera={{
                fov: DEFAULT_CAMERA_CONFIG.fov,
                near: DEFAULT_CAMERA_CONFIG.near,
                far: DEFAULT_CAMERA_CONFIG.far,
                position: DEFAULT_CAMERA_CONFIG.position,
              }}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance',
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <Scene ref={ref} showGrid={showGrid} />
            </Canvas>
          </Suspense>
        </div>
      </ThreeErrorBoundary>
    );
  }
);

ViewerCanvas.displayName = 'ViewerCanvas';
