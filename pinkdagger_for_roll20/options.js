const autoOpenCheckbox = document.getElementById('auto-open-tab');

chrome.storage.local.get(EXTENSION_OPTIONS_DEFAULTS, (options) => {
    autoOpenCheckbox.checked = options.autoOpenTab;
});

autoOpenCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ autoOpenTab: autoOpenCheckbox.checked });
});
