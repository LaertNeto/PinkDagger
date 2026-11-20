const COMBAT_MENU_ID = 'pinkdagger-combat-calculator';
const UPDATE_MENU_ID = 'pinkdagger-check-updates';
const UPDATED_FLAG_KEY = 'pinkdaggerJustUpdated';

const POPUP_PAGES = {
    [COMBAT_MENU_ID]: { url: 'combat.html', windowKey: 'combatCalculatorWindowId', width: 500, height: 860 },
    [UPDATE_MENU_ID]: { url: 'update.html', windowKey: 'updateWindowId', width: 480, height: 560 }
};

chrome.runtime.onInstalled.addListener(async () => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: COMBAT_MENU_ID,
            title: 'Calculadora de Combate',
            contexts: ['action']
        });
        chrome.contextMenus.create({
            id: UPDATE_MENU_ID,
            title: 'Verificar atualizações',
            contexts: ['action']
        });
    });

    // Depois que o auxiliar atualiza os arquivos, a extensão se recarrega e cai aqui
    const { [UPDATED_FLAG_KEY]: justUpdated } = await chrome.storage.local.get(UPDATED_FLAG_KEY);
    if (!justUpdated) return;
    await chrome.storage.local.remove(UPDATED_FLAG_KEY);
    openPopupPage(POPUP_PAGES[UPDATE_MENU_ID], 'update.html?updated=1');
});

chrome.contextMenus.onClicked.addListener((info) => {
    const page = POPUP_PAGES[info.menuItemId];
    if (page) openPopupPage(page);
});

async function openPopupPage(page, url = page.url) {
    // Reaproveita a janela já aberta; se ela foi fechada, o update falha e outra é criada
    const { [page.windowKey]: windowId } = await chrome.storage.session.get(page.windowKey);
    if (windowId !== undefined) {
        try {
            if (url !== page.url) {
                const [tab] = await chrome.tabs.query({ windowId });
                if (tab) await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(url) });
            }
            await chrome.windows.update(windowId, { focused: true });
            return;
        } catch (err) {}
    }

    const popup = await chrome.windows.create({
        url: chrome.runtime.getURL(url),
        type: 'popup',
        width: page.width,
        height: page.height
    });
    await chrome.storage.session.set({ [page.windowKey]: popup.id });
}
