const GITHUB_REPO = 'LaertNeto/PinkDagger';
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const NATIVE_HOST = 'com.pinkdagger.updater';
const UPDATED_FLAG_KEY = 'pinkdaggerJustUpdated';

const currentVersion = chrome.runtime.getManifest().version;

const els = {
    updatedBanner: document.getElementById('updated-banner'),
    currentVersion: document.getElementById('current-version'),
    latestVersion: document.getElementById('latest-version'),
    releaseStatus: document.getElementById('release-status'),
    helperStatus: document.getElementById('helper-status'),
    updateBtn: document.getElementById('update-btn'),
    notesSection: document.getElementById('notes-section'),
    releaseNotes: document.getElementById('release-notes')
};

// Cada parágrafo é uma lista de pedaços: texto puro, { code } ou { link, text }
function setStatus(el, kind, paragraphs) {
    el.className = `status ${kind}`;
    el.hidden = false;
    el.replaceChildren(...paragraphs.map((parts) => {
        const p = document.createElement('p');
        for (const part of [].concat(parts)) {
            if (typeof part === 'string') {
                p.append(part);
            } else if (part.code) {
                const code = document.createElement('code');
                code.textContent = part.code;
                p.append(code);
            } else if (part.link) {
                const a = document.createElement('a');
                a.href = part.link;
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = part.text;
                p.append(a);
            }
        }
        return p;
    }));
}

function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, '').split('.').map(Number);
    const pb = String(b).replace(/^v/i, '').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

async function fetchLatestRelease() {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
    });
    if (!response.ok) throw new Error(`GitHub respondeu ${response.status}`);
    return response.json();
}

async function callHelper(action) {
    try {
        return await chrome.runtime.sendNativeMessage(NATIVE_HOST, { action });
    } catch (err) {
        return { ok: false, error: 'native', detail: err.message || String(err) };
    }
}

const INSTALL_STEPS = [
    ['Para atualizar com um clique, instale o auxiliar uma vez:'],
    ['1. Abra a pasta da extensão, entre em ', { code: 'updater' }, ' e dê dois cliques em ', { code: 'instalar.bat' }, '.'],
    ['2. Recarregue a extensão em ', { code: 'chrome://extensions' }, ' (ou ', { code: 'edge://extensions' }, ') e abra esta janela de novo.']
];

// Traduz a resposta do auxiliar em uma mensagem; devolve true se ele pode atualizar
function showHelperStatus(result) {
    if (result.ok && result.gitRepo) {
        setStatus(els.helperStatus, 'warn', [
            ['A pasta da extensão é um repositório git, então o auxiliar não vai sobrescrevê-la.'],
            ['Atualize com ', { code: 'git pull' }, ' e recarregue a extensão.']
        ]);
        return false;
    }
    if (result.ok) {
        setStatus(els.helperStatus, 'ok', [['Auxiliar de atualização instalado ✓']]);
        return true;
    }

    const detail = result.detail || '';
    if (/not found|no such native application/i.test(detail)) {
        setStatus(els.helperStatus, 'warn', INSTALL_STEPS);
    } else if (/forbidden/i.test(detail)) {
        setStatus(els.helperStatus, 'warn', [
            ['O auxiliar está instalado, mas não reconheceu esta extensão. Rode na pasta ', { code: 'updater' }, ':'],
            [{ code: `instalar.bat -ExtensionId ${chrome.runtime.id}` }]
        ]);
    } else if (result.error === 'config_missing') {
        setStatus(els.helperStatus, 'error', [['A instalação do auxiliar está incompleta. Rode o ', { code: 'instalar.bat' }, ' de novo.']]);
    } else {
        setStatus(els.helperStatus, 'error', [['Erro ao falar com o auxiliar:'], [{ code: detail || result.error }]]);
    }
    return false;
}

function showUpdateError(result) {
    const messages = {
        git_repo: [['A pasta é um repositório git; use ', { code: 'git pull' }, '.']],
        extension_dir_invalid: [['O auxiliar não achou a extensão em ', { code: result.detail }, '. Rode o ', { code: 'instalar.bat' }, ' de novo.']],
        manifest_not_found: [['A release baixada não contém a extensão. Baixe manualmente em ', { link: RELEASES_URL, text: 'GitHub' }, '.']]
    };
    setStatus(els.releaseStatus, 'error', messages[result.error] || [
        ['A atualização falhou. Nenhum arquivo ficou pela metade: o auxiliar restaura a versão anterior em caso de erro.'],
        [{ code: result.detail || result.error }]
    ]);
}

async function runUpdate() {
    els.updateBtn.disabled = true;
    els.updateBtn.textContent = 'Baixando e instalando…';
    setStatus(els.releaseStatus, 'highlight', [['Baixando a nova versão do GitHub. Não feche esta janela.']]);

    const result = await callHelper('update');
    if (!result.ok) {
        showUpdateError(result);
        els.updateBtn.disabled = false;
        els.updateBtn.textContent = 'Tentar de novo';
        return;
    }

    await chrome.storage.local.set({ [UPDATED_FLAG_KEY]: result.version });
    els.updateBtn.textContent = 'Recarregando a extensão…';
    setStatus(els.releaseStatus, 'ok', [[`Arquivos atualizados para a versão ${result.version}. Recarregando a extensão…`]]);
    setTimeout(() => chrome.runtime.reload(), 1200);
}

async function init() {
    els.currentVersion.textContent = currentVersion;

    if (new URLSearchParams(location.search).has('updated')) {
        setStatus(els.updatedBanner, 'ok', [
            [`PinkDagger atualizado para a versão ${currentVersion}!`],
            ['Agora é só dar F5 na aba do Roll20.']
        ]);
    }

    const [releaseResult, helperResult] = await Promise.allSettled([fetchLatestRelease(), callHelper('ping')]);

    if (releaseResult.status === 'rejected') {
        els.latestVersion.textContent = '?';
        setStatus(els.releaseStatus, 'error', [
            ['Não foi possível consultar o GitHub agora.'],
            [{ code: releaseResult.reason.message }],
            ['Confira em ', { link: RELEASES_URL, text: 'github.com' }, '.']
        ]);
        return;
    }

    const release = releaseResult.value;
    const latestVersion = release.tag_name.replace(/^v/i, '');
    els.latestVersion.textContent = latestVersion;

    if (compareVersions(latestVersion, currentVersion) <= 0) {
        setStatus(els.releaseStatus, 'ok', [['Você já está com a versão mais recente.']]);
        return;
    }

    setStatus(els.releaseStatus, 'highlight', [
        [`Nova versão disponível: ${latestVersion}. `, { link: release.html_url, text: 'Ver no GitHub' }]
    ]);
    if (release.body) {
        els.releaseNotes.textContent = release.body.replace(/\r\n/g, '\n');
        els.notesSection.hidden = false;
    }

    const helperReady = showHelperStatus(helperResult.value);
    els.updateBtn.hidden = false;
    els.updateBtn.disabled = !helperReady;
    els.updateBtn.addEventListener('click', runUpdate);
}

init();
