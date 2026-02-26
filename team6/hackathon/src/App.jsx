import { useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Atom, Play, SkipForward, RotateCcw, Trash2, Box, Cpu } from 'lucide-react';
import Circuit from './components/Circuit';
import { DraggableGate } from './components/GatePalette';
import FixtureView from './components/FixtureView';

const NUM_SLOTS = 4;

/*
 * Hermitian gate algebra: G² = I for all gates.
 *
 *   X|0⟩=|1⟩  X|1⟩=|0⟩  X|+⟩=|+⟩  X|−⟩=|−⟩
 *   H|0⟩=|+⟩  H|1⟩=|−⟩  H|+⟩=|0⟩  H|−⟩=|1⟩
 *   Z|0⟩=|0⟩  Z|1⟩=|1⟩  Z|+⟩=|−⟩  Z|−⟩=|+⟩
 */
function applyGate(state, gate) {
  if (!gate) return state;
  if (state === 'DECOHERED') return 'DECOHERED';
  const table = {
    X: { ZERO: 'ONE', ONE: 'ZERO', PLUS: 'PLUS', MINUS: 'MINUS' },
    H: { ZERO: 'PLUS', ONE: 'MINUS', PLUS: 'ZERO', MINUS: 'ONE' },
    Z: { ZERO: 'ZERO', ONE: 'ONE', PLUS: 'MINUS', MINUS: 'PLUS' },
    NOISE: { ZERO: 'DECOHERED', ONE: 'DECOHERED', PLUS: 'DECOHERED', MINUS: 'DECOHERED' },
  };
  return table[gate]?.[state] ?? state;
}

function buildStepStates(initialState, gates) {
  // Returns array of length gates.length + 2
  // [initial, afterGate0, afterGate1, ..., afterGateN-1, final(same as last)]
  const states = [initialState === 'ONE' ? 'ONE' : 'ZERO'];
  let current = states[0];
  for (const gate of gates) {
    current = applyGate(current, gate);
    states.push(current);
  }
  states.push(current); // detector position same as final state
  return states;
}

function measureState(state) {
  switch (state) {
    case 'ZERO': return 'blue';
    case 'ONE': return 'red';
    case 'PLUS':
    case 'MINUS':
      return Math.random() < 0.5 ? 'blue' : 'red';
    case 'DECOHERED': return 'yellow';
    default: return 'blue';
  }
}

const stateLabels = {
  ZERO: '|0⟩', ONE: '|1⟩', PLUS: '|+⟩', MINUS: '|−⟩', DECOHERED: 'Decohered',
};

const stateColors = {
  ZERO: '#3b82f6', ONE: '#ef4444', PLUS: '#a855f7', MINUS: '#06b6d4', DECOHERED: '#fbbf24',
};

