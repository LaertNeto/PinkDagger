function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTextWithNewlines(text) {
    if (!text) return '';
    return text
        .replace(/\\n/g, '\n')
        .replace(/^\n+|\n+$/g, '')
        .trim();
}

// ---------------------------------------------------------------------------
// Negrito automático nas regras do texto das cartas (só na ficha; a macro e o chat não mudam).
// Tudo vira um regex só, para uma passada não colocar negrito dentro de outro.
// ---------------------------------------------------------------------------
const RULE_NUMBER_WORDS = 'um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez';
const RULE_TRAITS = 'agilidade|for[çc]a|acuidade|instinto|presen[çc]a|conhecimento';

// Rolagem de dados: d6, 2d6, 1d20+3, 1d4 − 1
const RULE_DICE = '\\d*d\\d+(?:\\s*[+\\-−]\\s*\\d+)?';

// Quantidade: "1", "um", "1d4", "até 3", "qualquer quantidade de", "um número qualquer de", "metade dos", "todos os seus"
const RULE_QUANTITY = '(?:at[ée]\\s+)?(?:'
    + `${RULE_DICE}|\\d+|${RULE_NUMBER_WORDS}`
    + '|qualquer\\s+(?:quantidade|n[úu]mero)(?:\\s+de)?'
    + '|(?:um|uma)\\s+(?:quantidade|n[úu]mero)(?:\\s+qualquer)?(?:\\s+de)?'
    + '|metade\\s+d[oa]s?'
    + '|tod[oa]s(?:\\s+[oa]s)?(?:\\s+(?:seus|suas))?'
    + ')';

// Recurso: "Pontos de Esperança", "Ponto de Fadiga", "de Esperança", "Fadiga", "PE", "PF", "PV", "Espaços de Armadura", "marcadores", "fichas"
const RULE_RESOURCE = '(?:'
    + '(?:de\\s+)?(?:pontos?|espa[çc]os?)\\s+de\\s+(?:esperan[çc]a|fadiga|vida|armadura|medo)'
    + '|(?:de\\s+)?(?:esperan[çc]a|fadiga|vida|medo)'
    + '|PE|PF|PV|PA|marcador(?:es)?|fichas?'
    + ')';

// Verbos de gastar/marcar/limpar/ganhar recursos, em qualquer forma comum: gaste, gastar, marque, marcar, limpe...
const RULE_RESOURCE_VERBS = 'gast(?:e|em|ar|a|am|ou|ando)|marqu(?:e|em)|marc(?:ar|a|am|ou|ando)'
    + '|limp(?:e|em|ar|a|ou)|recuper(?:e|em|ar|a|ou)|ganh(?:e|em|ar|a|ou)|perc(?:a|am)|perd(?:er|e|eu)'
    + '|cust(?:a|am|ar)|remov(?:a|er|e)|receb(?:a|er|e)';

const RULE_HIGHLIGHT_PARTS = [
    // Gaste 1 Ponto de Esperança, marcar 1 PF, gastar até 3 Pontos de Esperança, Marque um número qualquer de Pontos de Fadiga
    `(?:${RULE_RESOURCE_VERBS})\\s+${RULE_QUANTITY}\\s+${RULE_RESOURCE}`,
    // teste de conjuração (15), teste de Instinto, rolagem de ataque, teste de reação de Agilidade
    `(?:testes?|rolage(?:m|ns)|jogadas?)\\s+de\\s+(?:conjura[çc][ãa]o|ataque|dano|a[çc][ãa]o|esperan[çc]a|medo|rea[çc][ãa]o(?:\\s+de\\s+(?:${RULE_TRAITS}))?|${RULE_TRAITS})`
        + '(?:\\s*\\(\\s*(?:dificuldade\\s*)?\\d+\\s*\\))?',
    // Vantagem e tipos de dano
    '(?:des)?vantagem',
    'dano\\s+(?:m[áa]gico|f[íi]sico)',
    // Alcances depois de "até" ou "alcance": "a até Longe", "alcance Muito Próximo"
    '(?<=(?:at[ée]|alcance(?:\\s+de)?)\\s+)(?:corpo\\s+a\\s+corpo|muito\\s+pr[óo]ximo|pr[óo]ximo|muito\\s+perto|perto|muito\\s+longe|longe|muito\\s+distante|distante)',
    // Cartas em inglês: Spend a Hope, Mark a Stress, Spellcast Roll (15), advantage
    `(?:spend|mark|clear|gain|lose)\\s+(?:a|an|one|two|three|any\\s+number\\s+of|up\\s+to\\s+\\d+|${RULE_DICE}|\\d+)\\s+(?:hope|stress|hit\\s+points?|hp|armor\\s+slots?|fear|tokens?)`,
    `(?:spellcast|attack|reaction|agility|strength|finesse|instinct|presence|knowledge)\\s+rolls?(?:\\s*\\(\\s*\\d+\\s*\\))?`,
    '(?:dis)?advantage',
    // Qualquer rolagem de dados (por último: dentro de "gaste 1d4 PF" o trecho inteiro já foi pego)
    RULE_DICE
];

