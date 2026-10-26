function updateOriginalInput(originalInput, newValue) {
    if (!originalInput) return;
    // O campo fica numa aba oculta e nunca recebe foco, então .blur() sozinho não dispara nada;
    // os eventos de perda de foco são disparados manualmente para o Roll20 salvar o valor
    originalInput.focus();
    originalInput.value = newValue;
    originalInput.dispatchEvent(new Event('input', { bubbles: true }));
    originalInput.dispatchEvent(new Event('change', { bubbles: true }));
    originalInput.dispatchEvent(new FocusEvent('blur'));
    originalInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    originalInput.blur();
}

function triggerRollForAbilityName(doc, targetName) {
    const abilityElements = doc.querySelectorAll('.attributesabilities .abilities .abil');
    let targetFound = false;
    const normalizedTarget = targetName.trim().toLowerCase();

    abilityElements.forEach(abil => {
        const nameElem = abil.querySelector('.abilname');
        const name = nameElem?.innerText?.trim().toLowerCase() || (abil.querySelector('input.abilname')?.value?.trim().toLowerCase() || '');

        if (name === normalizedTarget) {
            const rollBtn = abil.querySelector('button[type="roll"], .btn, a, [role="button"]') || nameElem;
            if (rollBtn) {
                rollBtn.click();
                targetFound = true;
            }
        }
    });

    if (!targetFound) {
        console.warn(`Habilidade/Rolagem "${targetName}" não foi encontrada na aba nativa de Habilidades.`);
    }
}

function createAttributeMacroInRoll20(doc, attrName, callback) {
    const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
    if (!addAbilBtn) {
        if (callback) callback();
        return;
    }

    addAbilBtn.click();

    setTimeout(() => {
        const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
        const newAbil = abils[abils.length - 1];

        if (newAbil) {
            const editBtn = newAbil.querySelector('.editabil');
            if (editBtn) editBtn.click();

            setTimeout(() => {
                const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
                const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');

                if (nameInput) {
                    nameInput.value = attrName.toLowerCase();
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                if (macroTextarea) {
                    macroTextarea.value = `#Atributo-${attrName}`;
                    macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                    macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                    macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                const saveBtn = newAbil.querySelector('.saveabil');
                if (saveBtn) saveBtn.click();

                setTimeout(() => {
                    if (callback) callback();
                }, 150);
            }, 150);
        } else {
            if (callback) callback();
        }
    }, 150);
}

function addNewMacroToRoll20(doc, prefix, promptMessage, customFullName = null) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    if (!navTabs) return;

    const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) return;

    attrTabNav.click();

    setTimeout(() => {
        let fullMacroName = customFullName;
        let cleanName = '';

        if (!fullMacroName) {
            const itemName = prompt(promptMessage);
            if (!itemName || !itemName.trim()) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }
            cleanName = itemName.trim();
            fullMacroName = `${prefix}_${cleanName}`;
        } else {
            cleanName = customFullName;
        }

        const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
        if (!addAbilBtn) {
            if (pinkDaggerNav) pinkDaggerNav.click();
            return;
        }

        addAbilBtn.click();

        setTimeout(() => {
            const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
            const newAbil = abils[abils.length - 1];

            if (newAbil) {
                const editBtn = newAbil.querySelector('.editabil');
                if (editBtn) editBtn.click();

                setTimeout(() => {
                    const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
                    const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');

                    if (nameInput) {
                        nameInput.value = fullMacroName;
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                        nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    }

                    if (macroTextarea) {
                        let templateKey = prefix;
                        let defaultTemplate = MACRO_TEMPLATES[templateKey] || MACRO_TEMPLATES.exp;
                        let customizedTemplate = defaultTemplate.replace(/\{\{name=[^\n\}]*/, `{{name=${cleanName}`);

                        macroTextarea.value = customizedTemplate;
                        macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                        macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                        macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
                    }

                    const saveBtn = newAbil.querySelector('.saveabil');
                    if (saveBtn) saveBtn.click();

                    setTimeout(() => {
                        if (pinkDaggerNav) pinkDaggerNav.click();
                        populateDaggerheartData(doc);
                    }, 200);
                }, 150);
            } else {
                if (pinkDaggerNav) pinkDaggerNav.click();
                populateDaggerheartData(doc);
            }
        }, 200);
    }, 150);
}

