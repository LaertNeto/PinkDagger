// Ficha de Companheiro Animal (pinkdagger_companion): apenas Proficiência, Evasão, Fadiga,
// um ataque (macro wea_, como as armas do jogador), Experiências e Habilidades
function renderCompanionSheet(doc, root, stats) {
    const { profVal, evasao, fadiga, atq } = stats;

    // Cabeçalho igual ao do PC, mas só com a Proficiência
    const headerMeta = doc.querySelector('.dh-header-meta');
    if (headerMeta) headerMeta.style.display = 'flex';
    const nivelElem = doc.getElementById('dh-char-nivel');
    if (nivelElem) nivelElem.parentElement.style.display = 'none';
    const profElem = doc.getElementById('dh-char-prof');
    if (profElem) {
        if (profVal !== null) {
            profElem.innerText = profVal;
        } else {
            profElem.innerHTML = `<button class="dh-add-missing-btn" data-missing-companion="prof">+</button>`;
        }
    }

    const getSpinnerHTML = (label, key, exists, val) => {
        if (!exists) {
            return `<div class="dh-defense-item"><div class="dh-defense-sublabel">${label}</div><button class="dh-add-missing-btn" data-missing-companion="${key}">+</button></div>`;
        }
        return `
            <div class="dh-defense-item">
                <div class="dh-defense-sublabel">${label}</div>
                <div class="dh-defense-value-group">
                    <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-down" title="Diminuir ${label}">−</button>
                    <span class="dh-defense-val" id="dh-defense-val-${key}">${val}</span>
                    <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-up" title="Aumentar ${label}">+</button>
                </div>
            </div>
        `;
    };

    let fadigaHTML = '';
    if (fadiga && fadiga.exists) {
        const totalDots = Math.max(fadiga.max, fadiga.current, 1);
        let dotsHTML = '';
        for (let i = 1; i <= totalDots; i++) {
            dotsHTML += `<div class="dh-dot fadiga ${i <= fadiga.current ? 'active' : 'inactive'}"></div>`;
        }
        fadigaHTML = `
            <div class="dh-stat-box">
                <div class="dh-stat-header">
                    <span class="dh-stat-label">Fadiga</span>
                    <span class="dh-stat-value">${fadiga.current} / ${fadiga.max}</span>
                </div>
                <div class="dh-dots-container">${dotsHTML}</div>
            </div>
        `;
    } else {
        fadigaHTML = `
            <div class="dh-stat-box">
                <div class="dh-stat-header">
                    <span class="dh-stat-label">Fadiga</span>
                    <button class="dh-add-missing-btn" data-missing-companion="fadiga">+ Adicionar</button>
                </div>
            </div>
        `;
    }


    // --- Macros: ataque (primeiro wea_), experiências e habilidades ---
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let attackCardHTML = '';
    let attackMacroName = null;
    let attackEditData = null;
    let expCardsHTML = '';
    let abilityCardsHTML = '';

    abilityElements.forEach((abil, abilIdx) => {
        const rawName = abil.querySelector('.abilname')?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
        const lowerName = rawName.toLowerCase();
        const macroTextarea = abil.querySelector('textarea, input[name*="action"]');
        const macroContent = macroTextarea ? macroTextarea.value : '';

        if (lowerName.startsWith('wea_') && !attackMacroName) {
            attackMacroName = rawName;
            const fields = extractMacroFields(macroContent);
            const title = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
            const damageRaw = fields['dano'] || fields['damage'] || '';
            const desc = fields['desc'] || fields['descrição'] || fields['descricao'] || '';

            let atqTagHTML = '';
            if (atq.exists) {
                const valStr = String(atq.val).trim();
                const prefix = valStr.startsWith('+') || valStr.startsWith('-') ? '' : '+';
                atqTagHTML = `<span class="dh-weapon-trait-tag">ATQ ${prefix}${valStr}</span>`;
            } else {
                atqTagHTML = `<button class="dh-add-missing-btn" data-missing-companion="atq" title="Adicionar Atributo Atq">+ Atq</button>`;
            }

            attackEditData = {
                title,
                atq: atq.exists ? atq.val : '',
                atqAttrName: atq.attrName || 'Atq',
                damageRaw: formatTextWithNewlines(damageRaw),
                desc: formatTextWithNewlines(desc)
            };

            attackCardHTML = `
                <div class="dh-weapon-card dh-companion-attack-card" data-card-fullname="${rawName}">
                    <div class="dh-weapon-header">
                        ${atqTagHTML}
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <span class="dh-weapon-damage-tag">${formatDamageFormula(damageRaw, profVal || '-')}</span>
                            <button class="dh-weapon-edit-btn" id="dh-companion-attack-edit" title="Editar Ataque">✏️</button>
                        </div>
                    </div>
                    <div class="dh-weapon-title">🐾 ${title}</div>
                    ${desc ? `<div class="dh-weapon-desc">${formatTextWithNewlines(desc)}</div>` : ''}
                </div>
            `;
        } else if (lowerName.startsWith('exp_')) {
            const fields = extractMacroFields(macroContent);
            const expName = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
            const expMod = fields['modificador'] || fields['mod'] || '+0';
            expCardsHTML += `
                <div class="dh-exp-card" data-card-fullname="${rawName}">
                    <span class="dh-exp-name">${expName}</span>
                    <span class="dh-exp-mod">${expMod}</span>
                </div>
            `;
        } else if (lowerName.startsWith('hab_')) {
            const fields = extractMacroFields(macroContent);
            const cardTitle = fields['name'] ? formatTextWithNewlines(fields['name']) : rawName.substring(4).trim();
            let effectsHTML = '';
            Object.keys(fields).forEach(key => {
                if (key === 'name') return;
                if (key === '__raw_desc__' || key === 'desc' || key === 'descrição' || key === 'descricao' || key === 'efeito') {
                    effectsHTML += `<div class="dh-heritage-effect">${formatTextWithNewlines(fields[key])}</div>`;
                } else {
                    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    effectsHTML += `<div class="dh-heritage-effect"><span class="dh-heritage-effect-name">${formattedKey}:</span>${formatTextWithNewlines(fields[key])}</div>`;
                }
            });
            abilityCardsHTML += `
                <div class="dh-heritage-card" data-card-fullname="${rawName}">
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

    if (!attackCardHTML) {
        attackCardHTML = `
            <div class="dh-weapon-card dh-npc-missing-weapon" style="border-style: dashed; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #a0aec0; font-size: 0.85em;">Ataque não cadastrado</span>
                <button class="dh-add-missing-btn" id="dh-companion-add-attack">+ Criar Ataque</button>
            </div>
        `;
    }

    const attackHTML = `
        <div class="dh-section-title"><span>Ataque</span></div>
        <div class="dh-npc-weapon-row">${attackCardHTML}</div>
    `;

    // Principais Atributos: Evasão e Fadiga à esquerda, Experiências à direita (mesmo layout do PC)
    const statsHTML = `
        <div class="dh-section-title"><span>Principais Atributos</span></div>
        <div class="dh-top-row-grid">
            <div class="dh-companion-stats-col">
                ${getSpinnerHTML('Evasão', 'evasao', evasao && evasao.exists, evasao?.val)}
                ${fadigaHTML}
            </div>
            <div class="dh-experiences-box">
                <div class="dh-experiences-header">
                    <span>Experiências</span>
                    <button class="dh-add-btn" id="dh-companion-add-exp" title="Adicionar Experiência">+</button>
                </div>
                <div class="dh-experiences-grid" id="dh-companion-experiences-container">
                    ${expCardsHTML || '<span style="color: #718096; font-size: 0.8em;">Nenhuma experiência cadastrada.</span>'}
                </div>
            </div>
        </div>
    `;

    const abilitiesHTML = `
        <div class="dh-section-title">
            <span>Habilidades</span>
            <button class="dh-add-btn" id="dh-companion-add-hab" title="Adicionar Habilidade">+</button>
        </div>
        <div class="dh-heritage-grid" id="dh-companion-abilities-container">
            ${abilityCardsHTML || '<span style="color: #718096; font-size: 0.8em; grid-column: 1/-1;">Nenhuma habilidade cadastrada.</span>'}
        </div>
    `;

    root.innerHTML = statsHTML + attackHTML + abilitiesHTML;
    applySimpleCardView(doc, root, ['#dh-companion-abilities-container']);

    // --- Listeners ---
    if (evasao && evasao.exists) {
        setupDefenseControl(doc, root, 'evasao', evasao, ['evasão', 'evasao']);
    }

    const missingDefaults = {
        prof: ['Proficiência', 'Proficiência do companheiro:', '1', false],
        evasao: ['Evasão', 'Evasão do companheiro:', '10', false],
        fadiga: ['Fadiga', 'Fadiga máxima do companheiro:', '2', true],
        atq: ['Atq', 'Bônus de ataque do companheiro:', '0', false]
    };
    // O botão da Proficiência fica no cabeçalho, fora do root
    doc.querySelectorAll('[data-missing-companion]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const [attrName, promptMessage, defaultVal, hasMax] = missingDefaults[btn.getAttribute('data-missing-companion')];
            addNewAttributeToRoll20(doc, attrName, promptMessage, defaultVal, hasMax);
        });
    });

    const attackCard = root.querySelector('.dh-companion-attack-card');
    if (attackCard) {
        attackCard.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            triggerRollForAbilityName(doc, attackMacroName);
        });
        attackCard.querySelector('#dh-companion-attack-edit')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditCompanionAttackModal(doc, attackMacroName, attackEditData);
        });
    }

    root.querySelector('#dh-companion-add-attack')?.addEventListener('click', (e) => {
        e.stopPropagation();
        addNewMacroToRoll20(doc, 'wea', 'Nome do ataque do companheiro (ex: Mordida):', null, 'companion_attack');
    });

    root.querySelectorAll('#dh-companion-experiences-container .dh-exp-card, #dh-companion-abilities-container .dh-heritage-card').forEach(card => {
        card.addEventListener('click', () => {
            triggerRollForAbilityName(doc, card.getAttribute('data-card-fullname'));
        });
    });

    root.querySelectorAll('#dh-companion-abilities-container .dh-card-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCardEditClick(doc, btn, abilityElements);
        });
    });

    root.querySelector('#dh-companion-add-exp')?.addEventListener('click', () => addNewMacroToRoll20(doc, 'exp', 'Nome da nova Experiência:'));
    root.querySelector('#dh-companion-add-hab')?.addEventListener('click', () => addNewMacroToRoll20(doc, 'hab', 'Nome da nova Habilidade:'));
}