// Letras e números (com acento) dos dois lados impedem pegar pedaço de palavra
const RULE_HIGHLIGHT_REGEX = new RegExp(`(?<![\\p{L}\\p{N}])(?:${RULE_HIGHLIGHT_PARTS.join('|')})(?![\\p{L}\\p{N}])`, 'giu');

function highlightRuleText(text) {
    return String(text ?? '').replace(RULE_HIGHLIGHT_REGEX, (match) => `<strong class="dh-rule-highlight">${match}</strong>`);
}

// Texto de carta pronto para a ficha: quebras de linha arrumadas + regras em negrito
function formatCardText(text) {
    return highlightRuleText(formatTextWithNewlines(text));
}

function extractMacroFields(macroText) {
    const fields = {};
    let index = 0;

    while (index < macroText.length) {
        let start = macroText.indexOf('{{', index);
        if (start === -1) break;
        start += 2;

        let end = macroText.indexOf('}}', start);
        if (end === -1) break;

        let content = macroText.substring(start, end);
        let equalIndex = content.indexOf('=');
        if (equalIndex !== -1) {
            let key = content.substring(0, equalIndex).trim().toLowerCase();
            let val = content.substring(equalIndex + 1).trim();
            fields[key] = val;
        } else {
            let val = content.trim();
            if (val) {
                // Vários campos sem nome (ex.: texto + {{[x](imagem)}}) se juntam em vez de um apagar o outro
                fields['__raw_desc__'] = fields['__raw_desc__'] ? `${fields['__raw_desc__']}\n${val}` : val;
            }
        }
        index = end + 2;
    }
    return fields;
}

function extractMacroFieldsList(macroText) {
    const fieldsList = [];
    let index = 0;

    while (index < macroText.length) {
        let start = macroText.indexOf('{{', index);
        if (start === -1) break;
        start += 2;

        let end = macroText.indexOf('}}', start);
        if (end === -1) break;

        let content = macroText.substring(start, end);
        let equalIndex = content.indexOf('=');
        if (equalIndex !== -1) {
            let key = content.substring(0, equalIndex).trim();
            let val = content.substring(equalIndex + 1).trim();
            fieldsList.push({
                key: key,
                value: val,
                isName: key.toLowerCase() === 'name'
            });
        } else {
            let val = content.trim();
            if (val) {
                fieldsList.push({
                    key: 'Efeito',
                    value: val,
                    isName: false
                });
            }
        }
        index = end + 2;
    }
    return fieldsList;
}

// firstCbIndex: quantos checkboxes vêm antes deste texto na macro; o índice precisa contar a macro inteira
function renderCheckboxesInText(text, abilIndex, firstCbIndex = 0) {
    if (!text) return '';
    let cbCount = firstCbIndex;
    let formatted = formatTextWithNewlines(text);

    return formatted.replace(/\(\s*[xX]?\s*\)/g, (match) => {
        const isChecked = match.toLowerCase().includes('x');
        const html = `<input type="checkbox" class="dh-level-checkbox" data-abil-idx="${abilIndex}" data-cb-idx="${cbCount}" ${isChecked ? 'checked' : ''}>`;
        cbCount++;
        return html;
    });
}

