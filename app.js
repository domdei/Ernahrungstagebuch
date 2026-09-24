const STORAGE_KEY = 'ernaehrungstagebuch-diary-v1';
const DRAFT_STORAGE_KEY = 'ernaehrungstagebuch-draft-v1';
const THEME_STORAGE_KEY = 'ernaehrungstagebuch-theme';
const FOOD_DB_PATH = './food-data.json';
const APP_VERSION_PATH = './version.json';
const MAX_SUGGESTIONS = 20;
const ROTATION_WARNING_DAYS = 3;
const BACKUP_FILENAME_PREFIX = 'backup';

const state = {
    foods: [],
    entries: [],
    selectedFoods: [],
    selectedDate: getTodayString(),
    filterFromDate: getDefaultHistoryFromDate(),
    filterToDate: getTodayString(),
    filterDate: '',
    searchCategory: 'all',
    onlyFreshGreen: false,
    filterCategory: 'all',
    filterStatus: 'all',
    historyMode: false,
    historyDeleteMode: false,
};

const ui = {
    entryDate: document.getElementById('entryDate'),
    todayButton: document.getElementById('todayButton'),
    searchCategory: document.getElementById('searchCategory'),
    categoryClearButton: document.getElementById('categoryClearButton'),
    onlyFreshGreenFoods: document.getElementById('onlyFreshGreenFoods'),
    searchField: document.getElementById('searchField'),
    foodSearchLabel: document.getElementById('foodSearchLabel'),
    searchCloseButton: document.getElementById('searchCloseButton'),
    searchClearButton: document.getElementById('searchClearButton'),
    searchDoneButton: document.getElementById('searchDoneButton'),
    overlaySelectedFoods: document.getElementById('overlaySelectedFoods'),
    foodSearch: document.getElementById('foodSearch'),
    suggestions: document.getElementById('suggestions'),
    selectedFoods: document.getElementById('selectedFoods'),
    selectionWarnings: document.getElementById('selectionWarnings'),
    saveButton: document.getElementById('saveButton'),
    historyList: document.getElementById('historyList'),
    historyFilters: document.getElementById('historyFilters'),
    historyModeToggle: document.getElementById('historyModeToggle'),
    filterFromDate: document.getElementById('filterFromDate'),
    filterToDate: document.getElementById('filterToDate'),
    filterCategory: document.getElementById('filterCategory'),
    filterStatus: document.getElementById('filterStatus'),
    historyDeleteToggle: document.getElementById('historyDeleteToggle'),
    themeToggle: document.getElementById('themeToggle'),
    settingsButton: document.getElementById('settingsButton'),
    settingsModal: document.getElementById('settingsModal'),
    settingsCloseButton: document.getElementById('settingsCloseButton'),
    storageStatus: document.getElementById('storageStatus'),
    installButton: document.getElementById('installButton'),
    exportJsonButton: document.getElementById('exportJsonButton'),
    importFile: document.getElementById('importFile'),
    appVersion: document.getElementById('appVersion'),
    importModal: document.getElementById('importModal'),
    importModalTitle: document.getElementById('importModalTitle'),
    importModalText: document.getElementById('importModalText'),
    importMergeButton: document.getElementById('importMergeButton'),
    importReplaceButton: document.getElementById('importReplaceButton'),
    importCancelButton: document.getElementById('importCancelButton'),
};

let deferredPrompt = null;
let isSearchOverlayOpen = false;

function isMobileView() {
    return window.matchMedia('(max-width: 760px), (max-height: 500px)').matches;
}

function updateSearchClearButton() {
    if (!ui.searchClearButton) {
        return;
    }
    const hasText = Boolean(ui.foodSearch && ui.foodSearch.value.length > 0);
    ui.searchClearButton.classList.toggle('hidden', !hasText);
}

function updateSearchDoneButton() {
    if (!ui.searchDoneButton) {
        return;
    }
    const count = state.selectedFoods.length;
    ui.searchDoneButton.textContent = count > 0 ? `Fertig (${count})` : 'Fertig';
}

function updateOverlaySelectedFoods() {
    if (!ui.overlaySelectedFoods) {
        return;
    }
    if (!state.selectedFoods.length) {
        ui.overlaySelectedFoods.innerHTML = '';
        ui.overlaySelectedFoods.classList.add('hidden');
        return;
    }

    const chips = state.selectedFoods
        .map((foodName) => {
            const food = getFoodByName(foodName);
            const status = food ? food.status : 'green';
            return `
        <div class="selection-chip">
          <span class="badge badge-${status}"></span>
          <span>${escapeHtml(foodName)}</span>
          <button type="button" class="remove-chip" data-name="${escapeHtml(foodName)}" aria-label="Entfernen">×</button>
        </div>
      `;
        })
        .join('');

    ui.overlaySelectedFoods.innerHTML = chips;
    ui.overlaySelectedFoods.classList.remove('hidden');
}

function updateCategoryClearButton() {
    if (!ui.categoryClearButton || !ui.searchCategory) {
        return;
    }
    const hasFilter = ui.searchCategory.value !== 'all';
    ui.categoryClearButton.classList.toggle('hidden', !hasFilter);
    const wrap = ui.searchCategory.closest('.category-input-inner');
    if (wrap) {
        wrap.classList.toggle('has-selection', hasFilter);
    }
}

