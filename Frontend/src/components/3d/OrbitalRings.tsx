import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OrbitalRingsProps {
  prefersReducedMotion?: boolean;
}

export const OrbitalRings: React.FC<OrbitalRingsProps> = ({ prefersReducedMotion = false }) => {
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const ring3Ref = useRef<THREE.Group>(null);

  const satellite1Ref = useRef<THREE.Mesh>(null);
  const satellite2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (prefersReducedMotion) return;
    const clampedDelta = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += clampedDelta * 0.25;
      ring1Ref.current.rotation.x += clampedDelta * 0.1;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= clampedDelta * 0.18;
      ring2Ref.current.rotation.y += clampedDelta * 0.15;
    }

    if (ring3Ref.current) {
      ring3Ref.current.rotation.x += clampedDelta * 0.12;
      ring3Ref.current.rotation.y -= clampedDelta * 0.08;
    }

    // Circulate satellites along orbital trajectories
    if (satellite1Ref.current) {
      const radius = 2.2;
      satellite1Ref.current.position.x = Math.cos(t * 0.8) * radius;
      satellite1Ref.current.position.y = Math.sin(t * 0.8) * radius;
      satellite1Ref.current.position.z = Math.sin(t * 0.8) * 0.4;
    }

    if (satellite2Ref.current) {
      const radius = 2.6;
      satellite2Ref.current.position.x = Math.cos(-t * 0.6) * radius;
      satellite2Ref.current.position.z = Math.sin(-t * 0.6) * radius;
      satellite2Ref.current.position.y = Math.cos(-t * 0.6) * 0.3;
    }
  });

  return (
    <group>
      {/* Ring 1 - Cyber Cyan tilted orbital ring */}
      <group ref={ring1Ref} rotation={[Math.PI / 3, Math.PI / 6, 0]}>
        <mesh>
          <torusGeometry args={[2.2, 0.018, 16, 72]} />
          <meshStandardMaterial
            color="#22D3EE"
            emissive="#0891B2"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Satellite 1 */}
        <mesh ref={satellite1Ref}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#22D3EE"
            emissiveIntensity={2.5}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Ring 2 - Electric Violet counter-rotating ring */}
      <group ref={ring2Ref} rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <mesh>
          <torusGeometry args={[2.6, 0.014, 16, 72]} />
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#6D28D9"
            emissiveIntensity={0.9}
            roughness={0.25}
            metalness={0.85}
            transparent
            opacity={0.75}
          />
        </mesh>
        {/* Satellite 2 */}
        <mesh ref={satellite2Ref}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#A855F7"
            emissiveIntensity={2.2}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Ring 3 - Outer Emerald resonance ring */}
      <group ref={ring3Ref} rotation={[Math.PI / 2.2, -Math.PI / 5, 0]}>
        <mesh>
          <torusGeometry args={[2.95, 0.01, 16, 72]} />
          <meshStandardMaterial
            color="#34D399"
            emissive="#059669"
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.8}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};
