function formatTextWithNewlines(text) {
    if (!text) return '';
    return text
        .replace(/\\n/g, '\n')
        .replace(/^\n+|\n+$/g, '')
        .trim();
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
                fields['__raw_desc__'] = val;
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

function renderCheckboxesInText(text, abilIndex) {
    if (!text) return '';
    let cbCount = 0;
    let formatted = formatTextWithNewlines(text);

    return formatted.replace(/\(\s*[xX]?\s*\)/g, (match) => {
        const isChecked = match.toLowerCase().includes('x');
        const html = `<input type="checkbox" class="dh-level-checkbox" data-abil-idx="${abilIndex}" data-cb-idx="${cbCount}" ${isChecked ? 'checked' : ''}>`;
        cbCount++;
        return html;
    });
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