function openSettingsModal() {
    if (!ui.settingsModal) {
        return;
    }
    ui.settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    if (!ui.settingsModal) {
        return;
    }
    ui.settingsModal.classList.add('hidden');
}

async function initPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        try {
            let isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                isPersisted = await navigator.storage.persist();
            }
            updateStorageStatus(isPersisted);
        } catch (e) {
            console.warn('Storage persist check failed:', e);
            updateStorageStatus(false);
        }
    } else {
        updateStorageStatus(null);
    }
}

function updateStorageStatus(persisted) {
    if (!ui.storageStatus) {
        return;
    }
    if (persisted === true) {
        ui.storageStatus.textContent = 'Dauerhaft gesichert (Persisted)';
        ui.storageStatus.style.color = 'var(--green)';
    } else if (persisted === false) {
        ui.storageStatus.textContent = 'Standard (Nicht geschützt)';
        ui.storageStatus.style.color = 'var(--orange)';
    } else {
        ui.storageStatus.textContent = 'Standard';
        ui.storageStatus.style.color = '';
    }
}

function openSearchOverlay() {
    if (isSearchOverlayOpen) {
        return;
    }
    if (!isMobileView()) {
        return;
    }

    isSearchOverlayOpen = true;
    document.body.classList.add('search-overlay-active');
    updateSearchClearButton();
    updateOverlaySelectedFoods();
    updateSearchDoneButton();
    renderSuggestionList(ui.foodSearch.value.trim());

    try {
        window.history.pushState({ searchOverlay: true }, '');
    } catch (e) {}
}

function closeSearchOverlay(fromPopState = false) {
    if (!isSearchOverlayOpen) {
        if (ui.foodSearch) {
            ui.foodSearch.blur();
        }
        return;
    }

    isSearchOverlayOpen = false;
    document.body.classList.remove('search-overlay-active');
    if (ui.foodSearch) {
        ui.foodSearch.blur();
    }

    if (!fromPopState) {
        try {
            if (window.history.state && window.history.state.searchOverlay) {
                window.history.back();
            }
        } catch (e) {}
    }

    if (ui.foodSearch) {
        ui.foodSearch.value = '';
    }
    updateSearchClearButton();
    updateOverlaySelectedFoods();
    updateSearchDoneButton();
    persistDraftState();
    renderSelectedFoods();

    if (ui.suggestions) {
        ui.suggestions.innerHTML = '';
        ui.suggestions.classList.remove('visible');
    }
}

const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const debouncedSearch = debounce(() => {
    renderSuggestionList(ui.foodSearch.value.trim());
}, 120);

document.addEventListener('DOMContentLoaded', async () => {
    restoreEntries();
    restoreDraftState();
    ui.entryDate.value = state.selectedDate;
    ui.filterFromDate.value = state.filterFromDate;
    ui.filterToDate.value = state.filterToDate;
    state.filterCategory = 'all';
    state.filterStatus = 'all';
    createCategoryOptions();
    await loadFoodDatabase();
    await loadVersionInfo();
    updateHistoryControls();
    renderEverything();
    initTheme();
    initPersistentStorage();
    bindEvents();
    registerServiceWorker();
    bindInstallPrompt();
});

