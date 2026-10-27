// Dock: fixa a janela de uma ficha no canto inferior direito do Roll20, mostrando só a aba PinkDagger
const DOCK_STORAGE_KEY = 'pinkdagger_dock_size';
const DOCK_DEFAULT_SIZE = { width: 420, height: 560 };
const DOCK_MIN_SIZE = { width: 280, height: 200 };
const DOCK_MARGIN = 16;

const DOCK_TOP_STYLES = `
.ui-dialog.pd-docked {
    position: fixed !important;
    top: auto !important;
    left: auto !important;
    right: var(--pd-dock-right, ${DOCK_MARGIN}px) !important;
    bottom: ${DOCK_MARGIN}px !important;
    width: var(--pd-dock-w) !important;
    height: var(--pd-dock-h) !important;
    padding: 0 !important;
    border: 2px solid #E85D9E !important;
    border-radius: 8px !important;
    overflow: hidden !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6) !important;
}
.ui-dialog.pd-docked > :not(.ui-dialog-content):not(.pd-dock-resize) {
    display: none !important;
}
.ui-dialog.pd-docked .ui-dialog-content {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
}
.ui-dialog.pd-docked iframe {
    width: 100% !important;
    height: 100% !important;
}
.ui-dialog.pd-docked.pd-dock-resizing iframe {
    pointer-events: none;
}
.pd-dock-resize {
    position: absolute;
    top: 0;
    left: 0;
    width: 18px;
    height: 18px;
    cursor: nwse-resize;
    touch-action: none;
    z-index: 10;
    background: linear-gradient(135deg, #E85D9E 0 50%, transparent 50%);
    opacity: 0.8;
}
.pd-dock-resize:hover {
    opacity: 1;
}
`;

function getSheetDialog(doc) {
    const frame = doc.defaultView?.frameElement;
    return frame ? frame.closest('.ui-dialog') : null;
}

function injectDockStyles(topDoc) {
    if (topDoc.getElementById('pd-dock-styles')) return;
    const styleEl = topDoc.createElement('style');
    styleEl.id = 'pd-dock-styles';
    styleEl.textContent = DOCK_TOP_STYLES;
    topDoc.head.appendChild(styleEl);
}

// Distância da borda direita da janela até o lado esquerdo da barra lateral do Roll20
function getDockRightOffset(topDoc) {
    const win = topDoc.defaultView;
    const sidebar = topDoc.querySelector('#rightsidebar, #rightbar, .rightbar');
    if (sidebar && sidebar.offsetWidth > 0) {
        const left = sidebar.getBoundingClientRect().left;
        if (left > 0 && left < win.innerWidth) return win.innerWidth - left + DOCK_MARGIN;
    }
    return DOCK_MARGIN;
}

function clampDockSize(win, size) {
    const maxW = win.innerWidth - getDockRightOffset(win.document) - DOCK_MARGIN;
    const maxH = win.innerHeight - DOCK_MARGIN * 2;
    return {
        width: Math.max(DOCK_MIN_SIZE.width, Math.min(size.width, maxW)),
        height: Math.max(DOCK_MIN_SIZE.height, Math.min(size.height, maxH))
    };
}

function loadDockSize(win) {
    try {
        const saved = JSON.parse(win.localStorage.getItem(DOCK_STORAGE_KEY));
        if (saved && saved.width && saved.height) return clampDockSize(win, saved);
    } catch (err) {}
    return clampDockSize(win, DOCK_DEFAULT_SIZE);
}

function saveDockSize(win, size) {
    try {
        win.localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(size));
    } catch (err) {}
}

function applyDockSize(dialog, size) {
    dialog.style.setProperty('--pd-dock-w', `${size.width}px`);
    dialog.style.setProperty('--pd-dock-h', `${size.height}px`);
}

