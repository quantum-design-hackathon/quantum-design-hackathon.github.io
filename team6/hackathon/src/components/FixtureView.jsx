import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { QRCodeCanvas } from 'qrcode.react';
import QuantumColumn3D from './QuantumColumn3D';
import {
    generateFixtureGrid,
    parseGateString,
    buildColumnData,
    gatesToString,
} from '../quantum';

const GRID_SIZE = 5;
const SPACING = 0.7;
const NUM_GATES = 4;
const TOTAL_STEPS = NUM_GATES + 1;

export default function FixtureView() {
    // Grid of gate strings — each cell is like "XHZ"
    const [gateInputs, setGateInputs] = useState(() => {
        const initial = generateFixtureGrid(GRID_SIZE, NUM_GATES);
        return initial.map((row) => row.map((col) => gatesToString(col.gates)));
    });

    const [animProgress, setAnimProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isRepeating, setIsRepeating] = useState(false);
    const [stepIndex, setStepIndex] = useState(-1);
    const [showEditor, setShowEditor] = useState(true);
    const [showQR, setShowQR] = useState(false);

    const isDone = animProgress >= 1;
    const isStepping = stepIndex >= 0 && !isAnimating;

    // counter bumped each repeat cycle to re-roll measurements
    const [measureSeed, setMeasureSeed] = useState(0);

    // Derive grid data from gate input strings (re-derives on seed change too)
    const grid = useMemo(() => {
        return gateInputs.map((row) =>
            row.map((str) => {
                const gates = parseGateString(str, NUM_GATES);
                return buildColumnData(gates);
            })
        );
    }, [gateInputs, measureSeed]);

    const updateCell = useCallback((row, col, value) => {
        // Only allow valid gate chars + max 4
        const filtered = value
            .toUpperCase()
            .split('')
            .filter((ch) => 'XHZN'.includes(ch))
            .slice(0, 4)
            .join('');
        setGateInputs((prev) => {
            const next = prev.map((r) => [...r]);
            next[row][col] = filtered;
            return next;
        });
    }, []);

    const randomize = useCallback(() => {
        const newGrid = generateFixtureGrid(GRID_SIZE, NUM_GATES);
        setGateInputs(newGrid.map((row) => row.map((col) => gatesToString(col.gates))));
        setAnimProgress(0);
        setIsAnimating(false);
        setIsRepeating(false);
        setStepIndex(-1);
    }, []);

    const resetPhotons = useCallback(() => {
        setAnimProgress(0);
        setIsAnimating(false);
        setIsRepeating(false);
        setStepIndex(-1);
    }, []);

    const startAnimation = useCallback(() => {
        if (isAnimating || isStepping) return;
        setAnimProgress(0);
        setStepIndex(-1);
        setIsAnimating(true);
    }, [isAnimating, isStepping]);

    const toggleRepeater = useCallback(() => {
        setIsRepeating((prev) => {
            if (!prev) {
                // Start repeating
                setAnimProgress(0);
                setStepIndex(-1);
                setIsAnimating(true);
                return true;
            }
            return false;
        });
    }, []);

    const handleStep = useCallback(() => {
        if (isAnimating) return;
        const next = stepIndex + 1;
        if (next > TOTAL_STEPS) return;
        setStepIndex(next);
        setAnimProgress(next / TOTAL_STEPS);
    }, [isAnimating, stepIndex]);

    // Use a ref to track repeating state to avoid stale closure in the effect
    const isRepeatingRef = useRef(isRepeating);
    useEffect(() => {
        isRepeatingRef.current = isRepeating;
    }, [isRepeating]);

    // Smooth auto-play animation (with repeater support)
    useEffect(() => {
        if (!isAnimating) return;
        let frame;
        let timeout;
        let start = null;
        const duration = 4000;
        let cancelled = false;

        const tick = (timestamp) => {
            if (cancelled) return;
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setAnimProgress(progress);

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            } else {
                setIsAnimating(false);
                // If repeating, pause to show LEDs, then restart
                if (isRepeatingRef.current) {
                    timeout = setTimeout(() => {
                        if (!cancelled) {
                            setMeasureSeed((s) => s + 1); // re-roll measurements
                            setAnimProgress(0);
                            setIsAnimating(true);
                        }
                    }, 1500);
                }
            }
        };
        frame = requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            clearTimeout(timeout);
        };
    }, [isAnimating]);

    const offset = ((GRID_SIZE - 1) * SPACING) / 2;

    const stepLabel =
        stepIndex < 0
            ? 'Ready'
            : stepIndex === 0
                ? 'Input'
                : stepIndex <= NUM_GATES
                    ? `Gate ${stepIndex}`
                    : 'Measured';

    return (
        <div className="w-full h-screen relative flex" style={{ backgroundColor: '#050510' }}>
            {/* Editor Panel */}
            {showEditor && (
                <div
                    className="flex flex-col gap-3 p-4 overflow-y-auto"
                    style={{
                        width: 280,
                        minWidth: 280,
                        backgroundColor: '#0a0a18',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                    }}
                >
                    <h3
                        className="text-[0.6rem] font-bold tracking-[0.25em] uppercase text-center"
                        style={{ fontFamily: 'var(--font-display)', color: '#64748b' }}
                    >
                        Circuit Grid Editor
                    </h3>
                    <p className="text-[0.5rem] text-center" style={{ color: '#475569' }}>
                        Type gate sequences (max 4):&nbsp;
                        <span style={{ color: '#ef4444' }}>X</span>&nbsp;
                        <span style={{ color: '#a855f7' }}>H</span>&nbsp;
                        <span style={{ color: '#06b6d4' }}>Z</span>&nbsp;
                        <span style={{ color: '#fbbf24' }}>N</span>oise
                    </p>

                    {/* Column headers */}
                    <div className="grid gap-1" style={{ gridTemplateColumns: `32px repeat(${GRID_SIZE}, 1fr)` }}>
                        <div />
                        {Array.from({ length: GRID_SIZE }, (_, i) => (
                            <div
                                key={i}
                                className="text-center text-[0.45rem] font-bold tracking-wider"
                                style={{ color: '#475569', fontFamily: 'var(--font-display)' }}
                            >
                                C{i + 1}
                            </div>
                        ))}
                    </div>

                    {/* Grid rows */}
                    {gateInputs.map((row, ri) => (
                        <div
                            key={ri}
                            className="grid gap-1 items-center"
                            style={{ gridTemplateColumns: `32px repeat(${GRID_SIZE}, 1fr)` }}
                        >
                            <div
                                className="text-[0.45rem] font-bold tracking-wider text-right pr-1"
                                style={{ color: '#475569', fontFamily: 'var(--font-display)' }}
                            >
                                R{ri + 1}
                            </div>
                            {row.map((cellValue, ci) => (
                                <input
                                    key={ci}
                                    type="text"
                                    value={cellValue}
                                    maxLength={4}
                                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                                    disabled={isAnimating || isStepping}
                                    className="rounded-md border text-center font-mono text-[0.6rem] tracking-widest focus:outline-none focus:ring-1"
                                    style={{
                                        width: '100%',
                                        padding: '4px 2px',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderColor: cellValue
                                            ? 'rgba(168,85,247,0.3)'
                                            : 'rgba(255,255,255,0.06)',
                                        color: '#e2e8f0',
                                        caretColor: '#a855f7',
                                        fontFamily: 'var(--font-display)',
                                    }}
                                    placeholder="—"
                                />
                            ))}
                        </div>
                    ))}

                    {/* Quick presets */}
                    <div className="mt-2">
                        <h4
                            className="text-[0.45rem] font-bold tracking-[0.2em] uppercase mb-1.5 text-center"
                            style={{ fontFamily: 'var(--font-display)', color: '#475569' }}
                        >
                            Quick Presets
                        </h4>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                            {[
                                { label: 'All H', fill: 'H' },
                                { label: 'All X', fill: 'X' },
                                { label: 'HH=I', fill: 'HH' },
                                { label: 'HZH', fill: 'HZH' },
                                { label: 'Clear', fill: '' },
                            ].map(({ label, fill }) => (
                                <button
                                    key={label}
                                    className="px-2 py-1 rounded-md border text-[0.45rem] tracking-wider cursor-pointer transition-all hover:scale-105"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        borderColor: 'rgba(255,255,255,0.08)',
                                        color: '#94a3b8',
                                    }}
                                    onClick={() => {
                                        setGateInputs(
                                            Array.from({ length: GRID_SIZE }, () =>
                                                Array.from({ length: GRID_SIZE }, () => fill)
                                            )
                                        );
                                    }}
                                    disabled={isAnimating || isStepping}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <h4
                            className="text-[0.45rem] font-bold tracking-[0.2em] uppercase mb-2"
                            style={{ fontFamily: 'var(--font-display)', color: '#475569' }}
                        >
                            Gate Colors
                        </h4>
                        <div className="flex flex-col gap-1">
                            {[
                                { color: '#ef4444', label: 'X — Swap rails' },
                                { color: '#a855f7', label: 'H — Beam splitter' },
                                { color: '#06b6d4', label: 'Z — Phase shift' },
                                { color: '#fbbf24', label: 'N — Decoherence' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className="rounded-sm" style={{ width: 8, height: 8, backgroundColor: color }} />
                                    <span className="text-[0.45rem]" style={{ color: '#94a3b8' }}>{label}</span>
                                </div>
                            ))}
                            <div className="mt-1 flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: '#3b82f6' }} />
                                    <span className="text-[0.4rem]" style={{ color: '#64748b' }}>|0⟩</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: '#ef4444' }} />
                                    <span className="text-[0.4rem]" style={{ color: '#64748b' }}>|1⟩</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D Scene */}
            <div className="flex-1 relative">
                <Canvas
                    camera={{ position: [0, -3, 4], fov: 50 }}
                    gl={{ antialias: true, alpha: false }}
                    style={{ background: '#050510' }}
                >
                    <ambientLight intensity={0.15} />
                    <directionalLight position={[5, 8, 5]} intensity={0.3} color="#e0e7ff" />
                    <directionalLight position={[-3, -2, 4]} intensity={0.15} color="#3b82f6" />

                    <group>
                        {grid.map((row, ri) =>
                            row.map((col, ci) => (
                                <QuantumColumn3D
                                    key={`${ri}-${ci}`}
                                    x={ci * SPACING - offset}
                                    z={ri * SPACING - offset}
                                    gates={col.gates}
                                    states={col.states}
                                    measurement={col.measurement}
                                    animProgress={animProgress}
                                />
                            ))
                        )}
                    </group>

                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
                        <planeGeometry args={[6, 6]} />
                        <meshStandardMaterial color="#080812" transparent opacity={0.5} />
                    </mesh>

                    <OrbitControls
                        enableDamping
                        dampingFactor={0.05}
                        minDistance={2}
                        maxDistance={10}
                        autoRotate={!isAnimating && isDone}
                        autoRotateSpeed={0.5}
                        target={[0, 1.2, 0]}
                    />
                </Canvas>

                {/* Header */}
                <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
                    <h1
                        className="text-xl font-bold tracking-[0.2em]"
                        style={{
                            fontFamily: 'var(--font-display)',
                            background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        QUANTUM CHANDELIER
                    </h1>
                    <p className="text-[0.65rem] tracking-widest uppercase" style={{ color: '#475569' }}>
                        {GRID_SIZE}×{GRID_SIZE} Photonic Circuit Array — Orbit to explore
                    </p>
                    {(isStepping || isAnimating) && (
                        <span
                            className="mt-1 px-3 py-0.5 rounded-full border text-[0.6rem] font-bold tracking-wider"
                            style={{
                                fontFamily: 'var(--font-display)',
                                color: '#a855f7',
                                borderColor: 'rgba(168,85,247,0.3)',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                            }}
                        >
                            {isAnimating ? 'Running...' : stepLabel}
                        </span>
                    )}
                </div>

                {/* Toggle editor */}
                <button
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg border text-[0.55rem] font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                    style={{
                        fontFamily: 'var(--font-display)',
                        backgroundColor: 'rgba(168,85,247,0.1)',
                        borderColor: 'rgba(168,85,247,0.3)',
                        color: '#a855f7',
                    }}
                    onClick={() => setShowEditor((v) => !v)}
                >
                    {showEditor ? '◀ HIDE' : '▶ EDIT'}
                </button>

                {/* Controls */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 pointer-events-none">
                    <button
                        className="pointer-events-auto px-5 py-2.5 rounded-xl border font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem',
                            backgroundColor: (isAnimating || isStepping || isRepeating) ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.15)',
                            borderColor: (isAnimating || isStepping || isRepeating) ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.5)',
                            color: '#22c55e',
                            opacity: (isAnimating || isStepping || isRepeating) ? 0.35 : 1,
                        }}
                        onClick={startAnimation}
                        disabled={isAnimating || isStepping || isRepeating}
                    >
                        ▶ AUTO
                    </button>
                    <button
                        className="pointer-events-auto px-5 py-2.5 rounded-xl border font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem',
                            backgroundColor: isRepeating ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)',
                            borderColor: isRepeating ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.35)',
                            color: '#fbbf24',
                            boxShadow: isRepeating ? '0 0 15px rgba(251,191,36,0.15)' : 'none',
                        }}
                        onClick={toggleRepeater}
                    >
                        {isRepeating ? '⏸ STOP' : '🔁 REPEAT'}
                    </button>
                    <button
                        className="pointer-events-auto px-5 py-2.5 rounded-xl border font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem',
                            backgroundColor: (isAnimating || isRepeating) ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.15)',
                            borderColor: (isAnimating || isRepeating) ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.5)',
                            color: '#a855f7',
                            opacity: (isAnimating || isDone || isRepeating) ? 0.35 : 1,
                        }}
                        onClick={handleStep}
                        disabled={isAnimating || isDone || isRepeating}
                    >
                        ⏭ STEP
                    </button>
                    <button
                        className="pointer-events-auto px-5 py-2.5 rounded-xl border font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(59,130,246,0.12)',
                            borderColor: 'rgba(59,130,246,0.4)',
                            color: '#3b82f6',
                        }}
                        onClick={resetPhotons}
                    >
                        ⟲ RESET
                    </button>
                    <button
                        className="pointer-events-auto px-5 py-2.5 rounded-xl border font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(59,130,246,0.08)',
                            borderColor: 'rgba(59,130,246,0.25)',
                            color: '#60a5fa',
                        }}
                        onClick={randomize}
                    >
                        ↻ RANDOM
                    </button>
                </div>

                {/* QR Code Overlay */}
                {showQR && (
                    <div
                        className="absolute bottom-16 right-4 p-4 rounded-2xl border flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300 pointer-events-auto"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                            zIndex: 100
                        }}
                    >
                        <QRCodeCanvas
                            value="http://10.24.1.109:5174"
                            size={160}
                            level="H"
                            includeMargin={true}
                        />
                        <div className="text-center">
                            <p className="text-[0.6rem] font-bold text-slate-900 tracking-wider">JOIN SESSION</p>
                            <p className="text-[0.5rem] font-medium text-slate-500">10.24.1.109:5174</p>
                        </div>
                    </div>
                )}

                {/* QR Toggle Button */}
                <button
                    className="absolute bottom-32 right-4 z-10 px-3 py-1.5 rounded-lg border text-[0.55rem] font-semibold tracking-wider cursor-pointer transition-all hover:scale-105 pointer-events-auto"
                    style={{
                        fontFamily: 'var(--font-display)',
                        backgroundColor: showQR ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: '#60a5fa',
                    }}
                    onClick={() => setShowQR((v) => !v)}
                >
                    {showQR ? '✕ CLOSE QR' : '📱 SHARE QR'}
                </button>

                {/* Hint */}
                <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                    <p className="text-[0.5rem] tracking-widest uppercase" style={{ color: '#334155' }}>
                        Look up from below to see the LED grid • Look from the side to see the circuits
                    </p>
                </div>
            </div>
        </div>
    );
}