function addNewAttributeToRoll20(doc, attrName, promptMessage, defaultVal = "0", hasMax = false, isPrincipalTrait = false, skipPrompt = false) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    if (!navTabs) return;

    const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) return;

    attrTabNav.click();

    setTimeout(() => {
        // Se attrName não foi informado, pede o nome ao usuário
        let resolvedAttrName = attrName;
        if (!resolvedAttrName) {
            resolvedAttrName = prompt(promptMessage);
            if (!resolvedAttrName || !resolvedAttrName.trim()) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }
            resolvedAttrName = resolvedAttrName.trim();
        }

        let cleanVal = defaultVal;
        if (!skipPrompt) {
            const userVal = prompt(`Valor inicial para ${resolvedAttrName}:`, defaultVal);
            if (userVal === null) {
                if (pinkDaggerNav) pinkDaggerNav.click();
                return;
            }
            cleanVal = userVal.trim() || defaultVal;
        }

        const addAttribBtn = doc.querySelector('.attributesabilities .addattrib') || doc.querySelector('.addattrib');
        if (!addAttribBtn) {
            if (pinkDaggerNav) pinkDaggerNav.click();
            return;
        }

        addAttribBtn.click();

        setTimeout(() => {
            const attribs = doc.querySelectorAll('.attributesabilities .attributes .attrib');
            const newAttrib = attribs[attribs.length - 1];

            if (newAttrib) {
                const nameInput = newAttrib.querySelector('.attrname input') || newAttrib.querySelector('.attrname');
                const currentInput = newAttrib.querySelector('.current input');
                const maxInput = newAttrib.querySelector('.max input');

                if (nameInput) {
                    if (nameInput.tagName.toLowerCase() === 'input') {
                        nameInput.value = resolvedAttrName;
                    } else {
                        nameInput.innerText = resolvedAttrName;
                    }
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                if (currentInput) {
                    currentInput.value = cleanVal;
                    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
                    currentInput.dispatchEvent(new Event('change', { bubbles: true }));
                    currentInput.dispatchEvent(new Event('blur', { bubbles: true }));
                }

                if (maxInput && hasMax) {
                    maxInput.value = cleanVal;
                    maxInput.dispatchEvent(new Event('input', { bubbles: true }));
                    maxInput.dispatchEvent(new Event('change', { bubbles: true }));
                    maxInput.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }

            // Se for um Atributo Principal, adiciona o macro correspondente (#Atributo-Nome)
            if (isPrincipalTrait) {
                createAttributeMacroInRoll20(doc, resolvedAttrName, () => {
                    if (pinkDaggerNav) pinkDaggerNav.click();
                    populateDaggerheartData(doc);
                });
            } else {
                if (pinkDaggerNav) pinkDaggerNav.click();
                populateDaggerheartData(doc);
            }
        }, 200);
    }, 150);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Nome do personagem: texto do título da janela do Roll20 (ignorando os botões dentro dele),
// ou o campo de nome da ficha quando ela está em pop-out
function getSheetCharacterName(doc) {
    const titleElem = getSheetDialog(doc)?.querySelector('.ui-dialog-title');
    if (titleElem) {
        const titleText = Array.from(titleElem.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('')
            .trim();
        if (titleText) return titleText;
    }
    return doc.querySelector('input.name')?.value?.trim() || '';
}

function findAbilityElementByName(doc, abilName) {
    const target = abilName.trim().toLowerCase();
    return Array.from(doc.querySelectorAll('.attributesabilities .abilities .abil')).find(abil => {
        const name = abil.querySelector('.abilname')?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
        return name.toLowerCase() === target;
    }) || null;
}

// Renomeia um macro na aba nativa (ex.: dom_X -> vau_X). Retorna true se conseguiu.
async function renameAbilityInRoll20(doc, oldName, newName) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    const attrTabNav = navTabs?.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs?.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) return false;

    attrTabNav.click();
    await delay(150);

    let renamed = false;
    const abil = findAbilityElementByName(doc, oldName);
    if (abil) {
        const editBtn = abil.querySelector('.editabil');
        if (editBtn) editBtn.click();
        await delay(150);

        const nameInput = abil.querySelector('.abilname input') || abil.querySelector('input.abilname');
        if (nameInput) {
            nameInput.value = newName;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
            renamed = true;
        }

        const saveBtn = abil.querySelector('.saveabil');
        if (saveBtn) saveBtn.click();
        await delay(150);
    }

    if (pinkDaggerNav) pinkDaggerNav.click();
    populateDaggerheartData(doc);
    return renamed;
}

