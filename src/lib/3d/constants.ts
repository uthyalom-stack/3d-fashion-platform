import { CameraConfig, SceneConfig } from '@/types/3d';

export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 1.2, 3.5];

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 45,
  near: 0.1,
  far: 100,
  position: DEFAULT_CAMERA_POSITION,
};

export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 1.0, 0];

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  backgroundColor: '#f5f5f7',
  enableGrid: true,
  enableShadows: true,
};

export const CAMERA_LIMITS = {
  minDistance: 1.5,
  maxDistance: 7.0,
  minPolarAngle: Math.PI / 6, // 30 deg
  maxPolarAngle: Math.PI / 1.8, // ~100 deg
};
