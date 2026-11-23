// Importa um personagem da ficha oficial preenchível do Daggerheart (PDF em inglês) para uma ficha vazia:
// lê os campos do formulário (pdfForm.js), monta a lista de atributos e macros da ficha PinkDagger e cria tudo no Roll20.

const PDF_TRAITS = {
    agility: 'Agilidade',
    strength: 'Força',
    finesse: 'Acuidade',
    instinct: 'Instinto',
    presence: 'Presença',
    knowledge: 'Conhecimento'
};

// Alcances do livro em inglês -> os nomes usados no campo Alcance das armas (WEAPON_RANGES)
const PDF_RANGES = [
    [/^very\s+close$/i, 'Muito Próximo'],
    [/^very\s+far$/i, 'Muito Longe'],
    [/^melee$/i, 'Corpo a Corpo'],
    [/^close$/i, 'Próximo'],
    [/^far$/i, 'Longe']
];

const PDF_DAMAGE_TYPES = [
    [/^mag/i, 'mágico'],
    [/^phy/i, 'físico']
];

// Campos que só existem na ficha oficial: o PDF precisa ter todos para ser aceito
const PDF_REQUIRED_FIELDS = ['agility', 'evasion', 'hope_feature', 'experience_name.0', 'primary_weapon_name', 'domain_card_name.0.0'];

function isPdfChecked(value) {
    return value !== undefined && value !== null && value !== '' && value !== 'Off';
}

// "{" e "}" fecham os campos da macro antes da hora; "=" no nome do campo também quebra
function cleanPdfMacroText(text) {
    return String(text ?? '').replace(/[{}]/g, '').replace(/\r\n?/g, '\n').trim();
}

function cleanPdfMacroKey(text) {
    return cleanPdfMacroText(text).replace(/=/g, '').replace(/\s+/g, ' ');
}

function capitalizeWords(text) {
    return String(text ?? '').trim().toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (all, sep, letter) => sep + letter.toUpperCase());
}

// "Arcane Sense: You can sense..." -> { key: 'Arcane Sense', text: 'You can sense...' }.
// Só separa quando o trecho antes dos dois pontos parece um nome (curto e sem ponto final).
function splitPdfFeature(text) {
    const clean = cleanPdfMacroText(text);
    const colon = clean.indexOf(':');
    if (colon > 0 && colon <= 40 && !clean.slice(0, colon).includes('.')) {
        return { key: cleanPdfMacroKey(clean.slice(0, colon)), text: clean.slice(colon + 1).trim() };
    }
    return { key: '', text: clean };
}

function pdfFeatureField(feature) {
    return feature.key ? ` {{${feature.key}=${feature.text}\n}}` : ` {{${feature.text}\n}}`;
}

// "INSTINCT" -> "Instinto" (texto desconhecido fica como veio, só com maiúscula no começo)
function translatePdfTrait(text) {
    const clean = String(text ?? '').trim();
    return PDF_TRAITS[clean.toLowerCase()] || capitalizeWords(clean);
}

// "Instinct Far" -> { trait: 'Instinto', range: 'Longe' }
function parsePdfWeaponTrait(text) {
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
    const trait = PDF_TRAITS[(words[0] || '').toLowerCase()] || 'Agilidade';
    const rangeText = words.slice(1).join(' ');
    const range = (PDF_RANGES.find(([regex]) => regex.test(rangeText)) || [null, rangeText])[1];
    return { trait, range };
}

// "1d6+3 Magical" -> "[[@{proficiência}d6 + 3]] mágico" (os dados da arma são multiplicados pela Proficiência)
function parsePdfWeaponDamage(text) {
    const clean = String(text ?? '').trim();
    const dice = clean.match(/(\d*)d(\d+)\s*([+-]\s*\d+)?/i);
    const typeWord = clean.replace(/(\d*)d(\d+)\s*([+-]\s*\d+)?/i, '').trim();
    const type = (PDF_DAMAGE_TYPES.find(([regex]) => regex.test(typeWord)) || [null, typeWord])[1];
    if (!dice) return clean;
    const bonus = dice[3] ? ` ${dice[3].replace(/\s+/g, '').replace(/^([+-])/, '$1 ')}` : '';
    return `[[@{proficiência}d${dice[2]}${bonus}]]${type ? ` ${type}` : ''}`;
}

