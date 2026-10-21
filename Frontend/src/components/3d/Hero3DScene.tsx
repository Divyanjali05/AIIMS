import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { NeuralCore } from './NeuralCore';
import { OrbitalRings } from './OrbitalRings';
import { NeuralStarfield } from './NeuralStarfield';

interface SceneContentProps {
  onExploreClick?: () => void;
  prefersReducedMotion: boolean;
}

const SceneContent: React.FC<SceneContentProps> = ({
  onExploreClick,
  prefersReducedMotion
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Responsive scale based on viewport width
  const responsiveScale = Math.min(1, Math.max(0.68, viewport.width / 5.5));

  useFrame(({ pointer }, delta) => {
    if (!groupRef.current) return;
    const clampedDelta = Math.min(delta, 0.1);

    if (prefersReducedMotion) {
      groupRef.current.rotation.y = 0;
      groupRef.current.rotation.x = 0;
      return;
    }

    // Smooth pointer parallax lerping
    const targetRotY = pointer.x * 0.45;
    const targetRotX = -pointer.y * 0.35;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      clampedDelta * 3
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      clampedDelta * 3
    );
  });

  return (
    <group ref={groupRef} scale={[responsiveScale, responsiveScale, responsiveScale]}>
      {/* 3D Neural Starfield particle constellation */}
      <NeuralStarfield count={90} prefersReducedMotion={prefersReducedMotion} />

      {/* Floating Organic Assembly */}
      <Float
        speed={prefersReducedMotion ? 0 : 2.2}
        rotationIntensity={prefersReducedMotion ? 0 : 0.4}
        floatIntensity={prefersReducedMotion ? 0 : 0.5}
      >
        <NeuralCore
          onExploreClick={onExploreClick}
          prefersReducedMotion={prefersReducedMotion}
        />
        <OrbitalRings prefersReducedMotion={prefersReducedMotion} />
      </Float>
    </group>
  );
};

export interface Hero3DSceneProps {
  onExploreClick?: () => void;
  prefersReducedMotion?: boolean;
  isActive?: boolean;
}

export const Hero3DScene: React.FC<Hero3DSceneProps> = ({
  onExploreClick,
  prefersReducedMotion = false,
  isActive = true
}) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 45 }}
      dpr={[1, 2]}
      frameloop={isActive ? 'always' : 'never'}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto'
      }}
    >
      {/* Ambient & Directional Lighting Hierarchy */}
      <ambientLight color="#1E1B4B" intensity={0.9} />
      <pointLight position={[4, 3, 4]} color="#22D3EE" intensity={2.6} distance={20} />
      <pointLight position={[-4, -2, 3]} color="#8B5CF6" intensity={2.2} distance={20} />
      <pointLight position={[0, 4, -3]} color="#34D399" intensity={1.5} distance={20} />

      {/* 3D Scene Assembly */}
      <SceneContent
        onExploreClick={onExploreClick}
        prefersReducedMotion={prefersReducedMotion}
      />
    </Canvas>
  );
};

export default Hero3DScene;
