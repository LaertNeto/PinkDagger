function openEditWeaponModal(doc, abilIdx, rawName, weaponData) {
    const existingModal = doc.getElementById('dh-weapon-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-weapon-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    const traitsList = ['Agilidade', 'Força', 'Acuidade', 'Instinto', 'Presença', 'Conhecimento'];
    let traitOptionsHTML = '';
    const currentTraitLower = (weaponData.trait || '').toLowerCase();
    let traitMatched = false;

    traitsList.forEach(t => {
        const isSelected = t.toLowerCase() === currentTraitLower;
        if (isSelected) traitMatched = true;
        traitOptionsHTML += `<option value="${t}" ${isSelected ? 'selected' : ''}>${t}</option>`;
    });

    if (!traitMatched && weaponData.trait && weaponData.trait !== 'ATAQUE') {
        traitOptionsHTML += `<option value="${weaponData.trait}" selected>${weaponData.trait}</option>`;
    }

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Arma: ${weaponData.title || 'Arma'}</h3>
            <div class="dh-modal-field">
                <label>Nome da Arma:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-weapon-name" value="${escapeHtml(weaponData.title || '')}" placeholder="Nome da arma">
            </div>
            <div class="dh-modal-field">
                <label>Atributo de Ataque:</label>
                <select class="dh-modal-select" id="dh-edit-weapon-trait">
                    ${traitOptionsHTML}
                </select>
            </div>
            <div class="dh-modal-field">
                <label>Alcance:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-weapon-range" list="dh-weapon-range-options" value="${escapeHtml(weaponData.range || '')}" placeholder="Ex: Corpo a Corpo, Longe...">
                <datalist id="dh-weapon-range-options">
                    ${WEAPON_RANGES.map(range => `<option value="${range}"></option>`).join('')}
                </datalist>
            </div>
            <div class="dh-modal-field">
                <label>Fórmula de Dano:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-weapon-damage" value="${weaponData.damageRaw || ''}" placeholder="Ex: [[@{proficiência}d8 + 0]]">
            </div>
            <div class="dh-modal-field">
                <label>Descrição / Efeito:</label>
                <textarea class="dh-modal-textarea" id="dh-edit-weapon-desc" placeholder="Ex: Mágica, Duas Mãos, efeito crítico...">${weaponData.desc || ''}</textarea>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-weapon-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-weapon-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-weapon-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-weapon-save').addEventListener('click', () => {
        // Nome vazio mantém o atual: a arma precisa de nome para a macro e para o card
        const newName = modalOverlay.querySelector('#dh-edit-weapon-name').value.replace(/\s+/g, ' ').trim() || weaponData.title;
        const newTrait = modalOverlay.querySelector('#dh-edit-weapon-trait').value.trim();
        const newRange = modalOverlay.querySelector('#dh-edit-weapon-range').value.trim();
        const newDamage = modalOverlay.querySelector('#dh-edit-weapon-damage').value.trim();
        const newDesc = modalOverlay.querySelector('#dh-edit-weapon-desc').value.trim();

        saveWeaponChanges(doc, abilIdx, rawName, newTrait, newDamage, newDesc, newRange, newName);
        closeModal();
    });
}