function bindEvents() {
    ui.foodSearch.addEventListener('input', () => {
        updateSearchClearButton();
        debouncedSearch();
    });

    ui.foodSearch.addEventListener('focus', () => {
        if (isMobileView()) {
            openSearchOverlay();
        } else {
            renderSuggestionList(ui.foodSearch.value.trim());
        }
    });

    ui.foodSearch.addEventListener('click', () => {
        if (isMobileView() && !isSearchOverlayOpen) {
            openSearchOverlay();
        }
    });

    ui.foodSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const firstSuggestion = ui.suggestions.querySelector('.suggestion-item');
            if (firstSuggestion) {
                addSelectedFood(firstSuggestion.dataset.name);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            if (isSearchOverlayOpen) {
                closeSearchOverlay();
            } else if (ui.settingsModal && !ui.settingsModal.classList.contains('hidden')) {
                closeSettingsModal();
            } else {
                ui.foodSearch.blur();
                ui.suggestions.innerHTML = '';
                ui.suggestions.classList.remove('visible');
            }
        }
    });

    if (ui.searchDoneButton) {
        ui.searchDoneButton.addEventListener('click', () => {
            closeSearchOverlay();
        });
    }

    if (ui.overlaySelectedFoods) {
        ui.overlaySelectedFoods.addEventListener('click', (event) => {
            const button = event.target.closest('.remove-chip');
            if (!button) {
                return;
            }
            removeSelectedFood(button.dataset.name || '');
        });
    }

    if (ui.settingsButton) {
        ui.settingsButton.addEventListener('click', openSettingsModal);
    }

    if (ui.settingsCloseButton) {
        ui.settingsCloseButton.addEventListener('click', closeSettingsModal);
    }

    if (ui.settingsModal) {
        ui.settingsModal.addEventListener('click', (event) => {
            if (event.target === ui.settingsModal) {
                closeSettingsModal();
            }
        });
    }

    if (ui.searchCloseButton) {
        ui.searchCloseButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeSearchOverlay();
        });
    }

    if (ui.searchClearButton) {
        ui.searchClearButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            ui.foodSearch.value = '';
            updateSearchClearButton();
            persistDraftState();
            ui.foodSearch.focus();
            renderSuggestionList('');
        });
    }

    ui.foodSearch.addEventListener('blur', () => {
        if (isSearchOverlayOpen) {
            return;
        }
        setTimeout(() => {
            if (!ui.foodSearch.matches(':focus') && !ui.suggestions.matches(':hover')) {
                ui.suggestions.innerHTML = '';
                ui.suggestions.classList.remove('visible');
            }
        }, 120);
    });

    document.addEventListener('click', (event) => {
        if (isSearchOverlayOpen) {
            return;
        }
        const clickedInsideSearch = ui.foodSearch.contains(event.target);
        const clickedInsideSuggestions = ui.suggestions.contains(event.target);
        const clickedInsideClear = ui.searchClearButton && ui.searchClearButton.contains(event.target);

        if (!clickedInsideSearch && !clickedInsideSuggestions && !clickedInsideClear) {
            ui.suggestions.innerHTML = '';
            ui.suggestions.classList.remove('visible');
        }
    });

    window.addEventListener('popstate', () => {
        if (isSearchOverlayOpen) {
            closeSearchOverlay(true);
        }
    });

    window.addEventListener('resize', () => {
        if (isSearchOverlayOpen && !isMobileView()) {
            closeSearchOverlay();
        }
    });

    ui.saveButton.addEventListener('click', () => {
        if (!state.selectedFoods.length) {
            return;
        }

        const date = ui.entryDate.value || state.selectedDate;
        const existingNames = new Set(
            state.entries
                .filter((entry) => entry.date === date)
                .map((entry) => entry.name.toLowerCase())
        );

        const newEntries = state.selectedFoods
            .map((foodName) => getFoodByName(foodName))
            .filter(Boolean)
            .filter((food) => !existingNames.has(food.name.toLowerCase()))
            .map((food) => ({
                id: generateEntryId(),
                date,
                name: food.name,
                category: food.category,
                status: food.status,
                createdAt: Date.now(),
            }));

        if (!newEntries.length) {
            alert('Dieses Lebensmittel ist für das ausgewählte Datum bereits gespeichert.');
            return;
        }

        state.entries.push(...newEntries);
        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
        persistEntries();
        state.selectedFoods = [];
        ui.foodSearch.value = '';
        persistDraftState();
        renderEverything();
    });

    ui.entryDate.addEventListener('change', () => {
        state.selectedDate = ui.entryDate.value || getTodayString();
        persistDraftState();
        renderEverything();
    });

    ui.entryDate.addEventListener('input', () => {
        if (!ui.entryDate.value) {
            ui.entryDate.value = state.selectedDate || getTodayString();
        }
        persistDraftState();
    });

    ui.todayButton.addEventListener('click', () => {
        const today = getTodayString();
        state.selectedDate = today;
        ui.entryDate.value = today;
        persistDraftState();
        renderEverything();
    });

    ui.filterFromDate.addEventListener('change', () => {
        state.filterFromDate = ui.filterFromDate.value || getDefaultHistoryFromDate();
        renderEverything();
    });

    ui.filterToDate.addEventListener('change', () => {
        state.filterToDate = ui.filterToDate.value || getTodayString();
        renderEverything();
    });

    ui.searchCategory.addEventListener('change', () => {
        state.searchCategory = ui.searchCategory.value;
        updateCategoryClearButton();
        renderSuggestions();
    });

    if (ui.categoryClearButton) {
        ui.categoryClearButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            ui.searchCategory.value = 'all';
            state.searchCategory = 'all';
            updateCategoryClearButton();
            renderSuggestions();
        });
    }

    if (ui.onlyFreshGreenFoods) {
        ui.onlyFreshGreenFoods.addEventListener('click', () => {
            state.onlyFreshGreen = !state.onlyFreshGreen;
            updateGreenFilterUI();
            renderSuggestions();
        });
    }

    ui.filterCategory.addEventListener('change', () => {
        state.filterCategory = ui.filterCategory.value;
        renderEverything();
    });

    ui.filterStatus.addEventListener('change', () => {
        state.filterStatus = ui.filterStatus.value;
        renderEverything();
    });

    ui.historyModeToggle.addEventListener('click', () => {
        state.historyMode = !state.historyMode;
        updateHistoryControls();
        renderEverything();
    });

    ui.historyDeleteToggle.addEventListener('click', () => {
        state.historyDeleteMode = !state.historyDeleteMode;
        updateHistoryControls();
        renderHistory();
    });

    ui.historyList.addEventListener('click', (event) => {
        const button = event.target.closest('.delete-entry-button');
        if (!button) {
            return;
        }

        const entryId = button.dataset.entryId;
        if (!entryId) {
            return;
        }

        confirmDeleteEntry(entryId);
    });

    ui.suggestions.addEventListener('click', (event) => {
        const item = event.target.closest('.suggestion-item');
        if (!item) {
            return;
        }
        addSelectedFood(item.dataset.name);
    });

    ui.selectedFoods.addEventListener('click', (event) => {
        const button = event.target.closest('.remove-chip');
        if (!button) {
            return;
        }

        removeSelectedFood(button.dataset.name || '');
    });

    ui.exportJsonButton.addEventListener('click', () => exportJsonBackup());
    ui.importFile.addEventListener('change', handleImport);
    if (ui.themeToggle) {
        ui.themeToggle.addEventListener('click', toggleTheme);
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme, false);
}

function applyTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    if (ui.themeToggle) {
        const isDark = theme === 'dark';
        ui.themeToggle.textContent = isDark ? '☼' : '☾';
        ui.themeToggle.setAttribute('aria-label', isDark ? 'Tagmodus aktivieren' : 'Nachtmodus aktivieren');
        ui.themeToggle.setAttribute('title', isDark ? 'Tagmodus aktivieren' : 'Nachtmodus aktivieren');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#090e17' : '#0f172a');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
}

function updateGreenFilterUI() {
    if (ui.onlyFreshGreenFoods) {
        ui.onlyFreshGreenFoods.setAttribute('aria-pressed', String(state.onlyFreshGreen));
        ui.onlyFreshGreenFoods.classList.toggle('active', state.onlyFreshGreen);
    }
    if (ui.foodSearchLabel) {
        ui.foodSearchLabel.textContent = state.onlyFreshGreen ? 'Lebensmittel (gefiltert)' : 'Lebensmittel';
    }
}

async function loadFoodDatabase() {
    const response = await fetch(FOOD_DB_PATH);
    const foods = await response.json();
    state.foods = foods.map((food) => ({
        name: food.name,
        category: food.category,
        status: normalizeStatus(food.status),
    }));
    createCategoryOptions();
}

function createCategoryOptions() {
    const categories = [...new Set(state.foods.map((food) => food.category))].sort();
    const categoryOptions = '<option value="all">Alle</option>' +
        categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');

    const currentFilter = ui.filterCategory ? ui.filterCategory.value : 'all';
    ui.filterCategory.innerHTML = categoryOptions;
    ui.filterCategory.value = categories.includes(currentFilter) ? currentFilter : 'all';

    const currentSearch = ui.searchCategory ? ui.searchCategory.value : 'all';
    ui.searchCategory.innerHTML = categoryOptions;
    ui.searchCategory.value = categories.includes(currentSearch) ? currentSearch : 'all';
    state.searchCategory = ui.searchCategory.value;
    updateCategoryClearButton();
}

function restoreEntries() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        state.entries = raw ? JSON.parse(raw) : [];
    } catch (error) {
        state.entries = [];
    }

    state.entries = Array.isArray(state.entries) ? state.entries : [];
}

function restoreDraftState() {
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) {
            return;
        }

        const draft = JSON.parse(raw);
        if (typeof draft.selectedDate === 'string' && draft.selectedDate) {
            state.selectedDate = draft.selectedDate;
        }

        if (Array.isArray(draft.selectedFoods)) {
            state.selectedFoods = draft.selectedFoods.filter((food) => typeof food === 'string' && food.trim());
        }

        if (typeof draft.foodSearch === 'string' && ui.foodSearch) {
            ui.foodSearch.value = draft.foodSearch;
            updateSearchClearButton();
        }
    } catch (error) {
        console.error('Entwurf konnte nicht wiederhergestellt werden:', error);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
}

function persistEntries() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (error) {
        console.error('Speichern fehlgeschlagen:', error);
        alert('Das Speichern in den lokalen Browser-Daten ist fehlgeschlagen. Bitte prüfe den Speicherplatz oder den Browser-Status.');
    }
}

