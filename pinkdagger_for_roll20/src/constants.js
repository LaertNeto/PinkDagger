// Templates de macros padrão para novos itens
const MACRO_TEMPLATES = {
    anc: `&{template:default} {{name=Nome da Ancestralidade\n}} {{Nome do Efeito 1=Efeito ou bônus concedido.\n}} {{Nome do Efeito 2=Efeito ou bônus concedido.\n}}`,
    com: `&{template:default} {{name=Nome da Comunidade\n}} {{Nome do Efeito=Efeito ou bônus concedido.\n}}`,
    cla: `&{template:default} {{name=Nome da Classe\n}} {{Nome da habilidade=O que a habilidade faz.\n}}`,
    sub: `&{template:default} {{name=Nome da Subclasse\n}} {{Conjuração=Atributo\n}} {{Nome do Efeito=O que a habilidade faz.\n}}`,
    esp: `&{template:default} {{name=Nome da Habilidade\n}} {{O que a habilidade faz.\n}}`,
    wea: `#Atributo-Agilidade &{template:default} {{name=Nome da Arma\n}} {{dano=[[@{proficiência}d8 + 0]]\n}} {{desc=<OPCIONAL> Efeito crítico ou alcance.\n}}`,
    dom: `&{template:default} {{name=Nome da Carta\n}} {{Nível=1\n}} {{Custo=0\n}} {{Descrição=O que a carta de domínio faz.\n}}`,
    exp: `&{template:default} {{name=Nome da Experiência\n}} {{Modificador=+2\n}}`,
    inv: `Itens:`,
    txt: ``,
    ataque: `&{template:default} {{name=Ataque\n}} {{Ataque=[[d20+@{atq}]]\n}} {{Dano=[[@{dano}]] @{tipo_dano}\n}}`,
    hab: `&{template:default} {{name=Nome da Habilidade\n}} {{Efeito=O que a habilidade faz.\n}}`,
    companion_attack: `&{template:default} {{name=Nome do Ataque\n}} {{Ataque=[[d20+@{atq}]]\n}} {{dano=[[@{proficiência}d6]]\n}}`
};

// Macros da ficha de Medo (executadas após alterar o atributo, por isso o valor antigo é calculado a partir do novo)
const FEAR_MACROS = {
    menos: {
        name: 'Menos-Medo',
        action: (attr) => `&{template:default} {{name=😱 O Mestre gastou Medo\n}} {{Medo=[[@{${attr}}+1]] → [[@{${attr}}]]\n}}`
    },
    mais: {
        name: 'Mais-Medo',
        action: (attr) => `&{template:default} {{name=💀 O Mestre ganhou Medo\n}} {{Medo=[[@{${attr}}-1]] → [[@{${attr}}]]\n}}`
    }
};
const FEAR_DEFAULT_MAX = 12;

// Configurações do usuário (salvas no navegador, valem para todas as fichas)
const SETTINGS_STORAGE_KEY = 'pinkdagger_settings';
const SETTINGS_DEFAULTS = {
    cardView: 'detailed' // 'detailed' | 'simple'
};

// Opções da página de configurações da extensão (chrome.storage: o localStorage do Roll20 não é visível nessa página)
const EXTENSION_OPTIONS_DEFAULTS = {
    autoOpenTab: true
};

// Atributos que marcam a ficha como já configurada para o PinkDagger
const SHEET_TYPE_MARKERS = ['pinkdagger_pc', 'pinkdagger_npc', 'pinkdagger_fear', 'pinkdagger_companion'];

// Altura das caixas de texto de macro (salva no navegador, por personagem e macro)
const TEXTAREA_HEIGHTS_STORAGE_KEY = 'pinkdagger_textarea_heights';

// Atributos principais e recursos/trackers fixos do sistema Daggerheart
const FIXED_TRAITS = ['agilidade', 'força', 'acuidade', 'instinto', 'presença', 'conhecimento'];
const FIXED_TRACKERS = ['vida', 'fadiga', 'armadura', 'esperança'];

