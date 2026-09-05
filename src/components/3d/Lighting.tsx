'use client';
import React from 'react';

export function StudioLighting() {
  return (
    <>
      {/* Soft Ambient Light for base illumination */}
      <ambientLight intensity={0.65} color="#ffffff" />

      {/* Key Light - Soft white front-right light */}
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Fill Light - Cool tone left light to soften shadows */}
      <directionalLight position={[-3, 3, 2]} intensity={0.5} color="#e0e8ff" />

      {/* Rim / Back Light - Warm light behind avatar for edge definition */}
      <directionalLight position={[0, 4, -4]} intensity={0.6} color="#fff4e0" />

      {/* Subtle Ground Hemisphere Light for realistic studio reflections */}
      <hemisphereLight intensity={0.3} color="#ffffff" groundColor="#b0b0b5" />
    </>
  );
}
