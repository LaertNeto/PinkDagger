// Visualização "Oficial" da ficha de personagem: layout no estilo da ficha digital oficial de
// Daggerheart (faixa de identidade, escudos de Evasão e Armadura, flâmulas dos atributos,
// três colunas de combate e abas embaixo). Usa os mesmos ids e classes da visualização
// Clássica, então rolagens, edições e botões de adicionar são ligados por populateDaggerheartData
// do mesmo jeito nas duas.

const OFFICIAL_TRAIT_VERBS = {
    agilidade: ['Correr', 'Saltar', 'Manobrar'],
    força: ['Erguer', 'Esmagar', 'Agarrar'],
    acuidade: ['Controlar', 'Esconder', 'Consertar'],
    instinto: ['Perceber', 'Sentir', 'Navegar'],
    presença: ['Encantar', 'Atuar', 'Enganar'],
    conhecimento: ['Lembrar', 'Analisar', 'Compreender']
};

const OFFICIAL_TABS = [
    ['efeitos', 'Efeitos e Características'],
    ['equipamento', 'Equipamento'],
    ['detalhes', 'Detalhes'],
    ['textos', 'Textos']
];

const OFFICIAL_PROFICIENCY_SLOTS = 6;

// Ouro do Daggerheart: 10 punhados = 1 bolsa e 10 bolsas = 1 baú, por isso cada faixa tem 9 espaços
const OFFICIAL_GOLD = [
    { key: 'punhado', label: 'Punhados', names: ['punhado', 'moeda_punhado'], icon: 'coin' },
    { key: 'bolsa', label: 'Bolsas', names: ['bolsa', 'moeda_bolsa'], icon: 'bag' },
    { key: 'bau', label: 'Baú', names: ['baú', 'bau', 'moeda_bau'], icon: 'chest' }
];
const OFFICIAL_GOLD_SLOTS = 9;

const OFFICIAL_GOLD_ICONS = {
    coin: '<span class="dh-of-coin"></span>',
    bag: '<svg viewBox="0 0 16 18" aria-hidden="true"><path d="M5.5 1h5l-1.6 3.2h-1.8z"/><path d="M6.4 5h3.2C13.5 7.2 15 10.6 15 13.2 15 16.2 12.8 17 8 17s-7-.8-7-3.8C1 10.6 2.5 7.2 6.4 5z"/></svg>',
    chest: '<svg viewBox="0 0 20 16" aria-hidden="true"><path d="M2 6.5C2 3.5 4.5 1 7.5 1h5C15.5 1 18 3.5 18 6.5V7H2z"/><rect x="2" y="8" width="16" height="7" rx="1"/><rect x="8.5" y="6" width="3" height="4" rx=".6" class="dh-of-chest-lock"/></svg>'
};

function getOfficialActiveTab(savedTab) {
    return OFFICIAL_TABS.some(([tab]) => tab === savedTab) ? savedTab : 'efeitos';
}

// "2" vira "+2"; valores com sinal ou que não são números ficam como estão
function formatOfficialModifier(value) {
    const text = String(value ?? '').trim();
    return /^\d+$/.test(text) ? `+${text}` : (text || '—');
}

