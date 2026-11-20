// Calculadora de encontros baseada no Guia de Batalha do livro (seção "Escolhendo Adversários")
const COMBAT_STORAGE_KEY = 'combatCalculator';
const MAX_STEPPER_VALUE = 99;

// heavy: conta para o ajuste "sem brutamonte, horda, líder ou solo"
const ADVERSARY_TYPES = [
    { id: 'lacaio', label: 'Lacaio', cost: 1 },
    { id: 'manipulador', label: 'Manipulador', cost: 1 },
    { id: 'assistente', label: 'Assistente', cost: 1 },
    { id: 'horda', label: 'Horda', cost: 2, heavy: true },
    { id: 'atirador', label: 'Atirador', cost: 2 },
    { id: 'oportunista', label: 'Oportunista', cost: 2 },
    { id: 'comum', label: 'Comum', cost: 2 },
    { id: 'lider', label: 'Líder', cost: 3, heavy: true },
    { id: 'brutamonte', label: 'Brutamonte', cost: 4, heavy: true },
    { id: 'solo', label: 'Solo', cost: 5, heavy: true }
];

const getAdversaryCount = (state) => ADVERSARY_TYPES.reduce((sum, type) => sum + state.counts[type.id], 0);

// locked: a própria calculadora decide o valor, o usuário não pode marcar
const ADJUSTMENTS = [
    {
        id: 'easier',
        label: 'Luta mais fácil ou curta',
        delta: -1,
        applies: (state) => state.adjustments.easier
    },
    {
        id: 'multipleSolos',
        label: '2 ou mais adversários solo',
        hint: () => 'Automático',
        delta: -2,
        locked: () => true,
        applies: (state) => state.counts.solo >= 2
    },
    {
        id: 'bonusDamage',
        label: '+1d4 (ou +2) no dano de todos os adversários',
        hint: () => 'Mais desafio sem alongar o combate',
        delta: -2,
        applies: (state) => state.adjustments.bonusDamage
    },
    {
        id: 'lowerTier',
        label: 'Adversário de patamar inferior',
        hint: (state) => (state.tier > 1 ? `Abaixo do patamar ${state.tier}` : 'Não há patamar abaixo do 1'),
        delta: 1,
        locked: (state) => state.tier === 1,
        applies: (state) => state.tier > 1 && state.adjustments.lowerTier
    },
    {
        id: 'noHeavy',
        label: 'Sem brutamonte, horda, líder ou solo',
        hint: () => 'Automático',
        delta: 1,
        locked: () => true,
        applies: (state) => getAdversaryCount(state) > 0
            && ADVERSARY_TYPES.every((type) => !type.heavy || state.counts[type.id] === 0)
    },
    {
        id: 'harder',
        label: 'Luta mais perigosa ou duradoura',
        delta: 2,
        applies: (state) => state.adjustments.harder
    }
];

const emptyCounts = () => Object.fromEntries(ADVERSARY_TYPES.map((type) => [type.id, 0]));
const emptyAdjustments = () => ({ easier: false, bonusDamage: false, lowerTier: false, harder: false });

const COMBAT_DEFAULTS = {
    players: 4,
    tier: 1,
    counts: emptyCounts(),
    adjustments: emptyAdjustments()
};

function calculateEncounter(state) {
    const base = 3 * state.players + 2;
    const adjustment = ADJUSTMENTS.reduce((sum, adj) => sum + (adj.applies(state) ? adj.delta : 0), 0);
    const budget = base + adjustment;
    const spent = ADVERSARY_TYPES.reduce((sum, type) => sum + state.counts[type.id] * type.cost, 0);
    return { base, budget, spent, remaining: budget - spent };
}

function getEncounterStatus(state, { remaining }) {
    if (getAdversaryCount(state) === 0) {
        return { text: 'Adicione adversários para gastar os pontos.', className: 'status-neutral' };
    }
    if (remaining > 0) {
        const verb = remaining === 1 ? 'Sobra' : 'Sobram';
        return { text: `${verb} ${remaining} PB: encontro mais fácil que o sugerido.`, className: 'status-under' };
    }
    if (remaining < 0) {
        return { text: `Passou ${-remaining} PB: encontro mais difícil que o sugerido.`, className: 'status-over' };
    }
    return { text: 'Encontro balanceado: todos os PB foram gastos.', className: 'status-balanced' };
}

function pluralizeLacaio(amount) {
    return `${amount} ${amount === 1 ? 'lacaio' : 'lacaios'}`;
}

function formatDelta(delta) {
    return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}

function clampInt(value, min) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return min;
    return Math.min(MAX_STEPPER_VALUE, Math.max(min, parsed));
}

