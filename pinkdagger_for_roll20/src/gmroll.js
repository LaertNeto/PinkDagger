// GM Roll: com o modo ligado numa ficha, as rolagens dela vão pelo chat como "/w gm", só para o mestre.
// O estado fica salvo no navegador, por personagem, e só vale para quem ligou.
const GM_ROLL_STORAGE_KEY = 'pinkdagger_gm_roll';

// Id do personagem no Roll20, guardado na janela que contém o iframe da ficha
function getSheetCharacterId(doc) {
    const holder = getSheetDialog(doc)?.querySelector('[data-characterid]');
    return holder?.getAttribute('data-characterid') || '';
}

// Sem o id (ex.: ficha em pop-out), o nome do personagem identifica a ficha
function getGmRollKey(doc) {
    return getSheetCharacterId(doc) || getSheetCharacterName(doc);
}

function loadGmRollStates() {
    try {
        return JSON.parse(window.localStorage.getItem(GM_ROLL_STORAGE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

function isGmRollEnabled(doc) {
    const key = getGmRollKey(doc);
    return !!key && !!loadGmRollStates()[key];
}

function setGmRollEnabled(doc, enabled) {
    const key = getGmRollKey(doc);
    if (!key) return;
    const states = loadGmRollStates();
    if (enabled) states[key] = true;
    else delete states[key];
    try {
        window.localStorage.setItem(GM_ROLL_STORAGE_KEY, JSON.stringify(states));
    } catch (err) {}
}

// O chat fica na página principal do Roll20: acima do iframe da ficha ou,
// com a ficha em pop-out, na janela que a abriu
function getRoll20Chat(doc) {
    const win = doc.defaultView;
    const candidates = [];
    try { candidates.push(win.top.document); } catch (err) {}
    try { if (win.opener) candidates.push(win.opener.document); } catch (err) {}

    for (const chatDoc of candidates) {
        const input = chatDoc?.querySelector('#textchat-input textarea');
        const sendBtn = chatDoc?.querySelector('#textchat-input .btn') || chatDoc?.querySelector('#textchat-input button');
        if (input && sendBtn) {
            return { input, sendBtn, speakingAs: chatDoc.querySelector('#speakingas') };
        }
    }
    return null;
}

// Chamada da macro que o Roll20 expande no contexto do personagem, ex.: %{-Mabc123|dom_Livro}
function buildAbilityCall(doc, abilName) {
    const who = getSheetCharacterId(doc) || getSheetCharacterName(doc);
    if (!who || !abilName) return null;
    return `%{${who}|${abilName}}`;
}

// Envia a macro sussurrada para o mestre, falando como o personagem da ficha.
// O "Falando como" e o texto que já estava no chat voltam ao que eram depois do envio.
function sendGmRoll(doc, abilName) {
    const chat = getRoll20Chat(doc);
    const abilityCall = buildAbilityCall(doc, abilName);
    if (!chat || !abilityCall) {
        // Rolar aberto sem aviso revelaria o que o usuário quis esconder
        alert('GM Roll: não foi possível encontrar o chat do Roll20, então a rolagem não foi enviada. Desligue o GM Roll para rolar normalmente.');
        return;
    }

    const { input, sendBtn, speakingAs } = chat;
    const typedText = input.value;
    const previousSpeaker = speakingAs?.value;
    const characterId = getSheetCharacterId(doc);
    const speakerValue = characterId ? `character|${characterId}` : '';
    const canSpeakAsCharacter = !!speakingAs && !!speakerValue &&
        Array.from(speakingAs.options).some(option => option.value === speakerValue);

    if (canSpeakAsCharacter) speakingAs.value = speakerValue;
    input.value = `/w gm ${abilityCall}`;
    sendBtn.click();

    setTimeout(() => {
        if (canSpeakAsCharacter && speakingAs.value === speakerValue) speakingAs.value = previousSpeaker;
        if (typedText && !input.value) input.value = typedText;
    }, 100);
}

function updateGmRollButton(doc) {
    const btn = doc.getElementById('dh-gmroll-btn');
    if (!btn) return;
    const enabled = isGmRollEnabled(doc);
    btn.classList.toggle('dh-gmroll-on', enabled);
    btn.setAttribute('aria-pressed', String(enabled));
    btn.title = enabled
        ? 'GM Roll ligado: as rolagens desta ficha vão só para o mestre (/w gm). Clique para desligar.'
        : 'GM Roll desligado: as rolagens desta ficha vão para todos. Clique para mandar só para o mestre (/w gm).';
}

function setupGmRollButton(doc, btn) {
    // Sem chat ao alcance (ex.: pop-out sem a janela do Roll20), o modo não teria como funcionar
    if (!getRoll20Chat(doc)) {
        btn.remove();
        return;
    }
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setGmRollEnabled(doc, !isGmRollEnabled(doc));
        updateGmRollButton(doc);
    });
    updateGmRollButton(doc);
}
