import { motion } from 'framer-motion';

const gateStyles = {
    X: {
        label: 'X',
        sublabel: 'NOT Gate',
        description: 'Swaps rails',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
    },
    H: {
        label: 'H',
        sublabel: 'Hadamard',
        description: 'Beam Splitter',
        color: '#a855f7',
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.4)',
    },
    Z: {
        label: 'Z',
        sublabel: 'Phase',
        description: 'Phase Shift',
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.15)',
        border: 'rgba(6, 182, 212, 0.4)',
    },
    NOISE: {
        label: '⚡',
        sublabel: 'Noise',
        description: 'Decoherence',
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.15)',
        border: 'rgba(251, 191, 36, 0.4)',
    },
};

export function DraggableGate({ type }) {
    const style = gateStyles[type];

    const handleDragStart = (e) => {
        e.dataTransfer.setData('gateType', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <motion.div
            draggable
            onDragStart={handleDragStart}
            className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl border cursor-grab active:cursor-grabbing select-none"
            style={{
                backgroundColor: style.bg,
                borderColor: style.border,
                minWidth: 80,
            }}
            whileHover={{
                scale: 1.08,
                boxShadow: `0 0 20px ${style.color}40`,
            }}
            whileTap={{ scale: 0.95 }}
        >
            <span
                className="text-xl font-bold"
                style={{
                    fontFamily: 'var(--font-display)',
                    color: style.color,
                }}
            >
                {style.label}
            </span>
            <span
                className="text-[0.55rem] tracking-wider uppercase"
                style={{ color: style.color, opacity: 0.7 }}
            >
                {style.sublabel}
            </span>
        </motion.div>
    );
}

export function PlacedGate({ type, onRemove }) {
    const style = gateStyles[type];

    return (
        <motion.div
            className="flex flex-col items-center justify-center rounded-lg border cursor-pointer"
            style={{
                width: 56,
                height: 56,
                backgroundColor: style.bg,
                borderColor: style.border,
            }}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{
                scale: 1.1,
                boxShadow: `0 0 15px ${style.color}50`,
            }}
            onClick={onRemove}
            title="Click to remove"
        >
            <span
                className="text-base font-bold"
                style={{
                    fontFamily: 'var(--font-display)',
                    color: style.color,
                }}
            >
                {style.label}
            </span>
            <span
                className="text-[0.45rem] tracking-wider uppercase"
                style={{ color: style.color, opacity: 0.6 }}
            >
                {style.description}
            </span>
        </motion.div>
    );
}

export { gateStyles };