function persistDraftState() {
    try {
        const draft = {
            selectedDate: ui.entryDate.value || state.selectedDate || getTodayString(),
            selectedFoods: [...state.selectedFoods],
            foodSearch: ui.foodSearch ? ui.foodSearch.value : '',
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
        console.error('Entwurf konnte nicht gespeichert werden:', error);
    }
}

function getDefaultHistoryFromDate() {
    const today = parseDateInput(getTodayString());
    today.setDate(today.getDate() - ROTATION_WARNING_DAYS);
    return formatDateInput(today);
}

function updateHistoryControls() {
    if (ui.historyFilters && ui.historyModeToggle) {
        ui.historyFilters.classList.toggle('hidden', !state.historyMode);
        ui.historyModeToggle.setAttribute('aria-pressed', String(state.historyMode));
        ui.historyModeToggle.classList.toggle('active', state.historyMode);
        const filterTitle = state.historyMode ? 'Filter ausblenden' : 'Historie filtern';
        ui.historyModeToggle.setAttribute('title', filterTitle);
        ui.historyModeToggle.setAttribute('aria-label', filterTitle);

        if (!state.historyMode) {
            state.filterFromDate = getDefaultHistoryFromDate();
            state.filterToDate = getTodayString();
            state.filterCategory = 'all';
            state.filterStatus = 'all';
            ui.filterFromDate.value = state.filterFromDate;
            ui.filterToDate.value = state.filterToDate;
            ui.filterCategory.value = 'all';
            ui.filterStatus.value = 'all';
        }
    }

    if (ui.historyDeleteToggle) {
        ui.historyDeleteToggle.setAttribute('aria-pressed', String(state.historyDeleteMode));
        ui.historyDeleteToggle.classList.toggle('delete-active', state.historyDeleteMode);
        const deleteTitle = state.historyDeleteMode ? 'Löschmodus beenden' : 'Löschmodus aktivieren';
        ui.historyDeleteToggle.setAttribute('title', deleteTitle);
        ui.historyDeleteToggle.setAttribute('aria-label', deleteTitle);
    }
}

function renderEverything() {
    if (ui.filterFromDate) {
        ui.filterFromDate.value = state.filterFromDate;
    }
    if (ui.filterToDate) {
        ui.filterToDate.value = state.filterToDate;
    }
    createCategoryOptions();
    renderSelectedFoods();
    renderSuggestions();
    renderHistory();
}

function renderSelectedFoods() {
    if (!state.selectedFoods.length) {
        ui.selectedFoods.innerHTML = '<div class="empty-state">Noch keine Lebensmittel ausgewählt.</div>';
        ui.selectionWarnings.innerHTML = '';
        return;
    }

    const chips = state.selectedFoods
        .map((foodName) => {
            const food = getFoodByName(foodName);
            const status = food ? food.status : 'green';
            return `
        <div class="selection-chip">
          <span class="badge badge-${status}"></span>
          <span>${escapeHtml(foodName)}</span>
          <button type="button" class="remove-chip" data-name="${escapeHtml(foodName)}" aria-label="Entfernen">×</button>
        </div>
      `;
        })
        .join('');

    ui.selectedFoods.innerHTML = `<div class="selection-chip-list">${chips}</div>`;

    const warnings = state.selectedFoods.flatMap((foodName) => getWarningsForFood(foodName, ui.entryDate.value || state.selectedDate));
    if (!warnings.length) {
        ui.selectionWarnings.innerHTML = '';
        return;
    }

    const warningHtml = warnings
        .map((warning) => `
      <div class="warning-box ${warning.kind}">
        <strong>${warning.title}</strong>
        <span>${warning.text}</span>
      </div>
    `)
        .join('');

    ui.selectionWarnings.innerHTML = warningHtml;

}

function removeSelectedFood(foodName) {
    if (!foodName) {
        return;
    }

    state.selectedFoods = state.selectedFoods.filter((item) => item !== foodName);
    persistDraftState();
    renderSelectedFoods();
    updateOverlaySelectedFoods();
    updateSearchDoneButton();
    renderSuggestions();
}

function renderSuggestionList(query) {
    const allResults = getSuggestions(query);
    const results = query ? allResults.slice(0, MAX_SUGGESTIONS) : allResults;

    if (!query && !results.length) {
        ui.suggestions.innerHTML = '<div class="empty-state">Kein passendes Lebensmittel gefunden.</div>';
        ui.suggestions.classList.add('visible');
        return;
    }

    if (!query && !ui.foodSearch.matches(':focus') && !isSearchOverlayOpen) {
        ui.suggestions.innerHTML = '';
        ui.suggestions.classList.remove('visible');
        return;
    }

    if (!results.length) {
        ui.suggestions.innerHTML = '<div class="empty-state">Kein passendes Lebensmittel gefunden.</div>';
        ui.suggestions.classList.add('visible');
        return;
    }

    ui.suggestions.innerHTML = results
        .map((food) => {
            const referenceDate = ui.entryDate.value || state.selectedDate || getTodayString();
            const recentLabel = getRecentMealLabel(food.name, referenceDate);
            const recentTitle = getRecentMealTitle(recentLabel);
            const isRecent = Boolean(recentLabel);
            const recentChip = recentLabel
                ? `<span class="recent-chip recent-chip-alert" title="${recentTitle}">${recentLabel}</span>`
                : '';

            return `
        <button type="button" class="suggestion-item ${isRecent ? 'is-recent' : ''}" data-name="${escapeHtml(food.name)}">
          <strong>${escapeHtml(food.name)}</strong>
          <div class="suggestion-meta">
            <span class="tag">${escapeHtml(food.category)}</span>
            ${recentChip}
          </div>
          <span class="status-dot status-${food.status}" title="${toStatusLabel(food.status)}"></span>
        </button>
      `;
        })
        .join('');

    ui.suggestions.classList.add('visible');
}

function renderSuggestions() {
    const query = ui.foodSearch.value.trim();
    if (!query && !ui.foodSearch.matches(':focus') && !isSearchOverlayOpen) {
        ui.suggestions.classList.remove('visible');
        ui.suggestions.innerHTML = '';
        return;
    }
    renderSuggestionList(query);
}

function renderHistory() {
    const entries = filterEntries();

    if (!entries.length) {
        ui.historyList.innerHTML = '<div class="empty-state">Keine Einträge für die aktuelle Auswahl.</div>';
        return;
    }

    const grouped = entries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
            acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
    }, {});

    const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    const todayString = getTodayString();

    ui.historyList.innerHTML = dates
        .map((date, index) => {
            const dayEntries = grouped[date];
            const isToday = date === todayString;
            // Der jüngste Tag oder "Heute" ist standardmäßig geöffnet, ältere geschlossen (außer im Löschmodus)
            const shouldOpen = state.historyDeleteMode || index === 0;

            const counts = { green: 0, orange: 0, red: 0 };
            dayEntries.forEach((e) => {
                const s = e.status || 'green';
                counts[s] = (counts[s] || 0) + 1;
            });

            const statParts = [];
            if (counts.green > 0) statParts.push(`${counts.green} 🟢`);
            if (counts.orange > 0) statParts.push(`${counts.orange} 🟠`);
            if (counts.red > 0) statParts.push(`${counts.red} 🔴`);
            const statChipText = statParts.join(' · ') || `${dayEntries.length} 🟢`;

            const categoryGroups = dayEntries
                .reduce((acc, entry) => {
                    if (!acc[entry.category]) {
                        acc[entry.category] = [];
                    }
                    acc[entry.category].push(entry);
                    return acc;
                }, {});

            const categoryNames = Object.keys(categoryGroups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

            const categoryMarkup = categoryNames
                .map((category) => {
                    const items = categoryGroups[category]
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                        .map((entry) => {
                            const deleteButton = state.historyDeleteMode
                                ? `<button type="button" class="delete-entry-button" data-entry-id="${escapeHtml(entry.id)}" aria-label="Eintrag löschen">×</button>`
                                : '';

                            return `
                <div class="history-item" title="${toStatusLabel(entry.status)}">
                  <span class="name">${escapeHtml(entry.name)}</span>
                  <span class="status-dot status-${entry.status}" title="${toStatusLabel(entry.status)}" aria-label="${toStatusLabel(entry.status)}"></span>
                  ${deleteButton}
                </div>
              `;
                        })
                        .join('');

                    return `
              <div class="history-category-group">
                <div class="history-category-header">${escapeHtml(category)}</div>
                <div class="history-category-items">${items}</div>
              </div>
            `;
                })
                .join('');

            const todayBadge = isToday ? '<span class="history-day-today-badge">Heute</span>' : '';

            return `
        <details class="history-day" ${shouldOpen ? 'open' : ''}>
          <summary class="history-day-summary">
            <div class="history-day-title-wrap">
              <span class="history-day-chevron">▶</span>
              <span class="history-day-title">${escapeHtml(formatFriendlyDate(date))}</span>
              ${todayBadge}
            </div>
            <div class="history-day-stats">
              <span class="history-stat-chip">${statChipText}</span>
            </div>
          </summary>
          <div class="history-items">${categoryMarkup}</div>
        </details>
      `;
        })
        .join('');
}

