'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { CAMERA_LIMITS } from '@/lib/3d/constants';
import { calculateCameraFraming, resolveAvatarRoot, CameraFramingResult } from '@/lib/3d/cameraFraming';
import { CameraControlsRef } from '@/types/3d';

export interface CameraControlsProps {
  enabled?: boolean;
  avatarScene?: THREE.Object3D | null;
}

export const Controls = forwardRef<CameraControlsRef, CameraControlsProps>(({ enabled = true, avatarScene }, ref) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [framing, setFraming] = useState<CameraFramingResult | null>(null);

  // Recalculate camera framing ONLY when avatarScene initially loads or changes (NOT on viewport resize)
  useEffect(() => {
    if (!avatarScene) return;

    const targetObject = resolveAvatarRoot(avatarScene) ?? avatarScene;
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const fov = perspectiveCamera.fov ?? 45;
    const currentSize = sizeRef.current;
    const aspect = currentSize.width > 0 && currentSize.height > 0 ? currentSize.width / currentSize.height : 1.0;

    const calculatedFraming = calculateCameraFraming(targetObject, { fov, aspect });
    setFraming(calculatedFraming);

    if (controlsRef.current) {
      controlsRef.current.object.position.set(...calculatedFraming.position);
      controlsRef.current.target.set(...calculatedFraming.target);
      controlsRef.current.update();
    }
  }, [avatarScene, camera]);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (!controlsRef.current) return;

      const targetObject = resolveAvatarRoot(avatarScene) ?? avatarScene;
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      const fov = perspectiveCamera.fov ?? 45;
      const currentSize = sizeRef.current;
      const aspect = currentSize.width > 0 && currentSize.height > 0 ? currentSize.width / currentSize.height : 1.0;

      const calculatedFraming = calculateCameraFraming(targetObject, { fov, aspect });

      setFraming(calculatedFraming);
      controlsRef.current.object.position.set(...calculatedFraming.position);
      controlsRef.current.target.set(...calculatedFraming.target);
      controlsRef.current.update();
    },
  }));

  if (!enabled) return null;

  const currentTarget = framing ? framing.target : ([0, 1.0, 0] as [number, number, number]);
  const currentMinDist = framing ? framing.minDistance : CAMERA_LIMITS.minDistance;
  const currentMaxDist = framing ? framing.maxDistance : CAMERA_LIMITS.maxDistance;

  return (
    <OrbitControls
      ref={controlsRef}
      target={currentTarget}
      enablePan={false}
      enableZoom={true}
      zoomSpeed={0.8}
      enableRotate={true}
      rotateSpeed={0.8}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={currentMinDist}
      maxDistance={currentMaxDist}
      minPolarAngle={CAMERA_LIMITS.minPolarAngle}
      maxPolarAngle={CAMERA_LIMITS.maxPolarAngle}
      makeDefault
    />
  );
});

Controls.displayName = 'CameraControls';