export default function App() {
  const [viewMode, setViewMode] = useState('circuit'); // 'circuit' or 'fixture'
  const [initialState, setInitialState] = useState('ZERO'); // ZERO or ONE
  const [gateSlots, setGateSlots] = useState(Array(NUM_SLOTS).fill(null));
  const [photonPhase, setPhotonPhase] = useState('idle');
  const [photonStep, setPhotonStep] = useState(0);
  const [measurementColor, setMeasurementColor] = useState('none');
  const [displayLabel, setDisplayLabel] = useState('|0⟩');
  const timeoutRef = useRef([]);

  const isRunning = photonPhase === 'running';

  // Precompute state at every step position (memoized for circuit rendering)
  const stepStates = useMemo(
    () => buildStepStates(initialState, gateSlots),
    [initialState, gateSlots]
  );

  const currentState = photonPhase === 'idle'
    ? (initialState === 'ONE' ? 'ONE' : 'ZERO')
    : stepStates[photonStep];

  const handleDropGate = useCallback((index, gateType) => {
    setGateSlots((prev) => { const n = [...prev]; n[index] = gateType; return n; });
  }, []);

  const handleRemoveGate = useCallback((index) => {
    setGateSlots((prev) => { const n = [...prev]; n[index] = null; return n; });
  }, []);

  const handleToggleInitial = () => {
    if (isRunning) return;
    setInitialState((prev) => (prev === 'ZERO' ? 'ONE' : 'ZERO'));
    setDisplayLabel((prev) => (prev === '|0⟩' ? '|1⟩' : '|0⟩'));
  };

  const handleStart = () => {
    if (isRunning) return;
    setMeasurementColor('none');
    setPhotonPhase('running');
    setPhotonStep(0);
    setDisplayLabel(stateLabels[stepStates[0]]);

    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];

    const totalSteps = NUM_SLOTS + 1;
    let delay = 800;

    for (let step = 1; step <= totalSteps; step++) {
      const st = stepStates[step];

      const t = setTimeout(() => {
        setPhotonStep(step);
        setDisplayLabel(stateLabels[st]);

        // If this step is DECOHERED, stop auto-play here — animation handles the rest
        if (st === 'DECOHERED') {
          // Clear remaining timeouts
          timeoutRef.current.forEach(clearTimeout);
          timeoutRef.current = [];
          return;
        }

        if (step === totalSteps) {
          const color = measureState(st);
          setTimeout(() => {
            setMeasurementColor(color);
            setPhotonPhase('done');
            setDisplayLabel(
              color === 'blue' ? '|0⟩ detected' : color === 'red' ? '|1⟩ detected' : 'Classical'
            );
          }, 400);
        }
      }, delay);
      timeoutRef.current.push(t);
      delay += 700;

      // Don't schedule steps past decoherence
      if (st === 'DECOHERED') break;
    }
  };

  const handleStep = () => {
    if (isRunning) return;
    const totalSteps = NUM_SLOTS + 1;

    if (photonPhase === 'idle') {
      setMeasurementColor('none');
      setPhotonPhase('stepping');
      setPhotonStep(0);
      setDisplayLabel(stateLabels[stepStates[0]]);
    } else if (photonPhase === 'stepping') {
      const nextStep = photonStep + 1;
      if (nextStep > totalSteps) return;

      const st = stepStates[nextStep];
      setPhotonStep(nextStep);
      setDisplayLabel(stateLabels[st]);

      // If decohered, the DecoherenceEffect animation handles the rest
      if (st === 'DECOHERED') return;

      if (nextStep === totalSteps) {
        setTimeout(() => {
          const color = measureState(st);
          setMeasurementColor(color);
          setPhotonPhase('done');
          setDisplayLabel(
            color === 'blue' ? '|0⟩ detected' : color === 'red' ? '|1⟩ detected' : 'Classical'
          );
        }, 500);
      }
    }
  };

  const handleDecoherenceComplete = useCallback(() => {
    setMeasurementColor('lost');
    setPhotonPhase('done');
    setDisplayLabel('Photon Lost');
  }, []);

  const isStepping = photonPhase === 'stepping';

  const handleReset = () => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
    setGateSlots(Array(NUM_SLOTS).fill(null));
    setPhotonPhase('idle');
    setPhotonStep(0);
    setMeasurementColor('none');
    setDisplayLabel(stateLabels[initialState]);
  };

  if (viewMode === 'fixture') {
    return (
      <div className="relative">
        <FixtureView />
        <button
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border text-xs font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
          style={{
            fontFamily: 'var(--font-display)',
            backgroundColor: 'rgba(59,130,246,0.12)',
            borderColor: 'rgba(59,130,246,0.4)',
            color: '#3b82f6',
          }}
          onClick={() => setViewMode('circuit')}
        >
          <span className="flex items-center gap-2"><Cpu size={14} /> CIRCUIT</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sci-fi-grid scanline-overlay min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      {/* Mode toggle */}
      <button
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border text-xs font-semibold tracking-wider cursor-pointer transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-display)',
          backgroundColor: 'rgba(168,85,247,0.12)',
          borderColor: 'rgba(168,85,247,0.4)',
          color: '#a855f7',
        }}
        onClick={() => setViewMode('fixture')}
      >
        <span className="flex items-center gap-2"><Box size={14} /> 3D FIXTURE</span>
      </button>

      {/* Header */}
      <motion.header className="text-center" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center justify-center gap-3 mb-1">
          <Atom size={28} style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' }} />
          <h1
            className="text-2xl font-bold tracking-[0.15em]"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PHOTON LAB
          </h1>
        </div>
        <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
          Dual-Rail Photonic Quantum Circuit
        </p>
      </motion.header>

      {/* Live state label */}
      <motion.div className="text-center" key={displayLabel} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <span
          className="text-lg font-bold tracking-wider px-4 py-1 rounded-full border"
          style={{
            fontFamily: 'var(--font-display)',
            color: stateColors[currentState] || '#3b82f6',
            borderColor: 'currentColor',
            backgroundColor: 'rgba(0,0,0,0.3)',
            textShadow: '0 0 15px currentColor',
          }}
        >
          {displayLabel}
        </span>
      </motion.div>

      {/* Circuit */}
      <motion.div className="w-full max-w-3xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Circuit
          gateSlots={gateSlots}
          onDropGate={handleDropGate}
          onRemoveGate={handleRemoveGate}
          photonPhase={photonPhase}
          photonStep={photonStep}
          photonStateAtStep={stepStates}
          measurementColor={measurementColor}
          disabled={isRunning || isStepping}
          initialState={initialState}
          onToggleInitial={handleToggleInitial}
          onDecoherenceComplete={handleDecoherenceComplete}
        />
      </motion.div>

      {/* Gate Palette */}
      <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h3 className="text-[0.6rem] font-bold tracking-[0.3em] uppercase" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
          Gate Palette — Drag to Circuit
        </h3>
        <div className="flex items-center gap-3">
          <DraggableGate type="X" />
          <DraggableGate type="H" />
          <DraggableGate type="Z" />
          <DraggableGate type="NOISE" />
          <div
            className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-dashed"
            style={{ borderColor: 'rgba(255,255,255,0.1)', minWidth: 56, opacity: 0.5 }}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.opacity = '0.5'; }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.opacity = '0.5'; }}
          >
            <Trash2 size={18} style={{ color: '#64748b' }} />
            <span className="text-[0.5rem] tracking-wider uppercase" style={{ color: '#475569' }}>Trash</span>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <motion.button
          className="btn-gate flex items-center gap-2 py-3 px-6 rounded-xl border cursor-pointer"
          style={{
            backgroundColor: (isRunning || isStepping) ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
            borderColor: (isRunning || isStepping) ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.5)',
            color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em',
            opacity: (isRunning || isStepping) ? 0.4 : 1,
          }}
          whileHover={!(isRunning || isStepping) ? { scale: 1.05, boxShadow: '0 0 25px rgba(34,197,94,0.3)' } : {}}
          whileTap={!(isRunning || isStepping) ? { scale: 0.96 } : {}}
          onClick={handleStart}
          disabled={isRunning || isStepping}
        >
          <Play size={16} /> AUTO
        </motion.button>
        <motion.button
          className="btn-gate flex items-center gap-2 py-3 px-6 rounded-xl border cursor-pointer"
          style={{
            backgroundColor: isRunning ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)',
            borderColor: isRunning ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.5)',
            color: '#a855f7', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em',
            opacity: isRunning ? 0.4 : 1,
          }}
          whileHover={!isRunning ? { scale: 1.05, boxShadow: '0 0 25px rgba(168,85,247,0.3)' } : {}}
          whileTap={!isRunning ? { scale: 0.96 } : {}}
          onClick={handleStep}
          disabled={isRunning || photonPhase === 'done'}
        >
          <SkipForward size={16} /> STEP
        </motion.button>
        <motion.button
          className="btn-gate flex items-center gap-2 py-3 px-6 rounded-xl border cursor-pointer"
          style={{
            backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-glow)', color: 'var(--color-quantum-blue)',
            fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em',
          }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(59,130,246,0.3)', borderColor: '#3b82f6' }}
          whileTap={{ scale: 0.96 }}
          onClick={handleReset}
        >
          <RotateCcw size={16} /> RESET
        </motion.button>
      </motion.div>

      {/* Gate reference */}
      <motion.div className="w-full max-w-lg text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-glow)' }}>
          <h4 className="text-[0.55rem] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
            Hermitian Gates — G² = Identity
          </h4>
          <div className="grid grid-cols-4 gap-2 text-[0.6rem]" style={{ color: 'var(--color-text-muted)' }}>
            <div><span style={{ color: '#ef4444' }}>X</span>: Swap rails</div>
            <div><span style={{ color: '#a855f7' }}>H</span>: Beam splitter</div>
            <div><span style={{ color: '#06b6d4' }}>Z</span>: Phase shift</div>
            <div><span style={{ color: '#fbbf24' }}>⚡</span>: Decoherence</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