function abilityExistsInRoll20(doc, abilName) {
    const target = abilName.trim().toLowerCase();
    return Array.from(doc.querySelectorAll('.attributesabilities .abilities .abil')).some(abil => {
        const name = abil.querySelector('.abilname')?.innerText?.trim() || (abil.querySelector('.abilname input')?.value?.trim() || '');
        return name.toLowerCase() === target;
    });
}

// Executa o macro; se ele ainda não existir na aba nativa, cria antes de executar
async function ensureMacroAndTrigger(doc, abilName, abilAction) {
    if (!abilityExistsInRoll20(doc, abilName)) {
        const navTabs = doc.querySelector('.nav.nav-tabs');
        const attrTabNav = navTabs?.querySelector('a[data-tab="attributesabilities"]');
        const pinkDaggerNav = navTabs?.querySelector('a[data-tab="daggerheart"]');
        const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
        if (!attrTabNav || !addAbilBtn) return;

        attrTabNav.click();
        await delay(150);
        addAbilBtn.click();
        await delay(200);

        const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
        const newAbil = abils[abils.length - 1];
        if (newAbil) {
            const editBtn = newAbil.querySelector('.editabil');
            if (editBtn) editBtn.click();
            await delay(150);

            const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
            const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');

            if (nameInput) {
                nameInput.value = abilName;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (macroTextarea) {
                macroTextarea.value = abilAction;
                macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            const saveBtn = newAbil.querySelector('.saveabil');
            if (saveBtn) saveBtn.click();
            await delay(200);
        }

        if (pinkDaggerNav) pinkDaggerNav.click();
        await delay(150);
    }

    triggerRollForAbilityName(doc, abilName);
}

async function importNpcBatchToRoll20(doc, parsedData, onProgress) {
    const navTabs = doc.querySelector('.nav.nav-tabs');
    if (!navTabs) return;

    const attrTabNav = navTabs.querySelector('a[data-tab="attributesabilities"]');
    const pinkDaggerNav = navTabs.querySelector('a[data-tab="daggerheart"]');
    if (!attrTabNav) return;

    // Atualiza o nome do personagem se detectado no livro
    if (parsedData.name) {
        const charNameInput = doc.querySelector('input.name');
        if (charNameInput && (!charNameInput.value || charNameInput.value.trim() === '' || charNameInput.value.trim().toLowerCase() === 'personagem sem nome')) {
            charNameInput.value = parsedData.name;
            charNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            charNameInput.dispatchEvent(new Event('change', { bubbles: true }));
            charNameInput.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    }

    if (onProgress) onProgress('Acessando dados no Roll20...');
    attrTabNav.click();
    await delay(200);

    // Lista de atributos a criar
    const attributesToCreate = [
        { name: 'pinkdagger_npc', current: '1', hasMax: false },
        { name: 'Tipo', current: parsedData.tipo || 'Solo', hasMax: false },
        { name: 'Tier', current: parsedData.tier || '1', hasMax: false },
        { name: 'Flavor', current: parsedData.flavor || '', hasMax: false },
        { name: 'Motiv_Tatic', current: parsedData.motiv_tatic || '', hasMax: false },
        { name: 'Dificuldade', current: parsedData.dificuldade || '10', hasMax: false },
        { name: 'Limiares', current: parsedData.limiares || 'Nenhum', hasMax: false },
        { name: 'Vida', current: parsedData.vida || '1', max: parsedData.vida || '1', hasMax: true },
        { name: 'Fadiga', current: parsedData.fadiga || '1', max: parsedData.fadiga || '1', hasMax: true },
        { name: 'Atq', current: parsedData.atq || '0', hasMax: false },
        { name: 'Nome_Ataque', current: parsedData.nome_ataque || 'Ataque', hasMax: false },
        { name: 'Alcance', current: parsedData.alcance || 'corpo a corpo', hasMax: false },
        { name: 'Dano', current: parsedData.dano || '1d6', hasMax: false },
        { name: 'Tipo_Dano', current: parsedData.tipo_dano || 'fís', hasMax: false }
    ];

    // Se limiares vier no formato 29/55, também grava limiar-menor e limiar-maior para compatibilidade
    if (parsedData.limiares && parsedData.limiares.includes('/')) {
        const parts = parsedData.limiares.split('/');
        attributesToCreate.push({ name: 'Limiar-Menor', current: parts[0].trim(), hasMax: false });
        attributesToCreate.push({ name: 'Limiar-Maior', current: parts[1].trim(), hasMax: false });
    }

    // 1. Criar atributos
    for (let i = 0; i < attributesToCreate.length; i++) {
        const attr = attributesToCreate[i];
        if (onProgress) onProgress(`Cadastrando atributo ${attr.name} (${i + 1}/${attributesToCreate.length})...`);

        const addAttribBtn = doc.querySelector('.attributesabilities .addattrib') || doc.querySelector('.addattrib');
        if (!addAttribBtn) continue;
        addAttribBtn.click();
        await delay(120);

        const attribs = doc.querySelectorAll('.attributesabilities .attributes .attrib');
        const newAttrib = attribs[attribs.length - 1];
        if (newAttrib) {
            const nameInput = newAttrib.querySelector('.attrname input') || newAttrib.querySelector('.attrname');
            const currentInput = newAttrib.querySelector('.current input');
            const maxInput = newAttrib.querySelector('.max input');

            if (nameInput) {
                if (nameInput.tagName.toLowerCase() === 'input') nameInput.value = attr.name;
                else nameInput.innerText = attr.name;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (currentInput) {
                currentInput.value = attr.current;
                currentInput.dispatchEvent(new Event('input', { bubbles: true }));
                currentInput.dispatchEvent(new Event('change', { bubbles: true }));
                currentInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (maxInput && attr.hasMax) {
                maxInput.value = attr.max || attr.current;
                maxInput.dispatchEvent(new Event('input', { bubbles: true }));
                maxInput.dispatchEvent(new Event('change', { bubbles: true }));
                maxInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }
    }

    // 2. Lista de macros a criar
    const abilitiesToCreate = [];

    // Macro de Ataque
    abilitiesToCreate.push({
        name: 'Ataque',
        action: `&{template:default} {{name=@{nome_ataque}\n}} {{Ataque=[[d20+@{atq}]]\n}} {{Alcance=@{alcance}\n}} {{Dano=[[@{dano}]] @{tipo_dano}\n}}`
    });

    // Macros de Experiências
    if (parsedData.experiencias && parsedData.experiencias.length > 0) {
        parsedData.experiencias.forEach(exp => {
            abilitiesToCreate.push({
                name: `exp_${exp.name}`,
                action: `&{template:default} {{name=${exp.name}\n}} {{Modificador=${exp.mod}\n}}`
            });
        });
    }

    // Macros de Habilidades
    if (parsedData.habilidades && parsedData.habilidades.length > 0) {
        parsedData.habilidades.forEach(hab => {
            abilitiesToCreate.push({
                name: `hab_${hab.name}`,
                action: `&{template:default} {{name=${hab.name}\n}} {{Efeito=${hab.desc}\n}}`
            });
        });
    }

    // Criar macros
    for (let i = 0; i < abilitiesToCreate.length; i++) {
        const abil = abilitiesToCreate[i];
        if (onProgress) onProgress(`Cadastrando macro ${abil.name} (${i + 1}/${abilitiesToCreate.length})...`);

        const addAbilBtn = doc.querySelector('.attributesabilities .addabil') || doc.querySelector('.addabil');
        if (!addAbilBtn) continue;
        addAbilBtn.click();
        await delay(150);

        const abils = doc.querySelectorAll('.attributesabilities .abilities .abil');
        const newAbil = abils[abils.length - 1];
        if (newAbil) {
            const editBtn = newAbil.querySelector('.editabil');
            if (editBtn) editBtn.click();
            await delay(120);

            const nameInput = newAbil.querySelector('.abilname input') || newAbil.querySelector('input.abilname');
            const macroTextarea = newAbil.querySelector('textarea.action') || newAbil.querySelector('textarea');

            if (nameInput) {
                nameInput.value = abil.name;
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                nameInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (macroTextarea) {
                macroTextarea.value = abil.action;
                macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                macroTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            const saveBtn = newAbil.querySelector('.saveabil');
            if (saveBtn) saveBtn.click();
            await delay(120);
        }
    }

    if (onProgress) onProgress('Finalizando importação...');
    await delay(250);
    if (pinkDaggerNav) pinkDaggerNav.click();
    populateDaggerheartData(doc);
}