function confirmDeleteEntry(entryId) {
    const entry = state.entries.find((item) => item.id === entryId);
    if (!entry) {
        return;
    }

    const confirmed = window.confirm(`Eintrag wirklich löschen?\n${entry.name} (${formatFriendlyDate(entry.date)})`);
    if (!confirmed) {
        return;
    }

    state.entries = state.entries.filter((item) => item.id !== entryId);
    persistEntries();
    renderEverything();
}

function filterEntries() {
    const fromDate = ui.filterFromDate.value || state.filterFromDate || getDefaultHistoryFromDate();
    const toDate = ui.filterToDate.value || state.filterToDate || getTodayString();
    const category = ui.filterCategory.value || state.filterCategory || 'all';
    const status = ui.filterStatus.value || state.filterStatus || 'all';

    return state.entries.filter((entry) => {
        const matchesDate = entry.date >= fromDate && entry.date <= toDate;
        const matchesCategory = category === 'all' || entry.category === category;
        const matchesStatus = status === 'all' || entry.status === status;
        return matchesDate && matchesCategory && matchesStatus;
    });
}

function getWarningsForFood(foodName, selectedDate) {
    const food = getFoodByName(foodName);
    if (!food) {
        return [];
    }

    const warnings = [];
    const mostRecent = findMostRecentOccurrence(foodName, selectedDate);

    if (mostRecent && Math.abs(mostRecent.daysDifference) >= 1 && Math.abs(mostRecent.daysDifference) <= ROTATION_WARNING_DAYS) {
        if (mostRecent.daysDifference > 0) {
            warnings.push({
                kind: 'yellow',
                title: 'Rotation',
                text: `Dieses Lebensmittel wurde vor ${mostRecent.daysDifference} Tagen bereits gegessen.`,
            });
        } else {
            const absDays = Math.abs(mostRecent.daysDifference);
            warnings.push({
                kind: 'yellow',
                title: 'Rotation',
                text: absDays === 1 ? 'Dieses Lebensmittel wird morgen gegessen.' : `Dieses Lebensmittel wird in ${absDays} Tagen gegessen.`,
            });
        }
    }

    if (food.status === 'orange' || food.status === 'red') {
        warnings.push({
            kind: 'red',
            title: 'Unverträglichkeit',
            text: 'Unverträglichkeit laut der eigenen Bewertung – dieses Lebensmittel sollte gemieden werden.',
        });
    }

    return warnings;
}

function getRecentMealLabel(foodName, referenceDate) {
    const mostRecent = findMostRecentOccurrence(foodName, referenceDate);
    if (!mostRecent || Math.abs(mostRecent.daysDifference) < 1 || Math.abs(mostRecent.daysDifference) > ROTATION_WARNING_DAYS) {
        return '';
    }

    return `${mostRecent.daysDifference}T`;
}

function getRecentMealTitle(recentLabel) {
    if (!recentLabel) {
        return '';
    }

    const daysDifference = Number.parseInt(recentLabel, 10);
    if (daysDifference > 0) {
        return daysDifference === 1 ? 'Zuletzt vor 1 Tag gegessen' : `Zuletzt vor ${daysDifference} Tagen gegessen`;
    }
    if (daysDifference < 0) {
        const absDays = Math.abs(daysDifference);
        return absDays === 1 ? 'Wird morgen gegessen' : `Wird in ${absDays} Tagen gegessen`;
    }

    return 'Heute bereits erfasst';
}