function capitalizeOfficialLabel(text) {
    const lower = String(text).toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getOfficialSpinHTML(key, label) {
    return `
        <div class="dh-of-spin">
            <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-down" title="Diminuir ${label}">−</button>
            <button type="button" class="dh-defense-spin-btn" id="dh-def-${key}-up" title="Aumentar ${label}">+</button>
        </div>
    `;
}

// Escudo com valor (Evasão, Armadura e Nível). defKey liga os botões −/+ ao atributo.
function getOfficialShieldHTML(label, valueHTML, defKey = null) {
    return `
        <div class="dh-of-shield-wrap">
            <div class="dh-of-shield-outline"><div class="dh-of-shield">${valueHTML}</div></div>
            <span class="dh-of-pill">${label}</span>
            ${defKey ? getOfficialSpinHTML(defKey, label) : ''}
        </div>
    `;
}

function getOfficialDefenseValueHTML(defenses, key) {
    const def = defenses[key];
    if (def && def.exists) {
        return `<span class="dh-defense-val dh-of-shield-val" id="dh-defense-val-${key}">${def.val}</span>`;
    }
    return `<button class="dh-add-missing-btn" data-missing-def="${key}" title="Adicionar">+</button>`;
}

// Recurso com marcadores (PV, Fadiga, Esperança, Espaços de Armadura); variant muda o desenho
function getOfficialTrackerHTML(trackersMap, key, label, variant) {
    const item = trackersMap[key];
    if (!item || !item.exists) {
        return `
            <div class="dh-stat-box dh-of-track dh-of-track--${variant}">
                <div class="dh-stat-header">
                    <span class="dh-stat-label">${label}</span>
                    <button class="dh-add-missing-btn" data-missing-tracker="${key}">+ Adicionar</button>
                </div>
            </div>
        `;
    }
    return `
        <div class="dh-stat-box dh-of-track dh-of-track--${variant}">
            <div class="dh-stat-header">
                <span class="dh-stat-label">${label}</span>
                <span class="dh-stat-value">${item.current} / ${item.max}</span>
            </div>
            ${getTrackerBarHTML(key, item)}
        </div>
    `;
}

function getOfficialTraitsHTML(traitsMap) {
    const cards = FIXED_TRAITS.map(traitKey => {
        const data = traitsMap[traitKey];
        const label = capitalizeOfficialLabel(traitKey);
        const verbs = (OFFICIAL_TRAIT_VERBS[traitKey] || []).join('<br>');
        if (data && data.exists) {
            return `
                <div class="dh-trait-card dh-of-trait" data-trait="${traitKey}" title="Rolar ${label}">
                    <div class="dh-trait-name">${label}</div>
                    <div class="dh-of-pennant-outline"><div class="dh-trait-val dh-of-pennant">${formatOfficialModifier(data.current)}</div></div>
                    <div class="dh-of-trait-verbs">${verbs}</div>
                </div>
            `;
        }
        return `
            <div class="dh-trait-card dh-of-trait" data-missing-attr="${traitKey}">
                <div class="dh-trait-name">${label}</div>
                <div class="dh-of-pennant-outline"><div class="dh-of-pennant"><button class="dh-add-missing-btn" title="Adicionar ${label}">+</button></div></div>
                <div class="dh-of-trait-verbs">${verbs}</div>
            </div>
        `;
    }).join('');
    return `<div class="dh-of-traits" id="dh-traits-container">${cards}</div>`;
}

function getOfficialProficiencyHTML(profVal) {
    if (profVal === null || profVal === undefined) {
        return `<div class="dh-of-prof"><span class="dh-of-pill">Proficiência</span><button class="dh-add-missing-btn" id="dh-of-add-prof">+</button></div>`;
    }
    const prof = parseInt(profVal, 10) || 0;
    const total = Math.max(OFFICIAL_PROFICIENCY_SLOTS, prof);
    let dots = '';
    for (let i = 1; i <= total; i++) {
        dots += `<span class="dh-of-prof-dot${i <= prof ? ' dh-of-prof-dot--on' : ''}"></span>`;
    }
    return `<div class="dh-of-prof" title="Proficiência ${profVal}"><span class="dh-of-pill">Proficiência</span><span class="dh-of-prof-dots">${dots}</span></div>`;
}

function getOfficialWeaponHTML(weapon, traitsMap) {
    const traitData = traitsMap[String(weapon.trait).toLowerCase()];
    const traitBox = traitData && traitData.exists
        ? `<span class="dh-of-stat-box"><strong>${formatOfficialModifier(traitData.current)}</strong><small>${weapon.trait}</small></span>`
        : `<span class="dh-of-stat-box"><small>${weapon.trait}</small></span>`;
    return `
        <div class="dh-weapon-card dh-of-weapon" data-card-fullname="${weapon.rawName}" title="Rolar ${weapon.title}">
            <div class="dh-of-weapon-head">
                <div class="dh-of-weapon-id">
                    <div class="dh-of-weapon-name">${weapon.title}</div>
                    ${weapon.range ? `<div class="dh-of-weapon-range">${weapon.range}</div>` : ''}
                </div>
                <div class="dh-of-weapon-stats">
                    ${traitBox}
                    <span class="dh-of-stat-box"><strong>${weapon.damage}</strong><small>Dano</small></span>
                    <button class="dh-weapon-edit-btn" data-abil-idx="${weapon.abilIdx}" data-card-fullname="${weapon.rawName}" title="Editar Arma">✏️</button>
                </div>
            </div>
            <div class="dh-of-weapon-feature">${weapon.desc ? formatCardText(weapon.desc) : 'Sem característica.'}</div>
        </div>
    `;
}

// Card com imagem: a imagem vira o fundo do card, atrás do título (como na ficha oficial)
function getOfficialCardImageAttrs(image) {
    return image ? ` dh-of-card--image" style="--dh-card-image: url('${escapeHtml(image)}')` : '';
}

function getOfficialFeatureCardHTML(item) {
    const hasBody = item.effectsHTML || (!item.counters?.length && !item.image);
    return `
        <div class="dh-heritage-card dh-of-card${getOfficialCardImageAttrs(item.image)}" data-card-fullname="${item.rawName}">
            <div class="dh-of-card-head">
                <span class="dh-of-card-title">${item.title}</span>
                <span class="dh-of-card-tag">${capitalizeOfficialLabel(item.typeTag)}</span>
                <button class="dh-card-edit-btn" data-abil-idx="${item.abilIdx}" data-card-fullname="${item.rawName}" data-card-type="${item.typeTag}" title="Editar ${capitalizeOfficialLabel(item.typeTag)}">✏️</button>
            </div>
            ${hasBody ? `<div class="dh-of-card-body">${item.effectsHTML || '<div class="dh-heritage-effect">Sem efeitos informados.</div>'}</div>` : ''}
            ${item.counters?.length ? `<div class="dh-of-card-foot">${getCardCountersHTML(item.rawName, item.counters)}</div>` : ''}
        </div>
    `;
}

function getOfficialDomainCardHTML(card) {
    return `
        <div class="dh-domain-card dh-of-card${getOfficialCardImageAttrs(card.image)}" data-card-fullname="${card.rawName}">
            <div class="dh-of-card-head">
                <span class="dh-of-card-title">${card.name}</span>
                <span class="dh-of-card-tag">Domínio</span>
                <button class="dh-card-edit-btn" data-abil-idx="${card.abilIdx}" data-card-fullname="${card.rawName}" title="Editar Carta de Domínio">✏️</button>
            </div>
            ${card.desc ? `<div class="dh-of-card-body"><div class="dh-heritage-effect">${card.desc}</div></div>` : ''}
            <div class="dh-of-card-foot">
                <span class="dh-of-chip"><strong>${card.nivel}</strong><small>Nível</small></span>
                <span class="dh-of-chip"><strong>${card.custo}</strong><small>Custo</small></span>
                ${getCardCountersHTML(card.rawName, card.counters)}
            </div>
        </div>
    `;
}

// Domínios do personagem (atributos Dominio1 e Dominio2), com o estandarte ao lado do Nível.
// Clicar nos nomes (ou no botão, quando falta algum) abre um prompt para escrever os dois.
function getOfficialDomainsHTML(domains = []) {
    const names = domains.map(d => (d && d.val) || '').filter(Boolean);
    // Cada nome fica inteiro na linha (ex.: "Meia-Noite"); a quebra só acontece entre os dois
    const nameHTML = (name) => `<span class="dh-of-domain-name">${escapeHtml(name)}</span>`;
    const namesHTML = names.length === 2
        ? `${nameHTML(names[0])} <span class="dh-of-domains-amp">&amp;</span> ${nameHTML(names[1])}`
        : names.map(nameHTML).join('');
    const missingHTML = names.length < 2
        ? `<span class="dh-add-missing-btn dh-of-domains-add">+ ${names.length === 0 ? 'Domínios' : 'Domínio'}</span>`
        : '';
    return `
        <button type="button" class="dh-of-domains" id="dh-of-domains" title="${names.length ? 'Trocar domínios' : 'Adicionar os domínios do personagem'}">
            <span class="dh-of-banner-outline"><span class="dh-of-banner"><span>✦</span><span>◈</span></span></span>
            <span class="dh-of-domains-names">${namesHTML}${names.length && missingHTML ? ' <span class="dh-of-domains-amp">&amp;</span> ' : ''}${missingHTML}</span>
        </button>
    `;
}

// Linha "Comunidade Ancestralidade Classe (Subclasse)" abaixo do nome
function getOfficialSubtitleHTML(heritageItems, classItems) {
    const titlesOf = (items, tag) => items.filter(item => item.typeTag === tag).map(item => item.title).join(' / ');
    const parts = [
        titlesOf(heritageItems, 'COMUNIDADE'),
        titlesOf(heritageItems, 'ANCESTRALIDADE'),
        titlesOf(classItems, 'CLASSE')
    ].filter(Boolean);
    const subclass = titlesOf(classItems, 'SUBCLASSE');
    if (parts.length === 0 && !subclass) return '';
    return `<div class="dh-of-subtitle">${parts.join(' ')}${subclass ? ` <span class="dh-of-subtitle-sub">(${subclass})</span>` : ''}</div>`;
}

function getOfficialBarTitleHTML(label, actionsHTML = '', manyActions = false) {
    return `<div class="dh-of-bar-title${manyActions ? ' dh-of-bar-title--many-actions' : ''}"><span>${label}</span>${actionsHTML ? `<div class="dh-of-bar-actions">${actionsHTML}</div>` : ''}</div>`;
}

function getOfficialAddButtonHTML(id, label, title) {
    return `<button class="dh-add-btn dh-add-btn--labeled" id="${id}" title="${title}"><span class="dh-add-btn-plus">+</span><span class="dh-add-btn-label">${label}</span></button>`;
}

function getOfficialGoldInnerHTML(gold) {
    const groups = OFFICIAL_GOLD.map(({ key, label, icon }) => {
        const item = gold[key];
        if (!item.exists) {
            return `
                <div class="dh-of-gold-group dh-of-gold-group--${icon}">
                    <button class="dh-add-missing-btn" data-of-missing-money="${key}" title="Criar ${label}">+ Criar</button>
                    <span class="dh-of-gold-label">${label}</span>
                </div>
            `;
        }
        if (icon === 'chest') {
            return `
                <div class="dh-of-gold-group dh-of-gold-group--chest">
                    <button type="button" class="dh-of-gold-chest${item.val > 0 ? ' dh-of-gold-chest--on' : ''}" data-gold-chest title="${item.val > 0 ? 'Tirar um baú' : 'Marcar um baú'}">
                        ${OFFICIAL_GOLD_ICONS.chest}
                        ${item.val > 1 ? `<span class="dh-of-gold-badge">${item.val}</span>` : ''}
                    </button>
                    <span class="dh-of-gold-label">${label}</span>
                </div>
            `;
        }
        let slots = '';
        for (let i = 1; i <= OFFICIAL_GOLD_SLOTS; i++) {
            slots += `<button type="button" class="dh-of-gold-slot${i <= item.val ? ' dh-of-gold-slot--on' : ''}" data-gold-slot="${i}" title="${i} ${label.toLowerCase()}">${OFFICIAL_GOLD_ICONS[icon]}</button>`;
        }
        return `
            <div class="dh-of-gold-group dh-of-gold-group--${icon}" data-gold-key="${key}">
                <div class="dh-of-gold-track">
                    <button type="button" class="dh-of-gold-step" data-gold-step="-1" title="Tirar 1">−</button>
                    <div class="dh-of-gold-slots">${slots}</div>
                    <button type="button" class="dh-of-gold-step" data-gold-step="1" title="Somar 1">+</button>
                </div>
                <span class="dh-of-gold-label">${label} <strong>${item.val}</strong></span>
            </div>
        `;
    }).join('');
    return `<span class="dh-of-gold-title">Ouro</span>${groups}`;
}

function getOfficialEquipmentHTML(data) {
    const gold = {};
    OFFICIAL_GOLD.forEach(({ key }) => {
        gold[key] = { val: data.moneyMap[key].val, exists: data.moneyMap[key].exists };
    });
    return `
        <div class="dh-of-gold" id="dh-of-gold">${getOfficialGoldInnerHTML(gold)}</div>
        ${getOfficialBarTitleHTML('Inventário', data.hasInventory ? '' : '<button class="dh-add-btn" id="dh-add-inv" title="Criar Campo de Inventário no Roll20">+</button>')}
        <textarea class="dh-inventory-textarea dh-of-inventory" id="dh-inv-text" ${data.hasInventory ? '' : 'disabled'} placeholder="${data.hasInventory ? 'Digite os itens do inventário aqui...' : 'Clique no botão + acima para criar o campo de inventário primeiro.'}">${escapeHtml(data.inventoryText)}</textarea>
    `;
}

function buildOfficialSheetHTML(data) {
    const { trackersMap, defenses, traitsMap } = data;

    const nivelHTML = data.nivelVal !== null && data.nivelVal !== undefined
        ? `<span class="dh-of-shield-val">${data.nivelVal}</span>`
        : `<button class="dh-add-missing-btn" id="dh-of-add-nivel" title="Adicionar Nível">+</button>`;

    const armor = trackersMap['armadura'];
    const armorScoreHTML = armor && armor.exists
        ? `<span class="dh-of-shield-val">${armor.max}</span>`
        : `<span class="dh-of-shield-val dh-of-muted">—</span>`;

    const heroHTML = `
        <div class="dh-of-hero">
            <div class="dh-of-identity">
                <div class="dh-of-name">${escapeHtml(data.charName || 'Personagem')}</div>
                ${getOfficialSubtitleHTML(data.heritageItems, data.classItems)}
            </div>
            <div class="dh-of-hero-side">
                ${getOfficialDomainsHTML(data.domains)}
                <div class="dh-of-level">${getOfficialShieldHTML('Nível', nivelHTML)}</div>
            </div>
        </div>
    `;

    const coreHTML = `
        <div class="dh-of-core">
            <div class="dh-of-defense">
                <div class="dh-of-shields">
                    ${getOfficialShieldHTML('Evasão', getOfficialDefenseValueHTML(defenses, 'evasao'), defenses.evasao?.exists ? 'evasao' : null)}
                    ${getOfficialShieldHTML('Armadura', armorScoreHTML)}
                </div>
                ${getOfficialTrackerHTML(trackersMap, 'armadura', 'Espaços de Armadura', 'slots')}
            </div>
            ${getOfficialTraitsHTML(traitsMap)}
        </div>
    `;

    const thresholdValueHTML = (key, label) => `
        <div class="dh-of-threshold-val">
            ${getOfficialDefenseValueHTML(defenses, key)}
            ${defenses[key]?.exists ? getOfficialSpinHTML(key, label) : ''}
        </div>
    `;

    const hpColumnHTML = `
        <section class="dh-of-col dh-of-col--hp">
            ${getOfficialBarTitleHTML('Vida e Fadiga')}
            <div class="dh-of-thresholds">
                <div class="dh-of-threshold-label"><strong>Dano Menor</strong><small>Marque 1&nbsp;PV</small></div>
                ${thresholdValueHTML('menor', 'Limiar Menor')}
                <div class="dh-of-threshold-label"><strong>Dano Maior</strong><small>Marque 2&nbsp;PV</small></div>
                ${thresholdValueHTML('maior', 'Limiar Maior')}
                <div class="dh-of-threshold-label"><strong>Dano Grave</strong><small>Marque 3&nbsp;PV</small></div>
            </div>
            ${getOfficialTrackerHTML(trackersMap, 'vida', 'PV', 'boxes')}
            ${getOfficialTrackerHTML(trackersMap, 'fadiga', 'Fadiga', 'boxes')}
        </section>
    `;

    const weaponsHTML = data.weaponItems.length > 0
        ? data.weaponItems.map(weapon => getOfficialWeaponHTML(weapon, traitsMap)).join('')
        : '<div class="dh-of-empty">Nenhuma arma cadastrada.</div>';

    const weaponsColumnHTML = `
        <section class="dh-of-col dh-of-col--weapons">
            ${getOfficialBarTitleHTML('Armas Ativas', '<button class="dh-add-btn" id="dh-add-weapon" title="Adicionar Arma">+</button>')}
            ${getOfficialProficiencyHTML(data.profVal)}
            <div class="dh-of-weapons" id="dh-weapons-container">${weaponsHTML}</div>
        </section>
    `;

    const hopeColumnHTML = `
        <section class="dh-of-col dh-of-col--hope">
            ${getOfficialBarTitleHTML('Esperança')}
            ${getOfficialTrackerHTML(trackersMap, 'esperança', 'Esperança', 'diamonds')}
            <div class="dh-of-exp-box">
                ${getOfficialBarTitleHTML('Experiências', '<button class="dh-add-btn" id="dh-add-exp" title="Adicionar Experiência">+</button>')}
                <div class="dh-experiences-grid dh-of-exp-list" id="dh-experiences-container">
                    ${data.expCount > 0 ? data.expCardsHTML : '<div class="dh-of-empty">Nenhuma experiência cadastrada.</div>'}
                </div>
            </div>
        </section>
    `;

    const resourcesHTML = `
        <section class="dh-of-resources">
            ${getOfficialBarTitleHTML('Recursos Personalizados', '<button class="dh-add-btn" id="dh-add-custom-tracker" title="Adicionar Recurso Personalizado">+</button>')}
            ${data.customStatsHTML}
        </section>
    `;

    const domainsHTML = data.domainItems.length > 0
        ? data.domainItems.map(getOfficialDomainCardHTML).join('')
        : '<div class="dh-of-empty">Nenhuma carta de domínio cadastrada.</div>';

    const hasFeatures = data.classItems.length > 0 || data.heritageItems.length > 0;
    const featuresHTML = `
        <div class="dh-of-features">
            <div class="dh-of-features-col">
                ${getOfficialBarTitleHTML('Cartas de Domínio', `
                    <button class="dh-add-btn dh-vault-btn" id="dh-open-vault" title="Abrir Reserva">🗃️</button>
                    <button class="dh-add-btn" id="dh-add-domain" title="Adicionar Carta de Domínio">+</button>
                `)}
                <div class="dh-of-cards" id="dh-domains-container">${domainsHTML}</div>
            </div>
            <div class="dh-of-features-col">
                ${getOfficialBarTitleHTML('Características', `
                    ${getOfficialAddButtonHTML('dh-add-cla', 'Cla', 'Adicionar Classe')}
                    ${getOfficialAddButtonHTML('dh-add-sub', 'Sub', 'Adicionar Sub-classe')}
                    ${getOfficialAddButtonHTML('dh-add-esp', 'Esp', 'Adicionar Habilidade de Esperança')}
                    ${getOfficialAddButtonHTML('dh-add-anc', 'Anc', 'Adicionar Ancestralidade')}
                    ${getOfficialAddButtonHTML('dh-add-com', 'Com', 'Adicionar Comunidade')}
                `, true)}
                <div class="dh-of-cards" id="dh-class-container">${data.classItems.map(getOfficialFeatureCardHTML).join('')}</div>
                <div class="dh-of-cards" id="dh-heritage-container">${data.heritageItems.map(getOfficialFeatureCardHTML).join('')}</div>
                ${hasFeatures ? '' : '<div class="dh-of-empty">Nenhuma característica cadastrada.</div>'}
            </div>
        </div>
    `;

    const panelContents = {
        efeitos: featuresHTML,
        equipamento: getOfficialEquipmentHTML(data),
        detalhes: (data.finalLevelHTML || '') + data.generalAbilitiesHTML,
        textos: data.textsHTML
    };

    const tabsHTML = OFFICIAL_TABS.map(([tab, label]) => `<button type="button" class="dh-sheet-tab${data.activeTab === tab ? ' dh-sheet-tab--active' : ''}" data-sheet-tab="${tab}">${label}</button>`).join('');
    const panelsHTML = OFFICIAL_TABS.map(([tab]) => `<div class="dh-sheet-panel${data.activeTab === tab ? ' dh-sheet-panel--active' : ''}" data-sheet-panel="${tab}">${panelContents[tab]}</div>`).join('');

    return `
        <div class="dh-of">
            <div class="dh-of-frame">
                ${heroHTML}
                ${coreHTML}
                <div class="dh-of-columns">
                    ${hpColumnHTML}
                    ${weaponsColumnHTML}
                    ${hopeColumnHTML}
                </div>
                ${resourcesHTML}
            </div>
            <div class="dh-sheet-tabs dh-of-tabs">${tabsHTML}</div>
            <div class="dh-of-paper">${panelsHTML}</div>
        </div>
    `;
}

// Botões que só existem na visualização Oficial (na Clássica, Nível e Proficiência ficam no topo)
// Barra de Ouro: clicar num espaço marca até ele (clicar no último marcado desmarca);
// −/+ trocam 10 punhados por 1 bolsa e 10 bolsas por 1 baú, e desfazem a troca quando falta
function setupOfficialGold(doc, root, moneyMap) {
    const container = root.querySelector('#dh-of-gold');
    if (!container) return;

    const gold = {};
    OFFICIAL_GOLD.forEach(({ key }) => {
        gold[key] = { val: moneyMap[key].val, exists: moneyMap[key].exists };
    });

    const step = (index, delta) => {
        const item = gold[OFFICIAL_GOLD[index].key];
        const next = OFFICIAL_GOLD[index + 1] ? gold[OFFICIAL_GOLD[index + 1].key] : null;
        const canCarry = next && next.exists;
        if (delta > 0) {
            if (canCarry && item.val >= OFFICIAL_GOLD_SLOTS) {
                item.val = item.val + 1 - (OFFICIAL_GOLD_SLOTS + 1);
                return step(index + 1, 1);
            }
            item.val++;
            return true;
        }
        if (item.val > 0) {
            item.val--;
            return true;
        }
        if (canCarry && step(index + 1, -1)) {
            item.val = OFFICIAL_GOLD_SLOTS;
            return true;
        }
        return false;
    };

    const apply = (changeFn) => {
        const before = OFFICIAL_GOLD.map(({ key }) => gold[key].val);
        changeFn();
        OFFICIAL_GOLD.forEach(({ key, names }, index) => {
            if (gold[key].val === before[index]) return;
            // Busca o campo novamente: o Roll20 recria a linha do atributo e a referência antiga fica solta
            const input = findAttributeInput(doc, names) || moneyMap[key].input;
            if (input) updateOriginalInput(input, gold[key].val);
            moneyMap[key].val = gold[key].val;
        });
        container.innerHTML = getOfficialGoldInnerHTML(gold);
    };

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !container.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();

        const missingKey = btn.getAttribute('data-of-missing-money');
        if (missingKey) {
            const label = OFFICIAL_GOLD.find(m => m.key === missingKey).label;
            addNewAttributeToRoll20(doc, `moeda_${missingKey}`, `Quantidade inicial de ${label}:`, '0', false);
            return;
        }

        if (btn.hasAttribute('data-gold-chest')) {
            apply(() => { gold.bau.val = gold.bau.val > 0 ? gold.bau.val - 1 : 1; });
            return;
        }

        const key = btn.closest('[data-gold-key]')?.getAttribute('data-gold-key');
        if (!key) return;
        const index = OFFICIAL_GOLD.findIndex(m => m.key === key);

        if (btn.hasAttribute('data-gold-step')) {
            apply(() => step(index, parseInt(btn.getAttribute('data-gold-step'), 10)));
        } else if (btn.hasAttribute('data-gold-slot')) {
            const slot = parseInt(btn.getAttribute('data-gold-slot'), 10);
            apply(() => { gold[key].val = gold[key].val === slot ? slot - 1 : slot; });
        }
    });
}

function setupOfficialSheet(doc, root, moneyMap, domains = []) {
    setupOfficialGold(doc, root, moneyMap);
    root.querySelector('#dh-of-domains')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        promptCharacterDomains(doc, domains);
    });
    root.querySelector('#dh-of-add-nivel')?.addEventListener('click', () => {
        addNewAttributeToRoll20(doc, 'Nível', 'Digite o Nível do personagem:', '1');
    });
    root.querySelector('#dh-of-add-prof')?.addEventListener('click', () => {
        addNewAttributeToRoll20(doc, 'Proficiência', 'Digite a Proficiência do personagem:', '1');
    });
}
