/*
 * Shared quantum state logic.
 *
 * States: ZERO, ONE, PLUS, MINUS, DECOHERED
 *
 * Hermitian gates (G² = I):
 *   X|0⟩=|1⟩  X|1⟩=|0⟩  X|+⟩=|+⟩  X|−⟩=|−⟩
 *   H|0⟩=|+⟩  H|1⟩=|−⟩  H|+⟩=|0⟩  H|−⟩=|1⟩
 *   Z|0⟩=|0⟩  Z|1⟩=|1⟩  Z|+⟩=|−⟩  Z|−⟩=|+⟩
 */

const gateTable = {
    X: { ZERO: 'ONE', ONE: 'ZERO', PLUS: 'PLUS', MINUS: 'MINUS' },
    H: { ZERO: 'PLUS', ONE: 'MINUS', PLUS: 'ZERO', MINUS: 'ONE' },
    Z: { ZERO: 'ZERO', ONE: 'ONE', PLUS: 'MINUS', MINUS: 'PLUS' },
    NOISE: { ZERO: 'DECOHERED', ONE: 'DECOHERED', PLUS: 'DECOHERED', MINUS: 'DECOHERED' },
};

export function applyGate(state, gate) {
    if (!gate) return state;
    if (state === 'DECOHERED') return 'DECOHERED';
    return gateTable[gate]?.[state] ?? state;
}

export function buildStepStates(initialState, gates) {
    const states = [initialState === 'ONE' ? 'ONE' : 'ZERO'];
    let current = states[0];
    for (const gate of gates) {
        current = applyGate(current, gate);
        states.push(current);
    }
    return states;
}

export function measureState(state) {
    switch (state) {
        case 'ZERO': return 'blue';
        case 'ONE': return 'red';
        case 'PLUS':
        case 'MINUS': return Math.random() < 0.5 ? 'blue' : 'red';
        case 'DECOHERED': return 'yellow';
        default: return 'blue';
    }
}

export const stateLabels = {
    ZERO: '|0⟩', ONE: '|1⟩', PLUS: '|+⟩', MINUS: '|−⟩', DECOHERED: 'Decohered',
};

export const stateColors = {
    ZERO: '#3b82f6', ONE: '#ef4444', PLUS: '#a855f7', MINUS: '#06b6d4', DECOHERED: '#fbbf24',
};

// Color values for Three.js
export const stateHexColors = {
    blue: 0x3b82f6,
    red: 0xef4444,
    yellow: 0xfbbf24,
};

// Random gate selection for fixture
const availableGates = ['X', 'H', 'Z', null, null]; // nulls = empty slots

export function generateRandomCircuit(numGates = 4) {
    return Array.from({ length: numGates }, () =>
        availableGates[Math.floor(Math.random() * availableGates.length)]
    );
}

export function generateFixtureGrid(size = 5, numGates = 4) {
    const grid = [];
    for (let row = 0; row < size; row++) {
        const rowData = [];
        for (let col = 0; col < size; col++) {
            const gates = generateRandomCircuit(numGates);
            rowData.push(buildColumnData(gates));
        }
        grid.push(rowData);
    }
    return grid;
}

// Parse a string like "XHZ" into ['X', 'H', 'Z', null] (padded to numGates)
const validGates = { X: 'X', H: 'H', Z: 'Z', N: 'NOISE' };

export function parseGateString(str, numGates = 4) {
    const gates = [];
    for (const ch of (str || '').toUpperCase()) {
        if (validGates[ch] && gates.length < numGates) {
            gates.push(validGates[ch]);
        }
    }
    while (gates.length < numGates) gates.push(null);
    return gates;
}

// Build column data from a gate array
export function buildColumnData(gates) {
    const states = buildStepStates('ZERO', gates);
    const finalState = states[states.length - 1];
    const measurement = measureState(finalState);
    return { gates, states, finalState, measurement };
}

// Convert gate array back to display string
export function gatesToString(gates) {
    return gates
        .filter(Boolean)
        .map(g => g === 'NOISE' ? 'N' : g)
        .join('');
}
