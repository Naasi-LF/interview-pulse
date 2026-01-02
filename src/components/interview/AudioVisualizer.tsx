"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

interface AudioVisualizerProps {
    isRecording: boolean;
    volume: number; // 0.0 to 1.0 (approximated RMS)
}

function AnimatedSphere({ isRecording, volume }: { isRecording: boolean, volume: number }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();

        // Idle animation
        meshRef.current.rotation.x = time * 0.2;
        meshRef.current.rotation.y = time * 0.3;

        // React to volume
        // Base scale is 1.5, expands up to 2.5 based on volume
        const targetScale = isRecording ? 1.5 + (volume * 4) : 1.2;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Color shift based on volume (Purple to Cyan/White)
        // We'll handle this purely via material or let the distortion do the talking
    });

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.5}>
            <MeshDistortMaterial
                color={isRecording ? "#8b5cf6" : "#4b5563"} // Violet-500 vs Gray-600
                attach="material"
                distort={isRecording ? 0.3 + (volume * 2) : 0.1} // More distortion when loud
                speed={isRecording ? 2 + (volume * 5) : 1}
                roughness={0.2}
                metalness={0.8}
            />
        </Sphere>
    );
}

export default function AudioVisualizer({ isRecording, volume }: AudioVisualizerProps) {
    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <pointLight position={[-10, -10, -5]} intensity={2} color="#ec4899" />
                <pointLight position={[0, 5, 0]} intensity={1.5} color="#06b6d4" />

                <AnimatedSphere isRecording={isRecording} volume={volume} />
            </Canvas>
        </div>
    );
}
