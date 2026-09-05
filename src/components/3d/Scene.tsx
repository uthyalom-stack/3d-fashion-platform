'use client';
import React, { forwardRef } from 'react';
import { StudioLighting } from './Lighting';
import { AvatarPlaceholder } from './AvatarPlaceholder';
import { Controls } from './CameraControls';
import { CameraControlsRef } from '@/types/3d';

export interface SceneProps {
  showGrid?: boolean;
}

export const Scene = forwardRef<CameraControlsRef, SceneProps>(
  ({ showGrid = true }, ref) => {
    return (
      <>
        {/* Background color */}
        <color attach="background" args={['#f5f5f7']} />

        {/* Lighting system */}
        <StudioLighting />

        {/* Centered Avatar Placeholder */}
        <AvatarPlaceholder position={[0, 0, 0]} />

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
