/**
 * 3D Scene and Viewer Type Definitions
 * Phase 0 Foundation
 */

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
}

export interface CameraControlsRef {
  resetCamera: () => void;
}

export interface SceneConfig {
  backgroundColor: string;
  enableGrid?: boolean;
  enableShadows?: boolean;
}

/**
 * Interface boundary for future garment/clothing system.
 * Allows future garment layers to attach to avatar slots without refactoring the viewer.
 */
export interface GarmentSlot {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  modelUrl?: string;
  visible: boolean;
}

export interface AvatarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  garmentSlots?: GarmentSlot[];
}
