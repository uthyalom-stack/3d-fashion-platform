'use client';

import React, { forwardRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { StudioLighting } from './Lighting';
import { Avatar } from './Avatar';
import { AvatarPlaceholder } from './AvatarPlaceholder';
import { ModelLoader } from './ModelLoader';
import { Garment } from './Garment';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { Controls } from './CameraControls';
import { CameraControlsRef, AvatarId } from '../../types/3d';
import { OutfitState, CANONICAL_GARMENT_SLOTS } from '../../types/garment';

export interface SceneProps {
  avatarId?: AvatarId;
  showGrid?: boolean;
  activeModelUrl?: string | null;
  activeGarmentId?: string | null;
  outfitState?: OutfitState;
}

export const Scene = forwardRef<CameraControlsRef, SceneProps>(
  (
    {
      avatarId = 'male',
      showGrid = true,
      activeModelUrl = null,
      activeGarmentId = null,
      outfitState,
    },
    ref
  ) => {
    const [avatarScene, setAvatarScene] = useState<THREE.Object3D | null>(null);

    const handleAvatarLoaded = useCallback((scene: THREE.Object3D) => {
      setAvatarScene(scene);
    }, []);

    // Resolve active garments per slot
    const resolvedOutfitState: OutfitState = outfitState || {
      top: activeGarmentId,
      bottom: null,
      feet: null,
      waist: null,
      hand: null,
    };

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
            <Avatar
              avatarId={avatarId}
              position={[0, 0, 0]}
              onAvatarLoaded={handleAvatarLoaded}
            />
          </React.Suspense>
        </ThreeErrorBoundary>

        {/* Active Garment Layers attached directly into Avatar Skeleton Hierarchy */}
        {CANONICAL_GARMENT_SLOTS.map((slot) => {
          const garmentId = resolvedOutfitState[slot];
          if (!garmentId) return null;

          return (
            <ThreeErrorBoundary key={`garment-slot-${slot}`} fallback={null}>
              <React.Suspense fallback={null}>
                <Garment
                  key={`garment-render-${slot}-${garmentId}`}
                  garmentId={garmentId}
                  avatarId={avatarId}
                  avatarScene={avatarScene}
                />
              </React.Suspense>
            </ThreeErrorBoundary>
          );
        })}

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
