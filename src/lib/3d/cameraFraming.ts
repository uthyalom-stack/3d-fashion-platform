import * as THREE from 'three';

export interface CameraFramingOptions {
  fov?: number; // Vertical FOV in degrees, default 45
  aspect?: number; // Viewport aspect ratio (width / height), default 1.0
  paddingFactor?: number; // Framing margin factor, default 1.20 (20% margin)
}

export interface CameraFramingResult {
  target: [number, number, number];
  position: [number, number, number];
  defaultDistance: number;
  minDistance: number;
  maxDistance: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
    size: [number, number, number];
  };
}

/**
 * Resolves the root avatar object (e.g. `avatar-root-*` container) from a node in the scene graph
 * to ensure top-level transforms and scale are captured in bounding box calculations.
 */
export function resolveAvatarRoot(object: THREE.Object3D | null | undefined): THREE.Object3D | null | undefined {
  if (!object) return object;
  let targetObject: THREE.Object3D = object;
  let curr: THREE.Object3D | null = object;
  while (curr) {
    if (curr.name && curr.name.startsWith('avatar-root-')) {
      targetObject = curr;
      break;
    }
    curr = curr.parent;
  }
  return targetObject;
}

const DEFAULT_RESULT: CameraFramingResult = {
  target: [0, 1.0, 0],
  position: [0, 1.2, 3.5],
  defaultDistance: 3.5,
  minDistance: 0.8,
  maxDistance: 8.0,
  boundingBox: {
    min: [-0.5, 0, -0.2],
    max: [0.5, 1.8, 0.2],
    center: [0, 0.9, 0],
    size: [1.0, 1.8, 0.4],
  },
};

/**
 * Calculates camera position, target, and distance limits based on object bounding box/sphere.
 */
export function calculateCameraFraming(
  object: THREE.Object3D | null | undefined,
  options: CameraFramingOptions = {}
): CameraFramingResult {
  if (!object) {
    return DEFAULT_RESULT;
  }

  // Force world matrices update before computing bounding box
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty() || !isFinite(box.min.x) || !isFinite(box.max.x)) {
    return DEFAULT_RESULT;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  // If object has zero volume or size, return default
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    return DEFAULT_RESULT;
  }

  const fovDeg = options.fov ?? 45;
  const aspect = options.aspect && options.aspect > 0 ? options.aspect : 1.0;
  const paddingFactor = options.paddingFactor ?? 1.20; // 20% margin around full body

  const vFovRad = (fovDeg * Math.PI) / 180;
  const halfVFov = vFovRad / 2;
  const tanHalfVFov = Math.tan(halfVFov);

  // Calculate required distances to fit height and width comfortably
  const fitHeightDistance = ((size.y / 2) * paddingFactor) / tanHalfVFov;
  const fitWidthDistance = ((size.x / 2) * paddingFactor) / (tanHalfVFov * aspect);

  // Calculate bounding sphere fit
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const minFovRad = Math.min(vFovRad, 2 * Math.atan(tanHalfVFov * aspect));
  const fitSphereDistance = (sphere.radius * paddingFactor) / Math.sin(minFovRad / 2);

  // Determine ideal camera distance to fit entire avatar
  const defaultDistance = Math.max(fitHeightDistance, fitWidthDistance, fitSphereDistance);

  // Target torso/body center
  // For a standing human mannequin, box center Y aligns with lower torso/midbody
  const target: [number, number, number] = [center.x, center.y, center.z];

  // Position camera directly in front of target, slightly elevated for natural eye-level framing
  const positionY = center.y + size.y * 0.05;
  const position: [number, number, number] = [center.x, positionY, center.z + defaultDistance];

  // Dynamic zoom limits based on avatar dimensions:
  // minDistance allows inspecting garment details while keeping camera outside the mesh
  // maxDistance allows zooming out to see full outfit with background context
  const minDistance = Math.max(0.4, defaultDistance * 0.3);
  const maxDistance = Math.min(15.0, defaultDistance * 2.5);

  return {
    target,
    position,
    defaultDistance,
    minDistance,
    maxDistance,
    boundingBox: {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      center: [center.x, center.y, center.z],
      size: [size.x, size.y, size.z],
    },
  };
}
