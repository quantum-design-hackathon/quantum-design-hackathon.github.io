import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const colorMap = {
    none: { color: '#334155', glow: 'none', label: '—' },
    lost: { color: '#64748b', glow: 'none', label: 'LOST' },
    blue: {
        color: '#3b82f6',
        glow: '0 0 20px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.25)',
        label: '|0⟩',
    },
    red: {
        color: '#ef4444',
        glow: '0 0 20px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.25)',
        label: '|1⟩',
    },
    yellow: {
        color: '#fbbf24',
        glow: '0 0 20px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.25)',
        label: 'Classical',
    },
};

export default function MeasurementBulb({ resultColor = 'none' }) {
    const palette = colorMap[resultColor];
    const isActive = resultColor !== 'none' && resultColor !== 'lost';
    const isLost = resultColor === 'lost';

    return (
        <div className="flex flex-col items-center gap-1">
            <motion.div
                className="relative flex items-center justify-center"
                animate={isActive ? { scale: [1, 1.05, 1] } : isLost ? { scale: [1, 0.95, 1] } : { scale: 1 }}
                transition={isActive || isLost ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
                {isActive && (
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: 80,
                            height: 80,
                            background: `radial-gradient(circle, ${palette.color}30, transparent 70%)`,
                            filter: 'blur(12px)',
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                    />
                )}
                <Lightbulb
                    size={36}
                    style={{
                        color: palette.color,
                        filter: isActive ? `drop-shadow(0 0 8px ${palette.color}80)` : 'none',
                        transition: 'color 0.5s, filter 0.5s',
                        opacity: isLost ? 0.4 : 1,
                    }}
                    strokeWidth={1.5}
                />
            </motion.div>
            <span
                className="text-[0.55rem] tracking-widest uppercase font-semibold"
                style={{
                    fontFamily: 'var(--font-display)',
                    color: palette.color,
                    transition: 'color 0.5s',
                }}
            >
                {isActive ? palette.label : isLost ? 'LOST' : 'Detect'}
            </span>
        </div>
    );
}
