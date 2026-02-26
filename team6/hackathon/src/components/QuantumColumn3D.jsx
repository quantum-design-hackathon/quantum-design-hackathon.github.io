import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const gateColorMap = {
    X: '#ef4444',
    H: '#a855f7',
    Z: '#06b6d4',
    NOISE: '#fbbf24',
};

const stateToRailActive = {
    ZERO: { top: true, bottom: false },
    ONE: { top: false, bottom: true },
    PLUS: { top: true, bottom: true },
    MINUS: { top: true, bottom: true },
    DECOHERED: { top: false, bottom: false },
};

const RAIL_SPACING = 0.12; // Half distance between dual rails
const COLUMN_HEIGHT = 3.0; // Total height of each circuit column

export default function QuantumColumn3D({ x, z, gates, states, measurement, animProgress }) {
    const gateCount = gates.length;

    // Rails: neutral until measured, then colored by result
    const measured = animProgress >= 1;
    const topRailColor = measured ? (measurement === 'blue' ? '#3b82f6' : '#475569') : '#94a3b8';
    const bottomRailColor = measured ? (measurement === 'red' ? '#ef4444' : '#475569') : '#64748b';
    const topEmissive = measured && measurement === 'blue' ? 0.5 : 0.15;
    const bottomEmissive = measured && measurement === 'red' ? 0.4 : 0.1;

    // Gate positions (evenly spaced along the column)
    const gatePositions = useMemo(() => {
        return gates.map((_, i) => {
            const t = (i + 1) / (gateCount + 1);
            return COLUMN_HEIGHT * (1 - t);
        });
    }, [gates, gateCount]);

    // Photon position based on animation progress
    const photonY = COLUMN_HEIGHT * (1 - animProgress);
    const currentStepIndex = Math.min(
        Math.floor(animProgress * (gateCount + 1)),
        states.length - 1
    );
    const currentState = states[currentStepIndex] || 'ZERO';
    const rails = stateToRailActive[currentState] || { top: true, bottom: false };

    // Measurement LED color
    const ledColor = measurement === 'blue' ? '#3b82f6' : measurement === 'red' ? '#ef4444' : '#fbbf24';

    return (
        <group position={[x, 0, z]}>
            {/* === Dual Rails === */}
            <mesh position={[RAIL_SPACING, COLUMN_HEIGHT / 2, 0]}>
                <cylinderGeometry args={[0.012, 0.012, COLUMN_HEIGHT, 8]} />
                <meshStandardMaterial color={topRailColor} emissive={topRailColor} emissiveIntensity={topEmissive} transparent opacity={0.85} />
            </mesh>
            <mesh position={[-RAIL_SPACING, COLUMN_HEIGHT / 2, 0]}>
                <cylinderGeometry args={[0.012, 0.012, COLUMN_HEIGHT, 8]} />
                <meshStandardMaterial color={bottomRailColor} emissive={bottomRailColor} emissiveIntensity={bottomEmissive} transparent opacity={0.7} />
            </mesh>

            {/* === Gate Markers === */}
            {gates.map((gate, i) => {
                if (!gate) return null;
                const color = gateColorMap[gate] || '#ffffff';
                return (
                    <group key={i} position={[0, gatePositions[i], 0]}>
                        {/* Gate box spanning both rails */}
                        <mesh>
                            <boxGeometry args={[RAIL_SPACING * 3, 0.08, 0.15]} />
                            <meshStandardMaterial
                                color={color}
                                transparent
                                opacity={0.6}
                                emissive={color}
                                emissiveIntensity={0.3}
                            />
                        </mesh>
                    </group>
                );
            })}

            {/* === Photon Dots (animated) === */}
            {animProgress > 0 && animProgress < 1 && (
                <>
                    {rails.top && (
                        <PhotonOrb
                            position={[RAIL_SPACING, photonY, 0]}
                            color={currentState === 'ZERO' ? '#3b82f6' : '#3b82f6'}
                            intensity={rails.bottom ? 0.6 : 1}
                        />
                    )}
                    {rails.bottom && (
                        <PhotonOrb
                            position={[-RAIL_SPACING, photonY, 0]}
                            color={currentState === 'ONE' ? '#ef4444' : '#ef4444'}
                            intensity={rails.top ? 0.6 : 1}
                        />
                    )}
                </>
            )}

            {/* === Measurement LED at bottom === */}
            <group position={[0, -0.15, 0]}>
                <mesh>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshStandardMaterial
                        color={animProgress >= 1 ? ledColor : '#1a1a2e'}
                        emissive={animProgress >= 1 ? ledColor : '#000000'}
                        emissiveIntensity={animProgress >= 1 ? 1.5 : 0}
                        transparent
                        opacity={animProgress >= 1 ? 1 : 0.3}
                    />
                </mesh>
                {animProgress >= 1 && (
                    <pointLight
                        color={ledColor}
                        intensity={0.8}
                        distance={1}
                        decay={2}
                    />
                )}
            </group>
        </group>
    );
}

function PhotonOrb({ position, color, intensity = 1 }) {
    const ref = useRef();
    const baseScale = 0.04;

    useFrame(({ clock }) => {
        if (ref.current) {
            const s = baseScale * (1 + 0.2 * Math.sin(clock.elapsedTime * 8));
            ref.current.scale.set(s / baseScale, s / baseScale, s / baseScale);
        }
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[baseScale, 12, 12]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2 * intensity}
                transparent
                opacity={0.9 * intensity}
            />
        </mesh>
    );
}
