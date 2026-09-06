'use client';

import React, { forwardRef } from 'react';
import { StudioLighting } from './Lighting';
import { Avatar } from './Avatar';
import { AvatarPlaceholder } from './AvatarPlaceholder';
import { ModelLoader } from './ModelLoader';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { Controls } from './CameraControls';
import { CameraControlsRef } from '@/types/3d';

export interface SceneProps {
  showGrid?: boolean;
  activeModelUrl?: string | null;
}

export const Scene = forwardRef<CameraControlsRef, SceneProps>(
  ({ showGrid = true, activeModelUrl = null }, ref) => {
    return (
      <>
        {/* Background color */}
        <color attach="background" args={['#f5f5f7']} />

        {/* Lighting system */}
        <StudioLighting />

        {/* Base Avatar System (Phase 2 Foundation) */}
        <ThreeErrorBoundary
          fallback={<AvatarPlaceholder position={[0, 0, 0]} />}
        >
          <React.Suspense fallback={<AvatarPlaceholder position={[0, 0, 0]} />}>
            <Avatar position={[0, 0, 0]} />
          </React.Suspense>
        </ThreeErrorBoundary>

        {/* Dynamic 3D Asset Loader (Phase 1 Engine Integration) */}
        {activeModelUrl && (
          <ThreeErrorBoundary
            fallback={
              <group position={[0, 0.2, 0.6]}>
                <mesh>
                  <boxGeometry args={[0.3, 0.3, 0.3]} />
                  <meshStandardMaterial color="#ff3b30" wireframe />
                </mesh>
              </group>
            }
          >
            <React.Suspense fallback={null}>
              <ModelLoader
                url={activeModelUrl}
                position={[0, 0.2, 0.6]}
                scale={1}
              />
            </React.Suspense>
          </ThreeErrorBoundary>
        )}

        {/* Ground Reference Grid */}
        {showGrid && (
          <gridHelper
            args={[10, 20, '#d1d1d6', '#e5e5ea']}
            position={[0, 0, 0]}
          />
        )}

        {/* Orbit Controls */}
        <Controls ref={ref} />
      </>
    );
  }
);

Scene.displayName = '3DScene';