function findMostRecentOccurrence(foodName, targetDate) {
    const logs = state.entries.filter((entry) => entry.name === foodName && entry.date !== targetDate);
    if (!logs.length) {
        return null;
    }

    const relevant = logs
        .map((entry) => ({
            date: entry.date,
            daysDifference: diffInDays(targetDate, entry.date),
        }))
        .filter((entry) => Math.abs(entry.daysDifference) >= 1 && Math.abs(entry.daysDifference) <= ROTATION_WARNING_DAYS)
        .sort((a, b) => {
            const byDistance = Math.abs(a.daysDifference) - Math.abs(b.daysDifference);
            if (byDistance !== 0) {
                return byDistance;
            }
            return (a.daysDifference > 0 ? -1 : 1) - (b.daysDifference > 0 ? -1 : 1);
        })
        .shift();

    return relevant || null;
}

function isFoodAvailableForSelectedDate(foodName, selectedDateValue) {
    const referenceDate = selectedDateValue || state.selectedDate || getTodayString();
    const hasRecentOrUpcomingOccurrence = state.entries.some((entry) => {
        if (entry.name !== foodName) {
            return false;
        }
        return Math.abs(diffInDays(referenceDate, entry.date)) <= ROTATION_WARNING_DAYS;
    });

    return !hasRecentOrUpcomingOccurrence;
}

function getSuggestions(query) {
    const normalizedQuery = normalizeText(query);
    const category = state.searchCategory;

    const filteredFoods = [...state.foods].filter((food) => {
        const matchesCategory = category === 'all' || food.category === category;
        if (!matchesCategory) {
            return false;
        }

        if (state.onlyFreshGreen) {
            return food.status === 'green' && isFoodAvailableForSelectedDate(food.name, ui.entryDate.value || state.selectedDate || getTodayString());
        }

        return true;
    });

    if (!normalizedQuery) {
        return filteredFoods.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filteredFoods
        .map((food) => {
            const normalizedName = normalizeText(food.name);
            const score = getSearchScore(normalizedName, normalizedQuery);
            return { food, score };
        })
        .filter(({ score }) => score !== Number.POSITIVE_INFINITY)
        .sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name))
        .map(({ food }) => food);
}

function getSearchScore(name, query) {
    if (!name || !query) {
        return Number.POSITIVE_INFINITY;
    }

    if (name === query) {
        return 0;
    }

    if (name.endsWith(query)) {
        return 1;
    }

    if (name.startsWith(query)) {
        return 2;
    }

    const tokens = name.split(/[^a-z0-9]+/).filter(Boolean);
    const tokenIndex = tokens.findIndex((token) => token.startsWith(query) || token.endsWith(query));
    if (tokenIndex !== -1) {
        return 3 + tokenIndex;
    }

    if (name.includes(query)) {
        return 5;
    }

    return Number.POSITIVE_INFINITY;
}

function addSelectedFood(foodName) {
    const food = getFoodByName(foodName);
    if (!food) {
        return;
    }

    if (!state.selectedFoods.includes(food.name)) {
        state.selectedFoods.push(food.name);
    }

    if (isSearchOverlayOpen) {
        ui.foodSearch.value = '';
        updateSearchClearButton();
        updateOverlaySelectedFoods();
        updateSearchDoneButton();
        persistDraftState();
        renderSelectedFoods();
        if (ui.foodSearch) {
            ui.foodSearch.focus();
        }
        renderSuggestionList('');
    } else {
        ui.foodSearch.value = '';
        updateSearchClearButton();
        ui.suggestions.innerHTML = '';
        ui.suggestions.classList.remove('visible');
        persistDraftState();
        renderSelectedFoods();
    }
}

function getFoodByName(name) {
    return state.foods.find((food) => food.name.toLowerCase() === name.trim().toLowerCase()) || null;
}

function normalizeStatus(rawStatus) {
    const value = String(rawStatus || '').toLowerCase();
    if (value === 'red' || value.includes('rot')) return 'red';
    if (value === 'orange' || value.includes('orange')) return 'orange';
    return 'green';
}