// Monta tudo o que a ficha vai receber a partir dos valores do formulário
function buildCharacterFromPdfFields(values) {
    const v = (key) => String(values[key] ?? '').trim();
    const filled = (key) => { const text = v(key); return text && text !== '-' ? text : ''; };
    const countChecked = (prefix) => Object.keys(values).filter(key => key.startsWith(`${prefix}.`) && isPdfChecked(values[key])).length;
    const number = (key, fallback) => { const n = parseInt(v(key), 10); return Number.isNaN(n) ? fallback : n; };

    const attributes = [];
    const macros = [];
    const addAttr = (name, current, max = null) => attributes.push({ name, current: String(current), max: max === null ? null : String(max) });

    // --- Atributos ---
    addAttr('pinkdagger_pc', 1);
    addAttr('Nível', number('level', 1));
    addAttr('Proficiência', Math.max(countChecked('proficiency'), 1));
    Object.entries(PDF_TRAITS).forEach(([key, name]) => addAttr(name, number(key, 0)));
    addAttr('Evasão', number('evasion', 10));

    // Vida na ficha PinkDagger é quanto sobra; Fadiga, Armadura e Esperança são o que está marcado
    const hpMax = number('hp_max', 6);
    addAttr('Vida', Math.max(hpMax - countChecked('hp'), 0), hpMax);
    addAttr('Fadiga', countChecked('stress'), number('stress_max', 6));
    addAttr('Armadura', countChecked('armor_slot'), number('armor', number('armor_score', 0)));
    addAttr('Esperança', countChecked('hope'), 6);

    addAttr('Limiar-Menor', number('majorDamage', 0));
    addAttr('Limiar-Maior', number('severeDamage', 0));

    addAttr('moeda_punhado', countChecked('gold_handful'));
    addAttr('moeda_bolsa', countChecked('gold_bag'));
    addAttr('moeda_bau', isPdfChecked(values['gold_chest']) ? 1 : 0);

    // --- Cartas de domínio (ordem das páginas: primeira coluna da página 2, depois a página 3) ---
    const domainCards = [];
    Object.keys(values).forEach(key => {
        const match = key.match(/^domain_card_name\.(\d+)\.(\d+)$/);
        if (match && filled(key)) domainCards.push({ row: parseInt(match[1], 10), col: parseInt(match[2], 10) });
    });
    domainCards.sort((a, b) => a.col - b.col || a.row - b.row);

    const domains = [];
    domainCards.forEach(({ row, col }) => {
        const id = `${row}.${col}`;
        const name = cleanPdfMacroKey(filled(`domain_card_name.${id}`));
        const domain = capitalizeWords(filled(`domain_card_domain.${id}`));
        const type = capitalizeWords(filled(`domain_card_type.${id}`));
        if (domain && !domains.includes(domain)) domains.push(domain);
        macros.push({
            name: `dom_${name}`,
            action: `&{template:default} {{name=${name}\n}} {{Nível=0\n}} {{Custo=${filled(`domain_card_recall.${id}`) || '0'}\n}}`
                + (domain ? ` {{Domínio=${domain}\n}}` : '')
                + (type ? ` {{Tipo=${type}\n}}` : '')
                + ` {{Descrição=${cleanPdfMacroText(filled(`domain_card_feature.${id}`))}\n}}`
        });
    });
    domains.slice(0, 2).forEach((domain, i) => addAttr(`Dominio${i + 1}`, domain));

    // --- Experiências ---
    for (let i = 0; i < 10; i++) {
        const name = cleanPdfMacroKey(filled(`experience_name.${i}`));
        if (!name) continue;
        const bonus = filled(`experience_bonus.${i}`) || '0';
        macros.push({
            name: `exp_${name}`,
            action: `&{template:default} {{name=${name}\n}} {{Modificador=${/^[+-]/.test(bonus) ? bonus : `+${bonus}`}\n}}`
        });
    }

    // --- Classe, Subclasse e Esperança ---
    const [classPart, subclassPart] = v('class').split(/\s+-\s+/);
    const className = cleanPdfMacroKey(classPart || filled('subclass_class_1') || 'Classe');

    // "SPELLCAST TRAIT: INSTINCT" vem nas habilidades de classe, mas é da subclasse
    let spellcastTrait = '';
    const classFeatures = [];
    for (let i = 0; i < 10; i++) {
        const text = filled(`classfeature.${i}`);
        if (!text) continue;
        const spellcast = text.match(/^spellcast\s+trait\s*:\s*(.+)$/i);
        if (spellcast) spellcastTrait = translatePdfTrait(spellcast[1]);
        else classFeatures.push(splitPdfFeature(text));
    }

    const subclasses = [];
    for (let i = 1; i <= 3; i++) {
        const name = cleanPdfMacroKey(filled(`subclass_name_${i}`));
        if (!name) continue;
        const trait = translatePdfTrait(filled(`subclass_trait_${i}`)) || (subclasses.length === 0 ? spellcastTrait : '');
        const stages = [['foundation', 'Fundação'], ['specialization', 'Especialização'], ['mastery', 'Maestria']]
            .filter(([key]) => isPdfChecked(values[`subclass_${key}_${i}`])).map(([, label]) => label);
        let action = `&{template:default} {{name=${name}\n}}`;
        if (trait) action += ` {{Conjuração=${trait}\n}}`;
        if (stages.length) action += ` {{Estágio=${stages.join(', ')}\n}}`;
        const feature = filled(`subclass_feature_${i}`);
        if (feature) action += pdfFeatureField(splitPdfFeature(feature));
        subclasses.push({ name: `sub_${name}`, action });
    }
    if (subclasses.length === 0 && subclassPart) {
        subclasses.push({ name: `sub_${cleanPdfMacroKey(subclassPart)}`, action: `&{template:default} {{name=${cleanPdfMacroKey(subclassPart)}\n}}${spellcastTrait ? ` {{Conjuração=${spellcastTrait}\n}}` : ''}` });
    }

    if (classFeatures.length || v('class')) {
        macros.push({ name: `cla_${className}`, action: `&{template:default} {{name=${className}\n}}${classFeatures.map(pdfFeatureField).join('')}` });
    }
    macros.push(...subclasses);

    const hopeFeature = filled('hope_feature');
    if (hopeFeature) {
        const feature = splitPdfFeature(hopeFeature);
        const title = feature.key || 'Habilidade de Esperança';
        macros.push({ name: `esp_${title}`, action: `&{template:default} {{name=${title}\n}} {{${feature.text}\n}}` });
    }

    // --- Ancestralidade e Comunidade ---
    const ancestry = cleanPdfMacroKey(filled('ancestry_name'));
    if (ancestry) {
        const features = ['ancestry_feature_1', 'ancestry_feature_2'].map(filled).filter(Boolean).map(splitPdfFeature);
        macros.push({ name: `anc_${ancestry}`, action: `&{template:default} {{name=${ancestry}\n}}${features.map(pdfFeatureField).join('')}` });
    }
    const community = cleanPdfMacroKey(filled('community_name'));
    if (community) {
        const feature = filled('community_feature');
        macros.push({ name: `com_${community}`, action: `&{template:default} {{name=${community}\n}}${feature ? pdfFeatureField(splitPdfFeature(feature)) : ''}` });
    }

    // --- Armas ativas ---
    ['primary', 'secondary'].forEach(slot => {
        const name = cleanPdfMacroKey(filled(`${slot}_weapon_name`));
        if (!name) return;
        const { trait, range } = parsePdfWeaponTrait(filled(`${slot}_weapon_trait`));
        const feature = cleanPdfMacroText(filled(`${slot}_weapon_feature`));
        macros.push({
            name: `wea_${name}`,
            action: `#Atributo-${trait} &{template:default} {{name=${name}\n}}`
                + (range ? ` {{alcance=${range}\n}}` : '')
                + ` {{dano=${parsePdfWeaponDamage(filled(`${slot}_weapon_damage`))}\n}}`
                + (feature ? ` {{desc=${feature}\n}}` : '')
        });
    });

    // --- Inventário: itens, armadura e armas guardadas ---
    const inventoryLines = ['Itens:'];
    cleanPdfMacroText(v('inventory')).split(/[,\n]+/).map(item => item.trim()).filter(Boolean).forEach(item => inventoryLines.push(item));
    const armorName = cleanPdfMacroText(filled('armor_name'));
    if (armorName) {
        const armorInfo = [filled('armor_thresholds') && `limiares base ${filled('armor_thresholds')}`, filled('armor_score') && `armadura base ${filled('armor_score')}`].filter(Boolean).join(', ');
        inventoryLines.push('', `Armadura: ${armorName}${armorInfo ? ` (${armorInfo})` : ''}`);
        if (filled('armor_feature')) inventoryLines.push(cleanPdfMacroText(filled('armor_feature')));
    }
    for (let i = 0; i < 2; i++) {
        const name = cleanPdfMacroText(filled(`inventory_weapon_name.${i}`));
        if (!name) continue;
        const info = [filled(`inventory_weapon_trait.${i}`), filled(`inventory_weapon_damage.${i}`)].filter(Boolean).join(', ');
        inventoryLines.push('', `Arma no inventário: ${name}${info ? ` (${info})` : ''}`);
        if (filled(`inventory_weapon_feature.${i}`)) inventoryLines.push(cleanPdfMacroText(filled(`inventory_weapon_feature.${i}`)));
    }
    macros.push({ name: 'inventario', action: inventoryLines.join('\n') });

    // --- Aba Textos: detalhes, perguntas de origem, conexões e notas ---
    const details = [
        ['Pronomes', 'pronouns'], ['Roupas', 'details_clothes'], ['Olhos', 'details_eyes'],
        ['Corpo', 'details_body'], ['Cor', 'details_color'], ['Atitude', 'details_attitude']
    ].filter(([, key]) => filled(key)).map(([label, key]) => `${label}: ${cleanPdfMacroText(filled(key))}`);
    if (details.length) macros.push({ name: 'txt_Detalhes', action: details.join('\n') });

    const questionAnswers = (prefixQ, prefixA) => [1, 2, 3]
        .filter(i => filled(`${prefixA}_${i}`))
        .map(i => `${cleanPdfMacroText(filled(`${prefixQ}_${i}`))}\n${cleanPdfMacroText(filled(`${prefixA}_${i}`))}`)
        .join('\n\n');
    const background = questionAnswers('background_q', 'background_a');
    if (background) macros.push({ name: 'txt_Perguntas de Origem', action: background });
    const connections = questionAnswers('connection_q', 'connection_a');
    if (connections) macros.push({ name: 'txt_Conexões', action: connections });
    if (filled('notes')) macros.push({ name: 'txt_Notas', action: cleanPdfMacroText(filled('notes')) });

    // Macros de rolagem dos atributos (as mesmas que a ficha cria no primeiro clique)
    Object.values(PDF_TRAITS).forEach(name => macros.push({ name: name.toLowerCase(), action: `#Atributo-${name}` }));

    // Nomes repetidos (ex.: a mesma carta duas vezes) gravariam sempre na primeira macro
    const seen = new Set();
    const uniqueMacros = macros.filter(macro => {
        const key = macro.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        name: filled('name'),
        className,
        subclassName: (subclassPart || filled('subclass_name_1') || '').trim(),
        level: number('level', 1),
        attributes,
        macros: uniqueMacros,
        counts: {
            experiences: uniqueMacros.filter(m => m.name.startsWith('exp_')).length,
            weapons: uniqueMacros.filter(m => m.name.startsWith('wea_')).length,
            domainCards: uniqueMacros.filter(m => m.name.startsWith('dom_')).length
        }
    };
}

// Lê o arquivo e confere se é a ficha oficial; lança um erro com mensagem para a pessoa se não for
async function readCharacterPdf(file) {
    const { values, names } = await readPdfFormFields(await file.arrayBuffer());
    if (names.size === 0) {
        throw new Error('Este PDF não tem campos de formulário. Use o PDF da ficha preenchível, não uma versão impressa ou escaneada.');
    }
    if (!PDF_REQUIRED_FIELDS.every(field => names.has(field))) {
        throw new Error('Este PDF não é a ficha oficial preenchível do Daggerheart.');
    }
    return buildCharacterFromPdfFields(values);
}

// A importação só roda em ficha vazia: nenhum atributo e nenhuma macro em Atributos e Habilidades
function isSheetEmptyForImport(doc) {
    const hasName = (elem, selector) => {
        const nameElem = elem.querySelector(selector);
        return !!(nameElem?.innerText?.trim() || nameElem?.querySelector('input')?.value?.trim());
    };
    const attrs = Array.from(doc.querySelectorAll('.attributesabilities .attributes .attrib')).filter(a => hasName(a, '.attrname'));
    const abils = Array.from(doc.querySelectorAll('.attributesabilities .abilities .abil')).filter(a => hasName(a, '.abilname'));
    return attrs.length === 0 && abils.length === 0;
}

function openImportPcPdfModal(doc) {
    doc.getElementById('dh-import-pc-modal')?.remove();

    const modalOverlay = doc.createElement('div');
    modalOverlay.id = 'dh-import-pc-modal';
    modalOverlay.className = 'dh-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="dh-modal-box dh-import-npc-modal-box">
            <h3 class="dh-modal-title">📄 Importar Personagem de PDF</h3>
            <div class="dh-import-pdf-help">
                Escolha o PDF da <strong>ficha oficial preenchível do Daggerheart</strong> (em inglês). A ficha é preenchida com
                atributos, Vida, Fadiga, Esperança, armadura, ouro, experiências, armas, classe, subclasse, herança,
                cartas de domínio, inventário e os textos da página de detalhes.
                <br><br>
                As cartas de domínio entram com <strong>Nível 0</strong> (troque pelo ✏️) e todas no loadout: mova para a Reserva as que estiverem guardadas.
            </div>
            <div class="dh-modal-field">
                <label>Arquivo PDF:</label>
                <input type="file" class="dh-modal-input" id="dh-import-pc-file" accept=".pdf,application/pdf">
            </div>
            <div class="dh-import-pdf-summary" id="dh-import-pc-summary"></div>
            <div class="dh-import-pdf-status" id="dh-import-pc-status"></div>
            <div class="dh-modal-actions">
                <button type="button" class="dh-modal-btn dh-modal-btn-cancel" id="dh-import-pc-cancel">Cancelar</button>
                <button type="button" class="dh-modal-btn dh-modal-btn-save" id="dh-import-pc-confirm" disabled>🪄 Importar e Preencher</button>
            </div>
        </div>
    `;
    doc.body.appendChild(modalOverlay);

    const fileInput = modalOverlay.querySelector('#dh-import-pc-file');
    const summaryElem = modalOverlay.querySelector('#dh-import-pc-summary');
    const statusElem = modalOverlay.querySelector('#dh-import-pc-status');
    const confirmBtn = modalOverlay.querySelector('#dh-import-pc-confirm');
    const cancelBtn = modalOverlay.querySelector('#dh-import-pc-cancel');
    let character = null;

    const setStatus = (text, isError = false) => {
        statusElem.textContent = text;
        statusElem.classList.toggle('dh-import-pdf-status--error', isError);
    };

    cancelBtn.addEventListener('click', () => modalOverlay.remove());

    fileInput.addEventListener('change', async () => {
        character = null;
        confirmBtn.disabled = true;
        summaryElem.innerHTML = '';
        const file = fileInput.files[0];
        if (!file) return;

        setStatus('Lendo o PDF...');
        try {
            character = await readCharacterPdf(file);
        } catch (err) {
            setStatus(err.message || 'Não foi possível ler o PDF.', true);
            return;
        }

        const title = [character.className, character.subclassName && `(${character.subclassName})`].filter(Boolean).join(' ');
        const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
        summaryElem.innerHTML = `
            <strong>${escapeHtml(character.name || 'Personagem sem nome')}</strong> — ${escapeHtml(title)}, nível ${character.level}<br>
            ${character.attributes.length} atributos e ${character.macros.length} macros:
            ${plural(character.counts.experiences, 'experiência', 'experiências')}, ${plural(character.counts.weapons, 'arma', 'armas')},
            ${plural(character.counts.domainCards, 'carta de domínio', 'cartas de domínio')}
        `;
        setStatus('');
        confirmBtn.disabled = false;
    });

    confirmBtn.addEventListener('click', async () => {
        if (!character) return;
        if (!isSheetEmptyForImport(doc)) {
            setStatus('A importação só funciona em ficha vazia. Use um personagem novo ou apague os atributos e macros em Atributos e Habilidades.', true);
            return;
        }

        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        fileInput.disabled = true;
        try {
            await importCharacterToRoll20(doc, character, (message) => setStatus(message));
            modalOverlay.remove();
        } catch (err) {
            console.error('Erro na importação do PDF:', err);
            setStatus('Ocorreu um erro durante a importação. Verifique o console.', true);
            cancelBtn.disabled = false;
        }
    });
}

// Cria os atributos e macros do personagem na aba nativa do Roll20 (mesmo caminho da importação de NPC)
async function importCharacterToRoll20(doc, character, onProgress) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    const attrTabNav = navTabs?.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs?.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) throw new Error('Aba Atributos e Habilidades não encontrada.');

    // Nome do personagem só entra se a ficha ainda estiver sem nome
    const charNameInput = doc.querySelector('input.name');
    if (character.name && charNameInput && (!charNameInput.value.trim() || charNameInput.value.trim().toLowerCase() === 'personagem sem nome')) {
        updateOriginalInput(charNameInput, character.name);
    }

    attrTabNav.click();
    await delay(200);

    const fire = (input, value) => {
        input.value = value;
        ['input', 'change', 'blur'].forEach(type => input.dispatchEvent(new Event(type, { bubbles: true })));
    };

    for (let i = 0; i < character.attributes.length; i++) {
        const attr = character.attributes[i];
        onProgress?.(`Cadastrando atributo ${attr.name} (${i + 1}/${character.attributes.length})...`);
        const addAttribBtn = doc.querySelector('.attributesabilities .addattrib') || doc.querySelector('.addattrib');
        if (!addAttribBtn) break;
        addAttribBtn.click();
        await delay(120);

        const attribs = doc.querySelectorAll('.attributesabilities .attributes .attrib');
        const newAttrib = attribs[attribs.length - 1];
        if (!newAttrib) continue;
        const nameInput = newAttrib.querySelector('.attrname input') || newAttrib.querySelector('.attrname');
        if (nameInput?.tagName.toLowerCase() === 'input') fire(nameInput, attr.name);
        else if (nameInput) {
            nameInput.innerText = attr.name;
            ['input', 'change', 'blur'].forEach(type => nameInput.dispatchEvent(new Event(type, { bubbles: true })));
        }
        const currentInput = newAttrib.querySelector('.current input');
        if (currentInput) fire(currentInput, attr.current);
        const maxInput = newAttrib.querySelector('.max input');
        if (maxInput && attr.max !== null) fire(maxInput, attr.max);
    }

    for (let i = 0; i < character.macros.length; i++) {
        const macro = character.macros[i];
        onProgress?.(`Cadastrando macro ${macro.name} (${i + 1}/${character.macros.length})...`);
        const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
        if (!addAbilBtn) break;
        addAbilBtn.click();
        await delay(150);

        const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
        const newAbil = abils[abils.length - 1];
        if (!newAbil) continue;
        newAbil.querySelector('.editabil')?.click();
        await delay(120);

        const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
        const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');
        if (nameInput) fire(nameInput, macro.name);
        if (macroTextarea) fire(macroTextarea, macro.action);
        newAbil.querySelector('.saveabil')?.click();
        await delay(120);
    }

    onProgress?.('Finalizando importação...');
    await delay(250);
    if (pinkDaggerNav) pinkDaggerNav.click();
    populateDaggerheartData(doc);
}