function saveWeaponChanges(doc, abilIdx, rawName, newTrait, newDamage, newDesc, newRange = '', newName = '') {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da arma não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da arma não encontrado.");
        return;
    }

    let updatedMacro = macroTextarea.value || '';

    // 1. Atualiza Atributo: #Atributo-Nome
    if (newTrait) {
        if (/#Atributo-[^\s{]+/i.test(updatedMacro)) {
            updatedMacro = updatedMacro.replace(/#Atributo-[^\s{]+/i, `#Atributo-${newTrait}`);
        } else {
            updatedMacro = `#Atributo-${newTrait} ` + updatedMacro.trim();
        }
    }

    // Nome: {{name=...}}, que é o título da rolagem no chat e do card
    const fallbackTitle = rawName.startsWith('wea_') ? rawName.substring(4).trim() : rawName;
    const weaponName = newName || fallbackTitle;
    const nameRegex = /\{\{\s*name\s*=[\s\S]*?\}\}/i;
    if (newName) {
        const nameField = `{{name=${newName}\n}}`;
        if (nameRegex.test(updatedMacro)) {
            updatedMacro = updatedMacro.replace(nameRegex, () => nameField);
        } else if (updatedMacro.includes('&{template:default}')) {
            updatedMacro = updatedMacro.replace('&{template:default}', () => `&{template:default} ${nameField}`);
        }
    }

    // Alcance: {{alcance=...}} logo depois do nome; vazio tira o campo da macro
    const rangeField = `{{alcance=${newRange}\n}}`;
    const rangeRegex = /\s*\{\{\s*(?:alcance|range)\s*=[\s\S]*?\}\}/i;
    if (rangeRegex.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(rangeRegex, () => (newRange ? ` ${rangeField}` : ''));
    } else if (newRange) {
        updatedMacro = nameRegex.test(updatedMacro)
            ? updatedMacro.replace(nameRegex, (nameField) => `${nameField} ${rangeField}`)
            : `${updatedMacro} ${rangeField}`;
    }

    // 2. Atualiza Dano: {{dano=...}} ou {{damage=...}}
    if (/\{\{\s*(?:dano|damage)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:dano|damage)\s*=[\s\S]*?\}\}/i, `{{dano=${newDamage}\n}}`);
    } else {
        if (/\{\{\s*(?:desc|descrição|descricao)\s*=/i.test(updatedMacro)) {
            updatedMacro = updatedMacro.replace(/(\{\{\s*(?:desc|descrição|descricao)\s*=)/i, `{{dano=${newDamage}\n}} $1`);
        } else {
            updatedMacro += ` {{dano=${newDamage}\n}}`;
        }
    }

    // 3. Atualiza Descrição: {{desc=...}} ou {{descrição=...}} ou {{descricao=...}}
    if (/\{\{\s*(?:desc|descrição|descricao)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:desc|descrição|descricao)\s*=[\s\S]*?\}\}/i, `{{desc=${newDesc}\n}}`);
    } else {
        if (newDesc) {
            updatedMacro += ` {{desc=${newDesc}\n}}`;
        }
    }

    // Se o macro estava vazio ou sem template
    if (!updatedMacro.includes('&{template:default}')) {
        updatedMacro = `#Atributo-${newTrait} &{template:default} {{name=${weaponName}\n}} ${newRange ? `${rangeField} ` : ''}{{dano=${newDamage}\n}} {{desc=${newDesc}\n}}`;
    }

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    // O nome da macro no Roll20 (wea_Nome) acompanha o nome novo da arma
    setTimeout(async () => {
        if (!(await syncCardMacroName(doc, rawName, weaponName, 'A arma'))) populateDaggerheartData(doc);
    }, 150);
}

// attackData: { nome_ataque, atq, alcance, dano, tipo_dano }, cada um { attrName, value }
function openEditNpcAttackModal(doc, attackMacroName, attackData) {
    const existingModal = doc.getElementById('dh-npc-attack-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-npc-attack-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    const fieldDefs = [
        { key: 'nome_ataque', label: 'Nome do Ataque:', placeholder: 'Ex: Garras' },
        { key: 'atq', label: 'Bônus de Ataque:', placeholder: 'Ex: 3' },
        { key: 'alcance', label: 'Alcance:', placeholder: 'Ex: corpo a corpo' },
        { key: 'dano', label: 'Dano:', placeholder: 'Ex: 2d8+3' },
        { key: 'tipo_dano', label: 'Tipo de Dano:', placeholder: 'Ex: fís ou mag' }
    ];
    const escapeAttr = (val) => String(val ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    const fieldsHTML = fieldDefs.map(def => `
        <div class="dh-modal-field">
            <label>${def.label}</label>
            <input type="text" class="dh-modal-input" data-attack-field="${def.key}" value="${escapeAttr(attackData[def.key].value)}" placeholder="${def.placeholder}">
        </div>
    `).join('');

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Ataque: ${attackData.nome_ataque.value || 'Ataque'}</h3>
            ${fieldsHTML}
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-attack-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-attack-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-attack-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-attack-save').addEventListener('click', () => {
        const updated = {};
        fieldDefs.forEach(def => {
            const input = modalOverlay.querySelector(`[data-attack-field="${def.key}"]`);
            updated[def.key] = { attrName: attackData[def.key].attrName, value: input.value.trim() };
        });
        closeModal();
        saveNpcAttackToRoll20(doc, attackMacroName, updated);
    });
}

