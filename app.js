import { state, ui, isMobileView } from './src/state.js';
import {
    getTodayString,
    debounce,
    generateEntryId,
} from './src/utils.js';
import {
    restoreEntries,
    restoreDraftState,
    persistEntries,
    persistDraftState,
    loadFoodDatabase,
    loadVersionInfo,
    initPersistentStorage,
    exportJsonBackup,
    parseImportedJson,
    normalizeImportedEntry,
} from './src/db.js';
import {
    getFoodByName,
    getWarningsForFood,
} from './src/rotation.js';
import {
    initTheme,
    toggleTheme,
    updateGreenFilterUI,
    createCategoryOptions,
    updateSearchClearButton,
    updateSearchDoneButton,
    updateCategoryClearButton,
    updateOverlaySelectedFoods,
    renderSelectedFoods,
    renderSuggestionList,
    renderSuggestions,
    updateHistoryControls,
    renderHistory,
    renderEverything,
} from './src/ui.js';
import {
    openSettingsModal,
    closeSettingsModal,
    openConfirmModal,
    closeConfirmModal,
    openCategoryModal,
    closeCategoryModal,
    promptImportAction,
} from './src/modals.js';

let deferredPrompt = null;
let isSearchOverlayOpen = false;

function openSearchOverlay(preventKeyboard = false) {
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
    renderSuggestionList(ui.foodSearch ? ui.foodSearch.value.trim() : '', isSearchOverlayOpen);

    if (preventKeyboard && ui.foodSearch) {
        ui.foodSearch.blur();
    }

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
            ui.foodSearch.blur();
        }
        renderSuggestionList('', isSearchOverlayOpen);
    } else {
        ui.foodSearch.value = '';
        updateSearchClearButton();
        if (ui.suggestions) {
            ui.suggestions.innerHTML = '';
            ui.suggestions.classList.remove('visible');
        }
        persistDraftState();
        renderSelectedFoods();
        updateOverlaySelectedFoods();
        updateSearchDoneButton();
    }
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
    renderSuggestions(isSearchOverlayOpen);
}

function handleSaveAction() {
    if (!state.selectedFoods.length) {
        return;
    }

    const date = ui.entryDate.value || state.selectedDate || getTodayString();
    const conflicts = [];
    state.selectedFoods.forEach((foodName) => {
        const warnings = getWarningsForFood(foodName, date);
        if (warnings.length) {
            conflicts.push({
                name: foodName,
                warnings,
            });
        }
    });

    if (conflicts.length > 0) {
        openConfirmModal(conflicts, () => {
            executeSaveEntries();
        });
    } else {
        executeSaveEntries();
    }
}

function executeSaveEntries() {
    const date = ui.entryDate.value || state.selectedDate || getTodayString();
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

    if (newEntries.length > 0) {
        state.entries.push(...newEntries);
        state.entries.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);
        persistEntries();
    }

    state.selectedFoods = [];
    ui.foodSearch.value = '';
    updateOverlaySelectedFoods();
    updateSearchDoneButton();
    persistDraftState();
    if (isSearchOverlayOpen) {
        closeSearchOverlay();
    }
    renderEverything(isSearchOverlayOpen);
}

function confirmDeleteEntry(entryId) {
    const target = state.entries.find((entry) => entry.id === entryId);
    if (!target) {
        return;
    }

    const confirmed = window.confirm(`Möchtest du "${target.name}" wirklich aus dem Verlauf löschen?`);
    if (!confirmed) {
        return;
    }

    state.entries = state.entries.filter((entry) => entry.id !== entryId);
    persistEntries();
    renderEverything(isSearchOverlayOpen);
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
            .map((entry) => normalizeImportedEntry(entry, getFoodByName))
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
        renderEverything(isSearchOverlayOpen);
    } catch (error) {
        console.error('Fehler beim Import:', error);
        alert('Die Datei konnte nicht importiert werden. Bitte prüfe das Format.');
    } finally {
        event.target.value = '';
    }
}

const debouncedSearch = debounce(() => {
    renderSuggestionList(ui.foodSearch ? ui.foodSearch.value.trim() : '', isSearchOverlayOpen);
}, 120);

function bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        if (ui.installButton) {
            ui.installButton.classList.remove('hidden');
        }
    });

    if (ui.installButton) {
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

function bindEvents() {
    if (ui.foodSearch) {
        ui.foodSearch.addEventListener('input', () => {
            updateSearchClearButton();
            debouncedSearch();
        });

        let wasFocusedBeforeClick = false;

        ui.foodSearch.addEventListener('focus', () => {
            if (isMobileView()) {
                openSearchOverlay(true);
            } else {
                renderSuggestionList(ui.foodSearch.value.trim(), isSearchOverlayOpen);
            }
        });

        ui.foodSearch.addEventListener('mousedown', () => {
            wasFocusedBeforeClick = document.activeElement === ui.foodSearch;
        });

        ui.foodSearch.addEventListener('touchstart', () => {
            wasFocusedBeforeClick = document.activeElement === ui.foodSearch;
        }, { passive: true });

        ui.foodSearch.addEventListener('click', () => {
            if (isMobileView()) {
                if (!isSearchOverlayOpen) {
                    openSearchOverlay(true);
                } else if (wasFocusedBeforeClick) {
                    ui.foodSearch.blur();
                    wasFocusedBeforeClick = false;
                } else {
                    ui.foodSearch.focus();
                    wasFocusedBeforeClick = true;
                }
            }
        });

        ui.foodSearch.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const firstSuggestion = ui.suggestions ? ui.suggestions.querySelector('.suggestion-item') : null;
                if (firstSuggestion) {
                    addSelectedFood(firstSuggestion.dataset.name);
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                if (isSearchOverlayOpen) {
                    closeSearchOverlay();
                } else if (ui.confirmModal && !ui.confirmModal.classList.contains('hidden')) {
                    closeConfirmModal();
                } else if (ui.settingsModal && !ui.settingsModal.classList.contains('hidden')) {
                    closeSettingsModal();
                } else {
                    ui.foodSearch.blur();
                    if (ui.suggestions) {
                        ui.suggestions.innerHTML = '';
                        ui.suggestions.classList.remove('visible');
                    }
                }
            }
        });

        ui.foodSearch.addEventListener('blur', () => {
            if (isSearchOverlayOpen) {
                return;
            }
            setTimeout(() => {
                if (!ui.foodSearch.matches(':focus') && !ui.suggestions?.matches(':hover')) {
                    ui.suggestions.innerHTML = '';
                    ui.suggestions.classList.remove('visible');
                }
            }, 120);
        });
    }

    if (ui.searchDoneButton) {
        ui.searchDoneButton.addEventListener('click', () => {
            handleSaveAction();
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
            renderSuggestionList('', isSearchOverlayOpen);
        });
    }

    document.addEventListener('click', (event) => {
        if (isSearchOverlayOpen) {
            return;
        }
        const clickedInsideSearch = ui.foodSearch && ui.foodSearch.contains(event.target);
        const clickedInsideSuggestions = ui.suggestions && ui.suggestions.contains(event.target);
        const clickedInsideClear = ui.searchClearButton && ui.searchClearButton.contains(event.target);

        if (!clickedInsideSearch && !clickedInsideSuggestions && !clickedInsideClear && ui.suggestions) {
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

    if (ui.saveButton) {
        ui.saveButton.addEventListener('click', handleSaveAction);
    }

    if (ui.dateChipButton && ui.entryDate) {
        ui.dateChipButton.addEventListener('click', () => {
            if (typeof ui.entryDate.showPicker === 'function') {
                try {
                    ui.entryDate.showPicker();
                } catch (e) {
                    ui.entryDate.focus();
                }
            } else {
                ui.entryDate.focus();
            }
        });
    }

    if (ui.entryDate) {
        ui.entryDate.addEventListener('change', () => {
            state.selectedDate = ui.entryDate.value || getTodayString();
            persistDraftState();
            renderEverything(isSearchOverlayOpen);
        });

        ui.entryDate.addEventListener('input', () => {
            if (!ui.entryDate.value) {
                ui.entryDate.value = state.selectedDate || getTodayString();
            }
            state.selectedDate = ui.entryDate.value;
            persistDraftState();
            renderEverything(isSearchOverlayOpen);
        });
    }

    if (ui.todayButton) {
        ui.todayButton.addEventListener('click', () => {
            const today = getTodayString();
            if (ui.entryDate) {
                ui.entryDate.value = today;
            }
            state.selectedDate = today;
            persistDraftState();
            renderEverything(isSearchOverlayOpen);
        });
    }

    if (ui.categoryChipButton) {
        ui.categoryChipButton.addEventListener('click', () => {
            openCategoryModal((selectedCat) => {
                if (ui.searchCategory) {
                    ui.searchCategory.value = selectedCat;
                }
                state.searchCategory = selectedCat;
                updateCategoryClearButton();
                renderSuggestionList(ui.foodSearch ? ui.foodSearch.value.trim() : '', isSearchOverlayOpen);
            });
        });
    }

    if (ui.categoryModalCloseButton) {
        ui.categoryModalCloseButton.addEventListener('click', closeCategoryModal);
    }

    if (ui.categoryModal) {
        ui.categoryModal.addEventListener('click', (event) => {
            if (event.target === ui.categoryModal) {
                closeCategoryModal();
            }
        });
    }

    if (ui.searchCategory) {
        ui.searchCategory.addEventListener('change', () => {
            state.searchCategory = ui.searchCategory.value;
            updateCategoryClearButton();
            renderSuggestionList(ui.foodSearch.value.trim(), isSearchOverlayOpen);
        });
    }

    if (ui.categoryClearButton) {
        ui.categoryClearButton.addEventListener('click', () => {
            ui.searchCategory.value = 'all';
            state.searchCategory = 'all';
            updateCategoryClearButton();
            renderSuggestionList(ui.foodSearch.value.trim(), isSearchOverlayOpen);
        });
    }

    if (ui.onlyFreshGreenFoods) {
        ui.onlyFreshGreenFoods.addEventListener('click', () => {
            state.onlyFreshGreen = !state.onlyFreshGreen;
            updateGreenFilterUI();
            renderSuggestionList(ui.foodSearch.value.trim(), isSearchOverlayOpen);
        });
    }

    if (ui.filterFromDate) {
        ui.filterFromDate.addEventListener('change', () => {
            state.filterFromDate = ui.filterFromDate.value;
            renderHistory();
        });
    }

    if (ui.filterToDate) {
        ui.filterToDate.addEventListener('change', () => {
            state.filterToDate = ui.filterToDate.value;
            renderHistory();
        });
    }

    if (ui.filterCategory) {
        ui.filterCategory.addEventListener('change', () => {
            state.filterCategory = ui.filterCategory.value;
            renderHistory();
        });
    }

    if (ui.filterStatus) {
        ui.filterStatus.addEventListener('change', () => {
            state.filterStatus = ui.filterStatus.value;
            renderHistory();
        });
    }

    if (ui.historyModeToggle) {
        ui.historyModeToggle.addEventListener('click', () => {
            state.historyMode = !state.historyMode;
            updateHistoryControls();
            renderHistory();
        });
    }

    if (ui.historyDeleteToggle) {
        ui.historyDeleteToggle.addEventListener('click', () => {
            state.historyDeleteMode = !state.historyDeleteMode;
            updateHistoryControls();
            renderHistory();
        });
    }

    if (ui.historyList) {
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
    }

    if (ui.suggestions) {
        ui.suggestions.addEventListener('click', (event) => {
            const item = event.target.closest('.suggestion-item');
            if (!item) {
                return;
            }
            addSelectedFood(item.dataset.name);
        });
    }

    if (ui.selectedFoods) {
        ui.selectedFoods.addEventListener('click', (event) => {
            const button = event.target.closest('.remove-chip');
            if (!button) {
                return;
            }
            removeSelectedFood(button.dataset.name || '');
        });
    }

    if (ui.confirmCancelButton) {
        ui.confirmCancelButton.addEventListener('click', () => {
            closeConfirmModal();
        });
    }

    if (ui.confirmModal) {
        ui.confirmModal.addEventListener('click', (event) => {
            if (event.target === ui.confirmModal) {
                closeConfirmModal();
            }
        });
    }

    if (ui.themeToggle) {
        ui.themeToggle.addEventListener('click', toggleTheme);
    }

    if (ui.exportJsonButton) {
        ui.exportJsonButton.addEventListener('click', exportJsonBackup);
    }

    if (ui.importFile) {
        ui.importFile.addEventListener('change', handleImport);
    }
}

async function initApp() {
    await restoreEntries();
    restoreDraftState();
    if (ui.entryDate) {
        ui.entryDate.value = state.selectedDate;
    }
    if (ui.filterFromDate) {
        ui.filterFromDate.value = state.filterFromDate;
    }
    if (ui.filterToDate) {
        ui.filterToDate.value = state.filterToDate;
    }
    state.filterCategory = 'all';
    state.filterStatus = 'all';
    createCategoryOptions();
    await loadFoodDatabase();
    await loadVersionInfo();
    updateHistoryControls();
    renderEverything(isSearchOverlayOpen);
    initTheme();
    initPersistentStorage();
    bindEvents();
    registerServiceWorker();
    bindInstallPrompt();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
