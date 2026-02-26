import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlacedGate } from './GatePalette';

export default function GateSlot({ index, gate, onDrop, onRemove, disabled, height }) {
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const gateType = e.dataTransfer.getData('gateType');
        if (gateType) onDrop(index, gateType);
    };

    return (
        <div
            className="relative flex items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200"
            style={{
                width: 68,
                height: height || 110,
                borderColor: dragOver
                    ? '#3b82f6'
                    : gate
                        ? 'transparent'
                        : 'rgba(255, 255, 255, 0.06)',
                backgroundColor: dragOver
                    ? 'rgba(59, 130, 246, 0.08)'
                    : gate
                        ? 'transparent'
                        : 'rgba(255, 255, 255, 0.01)',
                boxShadow: dragOver ? '0 0 20px rgba(59, 130, 246, 0.15)' : 'none',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <AnimatePresence mode="wait">
                {gate ? (
                    <PlacedGate key={gate} type={gate} onRemove={() => onRemove(index)} />
                ) : (
                    <span
                        className="text-[0.5rem] tracking-wider uppercase select-none"
                        style={{ color: 'rgba(255,255,255,0.1)' }}
                    >
                        Drop
                    </span>
                )}
            </AnimatePresence>
        </div>
    );
}