// attackData: { title, atq, atqAttrName, damageRaw, desc }
function openEditCompanionAttackModal(doc, attackMacroName, attackData) {
    const existingModal = doc.getElementById('dh-companion-attack-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-companion-attack-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    const escapeAttr = (val) => String(val ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Ataque: ${attackData.title || 'Ataque'}</h3>
            <div class="dh-modal-field">
                <label>Nome do Ataque:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-companion-title" value="${escapeAttr(attackData.title)}" placeholder="Ex: Mordida">
            </div>
            <div class="dh-modal-field">
                <label>Bônus de Ataque (Atq):</label>
                <input type="text" class="dh-modal-input" id="dh-edit-companion-atq" value="${escapeAttr(attackData.atq)}" placeholder="Ex: 2">
            </div>
            <div class="dh-modal-field">
                <label>Fórmula de Dano:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-companion-damage" value="${escapeAttr(attackData.damageRaw)}" placeholder="Ex: [[@{proficiência}d6]]">
            </div>
            <div class="dh-modal-field">
                <label>Descrição / Efeito:</label>
                <textarea class="dh-modal-textarea" id="dh-edit-companion-desc" placeholder="Ex: Alcance corpo a corpo...">${attackData.desc || ''}</textarea>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-companion-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-companion-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-companion-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-companion-save').addEventListener('click', () => {
        const updated = {
            title: modalOverlay.querySelector('#dh-edit-companion-title').value.trim() || attackData.title,
            atq: modalOverlay.querySelector('#dh-edit-companion-atq').value.trim() || '0',
            atqAttrName: attackData.atqAttrName,
            damageRaw: modalOverlay.querySelector('#dh-edit-companion-damage').value.trim(),
            desc: modalOverlay.querySelector('#dh-edit-companion-desc').value.trim()
        };
        closeModal();
        saveCompanionAttackToRoll20(doc, attackMacroName, updated);
    });
}

// Campo "Link da imagem" dos modais de carta, com prévia
function getCardImageFieldHTML(url = '') {
    return `
        <div class="dh-modal-field">
            <label>Link da imagem ou GIF (opcional):</label>
            <input type="url" class="dh-modal-input dh-card-image-input" value="${escapeHtml(url)}" placeholder="https://media.giphy.com/.../giphy.gif">
            <div class="dh-settings-hint">Vai no fim da descrição como [x](link): o chat do Roll20 mostra a imagem ao usar a carta, e a ficha mostra no card.</div>
            <div class="dh-card-image-preview">${url ? `<img src="${escapeHtml(url)}" alt="">` : ''}</div>
        </div>
    `;
}

