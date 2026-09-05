'use client';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { CAMERA_LIMITS, DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from '@/lib/3d/constants';
import { CameraControlsRef } from '@/types/3d';

export interface CameraControlsProps {
  // Option for future controls configuration
  enabled?: boolean;
}

export const Controls = forwardRef<CameraControlsRef, CameraControlsProps>(({ enabled = true }, ref) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.object.position.set(...DEFAULT_CAMERA_POSITION);
        controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET);
        controlsRef.current.update();
      }
    },
  }));

  if (!enabled) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      target={DEFAULT_CAMERA_TARGET}
      enablePan={false}
      enableZoom={true}
      zoomSpeed={0.8}
      enableRotate={true}
      rotateSpeed={0.8}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={CAMERA_LIMITS.minDistance}
      maxDistance={CAMERA_LIMITS.maxDistance}
      minPolarAngle={CAMERA_LIMITS.minPolarAngle}
      maxPolarAngle={CAMERA_LIMITS.maxPolarAngle}
      makeDefault
    />
  );
});

Controls.displayName = 'CameraControls';
