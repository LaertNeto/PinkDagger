function setupMoneyControl(root, key, moneyObj) {
    const inputElem = root.querySelector(`#dh-money-${key}`);
    const btnUp = root.querySelector(`#dh-${key}-up`);
    const btnDown = root.querySelector(`#dh-${key}-down`);

    if (btnUp && btnDown && inputElem) {
        btnUp.addEventListener('click', () => {
            let val = parseInt(inputElem.value, 10);
            if (isNaN(val)) val = 0;
            val++;
            inputElem.value = val;
            if (moneyObj.input) updateOriginalInput(moneyObj.input, val);
        });

        btnDown.addEventListener('click', () => {
            let val = parseInt(inputElem.value, 10);
            if (isNaN(val)) val = 0;
            if (val > 0) val--;
            inputElem.value = val;
            if (moneyObj.input) updateOriginalInput(moneyObj.input, val);
        });
    }
}

function findAttributeInput(doc, possibleNames) {
    const attributeElements = doc.querySelectorAll('.attributesabilities .attributes .attrib');
    for (let i = 0; i < attributeElements.length; i++) {
        const attr = attributeElements[i];
        const nameElem = attr.querySelector('.attrname');
        const name = nameElem?.innerText?.trim().toLowerCase() || (attr.querySelector('.attrname input')?.value?.trim().toLowerCase() || '');
        if (possibleNames.includes(name)) {
            return attr.querySelector('.current input');
        }
    }
    return null;
}

function setupDefenseControl(doc, root, key, defObj, possibleNames) {
    const valElem = root.querySelector(`#dh-defense-val-${key}`);
    const btnUp = root.querySelector(`#dh-def-${key}-up`);
    const btnDown = root.querySelector(`#dh-def-${key}-down`);

    if (btnUp && btnDown && valElem) {
        btnUp.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            let val = parseInt(valElem.innerText, 10);
            if (isNaN(val)) val = 0;
            val++;
            valElem.innerText = val;
            defObj.val = val;
            const targetInput = defObj.input || findAttributeInput(doc, possibleNames);
            if (targetInput) updateOriginalInput(targetInput, val);
        });

        btnDown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            let val = parseInt(valElem.innerText, 10);
            if (isNaN(val)) val = 0;
            if (val > 0) val--;
            valElem.innerText = val;
            defObj.val = val;
            const targetInput = defObj.input || findAttributeInput(doc, possibleNames);
            if (targetInput) updateOriginalInput(targetInput, val);
        });
    }
}

function renderFearSheet(doc, root, medoStats) {
    const headerMeta = doc.querySelector('.dh-header-meta');
    if (headerMeta) {
        headerMeta.style.display = 'none';
    }

    if (!medoStats.exists) {
        root.innerHTML = `
            <div class="dh-fear-container">
                <div class="dh-fear-label">Medo</div>
                <button class="dh-add-missing-btn" id="dh-fear-create-attr">+ Criar atributo Medo</button>
            </div>
        `;
        root.querySelector('#dh-fear-create-attr')?.addEventListener('click', () => {
            addNewAttributeToRoll20(doc, 'Medo', null, '0', false, false, true);
        });
        return;
    }

    const maxVal = medoStats.max || FEAR_DEFAULT_MAX;
    let currentVal = Math.min(Math.max(medoStats.val, 0), maxVal);

    root.innerHTML = `
        <div class="dh-fear-container">
            <div class="dh-fear-label">Medo</div>
            <div class="dh-fear-controls">
                <button type="button" class="dh-fear-btn" id="dh-fear-down" title="Gastar Medo">−</button>
                <div class="dh-fear-value"><span id="dh-fear-val">${currentVal}</span><span class="dh-fear-max">/ ${maxVal}</span></div>
                <button type="button" class="dh-fear-btn" id="dh-fear-up" title="Ganhar Medo">+</button>
            </div>
            <div class="dh-fear-pips" id="dh-fear-pips"></div>
        </div>
    `;

    const valElem = root.querySelector('#dh-fear-val');
    const pipsElem = root.querySelector('#dh-fear-pips');
    const renderPips = () => {
        let pipsHTML = '';
        for (let i = 1; i <= maxVal; i++) {
            pipsHTML += `<span class="dh-fear-pip${i <= currentVal ? ' dh-fear-pip-filled' : ''}"></span>`;
        }
        pipsElem.innerHTML = pipsHTML;
    };
    renderPips();

    let busy = false;
    const changeFear = async (delta, macro) => {
        if (busy) return;
        const newVal = currentVal + delta;
        if (newVal < 0 || newVal > maxVal) return;

        busy = true;
        currentVal = newVal;
        valElem.innerText = currentVal;
        renderPips();

        // Busca o campo novamente: o Roll20 recria a linha do atributo e a referência antiga fica solta
        const targetInput = findAttributeInput(doc, [medoStats.attrName.toLowerCase()]) || medoStats.input;
        if (targetInput) updateOriginalInput(targetInput, currentVal);

        // Aguarda o Roll20 registrar o novo valor antes de o macro ler @{medo}
        await delay(300);
        await ensureMacroAndTrigger(doc, macro.name, macro.action(medoStats.attrName));
        busy = false;
    };

    root.querySelector('#dh-fear-down')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        changeFear(-1, FEAR_MACROS.menos);
    });

    root.querySelector('#dh-fear-up')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        changeFear(1, FEAR_MACROS.mais);
    });
}

// Modo simplificado: o CSS esconde os detalhes e o tooltip mostra o card completo
function applySimpleCardView(doc, root, containerSelectors) {
    if (getPinkDaggerSettings().cardView !== 'simple') return;
    root.classList.add('dh-cards-simple');
    containerSelectors.forEach(selector => {
        const container = root.querySelector(selector);
        if (!container) return;
        attachCardTooltip(doc, container, '.dh-heritage-card, .dh-weapon-card, .dh-domain-card', (cardElem) => {
            const clone = cardElem.cloneNode(true);
            clone.querySelectorAll('.dh-card-edit-btn, .dh-weapon-edit-btn').forEach(btn => btn.remove());
            return clone.outerHTML;
        });
    });
}

