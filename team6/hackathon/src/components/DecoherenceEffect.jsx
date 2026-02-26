import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

/*
 * Decoherence animation sequence:
 *   Phase 1 (0–600ms):   Noise particles flood in from outside the circuit (D)
 *   Phase 2 (600–1200ms): Photon dims, collapses to one random rail (B)
 *   Phase 3 (1200–2000ms): Photon shatters into scattering particles that fade (A)
 */

// Generate random noise particles once
function generateNoiseParticles(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        startX: Math.random() > 0.5 ? -40 + Math.random() * -60 : 140 + Math.random() * 60,
        startY: -30 + Math.random() * 160,
        endX: 20 + Math.random() * 60,
        endY: 30 + Math.random() * 40,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.3,
        color: `hsl(${10 + Math.random() * 30}, ${70 + Math.random() * 30}%, ${50 + Math.random() * 20}%)`,
    }));
}

// Generate scatter fragments
function generateScatterParticles(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        distance: 40 + Math.random() * 80,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 0.2,
        color: Math.random() > 0.5
            ? `rgba(59, 130, 246, ${0.4 + Math.random() * 0.4})`
            : `rgba(239, 68, 68, ${0.4 + Math.random() * 0.4})`,
    }));
}

export default function DecoherenceEffect({ x, railGap, onComplete }) {
    const [phase, setPhase] = useState(0); // 0=noise, 1=collapse, 2=scatter, 3=done
    const [collapseRail, setCollapseRail] = useState(0);

    const noiseParticles = useMemo(() => generateNoiseParticles(20), []);
    const scatterParticles = useMemo(() => generateScatterParticles(16), []);

    useEffect(() => {
        setCollapseRail(Math.random() > 0.5 ? 1 : -1);
        const t1 = setTimeout(() => setPhase(1), 700);
        const t2 = setTimeout(() => setPhase(2), 1400);
        const t3 = setTimeout(() => { setPhase(3); onComplete?.(); }, 2400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    const topY = -(railGap / 2);
    const bottomY = railGap / 2;
    const collapseY = collapseRail === -1 ? topY : bottomY;

    return (
        <div
            className="absolute z-30 pointer-events-none"
            style={{
                left: `${x}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200,
                height: railGap + 80,
            }}
        >
            {/* Phase 0: Noise particles flooding in */}
            <AnimatePresence>
                {phase === 0 && noiseParticles.map((p) => (
                    <motion.div
                        key={`noise-${p.id}`}
                        className="absolute rounded-full"
                        style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                            left: '50%',
                            top: '50%',
                        }}
                        initial={{
                            x: p.startX,
                            y: p.startY,
                            opacity: 0,
                            scale: 0,
                        }}
                        animate={{
                            x: p.endX - 50,
                            y: p.endY - 20,
                            opacity: [0, 1, 0.8],
                            scale: [0, 1.5, 1],
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                            duration: 0.5,
                            delay: p.delay,
                            ease: 'easeOut',
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Phase 0-1: Ambient corruptive flash */}
            {phase <= 1 && (
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 120,
                        height: 120,
                        background: 'radial-gradient(circle, rgba(251,191,36,0.15), rgba(239,68,68,0.05), transparent)',
                        filter: 'blur(20px)',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 0.8, 0.4], scale: [0, 1.2, 0.8] }}
                    transition={{ duration: 0.6 }}
                />
            )}

            {/* Phase 1: Dimming photon collapsing to one rail */}
            <AnimatePresence>
                {phase === 1 && (
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            left: '50%',
                            top: '50%',
                            width: 14,
                            height: 14,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ y: 0, opacity: 1, scale: 1 }}
                        animate={{
                            y: collapseY,
                            opacity: [1, 0.6, 0.3],
                            scale: [1, 0.8, 0.6],
                            backgroundColor: ['rgba(168,85,247,1)', 'rgba(148,163,184,0.8)', 'rgba(100,116,139,0.5)'],
                            boxShadow: [
                                '0 0 15px rgba(168,85,247,0.6)',
                                '0 0 8px rgba(148,163,184,0.3)',
                                '0 0 4px rgba(100,116,139,0.2)',
                            ],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                    />
                )}
            </AnimatePresence>

            {/* Phase 2: Scatter particles exploding out */}
            <AnimatePresence>
                {phase === 2 && scatterParticles.map((p) => (
                    <motion.div
                        key={`scatter-${p.id}`}
                        className="absolute rounded-full"
                        style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            boxShadow: `0 0 ${p.size}px ${p.color}`,
                            left: '50%',
                            top: '50%',
                        }}
                        initial={{
                            x: 0,
                            y: collapseY,
                            opacity: 1,
                            scale: 1,
                        }}
                        animate={{
                            x: Math.cos(p.angle) * p.distance,
                            y: collapseY + Math.sin(p.angle) * p.distance,
                            opacity: [1, 0.7, 0],
                            scale: [1, 0.5, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.8,
                            delay: p.delay,
                            ease: 'easeOut',
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Phase 2: Brief flash at scatter origin */}
            {phase === 2 && (
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 30,
                        height: 30,
                    }}
                    initial={{
                        y: collapseY,
                        opacity: 1,
                        scale: 0.5,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 0 20px rgba(255,255,255,0.5)',
                    }}
                    animate={{
                        opacity: 0,
                        scale: 2,
                    }}
                    transition={{ duration: 0.4 }}
                />
            )}
        </div>
    );
}