function initCombatCalculator(state) {
    const save = () => chrome.storage.local.set({ [COMBAT_STORAGE_KEY]: state });
    const paintFns = [];

    function refresh() {
        paintFns.forEach((paint) => paint());
        save();
    }

    // Enquanto o usuário digita, o campo fica como está (pode estar vazio); ao confirmar, mostra o valor válido
    function createStepper(min, getValue, setValue, label) {
        const stepper = document.createElement('div');
        stepper.className = 'stepper';

        const down = document.createElement('button');
        down.type = 'button';
        down.textContent = '−';
        down.title = `Diminuir ${label}`;

        const input = document.createElement('input');
        input.type = 'number';
        input.min = min;
        input.max = MAX_STEPPER_VALUE;
        input.setAttribute('aria-label', label);

        const up = document.createElement('button');
        up.type = 'button';
        up.textContent = '+';
        up.title = `Aumentar ${label}`;

        const step = (amount) => {
            setValue(clampInt(getValue() + amount, min));
            refresh();
        };
        down.addEventListener('click', () => step(-1));
        up.addEventListener('click', () => step(1));
        input.addEventListener('input', () => {
            setValue(clampInt(input.value, min));
            refresh();
        });
        input.addEventListener('change', () => {
            input.value = getValue();
        });

        paintFns.push(() => {
            if (document.activeElement !== input) input.value = getValue();
        });
        stepper.append(down, input, up);
        return stepper;
    }

    function buildAdversaryRow(type) {
        const row = document.createElement('div');
        row.className = 'adversary';

        const name = document.createElement('div');
        name.className = 'adversary-name';
        name.textContent = type.label;

        const cost = document.createElement('div');
        cost.className = 'adversary-cost';
        cost.textContent = `${type.cost} PB`;

        const subtotal = document.createElement('div');
        subtotal.className = 'adversary-subtotal';

        const stepper = createStepper(
            0,
            () => state.counts[type.id],
            (value) => { state.counts[type.id] = value; },
            type.label
        );

        // O livro cobra lacaios por conjunto: um conjunto tem um lacaio por personagem
        if (type.id === 'lacaio') {
            const detail = document.createElement('small');
            name.append(detail);
            paintFns.push(() => {
                const total = state.counts.lacaio * state.players;
                detail.textContent = `Conjunto de ${state.players} · total: ${pluralizeLacaio(total)}`;
            });
        }

        paintFns.push(() => {
            subtotal.textContent = `= ${state.counts[type.id] * type.cost}`;
        });

        row.append(name, cost, stepper, subtotal);
        return row;
    }

    function buildAdjustmentRow(adj) {
        const row = document.createElement('label');
        row.className = 'adjustment';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            state.adjustments[adj.id] = checkbox.checked;
            refresh();
        });

        const text = document.createElement('span');
        text.className = 'adjustment-text';
        text.textContent = adj.label;

        const delta = document.createElement('span');
        delta.className = 'adjustment-delta';
        delta.textContent = `${formatDelta(adj.delta)} PB`;

        if (adj.hint) {
            const hint = document.createElement('small');
            text.append(hint);
            paintFns.push(() => {
                hint.textContent = adj.hint(state);
            });
        }

        paintFns.push(() => {
            const applies = adj.applies(state);
            const locked = adj.locked ? adj.locked(state) : false;
            checkbox.checked = applies;
            checkbox.disabled = locked;
            row.classList.toggle('adjustment-active', applies);
            row.classList.toggle('adjustment-locked', locked);
        });

        row.append(checkbox, text, delta);
        return row;
    }

    function paintSummary() {
        const result = calculateEncounter(state);
        const status = getEncounterStatus(state, result);
        document.getElementById('budget-total').textContent = result.budget;
        document.getElementById('spent-total').textContent = result.spent;
        document.getElementById('remaining-total').textContent = result.remaining;
        document.getElementById('base-formula').textContent = `Base: (3 × ${state.players}) + 2 = ${result.base} PB`;
        const statusElem = document.getElementById('status');
        statusElem.textContent = status.text;
        statusElem.className = `status ${status.className}`;
    }

    document.getElementById('players-field').append(createStepper(
        1,
        () => state.players,
        (value) => { state.players = value; },
        'Jogadores'
    ));

    const tierSelect = document.getElementById('tier-select');
    tierSelect.addEventListener('change', () => {
        state.tier = parseInt(tierSelect.value, 10);
        refresh();
    });
    paintFns.push(() => {
        tierSelect.value = state.tier;
    });

    document.getElementById('adversary-list').append(...ADVERSARY_TYPES.map(buildAdversaryRow));
    document.getElementById('adjustment-list').append(...ADJUSTMENTS.map(buildAdjustmentRow));
    paintFns.push(paintSummary);

    // Limpar mantém jogadores e patamar
    document.getElementById('clear-btn').addEventListener('click', () => {
        state.counts = emptyCounts();
        state.adjustments = emptyAdjustments();
        refresh();
    });

    paintFns.forEach((paint) => paint());
}

chrome.storage.local.get({ [COMBAT_STORAGE_KEY]: COMBAT_DEFAULTS }, (stored) => {
    const saved = stored[COMBAT_STORAGE_KEY];
    initCombatCalculator({
        ...COMBAT_DEFAULTS,
        ...saved,
        counts: { ...emptyCounts(), ...saved.counts },
        adjustments: { ...emptyAdjustments(), ...saved.adjustments }
    });
});
