import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { NeuralStarfield } from './NeuralStarfield';
import { OrbitalRings } from './OrbitalRings';

export interface Assessment3DSceneProps {
  activeStationId: number;
  stationThemeColor: string;
  progressRatio: number; // 0 to 1
  isDarkMode?: boolean;
  prefersReducedMotion?: boolean;
  pulseTrigger?: number;
  completedStationIds?: number[];
  isActive?: boolean;
}

interface SceneContentProps {
  activeStationId: number;
  stationThemeColor: string;
  progressRatio: number;
  isDarkMode: boolean;
  prefersReducedMotion: boolean;
  pulseTrigger?: number;
  completedStationIds: number[];
}

const STATION_COLORS = ['#4f46e5', '#0284c7', '#7c3aed', '#d97706', '#059669'];

const SceneContent: React.FC<SceneContentProps> = ({
  activeStationId,
  stationThemeColor,
  progressRatio,
  isDarkMode,
  prefersReducedMotion,
  pulseTrigger = 0,
  completedStationIds = []
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const synapseLinesRef = useRef<THREE.LineSegments>(null);

  const { viewport } = useThree();
  const responsiveScale = Math.min(1.05, Math.max(0.72, viewport.width / 5.2));

  // 5 Dimension Node Positions in an organic pentagonal orbit
  const stationNodes = useMemo(() => {
    const orbitRadius = 2.45;
    return [1, 2, 3, 4, 5].map((id, idx) => {
      const angle = (idx / 5) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius * 0.72;
      const z = Math.sin(angle * 2) * 0.45;
      const isComplete = completedStationIds.includes(id);
      const isCurrent = activeStationId === id;
      const baseColor = isComplete ? '#10b981' : isCurrent ? stationThemeColor : STATION_COLORS[idx];

      return {
        id,
        position: [x, y, z] as [number, number, number],
        isComplete,
        isCurrent,
        color: baseColor
      };
    });
  }, [activeStationId, stationThemeColor, completedStationIds]);

  // Pre-generate dynamic synapse line positions connecting center to each station node
  const lineGeometry = useMemo(() => {
    const points: number[] = [];
    stationNodes.forEach((node) => {
      // Line from core origin (0, 0, 0) to node position
      points.push(0, 0, 0);
      points.push(node.position[0], node.position[1], node.position[2]);
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geom;
  }, [stationNodes]);

  // Pulse effect tracking
  const lastPulseRef = useRef(pulseTrigger);
  const pulseFactorRef = useRef(1.0);

  if (pulseTrigger !== lastPulseRef.current) {
    lastPulseRef.current = pulseTrigger;
    pulseFactorRef.current = 1.35; // Trigger pulse ripple
  }

  useFrame(({ pointer, clock }, delta) => {
    if (!groupRef.current) return;
    const clampedDelta = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    // Lerp pulse factor back to resting
    pulseFactorRef.current = THREE.MathUtils.lerp(pulseFactorRef.current, 1.0, clampedDelta * 4);

    if (prefersReducedMotion) {
      groupRef.current.rotation.y = 0;
      groupRef.current.rotation.x = 0;
      return;
    }

    // Pointer Parallax
    const targetRotY = pointer.x * 0.42;
    const targetRotX = -pointer.y * 0.32;
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

    // Core continuous rotation & breathing
    if (coreRef.current) {
      coreRef.current.rotation.y += clampedDelta * (0.25 + progressRatio * 0.2);
      coreRef.current.rotation.x = Math.sin(t * 0.6) * 0.12;
      const baseScale = (1.0 + Math.sin(t * 1.8) * 0.04) * pulseFactorRef.current;
      coreRef.current.scale.set(baseScale, baseScale, baseScale);
    }

    if (wireframeRef.current) {
      wireframeRef.current.rotation.y -= clampedDelta * 0.2;
      wireframeRef.current.rotation.z += clampedDelta * 0.1;
    }

    if (innerCoreRef.current) {
      const innerPulse = (0.92 + Math.sin(t * 3.2) * 0.08) * pulseFactorRef.current;
      innerCoreRef.current.scale.set(innerPulse, innerPulse, innerPulse);
    }
  });

  return (
    <group ref={groupRef} scale={[responsiveScale, responsiveScale, responsiveScale]}>
      {/* 1. Ambient Neural Particles */}
      <NeuralStarfield count={75} prefersReducedMotion={prefersReducedMotion} />

      {/* 2. Floating Assembly containing Core & Nodes */}
      <Float
        speed={prefersReducedMotion ? 0 : 1.8}
        rotationIntensity={prefersReducedMotion ? 0 : 0.25}
        floatIntensity={prefersReducedMotion ? 0 : 0.35}
      >
        {/* Core Singularity */}
        <mesh ref={innerCoreRef}>
          <sphereGeometry args={[0.65, 32, 32]} />
          <meshStandardMaterial
            color={stationThemeColor}
            emissive={stationThemeColor}
            emissiveIntensity={isDarkMode ? 2.5 : 1.6}
            roughness={0.12}
            metalness={0.88}
          />
        </mesh>

        {/* Liquid Distort Outer Shell */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.1, 32]} />
          <MeshDistortMaterial
            color={stationThemeColor}
            emissive={isDarkMode ? stationThemeColor : '#312e81'}
            emissiveIntensity={isDarkMode ? 0.8 : 0.35}
            roughness={isDarkMode ? 0.2 : 0.1}
            metalness={isDarkMode ? 0.85 : 0.4}
            distort={prefersReducedMotion ? 0 : 0.32}
            speed={prefersReducedMotion ? 0 : 1.8}
            transparent
            opacity={isDarkMode ? 0.82 : 0.72}
          />
        </mesh>

        {/* Outer Geodesic Wireframe */}
        <mesh ref={wireframeRef}>
          <icosahedronGeometry args={[1.28, 1]} />
          <meshBasicMaterial
            color={isDarkMode ? '#A5B4FC' : '#4F46E5'}
            wireframe
            transparent
            opacity={isDarkMode ? 0.4 : 0.25}
          />
        </mesh>

        {/* Orbital Ring System */}
        <OrbitalRings prefersReducedMotion={prefersReducedMotion} />

        {/* Synapse Lines Connecting Core to the 5 Dimension Stations */}
        <lineSegments ref={synapseLinesRef} geometry={lineGeometry}>
          <lineBasicMaterial
            color={isDarkMode ? '#6366F1' : '#4F46E5'}
            transparent
            opacity={isDarkMode ? 0.45 : 0.3}
            linewidth={1}
          />
        </lineSegments>

        {/* 5 Orbiting Station Dimension Nodes */}
        {stationNodes.map((node) => {
          const sphereRadius = node.isCurrent ? 0.26 : node.isComplete ? 0.21 : 0.16;

          return (
            <group key={node.id} position={node.position}>
              {/* Outer Glow Halo for Active or Completed Station */}
              {(node.isCurrent || node.isComplete) && (
                <mesh>
                  <sphereGeometry args={[sphereRadius * 1.5, 16, 16]} />
                  <meshBasicMaterial
                    color={node.color}
                    transparent
                    opacity={node.isCurrent ? 0.35 : 0.2}
                    wireframe
                  />
                </mesh>
              )}

              {/* Station Node Orb */}
              <mesh>
                <sphereGeometry args={[sphereRadius, 24, 24]} />
                <meshStandardMaterial
                  color={node.color}
                  emissive={node.color}
                  emissiveIntensity={node.isCurrent ? (isDarkMode ? 2.6 : 1.8) : node.isComplete ? 1.4 : 0.4}
                  roughness={0.15}
                  metalness={0.8}
                />
              </mesh>
            </group>
          );
        })}
      </Float>
    </group>
  );
};

export const Assessment3DScene: React.FC<Assessment3DSceneProps> = ({
  activeStationId,
  stationThemeColor,
  progressRatio,
  isDarkMode = false,
  prefersReducedMotion = false,
  pulseTrigger = 0,
  completedStationIds = [],
  isActive = true
}) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 46 }}
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
        pointerEvents: 'none'
      }}
    >
      {/* Dynamic Lighting Rig for Light vs Dark Theme */}
      {isDarkMode ? (
        <>
          <ambientLight color="#0F172A" intensity={0.9} />
          <directionalLight position={[4, 6, 4]} color="#FFFFFF" intensity={1.2} />
          <pointLight position={[4, 3, 4]} color={stationThemeColor} intensity={2.8} distance={18} />
          <pointLight position={[-4, -2, 3]} color="#22D3EE" intensity={2.2} distance={18} />
          <pointLight position={[0, -4, -2]} color="#10B981" intensity={1.6} distance={18} />
        </>
      ) : (
        <>
          <ambientLight color="#F8FAFC" intensity={1.4} />
          <directionalLight position={[5, 8, 6]} color="#FFFFFF" intensity={1.8} />
          <pointLight position={[4, 4, 4]} color={stationThemeColor} intensity={2.2} distance={20} />
          <pointLight position={[-4, -3, 3]} color="#4F46E5" intensity={1.8} distance={18} />
          <pointLight position={[0, -3, 2]} color="#059669" intensity={1.2} distance={16} />
        </>
      )}

      {/* Assembly Component */}
      <SceneContent
        activeStationId={activeStationId}
        stationThemeColor={stationThemeColor}
        progressRatio={progressRatio}
        isDarkMode={isDarkMode}
        prefersReducedMotion={prefersReducedMotion}
        pulseTrigger={pulseTrigger}
        completedStationIds={completedStationIds}
      />
    </Canvas>
  );
};

export default Assessment3DScene;
