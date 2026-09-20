'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { CAMERA_LIMITS } from '@/lib/3d/constants';
import { calculateCameraFraming, CameraFramingResult } from '@/lib/3d/cameraFraming';
import { CameraControlsRef } from '@/types/3d';

export interface CameraControlsProps {
  enabled?: boolean;
  avatarScene?: THREE.Object3D | null;
}

export const Controls = forwardRef<CameraControlsRef, CameraControlsProps>(({ enabled = true, avatarScene }, ref) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const [framing, setFraming] = useState<CameraFramingResult | null>(null);

  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 1.0;

  // Recalculate camera framing when avatarScene or viewport aspect ratio changes
  useEffect(() => {
    if (!avatarScene) return;

    // Use parent container if available to ensure any wrapper transform is captured
    let targetObject: THREE.Object3D = avatarScene;
    let curr: THREE.Object3D | null = avatarScene;
    while (curr) {
      if (curr.name && curr.name.startsWith('avatar-root-')) {
        targetObject = curr;
        break;
      }
      curr = curr.parent;
    }

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const fov = perspectiveCamera.fov ?? 45;

    const calculatedFraming = calculateCameraFraming(targetObject, { fov, aspect });
    setFraming(calculatedFraming);

    if (controlsRef.current) {
      controlsRef.current.object.position.set(...calculatedFraming.position);
      controlsRef.current.target.set(...calculatedFraming.target);
      controlsRef.current.update();
    }
  }, [avatarScene, camera, aspect]);

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        if (framing) {
          controlsRef.current.object.position.set(...framing.position);
          controlsRef.current.target.set(...framing.target);
        } else if (avatarScene) {
          let targetObject: THREE.Object3D = avatarScene;
          let curr: THREE.Object3D | null = avatarScene;
          while (curr) {
            if (curr.name && curr.name.startsWith('avatar-root-')) {
              targetObject = curr;
              break;
            }
            curr = curr.parent;
          }
          const perspectiveCamera = camera as THREE.PerspectiveCamera;
          const fov = perspectiveCamera.fov ?? 45;
          const calculatedFraming = calculateCameraFraming(targetObject, { fov, aspect });
          controlsRef.current.object.position.set(...calculatedFraming.position);
          controlsRef.current.target.set(...calculatedFraming.target);
        }
        controlsRef.current.update();
      }
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
