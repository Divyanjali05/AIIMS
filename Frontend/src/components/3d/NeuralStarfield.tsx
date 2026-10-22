import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface NeuralStarfieldProps {
  count?: number;
  prefersReducedMotion?: boolean;
}

export const NeuralStarfield: React.FC<NeuralStarfieldProps> = ({
  count = 90,
  prefersReducedMotion = false
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#8B5CF6'), // Violet
      new THREE.Color('#22D3EE'), // Cyan
      new THREE.Color('#34D399'), // Emerald
      new THREE.Color('#C084FC')  // Light Violet
    ];

    for (let i = 0; i < count; i++) {
      // Distribute in a spherical / elliptical cloud
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 4.2 + 0.8;

      const sinPhi = Math.sin(phi);
      pos[i * 3] = r * sinPhi * Math.cos(theta);
      pos[i * 3 + 1] = (r * sinPhi * Math.sin(theta)) * 0.75;
      pos[i * 3 + 2] = r * Math.cos(phi) * 0.85;

      const c = palette[i % palette.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return { positions: pos, colors: col };
  }, [count]);

  useFrame((_, delta) => {
    if (prefersReducedMotion || !pointsRef.current) return;
    const clampedDelta = Math.min(delta, 0.1);
    pointsRef.current.rotation.y += clampedDelta * 0.04;
    pointsRef.current.rotation.x += clampedDelta * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