function populateDaggerheartData(doc) {
    const root = doc.getElementById('dh-content-root');
    if (!root) return;

    // O re-render remove os cards; o tooltip e o modo simplificado são reaplicados abaixo
    hideCardTooltip(doc);
    root.classList.remove('dh-cards-simple');

    const charNameElem = doc.getElementById('dh-char-name');
    if (charNameElem) {
        const charName = getSheetCharacterName(doc);
        charNameElem.innerText = charName ? `${charName} (PinkDagger)` : 'PinkDagger';
    }

    const attributeElements = doc.querySelectorAll('.attributesabilities .attributes .attrib');
    
    const fixedTraits = FIXED_TRAITS;
    const fixedTrackers = FIXED_TRACKERS;

    let traitsMap = {};
    let trackersMap = {};
    let defenses = { evasao: null, menor: null, maior: null };
    let unmappedStats = [];
    let moneyMap = { 
        punhado: { val: 0, input: null, exists: false }, 
        bolsa: { val: 0, input: null, exists: false }, 
        bau: { val: 0, input: null, exists: false } 
    };
    let nivelVal = null;
    let profVal = null;
    let isNpc = false;
    let isPc = false;
    let isFear = false;
    let isCompanion = false;
    let medoStats = { val: 0, max: null, input: null, attrName: 'medo', exists: false };
    let npcStats = { 
        dificuldade: { val: '-', exists: false }, 
        atq: { val: '-', exists: false }, 
        alcance: { val: '-', exists: false }, 
        dano: { val: '-', exists: false }, 
        tipo_dano: { val: '', exists: false },
        nome_ataque: { val: '', exists: false },
        limiares: { val: '', exists: false },
        tipo: { val: '', exists: false },
        tier: { val: '-', exists: false },
        description: { val: '', exists: false },
        motiv_tatic: { val: '', exists: false }
    };

    attributeElements.forEach(attr => {
        const nameElem = attr.querySelector('.attrname');
        const name = nameElem?.innerText?.trim() || (attr.querySelector('.attrname input')?.value?.trim() || '');
        const currentInput = attr.querySelector('.current input');
        const currentSpan = attr.querySelector('.current span');
        const currentVal = currentInput ? currentInput.value : (currentSpan ? currentSpan.innerText : '-');
        
        const maxInput = attr.querySelector('.max input');
        const maxSpan = attr.querySelector('.max span');
        const maxVal = maxInput ? maxInput.value : (maxSpan ? maxSpan.innerText : null);

        const lowerName = name.toLowerCase();

        if (fixedTraits.includes(lowerName)) {
            traitsMap[lowerName] = { current: currentVal, originalName: name, exists: true };
        } else if (fixedTrackers.includes(lowerName)) {
            trackersMap[lowerName] = { 
                current: parseInt(currentVal, 10) || 0, 
                max: parseInt(maxVal || currentVal, 10) || 0,
                exists: true
            };
        } else if (lowerName === 'evasão' || lowerName === 'evasao') {
            defenses.evasao = { val: currentVal, input: currentInput, exists: true };
        } else if (lowerName === 'limiar-menor' || lowerName === 'limiar menor') {
            defenses.menor = { val: currentVal, input: currentInput, exists: true };
        } else if (lowerName === 'limiar-maior' || lowerName === 'limiar maior') {
            defenses.maior = { val: currentVal, input: currentInput, exists: true };
        } else if (lowerName === 'nivel' || lowerName === 'nível') {
            nivelVal = currentVal;
        } else if (lowerName === 'proficiência' || lowerName === 'proficiencia') {
            profVal = currentVal;
        } else if (lowerName === 'punhado' || lowerName === 'moeda_punhado') {
            moneyMap.punhado = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
        } else if (lowerName === 'bolsa' || lowerName === 'moeda_bolsa') {
            moneyMap.bolsa = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
        } else if (lowerName === 'baú' || lowerName === 'bau' || lowerName === 'moeda_bau') {
            moneyMap.bau = { val: parseInt(currentVal, 10) || 0, input: currentInput, exists: true };
        } else if (lowerName === 'pinkdagger_npc') {
            isNpc = true;
        } else if (lowerName === 'pinkdagger_pc') {
            isPc = true;
        } else if (lowerName === 'pinkdagger_fear') {
            isFear = true;
        } else if (lowerName === 'pinkdagger_companion') {
            isCompanion = true;
        } else if (lowerName === 'medo') {
            medoStats = {
                val: parseInt(currentVal, 10) || 0,
                max: parseInt(maxVal, 10) || null,
                input: currentInput,
                attrName: name,
                exists: true
            };
        } else if (lowerName === 'dificuldade') {
            npcStats.dificuldade = { val: currentVal, exists: true };
        } else if (lowerName === 'limiares' || lowerName === 'limiar') {
            npcStats.limiares = { val: currentVal, exists: true };
            if (currentVal && currentVal.includes('/')) {
                const parts = currentVal.split('/');
                if (!defenses.menor) defenses.menor = { val: parts[0].trim(), exists: true };
                if (!defenses.maior) defenses.maior = { val: parts[1].trim(), exists: true };
            }
        } else if (lowerName === 'atq' || lowerName === 'ataque') {
            npcStats.atq = { val: currentVal, exists: true, attrName: name };
        } else if (lowerName === 'nome_ataque' || lowerName === 'nome-ataque' || lowerName === 'nome ataque' || lowerName === 'arma' || lowerName === 'nome_arma') {
            npcStats.nome_ataque = { val: currentVal, exists: true, attrName: name };
        } else if (lowerName === 'alcance') {
            npcStats.alcance = { val: currentVal, exists: true, attrName: name };
        } else if (lowerName === 'dano') {
            npcStats.dano = { val: currentVal, exists: true, attrName: name };
        } else if (lowerName === 'tipo_dano' || lowerName === 'tipo-dano' || lowerName === 'tipo de dano' || lowerName === 'tipo do dano' || lowerName === 'dano_tipo') {
            npcStats.tipo_dano = { val: currentVal, exists: true, attrName: name };
        } else if (lowerName === 'tipo') {
            npcStats.tipo = { val: currentVal, exists: true };
        } else if (lowerName === 'tier') {
            npcStats.tier = { val: currentVal, exists: true };
        } else if (lowerName === 'flavor' || lowerName === 'description' || lowerName === 'descrição' || lowerName === 'descricao' || lowerName === 'desc') {
            npcStats.description = { val: currentVal, exists: true };
        } else if (lowerName === 'motiv_tatic' || lowerName === 'motiv_tatics' || lowerName === 'motivações e táticas' || lowerName === 'motivacoes e taticas' || lowerName === 'motivação e tática' || lowerName === 'motivacao e tatica' || lowerName === 'motivacoes_taticas' || lowerName === 'táticas' || lowerName === 'taticas' || lowerName === 'motivação' || lowerName === 'motivacao') {
            npcStats.motiv_tatic = { val: currentVal, exists: true };
        } else if (name) {
            unmappedStats.push({ name, current: currentVal, max: maxVal, originalInput: currentInput });
        }
    });

    // ========== FEAR SHEET RENDERING ==========
    if (isFear) {
        renderFearSheet(doc, root, medoStats);
        return;
    }

    // ========== COMPANION SHEET RENDERING ==========
    if (isCompanion) {
        renderCompanionSheet(doc, root, {
            profVal,
            evasao: defenses.evasao,
            fadiga: trackersMap['fadiga'],
            atq: npcStats.atq
        });
        return;
    }

    // ========== NPC SHEET RENDERING ==========
    if (isNpc) {
        const headerMeta = doc.querySelector('.dh-header-meta');
        if (headerMeta) {
            headerMeta.style.display = 'none';
        }

        const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');

        // --- Vida e Fadiga (apenas máximas) ---
        const vidaData = trackersMap['vida'];
        const fadigaData = trackersMap['fadiga'];
        const vidaMax = vidaData ? (vidaData.max || vidaData.current || '-') : '-';
        const fadigaMax = fadigaData ? (fadigaData.max || fadigaData.current || '-') : '-';

        // --- Mapa de atributos para resolução de variáveis nos macros ---
        const attrMap = {
            'atq': npcStats.atq.exists ? npcStats.atq.val : '',
            'ataque': npcStats.atq.exists ? npcStats.atq.val : '',
            'dano': npcStats.dano.exists ? npcStats.dano.val : '',
            'damage': npcStats.dano.exists ? npcStats.dano.val : '',
            'tipo_dano': npcStats.tipo_dano.exists ? npcStats.tipo_dano.val : '',
            'tipo-dano': npcStats.tipo_dano.exists ? npcStats.tipo_dano.val : '',
            'dano_tipo': npcStats.tipo_dano.exists ? npcStats.tipo_dano.val : '',
            'tipo': npcStats.tipo.exists ? npcStats.tipo.val : '',
            'alcance': npcStats.alcance.exists ? npcStats.alcance.val : '',
            'proficiência': profVal || '',
            'proficiencia': profVal || ''
        };

        // --- 1. FORA DE QUALQUER SEÇÃO (Topo da ficha) ---
        let tierTipoHTML = '';
        if (npcStats.tipo.exists && npcStats.tier.exists) {
            const tNum = parseInt(npcStats.tier.val, 10);
            const patamarStr = !isNaN(tNum) ? `${tNum}º patamar` : `${npcStats.tier.val}`;
            tierTipoHTML = `<div class="dh-npc-tier-tipo">${npcStats.tipo.val} (${patamarStr})</div>`;
        } else {
            let tierPart = npcStats.tier.exists 
                ? `Tier ${npcStats.tier.val}` 
                : `Tier <button class="dh-add-missing-btn" data-missing-npc-attr="tier" data-default="1">+</button>`;

            let tipoPart = npcStats.tipo.exists 
                ? npcStats.tipo.val 
                : `<button class="dh-add-missing-btn" data-missing-npc-attr="tipo" data-default="Solo">+ Tipo</button>`;

            tierTipoHTML = `<div class="dh-npc-tier-tipo">${tipoPart} ${tierPart}</div>`;
        }

        let descPart = npcStats.description.exists 
            ? `<div class="dh-npc-desc">${formatTextWithNewlines(npcStats.description.val)}</div>`
            : `<div style="margin: 3px 0;"><button class="dh-add-missing-btn" data-missing-npc-attr="flavor" data-default="">+ Flavor / Descrição</button></div>`;

        let motivPart = npcStats.motiv_tatic.exists 
            ? `<div class="dh-npc-tactics"><span class="dh-npc-tactics-label">Motivações e táticas:</span> ${formatTextWithNewlines(npcStats.motiv_tatic.val)}</div>`
            : `<div style="margin: 3px 0;"><button class="dh-add-missing-btn" data-missing-npc-attr="motiv_tatic" data-default="">+ Motivações e táticas</button></div>`;

        let npcHeaderHTML = `
            <div class="dh-npc-header-info">
                ${tierTipoHTML}
                ${descPart}
                ${motivPart}
            </div>
        `;

        // --- 2. Busca de Macros: Arma/Ataque, Experiências e Habilidades ---
        let attackCardHTML = '';
        let abilityCardsHTML = '';
        let expCardsHTML = '';
        let expCount = 0;
        let attackMacroFullName = null;
        let attackEditData = null;

        if (abilityElements.length > 0) {
            abilityElements.forEach((abil, abilIdx) => {
                const nameElem = abil.querySelector('.abilname');
                const rawName = nameElem?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
                const lowerName = rawName.toLowerCase();

                if (rawName.startsWith('=====')) return;

                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const isAttackMacro = lowerName === 'ataque' || 
                                     lowerName.startsWith('wea_') || 
                                     lowerName.startsWith('ataque_') ||
                                     (npcStats.nome_ataque.exists && lowerName === npcStats.nome_ataque.val.toLowerCase().trim());

                if (isAttackMacro) {
                    attackMacroFullName = rawName;
                    const fields = extractMacroFields(macroContent);
                    const macroNameField = fields['name'] ? formatTextWithNewlines(fields['name']) : '';
                    const attackTitle = npcStats.nome_ataque.exists 
                        ? npcStats.nome_ataque.val 
                        : (macroNameField || (rawName.startsWith('wea_') ? rawName.substring(4).trim() : 'Ataque'));
                    
                    // Tradução do dano e tipo_dano usando o helper de resolução de variáveis de macro
                    const rawDamage = fields['dano'] || fields['damage'] || '';
                    let resolvedDamage = resolveMacroVariables(rawDamage, attrMap);
                    if (!resolvedDamage && npcStats.dano.exists) {
                        resolvedDamage = `${npcStats.dano.val} ${npcStats.tipo_dano.exists ? npcStats.tipo_dano.val : ''}`.trim();
                    }

                    let damageTagHTML = '';
                    if (resolvedDamage) {
                        damageTagHTML = `<span class="dh-weapon-damage-tag">${resolvedDamage}</span>`;
                    } else {
                        let missingDmgParts = [];
                        if (!npcStats.dano.exists) {
                            missingDmgParts.push(`<button class="dh-add-missing-btn" data-missing-npc-attr="dano" data-default="4d12+15" title="Adicionar Dano">+ Dano</button>`);
                        }
                        if (!npcStats.tipo_dano.exists) {
                            missingDmgParts.push(`<button class="dh-add-missing-btn" data-missing-npc-attr="tipo_dano" data-default="fís" title="Adicionar Tipo de Dano">+ Tipo de Dano</button>`);
                        }
                        damageTagHTML = missingDmgParts.join(' ');
                    }

                    // Tradução do alcance
                    const rawAlcance = fields['alcance'] || '';
                    let resolvedAlcance = resolveMacroVariables(rawAlcance, attrMap);
                    if (!resolvedAlcance) {
                        resolvedAlcance = npcStats.alcance.exists ? npcStats.alcance.val : '';
                    }
                    let alcanceTagHTML = resolvedAlcance 
                        ? `<span class="dh-weapon-trait-tag">${resolvedAlcance}</span>`
                        : `<button class="dh-add-missing-btn" data-missing-npc-attr="alcance" data-default="próximo" title="Adicionar Alcance">+ Alcance</button>`;

                    // Bônus de ataque
                    let atqTagHTML = '';
                    if (npcStats.atq.exists) {
                        const valStr = String(npcStats.atq.val).trim();
                        const prefix = valStr.startsWith('+') || valStr.startsWith('-') ? '' : '+';
                        atqTagHTML = `<span class="dh-weapon-trait-tag" style="color: #f1c40f; border-color: rgba(241, 196, 15, 0.4); background: rgba(241, 196, 15, 0.15);">ATQ ${prefix}${valStr}</span>`;
                    } else {
                        atqTagHTML = `<button class="dh-add-missing-btn" data-missing-npc-attr="atq" data-default="10" title="Adicionar Atributo Atq">+ Atq</button>`;
                    }

                    // Valores atuais para o modal de edição (atributos que faltam são criados com o nome padrão)
                    attackEditData = {
                        nome_ataque: { attrName: npcStats.nome_ataque.attrName || 'Nome_Ataque', value: npcStats.nome_ataque.exists ? npcStats.nome_ataque.val : attackTitle },
                        atq: { attrName: npcStats.atq.attrName || 'Atq', value: npcStats.atq.exists ? npcStats.atq.val : '' },
                        alcance: { attrName: npcStats.alcance.attrName || 'Alcance', value: npcStats.alcance.exists ? npcStats.alcance.val : resolvedAlcance },
                        dano: { attrName: npcStats.dano.attrName || 'Dano', value: npcStats.dano.exists ? npcStats.dano.val : resolvedDamage },
                        tipo_dano: { attrName: npcStats.tipo_dano.attrName || 'Tipo_Dano', value: npcStats.tipo_dano.exists ? npcStats.tipo_dano.val : '' }
                    };

                    attackCardHTML = `
                        <div class="dh-weapon-card dh-npc-weapon-card" data-card-fullname="${rawName}">
                            <div class="dh-weapon-header">
                                ${alcanceTagHTML}
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    ${damageTagHTML}
                                    ${atqTagHTML}
                                    <button class="dh-weapon-edit-btn" id="dh-npc-attack-edit" title="Editar Ataque">✏️</button>
                                </div>
                            </div>
                            <div class="dh-weapon-title">⚔️ ${attackTitle}</div>
                        </div>
                    `;
                } else if (lowerName.startsWith('exp_')) {
                    expCount++;
                    const fields = extractMacroFields(macroContent);
                    const expName = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                    const expMod = fields['modificador'] || fields['mod'] || '+0';

                    expCardsHTML += `
                        <div class="dh-exp-card" data-card-fullname="${rawName}">
                            <span class="dh-exp-name">${expName}</span>
                            <span class="dh-exp-mod">${expMod}</span>
                        </div>
                    `;
                } else if (lowerName.startsWith('hab_') || lowerName.startsWith('habilidade') || lowerName.startsWith('esp_')) {
                    const fields = extractMacroFields(macroContent);
                    const cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.replace(/^hab_/i, '').trim();
                    let effectsHTML = '';

                    Object.keys(fields).forEach(key => {
                        if (key !== 'name') {
                            if (key === '__raw_desc__' || key === 'desc' || key === 'descrição' || key === 'descricao' || key === 'efeito') {
                                effectsHTML += `<div class="dh-heritage-effect">${formatTextWithNewlines(fields[key])}</div>`;
                            } else {
                                const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                                effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                            }
                        }
                    });

                    abilityCardsHTML += `
                        <div class="dh-heritage-card dh-npc-ability-card" data-card-fullname="${rawName}">
                            <div class="dh-card-header">
                                <div class="dh-heritage-tag">HABILIDADE</div>
                                <button class="dh-card-edit-btn" data-abil-idx="${abilIdx}" data-card-fullname="${rawName}" data-card-type="Habilidade" title="Editar Habilidade">✏️</button>
                            </div>
                            <div class="dh-heritage-title">${cardTitle}</div>
                            ${effectsHTML || '<div class="dh-heritage-effect">Sem descrição informada.</div>'}
                        </div>
                    `;
                }
            });
        }

        // Se não houver macro de ataque criado, mostra botão de adicionar macro
        if (!attackCardHTML) {
            attackCardHTML = `
                <div class="dh-weapon-card dh-npc-weapon-card dh-npc-missing-weapon" style="border-style: dashed; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #a0aec0; font-size: 0.85em;">Macro de Ataque não cadastrado</span>
                    <button class="dh-add-missing-btn" id="dh-npc-add-attack-macro">+ Criar Macro de Ataque</button>
                </div>
            `;
        }

        // --- 3. SEÇÃO ATRIBUTOS ---
        // Primeira linha: Dificuldade, Limiares, Vida (apenas máxima), Fadiga (apenas máxima)
        const difHTML = npcStats.dificuldade.exists 
            ? `<span class="dh-npc-attr-value">${npcStats.dificuldade.val}</span>`
            : `<button class="dh-add-missing-btn" data-missing-npc-attr="dificuldade" data-default="18">+</button>`;

        let limiaresHTML = '';
        if (npcStats.limiares.exists) {
            limiaresHTML = `<span class="dh-npc-attr-value">${npcStats.limiares.val}</span>`;
        } else if (defenses.menor?.exists && defenses.maior?.exists) {
            limiaresHTML = `<span class="dh-npc-attr-value">${defenses.menor.val} / ${defenses.maior.val}</span>`;
        } else if (defenses.menor?.exists) {
            limiaresHTML = `<span class="dh-npc-attr-value">${defenses.menor.val} / <button class="dh-add-missing-btn" data-missing-def="maior" title="Adicionar Limiar-Maior">+</button></span>`;
        } else if (defenses.maior?.exists) {
            limiaresHTML = `<span class="dh-npc-attr-value"><button class="dh-add-missing-btn" data-missing-def="menor" title="Adicionar Limiar-Menor">+</button> / ${defenses.maior.val}</span>`;
        } else {
            limiaresHTML = `<div style="display:flex; gap:3px;"><button class="dh-add-missing-btn" data-missing-npc-attr="limiares" data-default="29/55" title="Adicionar Limiares">+</button></div>`;
        }

        const vidaHTML = trackersMap['vida']?.exists 
            ? `<span class="dh-npc-attr-value">${vidaMax}</span>`
            : `<button class="dh-add-missing-btn" data-missing-npc-tracker="vida" data-default="8">+</button>`;

        const fadigaHTML = trackersMap['fadiga']?.exists 
            ? `<span class="dh-npc-attr-value">${fadigaMax}</span>`
            : `<button class="dh-add-missing-btn" data-missing-npc-tracker="fadiga" data-default="5">+</button>`;

        let npcAttrsHTML = `
            <div class="dh-section-title"><span>Atributos</span></div>
            <div class="dh-npc-attrs-grid-4">
                <div class="dh-npc-attr-item">
                    <span class="dh-npc-attr-label">Dificuldade</span>
                    ${difHTML}
                </div>
                <div class="dh-npc-attr-item">
                    <span class="dh-npc-attr-label">Limiares</span>
                    ${limiaresHTML}
                </div>
                <div class="dh-npc-attr-item">
                    <span class="dh-npc-attr-label">Vida</span>
                    ${vidaHTML}
                </div>
                <div class="dh-npc-attr-item">
                    <span class="dh-npc-attr-label">Fadiga</span>
                    ${fadigaHTML}
                </div>
            </div>
            <div class="dh-npc-weapon-row">${attackCardHTML}</div>
        `;

        // --- 4. SEÇÃO EXPERIÊNCIAS ---
        let npcExpSectionHTML = `
            <div class="dh-section-title">
                <span>Experiências</span>
                <button class="dh-add-btn" id="dh-npc-add-exp" title="Adicionar Experiência">+</button>
            </div>
            <div class="dh-npc-experiences-grid" id="dh-npc-experiences-container">
                ${expCount > 0 ? expCardsHTML : '<span style="color: #718096; font-size: 0.8em; padding: 4px;">Nenhuma experiência cadastrada.</span>'}
            </div>
        `;

        // --- 5. SEÇÃO HABILIDADES ---
        let npcAbilitiesSectionHTML = `
            <div class="dh-section-title">
                <span>Habilidades</span>
                <button class="dh-add-btn" id="dh-npc-add-hab" title="Adicionar Habilidade">+</button>
            </div>
            <div class="dh-npc-abilities-list" id="dh-npc-abilities-container">
                ${abilityCardsHTML || '<div style="color: #718096; font-size: 0.8em; padding: 6px 0;">Nenhuma habilidade cadastrada. Clique no + acima para adicionar.</div>'}
            </div>
        `;

        root.innerHTML = npcHeaderHTML + npcAttrsHTML + npcExpSectionHTML + npcAbilitiesSectionHTML;
        applySimpleCardView(doc, root, ['#dh-npc-abilities-container']);

        // --- Listeners do NPC ---
        // Rolagem da arma
        const npcWeaponCard = root.querySelector('.dh-npc-weapon-card:not(.dh-npc-missing-weapon)');
        if (npcWeaponCard) {
            npcWeaponCard.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const fullName = npcWeaponCard.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });

            npcWeaponCard.querySelector('#dh-npc-attack-edit')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditNpcAttackModal(doc, attackMacroFullName, attackEditData);
            });
        }

        // Rolagem de experiências
        const npcExpContainer = root.querySelector('#dh-npc-experiences-container');
        if (npcExpContainer) {
            npcExpContainer.querySelectorAll('.dh-exp-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });
        }

        // Rolagem de habilidades
        const npcAbilitiesContainer = root.querySelector('#dh-npc-abilities-container');
        if (npcAbilitiesContainer) {
            npcAbilitiesContainer.querySelectorAll('.dh-npc-ability-card').forEach(card => {
                card.addEventListener('click', () => {
                    const fullName = card.getAttribute('data-card-fullname');
                    triggerRollForAbilityName(doc, fullName);
                });
            });

            npcAbilitiesContainer.querySelectorAll('.dh-card-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCardEditClick(doc, btn, abilityElements);
                });
            });
        }

        // Botões de atributos ausentes do NPC
        root.querySelectorAll('[data-missing-npc-attr]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const attrName = btn.getAttribute('data-missing-npc-attr');
                const defaultVal = btn.getAttribute('data-default') || "0";
                const properName = attrName.charAt(0).toUpperCase() + attrName.slice(1);
                addNewAttributeToRoll20(doc, properName, `Valor para ${properName}:`, defaultVal, false);
            });
        });

        // Botões de trackers ausentes (Vida / Fadiga)
        root.querySelectorAll('[data-missing-npc-tracker]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackerName = btn.getAttribute('data-missing-npc-tracker');
                const defaultVal = btn.getAttribute('data-default') || "6";
                const properName = trackerName.charAt(0).toUpperCase() + trackerName.slice(1);
                addNewAttributeToRoll20(doc, properName, `Valor máximo de ${properName}:`, defaultVal, true);
            });
        });

        // Botões de defesas ausentes (Limiar-Menor / Limiar-Maior)
        root.querySelectorAll('[data-missing-def]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const defKey = btn.getAttribute('data-missing-def');
                let attrName = "Limiar-Menor";
                let defaultVal = "5";
                if (defKey === 'maior') { attrName = "Limiar-Maior"; defaultVal = "10"; }
                addNewAttributeToRoll20(doc, attrName, `Valor inicial para ${attrName}:`, defaultVal, false);
            });
        });

        // Botão para criar Macro de Ataque
        const addNpcAttackBtn = root.querySelector('#dh-npc-add-attack-macro');
        if (addNpcAttackBtn) {
            addNpcAttackBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addNewMacroToRoll20(doc, 'ataque', null, 'Ataque');
            });
        }

        // Botão para criar nova Experiência
        const addNpcExpBtn = root.querySelector('#dh-npc-add-exp');
        if (addNpcExpBtn) {
            addNpcExpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addNewMacroToRoll20(doc, 'exp', 'Nome da nova Experiência:');
            });
        }

        // Botão para criar nova Habilidade
        const addNpcHabBtn = root.querySelector('#dh-npc-add-hab');
        if (addNpcHabBtn) {
            addNpcHabBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addNewMacroToRoll20(doc, 'hab', 'Nome da nova Habilidade:');
            });
        }

        return; // Skip normal player sheet rendering
    }
    // ========== END NPC SHEET RENDERING ==========

    // ========== CHOICE SCREEN (IF NEITHER NPC NOR PC) ==========
    if (!isPc) {
        const headerMeta = doc.querySelector('.dh-header-meta');
        if (headerMeta) {
            headerMeta.style.display = 'none';
        }

        root.innerHTML = `
            <div class="dh-choice-container">
                <div class="dh-choice-title">Configurar Ficha PinkDagger</div>
                <div class="dh-choice-subtitle">Esta ficha ainda não foi configurada. Selecione abaixo se ela representa um Personagem de Jogador (PC) ou uma Criatura / Monstro (NPC):</div>
                <div class="dh-choice-grid">
                    <div class="dh-choice-card" id="dh-choose-pc-card">
                        <div class="dh-choice-icon">🛡️</div>
                        <div class="dh-choice-card-title">Personagem de Jogador (PC)</div>
                        <div class="dh-choice-card-desc">Ficha completa de herói com Atributos Principais, Rastreadores (Vida, Fadiga, Armadura, Esperança), Armas, Heranças, Classes, Domínio e Inventário.</div>
                        <button type="button" class="dh-choice-action-btn">Criar como Jogador (PC)</button>
                    </div>
                    <div class="dh-choice-card" id="dh-choose-npc-card">
                        <div class="dh-choice-icon">🐉</div>
                        <div class="dh-choice-card-title">Criatura / Monstro (NPC)</div>
                        <div class="dh-choice-card-desc">Ficha simplificada para o mestre com Dificuldade, Limiares, Vida, Fadiga, Bônus de Ataque, Dano, Experiências e lista de Habilidades.</div>
                        <button type="button" class="dh-choice-action-btn">Criar como Monstro (NPC)</button>
                    </div>
                </div>
                <details class="dh-choice-more">
                    <summary>Outros tipos de ficha</summary>
                    <div class="dh-choice-more-list">
                        <button type="button" class="dh-choice-more-btn" data-sheet-type="pinkdagger_companion">
                            <span class="dh-choice-more-icon">🐾</span>
                            <span class="dh-choice-more-text">
                                <strong>Companheiro Animal</strong>
                                <small>Proficiência, Evasão, Fadiga, um Ataque, Experiências e Habilidades.</small>
                            </span>
                        </button>
                        <button type="button" class="dh-choice-more-btn" data-sheet-type="pinkdagger_fear">
                            <span class="dh-choice-more-icon">😱</span>
                            <span class="dh-choice-more-text">
                                <strong>Medo (Mestre)</strong>
                                <small>Contador de Medo com botões −/+ que anunciam a mudança no chat.</small>
                            </span>
                        </button>
                    </div>
                </details>
            </div>
        `;

        root.querySelector('#dh-choose-pc-card')?.addEventListener('click', () => {
            addNewAttributeToRoll20(doc, 'pinkdagger_pc', null, '1', false, false, true);
        });

        root.querySelectorAll('.dh-choice-more-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                addNewAttributeToRoll20(doc, btn.getAttribute('data-sheet-type'), null, '1', false, false, true);
            });
        });

        root.querySelector('#dh-choose-npc-card')?.addEventListener('click', () => {
            openImportNpcModal(doc);
        });

        return; // Aguarda a escolha do usuário
    }

    // ========== PLAYER (PC) SHEET RENDERING ==========
    const headerMeta = doc.querySelector('.dh-header-meta');
    if (headerMeta) {
        headerMeta.style.display = 'flex';
    }

    const nivelElem = doc.getElementById('dh-char-nivel');
    const profElem = doc.getElementById('dh-char-prof');

    if (nivelElem) {
        nivelElem.parentElement.style.display = ''; // a ficha de companheiro esconde o Nível
        if (nivelVal !== null) {
            nivelElem.innerText = nivelVal;
        } else {
            nivelElem.innerHTML = `<button class="dh-add-missing-btn" id="dh-add-nivel-btn">+</button>`;
            doc.getElementById('dh-add-nivel-btn')?.addEventListener('click', () => {
                addNewAttributeToRoll20(doc, "Nível", "Digite o Nível do personagem:", "1");
            });
        }
    }

    if (profElem) {
        if (profVal !== null) {
            profElem.innerText = profVal;
        } else {
            profElem.innerHTML = `<button class="dh-add-missing-btn" id="dh-add-prof-btn">+</button>`;
            doc.getElementById('dh-add-prof-btn')?.addEventListener('click', () => {
                addNewAttributeToRoll20(doc, "Proficiência", "Digite a Proficiência do personagem:", "1");
            });
        }
    }

    let traitsHTML = '<div class="dh-section-title"><span>Atributos Principais</span></div><div class="dh-traits-grid" id="dh-traits-container">';
    fixedTraits.forEach(traitKey => {
        const data = traitsMap[traitKey];
        const displayName = traitKey.charAt(0).toUpperCase() + traitKey.slice(1);
        if (data && data.exists) {
            traitsHTML += `<div class="dh-trait-card" data-trait="${traitKey}"><div class="dh-trait-name">${displayName}</div><div class="dh-trait-val">${data.current}</div></div>`;
        } else {
            traitsHTML += `<div class="dh-trait-card" data-missing-attr="${traitKey}"><div class="dh-trait-name">${displayName}</div><button class="dh-add-missing-btn" style="margin-top:4px;">+</button></div>`;
        }
    });
    traitsHTML += '</div>';

    let statsHTML = `<div class="dh-section-title"><span>Recursos e Status</span><button class="dh-add-btn" id="dh-add-custom-tracker" title="Adicionar Recurso Personalizado">+</button></div><div class="dh-stats-grid">`;
    fixedTrackers.forEach(trackerKey => {
        const item = trackersMap[trackerKey];
        const displayName = trackerKey.charAt(0).toUpperCase() + trackerKey.slice(1);
        
        if (item && item.exists) {
            const totalDots = Math.max(item.max, item.current, 1);
            let dotsHTML = '';
            for (let i = 1; i <= totalDots; i++) {
                const isActive = i <= item.current ? 'active' : 'inactive';
                dotsHTML += `<div class="dh-dot ${trackerKey} ${isActive}"></div>`;
            }
            statsHTML += `
                <div class="dh-stat-box">
                    <div class="dh-stat-header">
                        <span class="dh-stat-label">${displayName}</span>
                        <span class="dh-stat-value">${item.current} / ${item.max}</span>
                    </div>
                    <div class="dh-dots-container">${dotsHTML}</div>
                </div>
            `;
        } else {
            statsHTML += `
                <div class="dh-stat-box">
                    <div class="dh-stat-header">
                        <span class="dh-stat-label">${displayName}</span>
                        <button class="dh-add-missing-btn" data-missing-tracker="${trackerKey}">+ Adicionar</button>
                    </div>
                    <div style="font-size: 0.75em; color: #718096; margin-top: 4px;">Não cadastrado</div>
                </div>
            `;
        }
    });

    statsHTML += '</div>';

    // Grid de Recursos Personalizados — renderizado após Defesas e Experiências
    let customStatsHTML = '';
    if (unmappedStats.length > 0) {
        customStatsHTML = '<div class="dh-stats-grid dh-custom-stats-grid">';
        unmappedStats.forEach((stat, index) => {
            customStatsHTML += `
                <div class="dh-stat-box dh-custom-stat-box" data-index="${index}">
                    <div class="dh-stat-header">
                        <span class="dh-stat-label dh-custom-stat-label">${stat.name}</span>
                        <div class="dh-spinner-group">
                            <input type="text" class="dh-spinner-input" value="${stat.current}" readonly>
                            <div class="dh-spinner-btns">
                                <button class="dh-spin-btn dh-btn-up">▲</button>
                                <button class="dh-spin-btn dh-btn-down">▼</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        customStatsHTML += '</div>';
    }

    const getDefHTML = (label, key) => {
        const def = defenses[key];
        if (def && def.exists) {
            return `
                <div class="dh-defense-item">
                    <div class="dh-defense-sublabel">${label}</div>
                    <div class="dh-defense-value-group">
                        <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-down" title="Diminuir ${label}">−</button>
                        <span class="dh-defense-val" id="dh-defense-val-${key}">${def.val}</span>
                        <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-up" title="Aumentar ${label}">+</button>
                    </div>
                </div>
            `;
        } else {
            return `<div class="dh-defense-item"><div class="dh-defense-sublabel">${label}</div><button class="dh-add-missing-btn" data-missing-def="${key}">+</button></div>`;
        }
    };

    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let expCardsHTML = '';
    let expCount = 0;
    let heritageCardsHTML = '';
    let heritageCount = 0;
    let classCardsHTML = '';
    let classCount = 0;
    let weaponCardsHTML = '';
    let weaponCount = 0;
    let domainCardsHTML = '';
    let domainCount = 0;
    let levelCardsHTML = '';
    let levelCount = 0;
    let generalAbilitiesHTML = '<div class="dh-section-title"><span>Outros Macros</span></div><ul class="dh-abilities-list" id="dh-other-macros-container">';
    let validAbilitiesCount = 0;
    
    let inventoryText = '';
    let inventoryTextareaElem = null;

    if (abilityElements.length > 0) {
        abilityElements.forEach((abil, abilIdx) => {
            const nameElem = abil.querySelector('.abilname');
            const rawName = nameElem?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
            const lowerName = rawName.toLowerCase();

            if (rawName.startsWith('=====')) {
                return;
            }

            if (lowerName.startsWith('exp_')) {
                expCount++;
                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                const expName = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                const expMod = fields['modificador'] || fields['mod'] || '+0';

                expCardsHTML += `
                    <div class="dh-exp-card" data-card-fullname="${rawName}">
                        <span class="dh-exp-name">${expName}</span>
                        <span class="dh-exp-mod">${expMod}</span>
                    </div>
                `;
            } else if (lowerName.startsWith('anc_') || lowerName.startsWith('com_')) {
                heritageCount++;
                let typeTag = lowerName.startsWith('anc_') ? 'ANCESTRALIDADE' : 'COMUNIDADE';

                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                let cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                let effectsHTML = '';

                Object.keys(fields).forEach(key => {
                    if (key !== 'name') {
                        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                        effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                    }
                });

                heritageCardsHTML += `
                    <div class="dh-heritage-card" data-card-fullname="${rawName}">
                        <div class="dh-card-header">
                            <div class="dh-heritage-tag">${typeTag}</div>
                            <button class="dh-card-edit-btn" data-abil-idx="${abilIdx}" data-card-fullname="${rawName}" data-card-type="${typeTag}" title="Editar ${typeTag}">✏️</button>
                        </div>
                        <div class="dh-heritage-title">${cardTitle}</div>
                        ${effectsHTML || '<div class="dh-heritage-effect">Sem efeitos informados.</div>'}
                    </div>
                `;
            } else if (lowerName.startsWith('cla_') || lowerName.startsWith('sub_') || lowerName.startsWith('esp_')) {
                classCount++;
                let typeTag = 'CLASSE';
                if (lowerName.startsWith('sub_')) typeTag = 'SUBCLASSE';
                if (lowerName.startsWith('esp_')) typeTag = 'ESPERANÇA';

                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                let cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
                let effectsHTML = '';

                Object.keys(fields).forEach(key => {
                    if (key !== 'name') {
                        if (key === '__raw_desc__') {
                            effectsHTML += `<div class="dh-heritage-effect">${formatTextWithNewlines(fields[key])}</div>`;
                        } else {
                            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                            effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                        }
                    }
                });

                classCardsHTML += `
                    <div class="dh-heritage-card" data-card-fullname="${rawName}">
                        <div class="dh-card-header">
                            <div class="dh-heritage-tag">${typeTag}</div>
                            <button class="dh-card-edit-btn" data-abil-idx="${abilIdx}" data-card-fullname="${rawName}" data-card-type="${typeTag}" title="Editar ${typeTag}">✏️</button>
                        </div>
                        <div class="dh-heritage-title">${cardTitle}</div>
                        ${effectsHTML || '<div class="dh-heritage-effect">Sem efeitos informados.</div>'}
                    </div>
                `;
            } else if (lowerName.startsWith('lvl_')) {
                levelCount++;
                const fallbackName = rawName.substring(4).trim();
                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                const levelTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : fallbackName;
                let blocksHTML = '';

                Object.keys(fields).forEach(key => {
                    if (key !== 'name') {
                        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                        const renderedText = renderCheckboxesInText(fields[key], abilIdx);
                        blocksHTML += `
                            <div class="dh-level-block">
                                <span class="dh-level-block-name">${formattedKey}:</span>
                                <div class="dh-level-block-text">${renderedText}</div>
                            </div>
                        `;
                    }
                });

                levelCardsHTML += `
                    <div class="dh-level-card" data-abil-idx="${abilIdx}">
                        <div class="dh-level-title">${levelTitle}</div>
                        ${blocksHTML || '<div class="dh-level-block">Sem dados.</div>'}
                    </div>
                `;
            } else if (lowerName === 'inventario' || lowerName === 'inventário' || lowerName === 'inv_inventario') {
                inventoryTextareaElem = abil.querySelector('textarea, input[name*="action"]');
                inventoryText = inventoryTextareaElem ? inventoryTextareaElem.value : '';
            } else if (lowerName.startsWith('wea_')) {
                weaponCount++;
                const fallbackName = rawName.substring(4).trim();
                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const traitMatch = macroContent.match(/#Atributo-([^\s{]+)/i);
                const weaponTrait = traitMatch ? traitMatch[1].trim() : 'ATAQUE';

                const fields = extractMacroFields(macroContent);
                const weaponTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : fallbackName;
                const weaponDamageRaw = fields['dano'] || fields['damage'] || '';
                const weaponDesc = fields['desc'] || fields['descrição'] || fields['descricao'] || '';

                const formattedDamage = formatDamageFormula(weaponDamageRaw, profVal || '-');

                weaponCardsHTML += `
                    <div class="dh-weapon-card" data-card-fullname="${rawName}">
                        <div class="dh-weapon-header">
                            <span class="dh-weapon-trait-tag">${weaponTrait}</span>
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <span class="dh-weapon-damage-tag">${formattedDamage}</span>
                                <button class="dh-weapon-edit-btn" data-abil-idx="${abilIdx}" data-card-fullname="${rawName}" title="Editar Arma">✏️</button>
                            </div>
                        </div>
                        <div class="dh-weapon-title">${weaponTitle}</div>
                        ${weaponDesc ? `<div class="dh-weapon-desc">${formatTextWithNewlines(weaponDesc)}</div>` : ''}
                    </div>
                `;
            } else if (lowerName.startsWith('dom_')) {
                domainCount++;
                const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                const fallbackName = rawName.substring(4).trim();
                const cardName = fields['name'] ? formatTextWithNewlines(fields['name']) : fallbackName;
                const cardNivel = fields['nível'] || fields['nivel'] ? formatTextWithNewlines(fields['nível'] || fields['nivel']) : '-';
                const cardCusto = fields['custo'] ? formatTextWithNewlines(fields['custo']) : '-';
                const cardDesc = fields['descrição'] || fields['descricao'] || fields['desc'] ? formatTextWithNewlines(fields['descrição'] || fields['descricao'] || fields['desc']) : 'Sem descrição.';

                domainCardsHTML += `
                    <div class="dh-domain-card" data-card-fullname="${rawName}">
                        <div class="dh-domain-header">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span>Nível: ${cardNivel}</span>
                                <span>Custo: ${cardCusto}</span>
                            </div>
                            <button class="dh-card-edit-btn" data-abil-idx="${abilIdx}" data-card-fullname="${rawName}" title="Editar Carta de Domínio">✏️</button>
                        </div>
                        <div class="dh-domain-name">${cardName}</div>
                        <div class="dh-domain-desc">${cardDesc}</div>
                    </div>
                `;
            } else if (lowerName.startsWith('vau_')) {
                // Cartas na reserva só aparecem no modal da Reserva
            } else if (!fixedTraits.includes(lowerName) && rawName !== '') {
                validAbilitiesCount++;
                generalAbilitiesHTML += `<li class="dh-ability-item" data-card-fullname="${rawName}"><span>${rawName}</span></li>`;
            }
        });
    }

    let defensesHTML = `
        <div class="dh-top-row-grid">
            <div class="dh-defenses-box">
                <div class="dh-defenses-header">Defesas e Limiares</div>
                <div class="dh-defenses-content">
                    <div class="dh-defense-row-full">
                        ${getDefHTML('Evasão', 'evasao')}
                    </div>
                    <div class="dh-defense-row-split">
                        ${getDefHTML('L. Menor', 'menor')}
                        ${getDefHTML('L. Maior', 'maior')}
                    </div>
                </div>
            </div>
            <div class="dh-experiences-box">
                <div class="dh-experiences-header">
                    <span>Experiências</span>
                    <button class="dh-add-btn" id="dh-add-exp" title="Adicionar Experiência">+</button>
                </div>
                <div class="dh-experiences-grid" id="dh-experiences-container">
                    ${expCount > 0 ? expCardsHTML : '<span style="color: #718096; font-size: 0.8em;">Nenhuma experiência cadastrada.</span>'}
                </div>
            </div>
        </div>
    `;

    let finalHeritageHTML = `
        <div class="dh-section-title">
            <span>Herança (Ancestralidade & Comunidade)</span>
            <div style="display: flex; gap: 5px;">
                <button class="dh-add-btn dh-add-btn--labeled" id="dh-add-anc" title="Adicionar Ancestralidade"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">Anc</span></button>
                <button class="dh-add-btn dh-add-btn--labeled" id="dh-add-com" title="Adicionar Comunidade"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">Com</span></button>
            </div>
        </div>
        <div class="dh-heritage-grid" id="dh-heritage-container">
            ${heritageCount > 0 ? heritageCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma herança cadastrada.</span>'}
        </div>
    `;

    let finalClassHTML = `
        <div class="dh-section-title">
            <span>Classe (Classe, Sub-classe e Esperança)</span>
            <div style="display: flex; gap: 5px;">
                <button class="dh-add-btn dh-add-btn--labeled" id="dh-add-cla" title="Adicionar Classe"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">Cla</span></button>
                <button class="dh-add-btn dh-add-btn--labeled" id="dh-add-sub" title="Adicionar Sub-classe"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">Sub</span></button>
                <button class="dh-add-btn dh-add-btn--labeled" id="dh-add-esp" title="Adicionar Habilidade de Esperança"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">Esp</span></button>
            </div>
        </div>
        <div class="dh-heritage-grid" id="dh-class-container">
            ${classCount > 0 ? classCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhum item cadastrado nesta seção.</span>'}
        </div>
    `;

    let finalWeaponsHTML = `
        <div class="dh-section-title">
            <span>Armas</span>
            <button class="dh-add-btn" id="dh-add-weapon" title="Adicionar Arma">+</button>
        </div>
        <div class="dh-weapons-grid" id="dh-weapons-container">
            ${weaponCount > 0 ? weaponCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma arma cadastrada.</span>'}
        </div>
    `;

    let finalDomainsHTML = `
        <div class="dh-section-title">
            <span>Cartas de Domínio</span>
            <div class="dh-section-actions">
                <button class="dh-add-btn dh-vault-btn" id="dh-open-vault" title="Abrir Reserva">🗃️</button>
                <button class="dh-add-btn" id="dh-add-domain" title="Adicionar Carta de Domínio">+</button>
            </div>
        </div>
        <div class="dh-domains-grid" id="dh-domains-container">
            ${domainCount > 0 ? domainCardsHTML : '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma carta de domínio cadastrada.</span>'}
        </div>
    `;

    const getMoneyHtml = (key, label) => {
        const m = moneyMap[key];
        if (m.exists) {
            return `
                <div class="dh-money-item">
                    <span class="dh-money-label">${label}</span>
                    <div class="dh-spinner-group">
                        <input type="text" class="dh-spinner-input" id="dh-money-${key}" value="${m.val}" readonly>
                        <div class="dh-spinner-btns">
                            <button class="dh-spin-btn" id="dh-${key}-up">▲</button>
                            <button class="dh-spin-btn" id="dh-${key}-down">▼</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="dh-money-item">
                    <span class="dh-money-label">${label}</span>
                    <button class="dh-add-missing-btn" data-missing-money="${key}">+ Adicionar</button>
                </div>
            `;
        }
    };

    const inventoryHTML = `
        <div class="dh-section-title">
            <span>Inventário e Moedas</span>
            ${!inventoryTextareaElem ? '<button class="dh-add-btn" id="dh-add-inv" title="Criar Campo de Inventário no Roll20">+</button>' : ''}
        </div>
        <div class="dh-inventory-grid">
            <div class="dh-inventory-textbox">
                <span class="dh-inventory-label">Inventário</span>
                <textarea class="dh-inventory-textarea" id="dh-inv-text" ${!inventoryTextareaElem ? 'disabled' : ''} placeholder="${inventoryTextareaElem ? 'Digite os itens do inventário aqui...' : 'Clique no botão + acima para criar o campo de inventário primeiro.'}">${inventoryText}</textarea>
            </div>
            <div class="dh-money-box" id="dh-money-container">
                <span class="dh-inventory-label" style="text-align: center;">Dinheiro</span>
                ${getMoneyHtml('punhado', 'Punhado')}
                ${getMoneyHtml('bolsa', 'Bolsa')}
                ${getMoneyHtml('bau', 'Baú')}
            </div>
        </div>
    `;

    let finalLevelHTML = '';
    if (levelCount > 0) {
        finalLevelHTML = `<div class="dh-section-title"><span>Passando de Nível</span></div><div class="dh-level-grid" id="dh-level-container">${levelCardsHTML}</div>`;
    }

    if (validAbilitiesCount === 0) {
        generalAbilitiesHTML += '<li style="color: #718096; padding: 5px;">Nenhum outro macro cadastrado.</li>';
    }
    generalAbilitiesHTML += '</ul>';

    root.innerHTML = traitsHTML + statsHTML + defensesHTML + customStatsHTML + finalHeritageHTML + finalClassHTML + finalWeaponsHTML + finalDomainsHTML + inventoryHTML + generalAbilitiesHTML + finalLevelHTML;

    applySimpleCardView(doc, root, ['#dh-heritage-container', '#dh-class-container', '#dh-weapons-container', '#dh-domains-container']);

    const invTextarea = root.querySelector('#dh-inv-text');
    if (invTextarea && inventoryTextareaElem) {
        invTextarea.addEventListener('input', () => {
            updateOriginalInput(inventoryTextareaElem, invTextarea.value);
        });
    }

    const addInvBtn = root.querySelector('#dh-add-inv');
    if (addInvBtn) {
        addInvBtn.addEventListener('click', () => {
            addNewMacroToRoll20(doc, 'inv', null, 'inventario');
        });
    }

    root.querySelectorAll('[data-missing-attr]').forEach(el => {
        el.querySelector('button').addEventListener('click', () => {
            const attrName = el.getAttribute('data-missing-attr');
            const properName = attrName.charAt(0).toUpperCase() + attrName.slice(1);
            addNewAttributeToRoll20(doc, properName, `Valor inicial para ${properName}:`, "0", false, true);
        });
    });

    root.querySelectorAll('[data-missing-tracker]').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackerName = btn.getAttribute('data-missing-tracker');
            const properName = trackerName.charAt(0).toUpperCase() + trackerName.slice(1);
            const defaultTrackerVal = trackerName.toLowerCase() === 'esperança' ? "2" : "6";
            addNewAttributeToRoll20(doc, properName, `Valor total/máximo de ${properName}:`, defaultTrackerVal, true);
        });
    });

    root.querySelectorAll('[data-missing-def]').forEach(btn => {
        btn.addEventListener('click', () => {
            const defKey = btn.getAttribute('data-missing-def');
            let attrName = "Evasão";
            let defaultVal = "10";
            if (defKey === 'menor') { attrName = "Limiar-Menor"; defaultVal = "5"; }
            if (defKey === 'maior') { attrName = "Limiar-Maior"; defaultVal = "10"; }
            addNewAttributeToRoll20(doc, attrName, `Valor inicial para ${attrName}:`, defaultVal, false);
        });
    });

    root.querySelectorAll('[data-missing-money]').forEach(btn => {
        btn.addEventListener('click', () => {
            const moneyKey = btn.getAttribute('data-missing-money');
            const properName = moneyKey.charAt(0).toUpperCase() + moneyKey.slice(1);
            addNewAttributeToRoll20(doc, `moeda_${moneyKey}`, `Quantidade inicial de moedas em ${properName}:`, "0", false);
        });
    });

    const addExpBtn = root.querySelector('#dh-add-exp');
    if (addExpBtn) addExpBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'exp', 'Nome da nova Experiência:'));

    const addAncBtn = root.querySelector('#dh-add-anc');
    if (addAncBtn) addAncBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'anc', 'Nome da nova Ancestralidade:'));

    const addComBtn = root.querySelector('#dh-add-com');
    if (addComBtn) addComBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'com', 'Nome da nova Comunidade:'));

    const addClaBtn = root.querySelector('#dh-add-cla');
    if (addClaBtn) addClaBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'cla', 'Nome da Classe:'));

    const addSubBtn = root.querySelector('#dh-add-sub');
    if (addSubBtn) addSubBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'sub', 'Nome da nova Subclasse:'));

    const addEspBtn = root.querySelector('#dh-add-esp');
    if (addEspBtn) addEspBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'esp', 'Nome da nova Habilidade de Esperança:'));

    const addWeaponBtn = root.querySelector('#dh-add-weapon');
    if (addWeaponBtn) addWeaponBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'wea', 'Nome da nova Arma:'));

    const addDomainBtn = root.querySelector('#dh-add-domain');
    if (addDomainBtn) addDomainBtn.addEventListener('click', () => addNewMacroToRoll20(doc, 'dom', 'Nome da nova Carta de Domínio:'));
    const openVaultBtn = root.querySelector('#dh-open-vault');
    if (openVaultBtn) openVaultBtn.addEventListener('click', () => openVaultModal(doc));

    if (moneyMap.punhado.exists) setupMoneyControl(root, 'punhado', moneyMap.punhado);
    if (moneyMap.bolsa.exists) setupMoneyControl(root, 'bolsa', moneyMap.bolsa);
    if (moneyMap.bau.exists) setupMoneyControl(root, 'bau', moneyMap.bau);

    if (defenses.evasao && defenses.evasao.exists) {
        setupDefenseControl(doc, root, 'evasao', defenses.evasao, ['evasão', 'evasao']);
    }
    if (defenses.menor && defenses.menor.exists) {
        setupDefenseControl(doc, root, 'menor', defenses.menor, ['limiar-menor', 'limiar menor']);
    }
    if (defenses.maior && defenses.maior.exists) {
        setupDefenseControl(doc, root, 'maior', defenses.maior, ['limiar-maior', 'limiar maior']);
    }

    const traitsContainer = root.querySelector('#dh-traits-container');
    if (traitsContainer) {
        traitsContainer.querySelectorAll('.dh-trait-card[data-trait]').forEach(card => {
            card.addEventListener('click', () => {
                const traitKey = card.getAttribute('data-trait');
                triggerRollForAbilityName(doc, traitKey);
            });
        });
    }

    const experiencesContainer = root.querySelector('#dh-experiences-container');
    if (experiencesContainer) {
        experiencesContainer.querySelectorAll('.dh-exp-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });
        });
    }

    const heritageContainer = root.querySelector('#dh-heritage-container');
    if (heritageContainer) {
        heritageContainer.querySelectorAll('.dh-heritage-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });
        });

        heritageContainer.querySelectorAll('.dh-card-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardEditClick(doc, btn, abilityElements);
            });
        });
    }

    const classContainer = root.querySelector('#dh-class-container');
    if (classContainer) {
        classContainer.querySelectorAll('.dh-heritage-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });
        });

        classContainer.querySelectorAll('.dh-card-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardEditClick(doc, btn, abilityElements);
            });
        });
    }

    const weaponsContainer = root.querySelector('#dh-weapons-container');
    if (weaponsContainer) {
        weaponsContainer.querySelectorAll('.dh-weapon-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });
        });

        weaponsContainer.querySelectorAll('.dh-weapon-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const abilIdx = parseInt(btn.getAttribute('data-abil-idx'), 10);
                const rawName = btn.getAttribute('data-card-fullname');
                const targetAbil = abilityElements[abilIdx];
                const macroTextarea = targetAbil?.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const traitMatch = macroContent.match(/#Atributo-([^\s{]+)/i);
                const weaponTrait = traitMatch ? traitMatch[1].trim() : 'Agilidade';

                const fields = extractMacroFields(macroContent);
                const weaponTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : (rawName.startsWith('wea_') ? rawName.substring(4).trim() : rawName);
                const weaponDamageRaw = fields['dano'] || fields['damage'] || '';
                const weaponDesc = fields['desc'] || fields['descrição'] || fields['descricao'] || '';

                openEditWeaponModal(doc, abilIdx, rawName, {
                    title: weaponTitle,
                    trait: weaponTrait,
                    damageRaw: weaponDamageRaw,
                    desc: weaponDesc
                });
            });
        });
    }

    const domainsContainer = root.querySelector('#dh-domains-container');
    if (domainsContainer) {
        domainsContainer.querySelectorAll('.dh-domain-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.getAttribute('data-card-fullname');
                triggerRollForAbilityName(doc, fullName);
            });
        });

        domainsContainer.querySelectorAll('.dh-card-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const abilIdx = parseInt(btn.getAttribute('data-abil-idx'), 10);
                const rawName = btn.getAttribute('data-card-fullname');
                const targetAbil = abilityElements[abilIdx];
                const macroTextarea = targetAbil?.querySelector('textarea, input[name*="action"]');
                const macroContent = macroTextarea ? macroTextarea.value : '';

                const fields = extractMacroFields(macroContent);
                const cardName = fields['name'] ? formatTextWithNewlines(fields['name']) : (rawName.startsWith('dom_') ? rawName.substring(4).trim() : rawName);
                const cardNivel = fields['nível'] || fields['nivel'] ? formatTextWithNewlines(fields['nível'] || fields['nivel']) : '1';
                const cardCusto = fields['custo'] ? formatTextWithNewlines(fields['custo']) : '0';
                const cardDesc = fields['descrição'] || fields['descricao'] || fields['desc'] ? formatTextWithNewlines(fields['descrição'] || fields['descricao'] || fields['desc']) : '';

                openEditDomainModal(doc, abilIdx, rawName, {
                    name: cardName,
                    nivel: cardNivel,
                    custo: cardCusto,
                    desc: cardDesc
                });
            });
        });
    }

    const otherMacrosContainer = root.querySelector('#dh-other-macros-container');
    if (otherMacrosContainer) {
        otherMacrosContainer.querySelectorAll('.dh-ability-item').forEach(item => {
            item.addEventListener('click', () => {
                const fullName = item.getAttribute('data-card-fullname');
                if (fullName) {
                    triggerRollForAbilityName(doc, fullName);
                }
            });
        });
    }

    const levelContainer = root.querySelector('#dh-level-container');
    if (levelContainer) {
        levelContainer.querySelectorAll('.dh-level-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const abilIdx = cb.getAttribute('data-abil-idx');
                const targetAbil = abilityElements[abilIdx];
                if (!targetAbil) return;

                const macroTextarea = targetAbil.querySelector('textarea, input[name*="action"]');
                if (!macroTextarea) return;

                let currentVal = macroTextarea.value;
                let targetCbIndex = parseInt(cb.getAttribute('data-cb-idx'), 10);
                let count = 0;

                let newVal = currentVal.replace(/\(\s*[xX]?\s*\)/g, (match) => {
                    if (count === targetCbIndex) {
                        count++;
                        return e.target.checked ? '(X)' : '( )';
                    }
                    count++;
                    return match;
                });

                updateOriginalInput(macroTextarea, newVal);
            });
        });
    }

    // Listeners dos recursos personalizados integrados no grid de Recursos e Status
    root.querySelectorAll('.dh-custom-stat-box').forEach(box => {
        const index = box.getAttribute('data-index');
        const statObj = unmappedStats[index];
        const inputElem = box.querySelector('.dh-spinner-input');

        box.querySelector('.dh-btn-up').addEventListener('click', () => {
            let val = parseInt(inputElem.value, 10);
            if (isNaN(val)) val = 0;
            val++;
            inputElem.value = val;
            updateOriginalInput(statObj.originalInput, val);
        });

        box.querySelector('.dh-btn-down').addEventListener('click', () => {
            let val = parseInt(inputElem.value, 10);
            if (isNaN(val)) val = 0;
            val--;
            inputElem.value = val;
            updateOriginalInput(statObj.originalInput, val);
        });
    });

    // Botão + para adicionar novo recurso personalizado
    const addCustomTrackerBtn = root.querySelector('#dh-add-custom-tracker');
    if (addCustomTrackerBtn) {
        addCustomTrackerBtn.addEventListener('click', () => {
            addNewAttributeToRoll20(doc, null, 'Nome do novo Recurso Personalizado:', '0', false);
        });
    }
}

