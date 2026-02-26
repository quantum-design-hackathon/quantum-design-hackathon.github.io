import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import GateSlot from './GateSlot';
import MeasurementBulb from './MeasurementBulb';
import DecoherenceEffect from './DecoherenceEffect';

const RAIL_GAP = 80;

export default function Circuit({
    gateSlots,
    onDropGate,
    onRemoveGate,
    photonPhase,
    photonStep,
    photonStateAtStep,
    measurementColor,
    disabled,
    initialState,
    onToggleInitial,
    onDecoherenceComplete,
}) {
    const numSlots = gateSlots.length;

    const getX = (step) => {
        const start = 8;
        const end = 92;
        const range = end - start;
        const totalPositions = numSlots + 2;
        return start + (step / (totalPositions - 1)) * range;
    };

    const getRailY = (state) => {
        switch (state) {
            case 'ZERO': return -(RAIL_GAP / 2);
            case 'ONE': return RAIL_GAP / 2;
            default: return 0;
        }
    };

    const isSplit = (state) =>
        state === 'PLUS' || state === 'MINUS';

    const photonColorForRail = (state, rail) => {
        if (state === 'DECOHERED') return '#fbbf24';
        if (isSplit(state)) return rail === 'top' ? '#3b82f6' : '#ef4444';
        if (state === 'ZERO') return '#3b82f6';
        if (state === 'ONE') return '#ef4444';
        return '#3b82f6';
    };

    const currentState =
        photonPhase === 'idle'
            ? initialState === 'ONE' ? 'ONE' : 'ZERO'
            : photonStateAtStep?.[photonStep] ?? 'ZERO';

    const isDecohered = currentState === 'DECOHERED' && photonPhase !== 'idle';
    const currentX = getX(photonStep);
    const showWaves = photonPhase !== 'idle' && photonPhase !== 'done' && !isDecohered && isSplit(currentState);
    const isAntiPhase = currentState === 'MINUS';

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div
                className="relative rounded-2xl border px-6 py-8 overflow-hidden"
                style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderColor: 'var(--color-border-glow)',
                    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
                }}
            >
                {/* === Dual Rails === */}
                <div
                    className="absolute left-6 right-6 h-[2px]"
                    style={{
                        top: `calc(50% - ${RAIL_GAP / 2}px)`,
                        background: 'linear-gradient(90deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 12%, rgba(59,130,246,0.1) 88%, rgba(59,130,246,0.2) 100%)',
                    }}
                />
                <div
                    className="absolute left-6 right-6 h-[2px]"
                    style={{
                        top: `calc(50% + ${RAIL_GAP / 2}px)`,
                        background: 'linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.07) 12%, rgba(239,68,68,0.07) 88%, rgba(239,68,68,0.15) 100%)',
                    }}
                />

                {/* Rail labels */}
                <div className="absolute text-[0.55rem] font-bold tracking-widest" style={{ left: 8, top: `calc(50% - ${RAIL_GAP / 2}px - 14px)`, color: '#3b82f6', fontFamily: 'var(--font-display)' }}>|0⟩</div>
                <div className="absolute text-[0.55rem] font-bold tracking-widest" style={{ left: 8, top: `calc(50% + ${RAIL_GAP / 2}px + 5px)`, color: '#ef4444', fontFamily: 'var(--font-display)' }}>|1⟩</div>

                {/* === Wave Ripples === */}
                <AnimatePresence>
                    {showWaves && (
                        <>
                            <WaveRipple
                                key="wave-top"
                                rail="top"
                                railGap={RAIL_GAP}
                                photonX={currentX}
                                color="#3b82f6"
                                phaseOffset={0}
                            />
                            <WaveRipple
                                key="wave-bottom"
                                rail="bottom"
                                railGap={RAIL_GAP}
                                photonX={currentX}
                                color="#ef4444"
                                phaseOffset={isAntiPhase ? Math.PI : 0}
                            />
                        </>
                    )}
                </AnimatePresence>

                {/* Phase label */}
                <AnimatePresence>
                    {showWaves && (
                        <motion.div
                            className="absolute z-30 pointer-events-none"
                            style={{
                                left: `${currentX + 3}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div
                                className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold tracking-wider"
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    color: isAntiPhase ? '#06b6d4' : '#a855f7',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    border: `1px solid ${isAntiPhase ? 'rgba(6,182,212,0.3)' : 'rgba(168,85,247,0.3)'}`,
                                    textShadow: `0 0 8px ${isAntiPhase ? '#06b6d4' : '#a855f7'}`,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {isAntiPhase ? 'π phase' : 'in phase'}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* === Main layout row === */}
                <div className="relative flex items-center justify-between" style={{ minHeight: RAIL_GAP + 90, paddingLeft: 12, paddingRight: 4 }}>
                    {/* Input toggle */}
                    <div className="flex flex-col items-center gap-1 z-10">
                        <motion.button
                            className="rounded-full border-2 flex items-center justify-center cursor-pointer"
                            style={{
                                width: 44, height: 44,
                                borderColor: initialState === 'ZERO' ? 'rgba(59,130,246,0.5)' : 'rgba(239,68,68,0.5)',
                                backgroundColor: initialState === 'ZERO' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)',
                                boxShadow: `0 0 12px ${initialState === 'ZERO' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onToggleInitial}
                            disabled={photonPhase === 'running'}
                            title="Toggle initial state"
                        >
                            <span className="text-[0.65rem] font-bold" style={{ fontFamily: 'var(--font-display)', color: initialState === 'ZERO' ? '#3b82f6' : '#ef4444' }}>
                                {initialState === 'ZERO' ? '|0⟩' : '|1⟩'}
                            </span>
                        </motion.button>
                        <span className="text-[0.45rem] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>Toggle</span>
                    </div>

                    {/* Gate Slots */}
                    {gateSlots.map((gate, i) => (
                        <div key={i} className="z-10">
                            <GateSlot index={i} gate={gate} onDrop={onDropGate} onRemove={onRemoveGate} disabled={disabled} height={RAIL_GAP + 40} />
                        </div>
                    ))}

                    {/* Detector */}
                    <div className="z-10">
                        <MeasurementBulb resultColor={measurementColor} />
                    </div>
                </div>

                {/* === Photon Dots (hidden during decoherence) === */}
                <AnimatePresence>
                    {photonPhase !== 'idle' && !isDecohered && !isSplit(currentState) && (
                        <PhotonDot
                            key="single"
                            x={currentX}
                            y={getRailY(currentState)}
                            color={photonColorForRail(currentState, 'top')}
                            phase={photonPhase}
                        />
                    )}
                    {photonPhase !== 'idle' && !isDecohered && isSplit(currentState) && (
                        <>
                            <PhotonDot
                                key="top-split"
                                x={currentX}
                                y={-(RAIL_GAP / 2)}
                                color={photonColorForRail(currentState, 'top')}
                                phase={photonPhase}
                                pulsing
                            />
                            <PhotonDot
                                key="bottom-split"
                                x={currentX}
                                y={RAIL_GAP / 2}
                                color={photonColorForRail(currentState, 'bottom')}
                                phase={photonPhase}
                                pulsing
                            />
                        </>
                    )}
                </AnimatePresence>

                {/* === Decoherence Animation === */}
                {isDecohered && (
                    <DecoherenceEffect
                        x={currentX}
                        railGap={RAIL_GAP}
                        onComplete={onDecoherenceComplete}
                    />
                )}
            </div>
        </div>
    );
}

/* ─── Wave Ripple ─────────────────────────────────────────────── */

function WaveRipple({ rail, railGap, photonX, color, phaseOffset }) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 50);
        return () => clearInterval(id);
    }, []);

    const yCenter = rail === 'top' ? -(railGap / 2) : railGap / 2;
    const waveWidth = 180;
    const waveHeight = 18;
    const points = 60;
    const amplitude = waveHeight / 2;
    const frequency = 3; // number of full waves visible
    const speed = tick * 0.15;

    // Build SVG path for sine wave
    let path = '';
    for (let i = 0; i <= points; i++) {
        const x = (i / points) * waveWidth;
        const phase = ((i / points) * frequency * 2 * Math.PI) + phaseOffset - speed;
        const y = amplitude * Math.sin(phase) + waveHeight / 2;
        path += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }

    return (
        <motion.div
            className="absolute z-10 pointer-events-none"
            style={{
                left: `calc(${photonX}% - ${waveWidth + 10}px)`,
                top: `calc(50% + ${yCenter}px - ${waveHeight / 2}px)`,
                width: waveWidth,
                height: waveHeight,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <svg
                width={waveWidth}
                height={waveHeight}
                viewBox={`0 0 ${waveWidth} ${waveHeight}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Glow layer */}
                <path
                    d={path}
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.15"
                    style={{ filter: `blur(3px)` }}
                />
                {/* Main wave */}
                <path
                    d={path}
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                />
                {/* Fade mask — fades out on the left */}
                <defs>
                    <linearGradient id={`fade-${rail}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="white" stopOpacity="0" />
                        <stop offset="30%" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="white" stopOpacity="1" />
                    </linearGradient>
                    <mask id={`mask-${rail}`}>
                        <rect width={waveWidth} height={waveHeight} fill={`url(#fade-${rail})`} />
                    </mask>
                </defs>
                {/* Re-draw main wave with mask for fade effect */}
                <path
                    d={path}
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.8"
                    mask={`url(#mask-${rail})`}
                />
            </svg>
        </motion.div>
    );
}

/* ─── Photon Dot ──────────────────────────────────────────────── */

function PhotonDot({ x, y, color, phase, pulsing }) {
    return (
        <motion.div
            className="absolute z-20 pointer-events-none"
            style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color}, ${color}80)`,
                boxShadow: `0 0 10px ${color}90, 0 0 28px ${color}50`,
                transform: 'translate(-50%, -50%)',
            }}
            initial={{ left: `${x}%`, top: `calc(50% + ${y}px)`, opacity: 0, scale: 0 }}
            animate={{
                left: `${x}%`,
                top: `calc(50% + ${y}px)`,
                opacity: phase === 'done' ? 0 : 1,
                scale: phase === 'done' ? 0 : pulsing ? [1, 1.3, 1] : 1,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
                left: { duration: 0.5, ease: 'easeInOut' },
                top: { duration: 0.35, ease: 'easeInOut' },
                opacity: { duration: 0.25 },
                scale: pulsing ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 },
            }}
        >
            <div className="absolute inset-[2px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.7), transparent)' }} />
        </motion.div>
    );
}