// Contadores de carta (fichas, usos...): campos {{Nome=atual/máximo}} na macro, ex.: {{Fichas=2/3}}.
// Ficam no texto da macro para acompanhar a carta (Reserva, renomear) e aparecem na rolagem do chat.
const CARD_COUNTER_VALUE_REGEX = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;
const CARD_COUNTER_FIELD_REGEX = /\s*\{\{\s*[^=}]+?\s*=\s*\d+\s*\/\s*\d+\s*\}\}/g;

function parseCardCounter(value) {
    const match = String(value ?? '').match(CARD_COUNTER_VALUE_REGEX);
    return match ? { current: parseInt(match[1], 10), max: parseInt(match[2], 10) } : null;
}

function getCardCounters(macroText) {
    return extractMacroFieldsList(macroText || '')
        .filter(field => !field.isName)
        .map(field => ({ name: field.key, counter: parseCardCounter(field.value) }))
        .filter(item => item.counter)
        .map(item => ({ name: item.name, current: item.counter.current, max: item.counter.max }));
}

// Troca todos os contadores da macro pela lista nova (vazia remove todos)
function setCardCounterFields(macroText, counters) {
    const withoutCounters = (macroText || '').replace(CARD_COUNTER_FIELD_REGEX, '');
    const fields = counters.map(c => ` {{${c.name}=${c.current}/${c.max}\n}}`).join('');
    return withoutCounters + fields;
}

function getCardCountersHTML(rawName, counters) {
    if (!counters || counters.length === 0) return '';
    const items = counters.map(c => `
        <div class="dh-card-counter" data-card-fullname="${rawName}" data-counter-name="${escapeHtml(c.name)}" data-counter-max="${c.max}">
            <button type="button" class="dh-card-counter-btn" data-counter-step="-1" title="Tirar 1 de ${escapeHtml(c.name)}">−</button>
            <span class="dh-card-counter-val"><strong><span class="dh-card-counter-current">${c.current}</span>/${c.max}</strong><small>${escapeHtml(c.name)}</small></span>
            <button type="button" class="dh-card-counter-btn" data-counter-step="1" title="Somar 1 em ${escapeHtml(c.name)}">+</button>
        </div>
    `).join('');
    return `<div class="dh-card-counters">${items}</div>`;
}

// Imagem/GIF da carta: link no formato do Roll20 [x](url) no fim da descrição. O chat do
// Roll20 mostra a imagem; a ficha tira o link do texto e mostra a imagem no card.
const CARD_IMAGE_LINK_REGEX = /\s*\[x\]\((https?:\/\/[^)\s]+)\)/gi;

function getCardImageUrl(text) {
    const match = String(text ?? '').match(/\[x\]\((https?:\/\/[^)\s]+)\)/i);
    return match ? sanitizeCardImageUrl(match[1]) : '';
}

function stripCardImageLinks(text) {
    return String(text ?? '').replace(CARD_IMAGE_LINK_REGEX, '').trim();
}

// Coloca (ou troca) o link da imagem no fim do texto; url vazia só tira o link
function withCardImageLink(text, url) {
    const clean = stripCardImageLinks(text);
    if (!url) return clean;
    return `${clean}${clean ? '\n' : ''}[x](${url})`;
}

