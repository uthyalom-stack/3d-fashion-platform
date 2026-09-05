'use client';
import React, { useRef } from 'react';
import { Group } from 'three';
import { AvatarProps } from '@/types/3d';

/**
 * Procedural Mannequin / Avatar Placeholder
 * Built entirely with Three.js primitives (Cylinders, Spheres, Capsules).
 * Does NOT rely on external 3D files or copyrighted human assets.
 */
export function AvatarPlaceholder({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  garmentSlots = [],
}: AvatarProps) {
  const groupRef = useRef<Group>(null);

  // Clean studio neutral material for mannequin
  const mannequinMaterial = (
    <meshStandardMaterial
      color="#e2e4e9"
      roughness={0.4}
      metalness={0.1}
    />
  );

  const jointMaterial = (
    <meshStandardMaterial
      color="#cccccc"
      roughness={0.5}
      metalness={0.2}
    />
  );

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Circular Stand Base */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.45, 0.48, 0.04, 32]} />
        <meshStandardMaterial color="#333336" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Stand Support Rod */}
      <mesh position={[0, 0.9, -0.2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.76, 16]} />
        <meshStandardMaterial color="#88888d" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Main Mannequin Root */}
      <group position={[0, 0, 0]}>
        {/* Feet / Pedestal Connectors */}
        <mesh position={[-0.1, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.18]} />
          {mannequinMaterial}
        </mesh>
        <mesh position={[0.1, 0.08, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.18]} />
          {mannequinMaterial}
        </mesh>

        {/* Lower Legs */}
        <mesh position={[-0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.46, 16]} />
          {mannequinMaterial}
        </mesh>
        <mesh position={[0.1, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.46, 16]} />
          {mannequinMaterial}
        </mesh>

        {/* Knees */}
        <mesh position={[-0.1, 0.6, 0]} castShadow>
          <sphereGeometry args={[0.042, 16, 16]} />
          {jointMaterial}
        </mesh>
        <mesh position={[0.1, 0.6, 0]} castShadow>
          <sphereGeometry args={[0.042, 16, 16]} />
          {jointMaterial}
        </mesh>

        {/* Upper Legs / Thighs */}
        <mesh position={[-0.1, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.045, 0.46, 16]} />
          {mannequinMaterial}
        </mesh>
        <mesh position={[0.1, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.045, 0.46, 16]} />
          {mannequinMaterial}
        </mesh>

        {/* Pelvis / Hips */}
        <mesh position={[0, 1.12, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.14, 0.18, 24]} />
          {mannequinMaterial}
        </mesh>

        {/* Waist / Torso lower */}
        <mesh position={[0, 1.28, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.13, 0.16, 24]} />
          {mannequinMaterial}
        </mesh>

        {/* Upper Torso / Chest */}
        <mesh position={[0, 1.48, 0]} castShadow>
          <cylinderGeometry args={[0.19, 0.15, 0.26, 24]} />
          {mannequinMaterial}
        </mesh>

        {/* Shoulder Joints */}
        <mesh position={[-0.21, 1.58, 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          {jointMaterial}
        </mesh>
        <mesh position={[0.21, 1.58, 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          {jointMaterial}
        </mesh>

        {/* Arms (Upper) */}
        <mesh position={[-0.23, 1.38, 0]} rotation={[0, 0, 0.1]} castShadow>
          <cylinderGeometry args={[0.038, 0.032, 0.35, 16]} />
          {mannequinMaterial}
        </mesh>
        <mesh position={[0.23, 1.38, 0]} rotation={[0, 0, -0.1]} castShadow>
          <cylinderGeometry args={[0.038, 0.032, 0.35, 16]} />
          {mannequinMaterial}
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.66, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.055, 0.1, 16]} />
          {mannequinMaterial}
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.80, 0]} castShadow>
          <sphereGeometry args={[0.11, 24, 24]} />
          {mannequinMaterial}
        </mesh>
      </group>

      {/* Render placeholder indicators for attached garment slots if present */}
      {garmentSlots.map((slot) => {
        if (!slot.visible) return null;
        return (
          <group key={slot.id} name={`garment-slot-${slot.id}`}>
            {/* Future garment models will be rendered here dynamically */}
          </group>
        );
      })}
    </group>
  );
}