function setupDockResize(dialog) {
    const topDoc = dialog.ownerDocument;
    const win = topDoc.defaultView;
    const handle = topDoc.createElement('div');
    handle.className = 'pd-dock-resize';
    handle.title = 'Arraste para redimensionar (duplo clique restaura o tamanho padrão)';
    dialog.appendChild(handle);

    handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = dialog.offsetWidth;
        const startH = dialog.offsetHeight;
        let size = { width: startW, height: startH };

        // Captura o ponteiro: move/up chegam na alça mesmo sobre o canvas, iframes ou fora da janela
        handle.setPointerCapture(e.pointerId);

        // Ancorada no canto inferior direito: arrastar para cima/esquerda aumenta
        const onMove = (ev) => {
            // Rede de segurança: se o botão não está mais pressionado, encerra o redimensionamento
            if (ev.buttons === 0) {
                onEnd();
                return;
            }
            size = clampDockSize(win, {
                width: startW + (startX - ev.clientX),
                height: startH + (startY - ev.clientY)
            });
            applyDockSize(dialog, size);
        };
        const onEnd = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onEnd);
            handle.removeEventListener('pointercancel', onEnd);
            handle.removeEventListener('lostpointercapture', onEnd);
            win.removeEventListener('blur', onEnd);
            if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
            dialog.classList.remove('pd-dock-resizing');
            saveDockSize(win, size);
        };

        dialog.classList.add('pd-dock-resizing');
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onEnd);
        handle.addEventListener('pointercancel', onEnd);
        handle.addEventListener('lostpointercapture', onEnd);
        win.addEventListener('blur', onEnd);
    });

    handle.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const size = clampDockSize(win, DOCK_DEFAULT_SIZE);
        applyDockSize(dialog, size);
        saveDockSize(win, size);
    });
}

function updateDockButton(doc) {
    const btn = doc.getElementById('dh-dock-btn');
    if (!btn) return;
    const docked = doc.body.classList.contains('dh-docked');
    btn.classList.toggle('dh-title-btn-active', docked);
    btn.title = docked ? 'Desafixar ficha' : 'Fixar ficha no canto da tela';
}

function updateDockPosition(dialog) {
    dialog.style.setProperty('--pd-dock-right', `${getDockRightOffset(dialog.ownerDocument)}px`);
}

function undockDialog(dialog) {
    clearInterval(dialog._pdDockPositionTimer);
    dialog.classList.remove('pd-docked', 'pd-dock-resizing');
    dialog.style.removeProperty('--pd-dock-right');
    dialog.style.removeProperty('--pd-dock-w');
    dialog.style.removeProperty('--pd-dock-h');
    dialog.querySelector('.pd-dock-resize')?.remove();

    const sheetDoc = dialog.querySelector('iframe')?.contentDocument;
    if (sheetDoc) {
        sheetDoc.body.classList.remove('dh-docked');
        updateDockButton(sheetDoc);
    }
}

function dockSheet(doc) {
    const dialog = getSheetDialog(doc);
    if (!dialog) return;
    const topDoc = dialog.ownerDocument;
    injectDockStyles(topDoc);

    // Apenas uma ficha fixada por vez
    topDoc.querySelectorAll('.ui-dialog.pd-docked').forEach(other => {
        if (other !== dialog) undockDialog(other);
    });

    applyDockSize(dialog, loadDockSize(topDoc.defaultView));
    updateDockPosition(dialog);
    dialog.classList.add('pd-docked');
    // A barra lateral pode ser recolhida ou redimensionada a qualquer momento.
    // O timer se encerra sozinho ao desafixar: quem desafixa pode ser o script de outra ficha
    // (outro iframe), que não enxerga nem consegue limpar o timer deste
    clearInterval(dialog._pdDockPositionTimer);
    const positionTimer = setInterval(() => {
        if (!dialog.isConnected || !dialog.classList.contains('pd-docked')) {
            clearInterval(positionTimer);
            return;
        }
        updateDockPosition(dialog);
    }, 500);
    dialog._pdDockPositionTimer = positionTimer;
    if (!dialog.querySelector('.pd-dock-resize')) setupDockResize(dialog);

    doc.body.classList.add('dh-docked');
    doc.querySelector('.nav.nav-tabs a[data-tab="daggerheart"]')?.click();
    updateDockButton(doc);
}

function toggleDock(doc) {
    const dialog = getSheetDialog(doc);
    if (!dialog) return;
    if (dialog.classList.contains('pd-docked')) {
        undockDialog(dialog);
    } else {
        dockSheet(doc);
    }
}