// Só http(s) e sem caracteres que quebrariam o link da macro ou o HTML
function sanitizeCardImageUrl(url) {
    const trimmed = String(url ?? '').trim();
    return /^https?:\/\/[^\s()"'<>{}\[\]]+$/i.test(trimmed) ? trimmed : '';
}

function getCardImageHTML(url) {
    return url ? `<div class="dh-card-image"><img src="${escapeHtml(url)}" alt="" loading="lazy"></div>` : '';
}

// Alcance da arma: campo {{alcance=...}} da macro (ou {{range=...}})
function getWeaponRange(fields) {
    return formatTextWithNewlines(fields['alcance'] || fields['range'] || '');
}

function formatDamageFormula(damageText, profVal) {
    if (!damageText) return '-';
    
    let clean = damageText
        .replace(/\[\[/g, '') .replace(/\]\]/g, '')
        .replace(/@\{proficiência\}/gi, profVal !== '-' ? `${profVal}` : '')
        .replace(/@\{proficiencia\}/gi, profVal !== '-' ? `${profVal}` : '')
        .replace(/\s+/g, ' ')
        .trim();

    return clean || '-';
}

function resolveMacroVariables(text, attrMap = {}) {
    if (!text) return '';
    let result = text;
    // Substitui variáveis do Roll20 @{nome}
    result = result.replace(/@\{([^}]+)\}/gi, (match, attrName) => {
        const cleanKey = attrName.trim().toLowerCase();
        if (attrMap[cleanKey] !== undefined && attrMap[cleanKey] !== null && attrMap[cleanKey] !== '') {
            return attrMap[cleanKey];
        }
        return '';
    });
    // Remove os colchetes inline roll [[ e ]]
    result = result.replace(/\[\[/g, '').replace(/\]\]/g, '');
    // Limpa espaços duplicados
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

function getPinkDaggerSettings() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
        return { ...SETTINGS_DEFAULTS, ...(saved || {}) };
    } catch (err) {
        return { ...SETTINGS_DEFAULTS };
    }
}

function savePinkDaggerSettings(changes) {
    const settings = { ...getPinkDaggerSettings(), ...changes };
    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {}
    return settings;
}

function loadTextareaHeights() {
    try {
        return JSON.parse(window.localStorage.getItem(TEXTAREA_HEIGHTS_STORAGE_KEY)) || {};
    } catch (err) {
        return {};
    }
}

function getSavedTextareaHeight(doc, macroName) {
    return loadTextareaHeights()[getSheetCharacterName(doc)]?.[macroName.toLowerCase()] || null;
}

function saveTextareaHeight(doc, macroName, height) {
    const heights = loadTextareaHeights();
    const charName = getSheetCharacterName(doc);
    heights[charName] = { ...heights[charName], [macroName.toLowerCase()]: height };
    try {
        window.localStorage.setItem(TEXTAREA_HEIGHTS_STORAGE_KEY, JSON.stringify(heights));
    } catch (err) {}
}

// Tooltip flutuante compartilhado (um por documento)
function getCardTooltip(doc) {
    let tooltip = doc.getElementById('dh-card-tooltip');
    if (!tooltip) {
        tooltip = doc.createElement('div');
        tooltip.id = 'dh-card-tooltip';
        tooltip.className = 'dh-card-tooltip';
        doc.body.appendChild(tooltip);
    }
    return tooltip;
}

function hideCardTooltip(doc) {
    doc.getElementById('dh-card-tooltip')?.classList.remove('dh-card-tooltip-visible');
}

function showCardTooltip(doc, cardElem, contentHTML) {
    const tooltip = getCardTooltip(doc);
    tooltip.innerHTML = contentHTML;
    tooltip.classList.add('dh-card-tooltip-visible');

    // Ao lado do card (direita, senão esquerda), sempre dentro da tela
    const win = doc.defaultView;
    const margin = 8;
    const rect = cardElem.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let left = rect.right + margin;
    if (left + tipRect.width > win.innerWidth - margin) left = rect.left - tipRect.width - margin;
    left = Math.max(margin, Math.min(left, win.innerWidth - tipRect.width - margin));
    const top = Math.max(margin, Math.min(rect.top, win.innerHeight - tipRect.height - margin));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

// getContentHTML(cardElem) devolve o HTML do tooltip, ou vazio para não mostrar
function attachCardTooltip(doc, container, cardSelector, getContentHTML) {
    container.addEventListener('mouseover', (e) => {
        const cardElem = e.target.closest(cardSelector);
        const contentHTML = cardElem && container.contains(cardElem) ? getContentHTML(cardElem) : '';
        if (contentHTML) showCardTooltip(doc, cardElem, contentHTML);
        else hideCardTooltip(doc);
    });
    container.addEventListener('mouseleave', () => hideCardTooltip(doc));
    container.addEventListener('click', () => hideCardTooltip(doc));
}