function setupCardImageField(modalOverlay) {
    const input = modalOverlay.querySelector('.dh-card-image-input');
    const preview = modalOverlay.querySelector('.dh-card-image-preview');
    input.addEventListener('input', () => {
        const url = sanitizeCardImageUrl(input.value);
        preview.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="">` : '';
    });
}

// Lê o link do modal. Retorna null (e avisa) quando há algo digitado que não é um link válido.
function readCardImageField(modalOverlay) {
    const raw = modalOverlay.querySelector('.dh-card-image-input').value.trim();
    const url = sanitizeCardImageUrl(raw);
    if (raw && !url) {
        alert('O link da imagem precisa começar com http:// ou https:// e não pode ter espaços, aspas, parênteses ou chaves.');
        return null;
    }
    return url;
}

// Seção "Contadores" dos modais de carta: nome + máximo; o valor atual é mantido ao salvar
function getCounterEditorRowHTML(counter = { name: '', current: 0, max: 3 }) {
    return `
        <div class="dh-counter-edit-item" data-counter-current="${counter.current}">
            <input type="text" class="dh-modal-input dh-counter-name-input" value="${escapeHtml(counter.name)}" placeholder="Nome (ex.: Fichas, Usos)">
            <label class="dh-counter-max-label">Máx.
                <input type="number" min="1" class="dh-modal-input dh-counter-max-input" value="${counter.max}">
            </label>
            <button type="button" class="dh-effect-remove-btn" title="Remover contador">🗑️</button>
        </div>
    `;
}

function getCounterEditorHTML(counters = []) {
    return `
        <div class="dh-modal-field">
            <label>Contadores:</label>
            <div class="dh-settings-hint">Fichas, usos ou cargas da carta, com − e + no card. O valor atual fica salvo na própria macro.</div>
            <div class="dh-counter-edit-list">${counters.map(getCounterEditorRowHTML).join('')}</div>
            <button type="button" class="dh-add-effect-btn dh-add-counter-btn">+ Adicionar Contador</button>
        </div>
    `;
}

function setupCounterEditor(modalOverlay) {
    const list = modalOverlay.querySelector('.dh-counter-edit-list');
    list.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.dh-effect-remove-btn');
        if (removeBtn) removeBtn.closest('.dh-counter-edit-item').remove();
    });
    modalOverlay.querySelector('.dh-add-counter-btn').addEventListener('click', () => {
        list.insertAdjacentHTML('beforeend', getCounterEditorRowHTML());
        list.lastElementChild.querySelector('.dh-counter-name-input').focus();
    });
}

// Lê os contadores do modal. "=", "{" e "}" quebrariam o campo da macro; nomes repetidos ficam só uma vez.
function readCounterEditor(modalOverlay) {
    const counters = [];
    modalOverlay.querySelectorAll('.dh-counter-edit-item').forEach(item => {
        const name = item.querySelector('.dh-counter-name-input').value.replace(/[={}]/g, '').replace(/\s+/g, ' ').trim();
        if (!name || counters.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
        const max = Math.max(parseInt(item.querySelector('.dh-counter-max-input').value, 10) || 1, 1);
        const current = Math.min(parseInt(item.getAttribute('data-counter-current'), 10) || 0, max);
        counters.push({ name, current, max });
    });
    return counters;
}

function handleCardEditClick(doc, btn, abilityElements) {
    const abilIdx = parseInt(btn.getAttribute('data-abil-idx'), 10);
    const rawName = btn.getAttribute('data-card-fullname');
    const cardType = btn.getAttribute('data-card-type') || 'Carta';

    const targetAbil = abilityElements[abilIdx];
    const macroTextarea = targetAbil?.querySelector('textarea, input[name*="action"]');
    const macroContent = macroTextarea ? macroTextarea.value : '';

    const fieldsList = extractMacroFieldsList(macroContent);

    let cardTitle = '';
    const nameField = fieldsList.find(f => f.isName);
    if (nameField) {
        cardTitle = formatTextWithNewlines(nameField.value);
    } else {
        cardTitle = rawName.substring(4).trim();
    }

    // Contadores ({{Nome=atual/máximo}}) e o link da imagem ([x](url)) têm campos próprios no modal
    const effectsList = fieldsList
        .filter(f => !f.isName && !parseCardCounter(f.value))
        .map(f => ({ ...f, value: stripCardImageLinks(f.value) }))
        .filter(f => f.value || !getCardImageUrl(fieldsList.find(orig => orig.key === f.key)?.value));
    if (effectsList.length === 0) {
        effectsList.push({ key: 'Efeito', value: '' });
    }

    openEditGeneralCardModal(doc, abilIdx, rawName, cardType, cardTitle, effectsList, getCardCounters(macroContent), getCardImageUrl(macroContent));
}

function openEditGeneralCardModal(doc, abilIdx, rawName, cardType, cardTitle, effectsList, counters = [], imageUrl = '') {
    const existingModal = doc.getElementById('dh-general-card-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-general-card-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    let effectsHTML = '';
    effectsList.forEach((eff, idx) => {
        effectsHTML += createEffectItemHTML(idx, eff.key, eff.value);
    });

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar ${cardType}: ${cardTitle || rawName}</h3>
            <div class="dh-modal-field">
                <label>Nome / Título:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-card-name" value="${cardTitle || ''}" placeholder="Nome da carta">
            </div>
            <div class="dh-modal-field">
                <label>Efeitos / Regras:</label>
                <div class="dh-effects-container" id="dh-effects-container">
                    ${effectsHTML}
                </div>
                <button type="button" class="dh-add-effect-btn" id="dh-add-effect-btn">+ Adicionar Outro Efeito</button>
            </div>
            ${getCardImageFieldHTML(imageUrl)}
            ${getCounterEditorHTML(counters)}
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-card-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-card-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const effectsContainer = modalOverlay.querySelector('#dh-effects-container');
    const addEffectBtn = modalOverlay.querySelector('#dh-add-effect-btn');
    setupCounterEditor(modalOverlay);
    setupCardImageField(modalOverlay);

    function attachRemoveListeners() {
        effectsContainer.querySelectorAll('.dh-effect-remove-btn').forEach(btn => {
            btn.onclick = () => {
                const item = btn.closest('.dh-effect-item');
                if (item) item.remove();
            };
        });
    }
    attachRemoveListeners();

    let effectCounter = effectsList.length;
    addEffectBtn.addEventListener('click', () => {
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = createEffectItemHTML(effectCounter++, 'Efeito', '');
        const newElem = tempDiv.firstElementChild;
        effectsContainer.appendChild(newElem);
        attachRemoveListeners();
        newElem.querySelector('.dh-effect-val-textarea')?.focus();
    });

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-card-cancel').addEventListener('click', closeModal);

    modalOverlay.querySelector('#dh-edit-card-save').addEventListener('click', () => {
        const newName = modalOverlay.querySelector('#dh-edit-card-name').value.trim() || cardTitle || rawName;
        const newImage = readCardImageField(modalOverlay);
        if (newImage === null) return;

        const updatedEffects = [];
        effectsContainer.querySelectorAll('.dh-effect-item').forEach(item => {
            const keyInput = item.querySelector('.dh-effect-key-input');
            const valTextarea = item.querySelector('.dh-effect-val-textarea');
            const k = keyInput ? keyInput.value.trim() : '';
            const v = valTextarea ? valTextarea.value.trim() : '';
            if (k || v) {
                updatedEffects.push({ key: k || 'Efeito', val: v });
            }
        });

        // O link da imagem vai no fim do último efeito (a "descrição" da carta)
        if (newImage) {
            if (updatedEffects.length === 0) updatedEffects.push({ key: 'Efeito', val: '' });
            const last = updatedEffects[updatedEffects.length - 1];
            last.val = withCardImageLink(last.val, newImage);
        }

        saveGeneralCardChanges(doc, abilIdx, rawName, newName, updatedEffects, readCounterEditor(modalOverlay));
        closeModal();
    });
}

function createEffectItemHTML(index, key, value) {
    const cleanVal = formatTextWithNewlines(value);
    return `
        <div class="dh-effect-item" data-effect-idx="${index}">
            <div class="dh-effect-item-header">
                <input type="text" class="dh-modal-input dh-effect-key-input" value="${key || ''}" placeholder="Nome do Efeito (ex: Habilidade, Conjuração)">
                <button type="button" class="dh-effect-remove-btn" title="Remover efeito">🗑️</button>
            </div>
            <textarea class="dh-modal-textarea dh-effect-val-textarea" placeholder="O que este efeito faz...">${cleanVal}</textarea>
        </div>
    `;
}

function saveGeneralCardChanges(doc, abilIdx, rawName, newName, effectsList, counters = []) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da carta não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da carta não encontrado.");
        return;
    }

    let updatedMacro = `&{template:default} {{name=${newName}\n}}`;
    effectsList.forEach(eff => {
        updatedMacro += ` {{${eff.key}=${eff.val}\n}}`;
    });
    updatedMacro = setCardCounterFields(updatedMacro, counters);

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    // O nome da macro no Roll20 acompanha o nome novo da carta
    setTimeout(async () => {
        if (!(await syncCardMacroName(doc, rawName, newName))) populateDaggerheartData(doc);
    }, 150);
}

function openEditDomainModal(doc, abilIdx, rawName, domainData) {
    const existingModal = doc.getElementById('dh-domain-edit-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-domain-edit-modal';
    modalOverlay.className = 'dh-modal-overlay';

    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">Editar Carta de Domínio: ${domainData.name || 'Domínio'}</h3>
            <div class="dh-modal-field">
                <label>Nome da Carta:</label>
                <input type="text" class="dh-modal-input" id="dh-edit-domain-name" value="${domainData.name || ''}" placeholder="Nome da carta de domínio">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="dh-modal-field">
                    <label>Nível:</label>
                    <input type="text" class="dh-modal-input" id="dh-edit-domain-nivel" value="${domainData.nivel || ''}" placeholder="Ex: 1">
                </div>
                <div class="dh-modal-field">
                    <label>Custo:</label>
                    <input type="text" class="dh-modal-input" id="dh-edit-domain-custo" value="${domainData.custo || ''}" placeholder="Ex: 0, 1 Esperança...">
                </div>
            </div>
            <div class="dh-modal-field">
                <label>Descrição / Efeito:</label>
                <textarea class="dh-modal-textarea" id="dh-edit-domain-desc" placeholder="O que a carta de domínio faz...">${domainData.desc || ''}</textarea>
            </div>
            ${getCardImageFieldHTML(domainData.image || '')}
            ${getCounterEditorHTML(domainData.counters || [])}
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-edit-domain-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-edit-domain-save">Salvar</button>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#dh-edit-domain-cancel').addEventListener('click', closeModal);
    setupCounterEditor(modalOverlay);
    setupCardImageField(modalOverlay);

    modalOverlay.querySelector('#dh-edit-domain-save').addEventListener('click', () => {
        const newName = modalOverlay.querySelector('#dh-edit-domain-name').value.trim() || domainData.name || rawName;
        const newNivel = modalOverlay.querySelector('#dh-edit-domain-nivel').value.trim() || '1';
        const newCusto = modalOverlay.querySelector('#dh-edit-domain-custo').value.trim() || '0';
        const newImage = readCardImageField(modalOverlay);
        if (newImage === null) return;
        const newDesc = withCardImageLink(modalOverlay.querySelector('#dh-edit-domain-desc').value, newImage);

        saveDomainChanges(doc, abilIdx, rawName, newName, newNivel, newCusto, newDesc, readCounterEditor(modalOverlay));
        closeModal();
    });
}

function saveDomainChanges(doc, abilIdx, rawName, newName, newNivel, newCusto, newDesc, counters = null) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetAbil = abilityElements[abilIdx];

    if (!targetAbil && rawName) {
        abilityElements.forEach(abil => {
            const nameElem = abil.querySelector('.abilname');
            const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');
            if (name === rawName.toLowerCase()) {
                targetAbil = abil;
            }
        });
    }

    if (!targetAbil) {
        console.error("Habilidade da carta de domínio não encontrada para salvar.");
        return;
    }

    const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
    if (!macroTextarea) {
        console.error("Campo de texto da macro da carta de domínio não encontrado.");
        return;
    }

    let updatedMacro = macroTextarea.value || '';

    // 1. Atualiza name
    if (/\{\{\s*name\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*name\s*=[\s\S]*?\}\}/i, `{{name=${newName}\n}}`);
    } else {
        updatedMacro += ` {{name=${newName}\n}}`;
    }

    // 2. Atualiza nível
    if (/\{\{\s*(?:nível|nivel)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:nível|nivel)\s*=[\s\S]*?\}\}/i, `{{Nível=${newNivel}\n}}`);
    } else {
        updatedMacro += ` {{Nível=${newNivel}\n}}`;
    }

    // 3. Atualiza custo
    if (/\{\{\s*custo\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*custo\s*=[\s\S]*?\}\}/i, `{{Custo=${newCusto}\n}}`);
    } else {
        updatedMacro += ` {{Custo=${newCusto}\n}}`;
    }

    // 4. Atualiza descrição
    if (/\{\{\s*(?:descrição|descricao|desc)\s*=[\s\S]*?\}\}/i.test(updatedMacro)) {
        updatedMacro = updatedMacro.replace(/\{\{\s*(?:descrição|descricao|desc)\s*=[\s\S]*?\}\}/i, `{{Descrição=${newDesc}\n}}`);
    } else {
        if (newDesc) {
            updatedMacro += ` {{Descrição=${newDesc}\n}}`;
        }
    }

    // Se o macro estava vazio ou sem template
    if (!updatedMacro.includes('&{template:default}')) {
        updatedMacro = `&{template:default} {{name=${newName}\n}} {{Nível=${newNivel}\n}} {{Custo=${newCusto}\n}} {{Descrição=${newDesc}\n}}`;
    }

    // Contadores: null (chamada sem o modal) deixa os que já estão na macro
    if (counters) updatedMacro = setCardCounterFields(updatedMacro, counters);

    updateOriginalInput(macroTextarea, updatedMacro);

    const saveBtn = targetAbil.querySelector('.saveabil');
    if (saveBtn) saveBtn.click();

    // O nome da macro no Roll20 acompanha o nome novo da carta
    setTimeout(async () => {
        if (!(await syncCardMacroName(doc, rawName, newName))) populateDaggerheartData(doc);
    }, 150);
}




function openImportNpcModal(doc) {
    const existingModal = doc.getElementById('dh-import-npc-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-import-npc-modal';
    modalOverlay.className = 'dh-modal-overlay';

    modalOverlay.innerHTML = `
        <div class="dh-modal-box dh-import-npc-modal-box">
            <h3 class="dh-modal-title">🐉 Importar Ficha de Monstro / NPC</h3>
            <div style="font-size: 0.85em; color: #cbd5e0; line-height: 1.4;">
                Copie o texto da ficha diretamente do livro/PDF de Daggerheart (<kbd>Ctrl+C</kbd>) e cole abaixo (<kbd>Ctrl+V</kbd>).
                O parser irá identificar automaticamente <strong>Nome, Tipo, Tier, Descrição, Motivações, Atributos, Ataque, Experiências</strong> e todas as <strong>Habilidades</strong>!
            </div>
            
            <div class="dh-modal-field" style="margin-top: 6px;">
                <label>Texto da Ficha (Livro ou PDF):</label>
                <textarea class="dh-modal-textarea dh-import-textarea" id="dh-import-npc-text" rows="12" placeholder="Exemplo:
EXALTADO, SOLDADO
Lacaio (4º patamar)
Almas de fiéis abençoados com armamento divino.
Motivações e táticas: aglomerar, obedecer, manobrar melhor, punir
Dificuldade: 18 | Limiar: nenhum | 1 PV | 2 PF
ATQ: +2 | Espada e escudo: corpo a corpo | 10 fís
HABILIDADES
Lacaio (13) (passiva): o soldado é derrotado..."></textarea>
            </div>

            <div id="dh-import-status" style="font-size: 0.84em; color: #f1c40f; font-weight: bold; min-height: 20px;"></div>

            <div class="dh-modal-actions" style="justify-content: space-between; align-items: center; margin-top: 8px;">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-import-blank-btn" title="Criar ficha de NPC vazia para preencher manualmente">Criar em Branco</button>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-import-cancel-btn">Cancelar</button>
                    <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-import-confirm-btn">🪄 Importar e Preencher</button>
                </div>
            </div>
        </div>
    `;

    doc.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    const cancelBtn = modalOverlay.querySelector('#dh-import-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Criar em branco (sem importar)
    const blankBtn = modalOverlay.querySelector('#dh-import-blank-btn');
    if (blankBtn) {
        blankBtn.addEventListener('click', () => {
            closeModal();
            addNewAttributeToRoll20(doc, 'pinkdagger_npc', null, '1', false, false, true);
        });
    }

    // Importar e preencher
    const confirmBtn = modalOverlay.querySelector('#dh-import-confirm-btn');
    const textarea = modalOverlay.querySelector('#dh-import-npc-text');
    const statusElem = modalOverlay.querySelector('#dh-import-status');

    if (confirmBtn && textarea) {
        confirmBtn.addEventListener('click', async () => {
            const rawText = textarea.value.trim();
            if (!rawText) {
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Cole o texto da ficha copiado do livro antes de importar.';
                }
                return;
            }

            const parsed = parseNpcBookText(rawText);
            if (!parsed || (!parsed.tipo && !parsed.dificuldade && !parsed.atq)) {
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Não foi possível reconhecer o formato da ficha. Verifique se o texto copiado inclui Tipo/Patamar, Dificuldade ou Ataque.';
                }
                return;
            }

            confirmBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;
            if (blankBtn) blankBtn.disabled = true;
            textarea.disabled = true;

            if (statusElem) {
                statusElem.style.color = '#f1c40f';
                statusElem.innerText = 'Iniciando importação para o Roll20...';
            }

            try {
                await importNpcBatchToRoll20(doc, parsed, (msg) => {
                    if (statusElem) statusElem.innerText = msg;
                });
                closeModal();
            } catch (err) {
                console.error('Erro na importação de NPC:', err);
                if (statusElem) {
                    statusElem.style.color = '#e74c3c';
                    statusElem.innerText = 'Ocorreu um erro durante a importação. Verifique o console.';
                }
                confirmBtn.disabled = false;
                if (cancelBtn) cancelBtn.disabled = false;
                if (blankBtn) blankBtn.disabled = false;
                textarea.disabled = false;
            }
        });
    }
}

// Lê as cartas de domínio ativas (dom_) e da reserva (vau_) direto da aba nativa
function collectDomainAndVaultCards(doc) {
    const cards = { active: [], vault: [] };
    doc.querySelectorAll('.attributesabilities .abilities .abil').forEach(abil => {
        const rawName = abil.querySelector('.abilname')?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
        const lowerName = rawName.toLowerCase();
        const isActive = lowerName.startsWith('dom_');
        if (!isActive && !lowerName.startsWith('vau_')) return;

        const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
        const fields = extractMacroFields(macroTextarea ? macroTextarea.value : '');
        const nivel = fields['nível'] || fields['nivel'];
        const desc = fields['descrição'] || fields['descricao'] || fields['desc'];
        const card = {
            rawName,
            name: fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim(),
            nivel: nivel ? formatTextWithNewlines(nivel) : '-',
            custo: fields['custo'] ? formatTextWithNewlines(fields['custo']) : '-',
            desc: formatCardText(stripCardImageLinks(desc)) || 'Sem descrição.'
        };
        (isActive ? cards.active : cards.vault).push(card);
    });
    return cards;
}

function openVaultModal(doc) {
    const existingModal = doc.getElementById('dh-vault-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-vault-modal';
    modalOverlay.className = 'dh-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="dh-modal-box dh-vault-modal-box">
            <h3 class="dh-modal-title">🗃️ Reserva de Cartas de Domínio</h3>
            <div style="font-size: 0.85em; color: #cbd5e0;">Clique numa carta para movê-la entre as cartas ativas e a reserva.</div>
            <div class="dh-vault-columns">
                <div class="dh-vault-column">
                    <div class="dh-vault-column-title">Ativas <span id="dh-vault-active-count"></span></div>
                    <div class="dh-vault-list" id="dh-vault-active-list"></div>
                </div>
                <div class="dh-vault-column">
                    <div class="dh-vault-column-title">Reserva <span id="dh-vault-vault-count"></span></div>
                    <div class="dh-vault-list" id="dh-vault-vault-list"></div>
                </div>
            </div>
            <div id="dh-vault-status" style="font-size: 0.84em; color: #f1c40f; font-weight: bold; min-height: 20px;"></div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-vault-close-btn">Fechar</button>
            </div>
        </div>
    `;
    doc.body.appendChild(modalOverlay);

    const statusElem = modalOverlay.querySelector('#dh-vault-status');
    let cards = collectDomainAndVaultCards(doc);
    let pendingMoves = 0;
    let moveQueue = Promise.resolve();

    const renderList = (listId, countId, list, emptyText) => {
        const listElem = modalOverlay.querySelector(listId);
        modalOverlay.querySelector(countId).innerText = `(${list.length})`;
        listElem.innerHTML = list.length
            ? list.map(card => `<div class="dh-vault-card" data-card-fullname="${card.rawName}">${card.name}</div>`).join('')
            : `<div class="dh-vault-empty">${emptyText}</div>`;
    };

    const render = () => {
        renderList('#dh-vault-active-list', '#dh-vault-active-count', cards.active, 'Nenhuma carta ativa.');
        renderList('#dh-vault-vault-list', '#dh-vault-vault-count', cards.vault, 'Reserva vazia.');
        statusElem.innerText = pendingMoves > 0 ? `Movendo cartas no Roll20 (${pendingMoves})...` : '';
    };

    const moveCard = (rawName) => {
        const fromActive = rawName.toLowerCase().startsWith('dom_');
        const fromList = fromActive ? cards.active : cards.vault;
        const toList = fromActive ? cards.vault : cards.active;
        const idx = fromList.findIndex(c => c.rawName === rawName);
        if (idx === -1) return;

        // Atualiza a interface na hora; o Roll20 é atualizado em fila
        const [card] = fromList.splice(idx, 1);
        const newRawName = (fromActive ? 'vau_' : 'dom_') + rawName.substring(4);
        toList.push({ ...card, rawName: newRawName });
        pendingMoves++;
        render();

        moveQueue = moveQueue.then(async () => {
            const ok = await renameAbilityInRoll20(doc, rawName, newRawName);
            if (!ok) console.error(`Não foi possível mover a carta "${rawName}".`);
            pendingMoves--;
            // Ao terminar a fila, sincroniza com o que realmente está no Roll20
            if (pendingMoves === 0 && doc.body.contains(modalOverlay)) {
                cards = collectDomainAndVaultCards(doc);
            }
            if (doc.body.contains(modalOverlay)) render();
        });
    };

    const columnsElem = modalOverlay.querySelector('.dh-vault-columns');
    attachCardTooltip(doc, columnsElem, '.dh-vault-card', (cardElem) => {
        const rawName = cardElem.getAttribute('data-card-fullname');
        const card = [...cards.active, ...cards.vault].find(c => c.rawName === rawName);
        if (!card) return '';
        return `
            <div class="dh-domain-card">
                <div class="dh-domain-header">
                    <span>Nível: ${card.nivel}</span>
                    <span>Custo: ${card.custo}</span>
                </div>
                <div class="dh-domain-name">${card.name}</div>
                <div class="dh-domain-desc">${card.desc}</div>
            </div>
        `;
    });
    columnsElem.addEventListener('click', (e) => {
        const cardElem = e.target.closest('.dh-vault-card');
        if (cardElem) moveCard(cardElem.getAttribute('data-card-fullname'));
    });
    modalOverlay.querySelector('#dh-vault-close-btn').addEventListener('click', () => {
        hideCardTooltip(doc);
        modalOverlay.remove();
    });

    render();
}

function openSettingsModal(doc) {
    const existingModal = doc.getElementById('dh-settings-modal');
    if (existingModal) existingModal.remove();

    const settings = getPinkDaggerSettings();
    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-settings-modal';
    modalOverlay.className = 'dh-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="dh-modal-box">
            <h3 class="dh-modal-title">⚙️ Configurações</h3>
            <div class="dh-settings-group">
                <div class="dh-settings-label">Visualização da ficha</div>
                <div class="dh-settings-hint">Vale para todas as fichas neste navegador. A Oficial muda só a ficha de Personagem; Companheiro e NPC continuam na Clássica.</div>
                <label class="dh-settings-option">
                    <input type="radio" name="dh-card-view" value="detailed" ${settings.cardView === 'detailed' ? 'checked' : ''}>
                    <span><strong>Clássico</strong><small>Layout PinkDagger, com todas as informações direto nos cards.</small></span>
                </label>
                <label class="dh-settings-option">
                    <input type="radio" name="dh-card-view" value="simple" ${settings.cardView === 'simple' ? 'checked' : ''}>
                    <span><strong>Simplificado</strong><small>Layout PinkDagger com os cards mostrando só o nome; o card completo aparece ao passar o mouse.</small></span>
                </label>
                <label class="dh-settings-option">
                    <input type="radio" name="dh-card-view" value="official" ${settings.cardView === 'official' ? 'checked' : ''}>
                    <span><strong>Oficial</strong><small>Layout no estilo da ficha digital oficial de Daggerheart: atributos em flâmulas, Vida, Armas e Esperança lado a lado e abas embaixo.</small></span>
                </label>
            </div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-settings-close-btn">Fechar</button>
            </div>
        </div>
    `;
    doc.body.appendChild(modalOverlay);

    modalOverlay.querySelectorAll('input[name="dh-card-view"]').forEach(radio => {
        radio.addEventListener('change', () => {
            savePinkDaggerSettings({ cardView: radio.value });
            populateDaggerheartData(doc);
        });
    });
    modalOverlay.querySelector('#dh-settings-close-btn').addEventListener('click', () => modalOverlay.remove());
}