function toStatusLabel(status) {
    if (status === 'orange') return 'Orange';
    if (status === 'red') return 'Rot';
    return 'Grün';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeText(value) {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getTodayString() {
    return formatDateInput(new Date());
}

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function diffInDays(left, right) {
    const leftDate = parseDateInput(left);
    const rightDate = parseDateInput(right);
    const diffMs = leftDate.getTime() - rightDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatFriendlyDate(dateString) {
    const date = parseDateInput(dateString);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function getDateStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateTimeStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function getBackupFilename(date = new Date(), includeTime = true) {
    const stamp = includeTime ? getDateTimeStamp(date) : getDateStamp(date);
    return `${BACKUP_FILENAME_PREFIX}_${stamp}.json`;
}

async function exportJsonBackup() {
    const fileName = getBackupFilename(new Date(), true);
    const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        entries: state.entries,
    }, null, 2);

    // Stufe 1: showSaveFilePicker falls unterstützt (direkte Ordner- und Dateiauswahl)
    if (window.showSaveFilePicker && typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: 'JSON-Backup',
                        accept: { 'application/json': ['.json'] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(payload);
            await writable.close();
            return;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                return;
            }
            console.warn('showSaveFilePicker fehlgeschlagen, versuche Web Share:', error);
        }
    }

    const blob = new Blob([payload], { type: 'application/json' });

    // Stufe 2: Web Share API (auf Mobilgeräten für Google Drive, Dateimanager etc.)
    // Zuerst mit application/json testen, sonst mit text/plain Fallback
    const candidateTypes = ['application/json', 'text/plain'];
    for (const mimeType of candidateTypes) {
        try {
            const backupFile = new File([blob], fileName, { type: mimeType });
            if (navigator.canShare && navigator.canShare({ files: [backupFile] })) {
                await navigator.share({
                    title: 'Ernährungstagebuch Backup',
                    text: `Backup vom ${new Date().toLocaleDateString('de-DE')}`,
                    files: [backupFile],
                });
                return;
            }
        } catch (error) {
            if (error && error.name === 'AbortError') {
                return;
            }
            console.warn(`Share mit ${mimeType} fehlgeschlagen:`, error);
        }
    }

    // Stufe 3: Download-Fallback
    downloadBlob(blob, fileName);
}

async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const content = await file.text();
        const parsed = parseImportedJson(content);
        const nextEntries = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : [];

        const imported = nextEntries
            .map((entry) => normalizeImportedEntry(entry))
            .filter(Boolean);

        if (!imported.length) {
            alert('Es wurden keine Einträge gefunden, die importiert werden können.');
            return;
        }

        const choice = await promptImportAction(imported.length, state.entries.length);
        if (choice === 'cancel') {
            return;
        }

        if (choice === 'replace') {
            state.entries = imported;
        } else if (choice === 'merge') {
            // Intelligent zusammenführen: Duplikate (gleicher Tag + gleicher Name) überspringen
            const existingKeys = new Set(
                state.entries.map((e) => `${e.date}__${e.name.toLowerCase()}`)
            );
            const nonDuplicates = imported.filter(
                (e) => !existingKeys.has(`${e.date}__${e.name.toLowerCase()}`)
            );
            state.entries = [...state.entries, ...nonDuplicates];
        }

        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
        persistEntries();
        renderEverything();
    } catch (error) {
        console.error('Fehler beim Import:', error);
        alert('Die Datei konnte nicht importiert werden. Bitte prüfe das Format.');
    } finally {
        event.target.value = '';
    }
}

function promptImportAction(importedCount, currentCount) {
    return new Promise((resolve) => {
        if (!ui.importModal) {
            // Fallback falls DOM-Element fehlt
            const shouldMerge = window.confirm('Bestehende Einträge beibehalten und importierte Einträge ergänzen?');
            resolve(shouldMerge ? 'merge' : 'replace');
            return;
        }

        const currentText = currentCount === 1 ? '1 bestehender Eintrag' : `${currentCount} bestehende Einträge`;
        const importedText = importedCount === 1 ? '1 Eintrag' : `${importedCount} Einträge`;

        ui.importModalText.textContent = `In der Datei wurden ${importedText} gefunden. Im Tagebuch befinden sich aktuell ${currentText}. Wie möchtest du fortfahren?`;

        ui.importModal.classList.remove('hidden');

        const cleanup = () => {
            ui.importModal.classList.add('hidden');
            ui.importMergeButton.removeEventListener('click', onMerge);
            ui.importReplaceButton.removeEventListener('click', onReplace);
            ui.importCancelButton.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeyDown);
            ui.importModal.removeEventListener('click', onBackdropClick);
        };

        const onMerge = () => {
            cleanup();
            resolve('merge');
        };

        const onReplace = () => {
            cleanup();
            resolve('replace');
        };

        const onCancel = () => {
            cleanup();
            resolve('cancel');
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cleanup();
                resolve('cancel');
            }
        };

        const onBackdropClick = (event) => {
            if (event.target === ui.importModal) {
                cleanup();
                resolve('cancel');
            }
        };

        ui.importMergeButton.addEventListener('click', onMerge);
        ui.importReplaceButton.addEventListener('click', onReplace);
        ui.importCancelButton.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);
        ui.importModal.addEventListener('click', onBackdropClick);
    });
}

function parseImportedJson(content) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries;
    }
    return [];
}

function normalizeImportedEntry(entry) {
    const name = entry.name || entry.food || entry['Lebensmittel'];
    if (!name) {
        return null;
    }

    const food = getFoodByName(name) || state.foods.find((item) => normalizeText(item.name) === normalizeText(name));
    return {
        id: entry.id || generateEntryId(),
        date: entry.date || entry.day || getTodayString(),
        name: food ? food.name : name,
        category: food ? food.category : entry.category || 'Unbekannt',
        status: normalizeStatus(entry.status || (food ? food.status : 'green')),
        createdAt: entry.createdAt || Date.now(),
    };
}

function generateEntryId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

async function loadVersionInfo() {
    try {
        const response = await fetch(APP_VERSION_PATH);
        if (!response.ok) {
            throw new Error('Version konnte nicht geladen werden');
        }

        const data = await response.json();
        const version = data && typeof data.version === 'string' ? data.version : '1.0.0';
        if (ui.appVersion) {
            ui.appVersion.textContent = version;
        }
    } catch (error) {
        console.error('Version konnte nicht geladen werden:', error);
        if (ui.appVersion) {
            ui.appVersion.textContent = '1.0.0';
        }
    }
}

function bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        ui.installButton.classList.remove('hidden');
    });

    ui.installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        ui.installButton.classList.add('hidden');
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((registration) => {
            registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (!installingWorker) {
                    return;
                }

                installingWorker.addEventListener('statechange', () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.info('Service Worker-Update installiert und aktiv.');
                    }
                });
            });
        }).catch((error) => {
            console.error('Service Worker konnte nicht registriert werden:', error);
        });
    });
}
