import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';

interface NeuralCoreProps {
  onExploreClick?: () => void;
  prefersReducedMotion?: boolean;
}

export const NeuralCore: React.FC<NeuralCoreProps> = ({
  onExploreClick,
  prefersReducedMotion = false
}) => {
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);

  React.useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    // Smooth hover lerp
    const targetScale = hovered ? 1.12 : 1.0;
    if (outerMeshRef.current) {
      outerMeshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        clampedDelta * 5
      );

      if (!prefersReducedMotion) {
        outerMeshRef.current.rotation.y += clampedDelta * (hovered ? 0.6 : 0.3);
        outerMeshRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
      }
    }

    if (wireframeRef.current && !prefersReducedMotion) {
      wireframeRef.current.rotation.y -= clampedDelta * (hovered ? 0.5 : 0.25);
      wireframeRef.current.rotation.z += clampedDelta * 0.15;
    }

    if (innerCoreRef.current) {
      // Subtle rhythmic core pulsation
      const pulse = 0.92 + Math.sin(t * (hovered ? 4.5 : 2.5)) * 0.08;
      innerCoreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'auto';
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onExploreClick) onExploreClick();
      }}
    >
      {/* 1. Deep Core Pulsing Singularity */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshStandardMaterial
          color="#22D3EE"
          emissive="#22D3EE"
          emissiveIntensity={hovered ? 3.0 : 1.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* 2. Primary Quantum Distorted Liquid-Crystal Shell */}
      <mesh ref={outerMeshRef}>
        <icosahedronGeometry args={[1.25, 32]} />
        <MeshDistortMaterial
          color={hovered ? '#A855F7' : '#7C3AED'}
          emissive="#4C1D95"
          emissiveIntensity={0.6}
          roughness={0.15}
          metalness={0.85}
          distort={prefersReducedMotion ? 0 : hovered ? 0.45 : 0.3}
          speed={prefersReducedMotion ? 0 : hovered ? 3.0 : 1.8}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 3. Outer Geodesic Wireframe Lattice */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[1.42, 1]} />
        <meshBasicMaterial
          color="#38BDF8"
          wireframe
          transparent
          opacity={hovered ? 0.55 : 0.3}
        />
      </mesh>
    </group>
  );
};
