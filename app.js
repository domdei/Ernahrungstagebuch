import { state, ui, isMobileView } from './src/state.js';
import {
    getTodayString,
    debounce,
    generateEntryId,
    normalizeText,
    getFoodTolerance,
    normalizeFoodRecord,
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
    idbPutFood,
    idbDeleteFood,
    idbSetAllFoods,
    idbGetAllFoods,
    resetFoodTolerancesToDefault,
    exportTolerancesBackup,
    parseImportedTolerancesJson,
} from './src/db.js';
import {
    getFoodByName,
    getWarningsForFood,
    isFoodLoggedOnDate,
} from './src/rotation.js';
import {
    initTheme,
    toggleTheme,
    updateGreenFilterUI,
    createCategoryOptions,
    updateSearchClearButton,
    updateSearchDoneButton,
    updateCategoryClearButton,
    updateHistoryCategoryFilterUI,
    updateHistoryStatusFilterUI,
    updateOverlaySelectedFoods,
    renderSelectedFoods,
    renderSuggestionList,
    renderSuggestions,
    updateHistoryControls,
    renderHistory,
    renderEverything,
    updateFoodCountBadge,
} from './src/ui.js';
import {
    openSettingsModal,
    closeSettingsModal,
    openConfirmModal,
    closeConfirmModal,
    openCategoryModal,
    openStatusModal,
    closeCategoryModal,
    promptImportAction,
    openFoodManagerModal,
    closeFoodManagerModal,
    renderFoodManagerList,
    renderFoodManagerCategoryOptions,
    updateFoodManagerFiltersUI,
    openFoodForm,
    closeFoodForm,
    promptFoodDeleteConfirmation,
    promptTolerancesImportAction,
} from './src/modals.js';
import { bindInstallPrompt, registerServiceWorker } from './src/pwa.js';

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

    const targetDate = ui.entryDate?.value || state.selectedDate || getTodayString();
    if (isFoodLoggedOnDate(food.name, targetDate)) {
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
        .map((food) => {
            const tol = getFoodTolerance(food);
            return {
                id: generateEntryId(),
                date,
                name: food.name,
                category: food.category,
                tolerance: tol,
                createdAt: Date.now(),
            };
        });

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
        const { entries: nextEntries, foodTolerances: nextFoods } = parseImportedJson(content);

        const imported = nextEntries
            .map((entry) => normalizeImportedEntry(entry, getFoodByName))
            .filter(Boolean);

        if (!imported.length && (!nextFoods || !nextFoods.length)) {
            alert('Es wurden keine Einträge oder Lebensmittel gefunden, die importiert werden können.');
            return;
        }

        const choice = await promptImportAction(imported.length, state.entries.length);
        if (choice === 'cancel') {
            return;
        }

        if (choice === 'replace') {
            state.entries = imported;
            if (nextFoods && nextFoods.length > 0) {
                await idbSetAllFoods(nextFoods);
                state.foods = nextFoods.map(normalizeFoodRecord);
            }
        } else if (choice === 'merge') {
            const existingKeys = new Set(
                state.entries.map((e) => `${e.date}__${e.name.toLowerCase()}`)
            );
            const nonDuplicates = imported.filter(
                (e) => !existingKeys.has(`${e.date}__${e.name.toLowerCase()}`)
            );
            state.entries = [...state.entries, ...nonDuplicates];

            if (nextFoods && nextFoods.length > 0) {
                for (const item of nextFoods) {
                    await idbPutFood(item);
                }
                const reloaded = await idbGetAllFoods();
                state.foods = reloaded.map(normalizeFoodRecord);
            }
        }

        if (nextFoods && nextFoods.length > 0) {
            createCategoryOptions();
            updateFoodCountBadge();
            renderFoodManagerCategoryOptions();
            renderFoodManagerList();
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

async function handleTolerancesImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const content = await file.text();
        const importedFoods = parseImportedTolerancesJson(content);

        if (!importedFoods || !importedFoods.length) {
            alert('Es wurden keine Lebensmittel in der Datei gefunden.');
            return;
        }

        const choice = await promptTolerancesImportAction(importedFoods.length, state.foods.length);
        if (choice === 'replace') {
            await idbSetAllFoods(importedFoods);
            state.foods = importedFoods.map(normalizeFoodRecord);
        } else if (choice === 'merge') {
            for (const item of importedFoods) {
                await idbPutFood(item);
            }
            const reloaded = await idbGetAllFoods();
            state.foods = reloaded.map(normalizeFoodRecord);
        }

        createCategoryOptions();
        updateFoodCountBadge();
        renderFoodManagerCategoryOptions();
        renderFoodManagerList();
        renderEverything(isSearchOverlayOpen);
        alert(`${importedFoods.length} Lebensmittel erfolgreich importiert (${choice === 'replace' ? 'ersetzt' : 'ergänzt'}).`);
    } catch (error) {
        console.error('Fehler beim Importieren der Toleranzen:', error);
        alert('Die Datei konnte nicht importiert werden. Bitte prüfe das Format.');
    } finally {
        event.target.value = '';
    }
}

const debouncedSearch = debounce(() => {
    renderSuggestionList(ui.foodSearch ? ui.foodSearch.value.trim() : '', isSearchOverlayOpen);
}, 120);

function bindEvents() {
    if (ui.foodSearch) {
        ui.foodSearch.addEventListener('input', () => {
            updateSearchClearButton();
            debouncedSearch();
        });

        let wasFocusedBeforeClick = false;
        let overlayJustOpened = false;

        ui.foodSearch.addEventListener('focus', () => {
            if (isMobileView()) {
                if (!isSearchOverlayOpen) {
                    openSearchOverlay(true);
                    overlayJustOpened = true;
                }
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
                    overlayJustOpened = true;
                } else if (overlayJustOpened) {
                    overlayJustOpened = false;
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
                const firstSuggestion = ui.suggestions ? ui.suggestions.querySelector('.suggestion-item:not(.is-already-logged):not([disabled])') : null;
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
                } else if (ui.foodManagerModal && !ui.foodManagerModal.classList.contains('hidden')) {
                    closeFoodManagerModal();
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
            openCategoryModal(
                (selectedCat) => {
                    if (ui.searchCategory) {
                        ui.searchCategory.value = selectedCat;
                    }
                    state.searchCategory = selectedCat;
                    updateCategoryClearButton();
                    renderSuggestionList(ui.foodSearch ? ui.foodSearch.value.trim() : '', isSearchOverlayOpen);
                },
                state.searchCategory || 'all',
                'Kategorie auswählen'
            );
        });
    }

    if (ui.historyCategoryChipButton) {
        ui.historyCategoryChipButton.addEventListener('click', () => {
            openCategoryModal(
                (selectedCat) => {
                    if (ui.filterCategory) {
                        ui.filterCategory.value = selectedCat;
                    }
                    state.filterCategory = selectedCat;
                    updateHistoryCategoryFilterUI();
                    renderHistory();
                },
                state.filterCategory || 'all',
                'Verlauf: Kategorie filtern'
            );
        });
    }

    if (ui.historyCategoryClearButton) {
        ui.historyCategoryClearButton.addEventListener('click', () => {
            if (ui.filterCategory) {
                ui.filterCategory.value = 'all';
            }
            state.filterCategory = 'all';
            updateHistoryCategoryFilterUI();
            renderHistory();
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
            updateHistoryCategoryFilterUI();
            renderHistory();
        });
    }

    if (ui.historyStatusChipButton) {
        ui.historyStatusChipButton.addEventListener('click', () => {
            openStatusModal(
                (selectedStatus) => {
                    if (ui.filterStatus) {
                        ui.filterStatus.value = selectedStatus;
                    }
                    state.filterStatus = selectedStatus;
                    updateHistoryStatusFilterUI();
                    renderHistory();
                },
                state.filterStatus || 'all'
            );
        });
    }

    if (ui.historyStatusClearButton) {
        ui.historyStatusClearButton.addEventListener('click', () => {
            if (ui.filterStatus) {
                ui.filterStatus.value = 'all';
            }
            state.filterStatus = 'all';
            updateHistoryStatusFilterUI();
            renderHistory();
        });
    }

    if (ui.filterStatus) {
        ui.filterStatus.addEventListener('change', () => {
            state.filterStatus = ui.filterStatus.value;
            updateHistoryStatusFilterUI();
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
            if (!item || item.classList.contains('is-already-logged') || item.disabled) {
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

    if (ui.noticeOpenManagerButton) {
        ui.noticeOpenManagerButton.addEventListener('click', () => {
            if (ui.firstRunNotice) ui.firstRunNotice.classList.add('hidden');
            localStorage.setItem('food_tolerances_notice_dismissed', 'true');
            openFoodManagerModal();
        });
    }

    if (ui.noticeDismissButton) {
        ui.noticeDismissButton.addEventListener('click', () => {
            if (ui.firstRunNotice) ui.firstRunNotice.classList.add('hidden');
            localStorage.setItem('food_tolerances_notice_dismissed', 'true');
        });
    }

    if (ui.openFoodManagerButton) {
        ui.openFoodManagerButton.addEventListener('click', () => {
            closeSettingsModal();
            openFoodManagerModal();
        });
    }

    if (ui.exportTolerancesButton) {
        ui.exportTolerancesButton.addEventListener('click', exportTolerancesBackup);
    }

    if (ui.importTolerancesFile) {
        ui.importTolerancesFile.addEventListener('change', handleTolerancesImport);
    }

    if (ui.resetTolerancesButton) {
        ui.resetTolerancesButton.addEventListener('click', async () => {
            const confirmed = window.confirm(
                'Möchtest du alle Lebensmittel und Verträglichkeiten auf die Standardwerte aus der Datenbank zurücksetzen? Eigene Änderungen gehen dabei verloren.'
            );
            if (!confirmed) return;
            const success = await resetFoodTolerancesToDefault();
            if (success) {
                createCategoryOptions();
                renderFoodManagerCategoryOptions();
                renderFoodManagerList();
                renderEverything(isSearchOverlayOpen);
                updateFoodCountBadge();
                alert('Lebensmittel und Verträglichkeiten wurden auf die Standardwerte zurückgesetzt.');
            } else {
                alert('Zurücksetzen fehlgeschlagen.');
            }
        });
    }

    if (ui.foodManagerCloseButton) {
        ui.foodManagerCloseButton.addEventListener('click', closeFoodManagerModal);
    }

    if (ui.foodManagerModal) {
        ui.foodManagerModal.addEventListener('click', (event) => {
            if (event.target === ui.foodManagerModal) {
                closeFoodManagerModal();
            }
        });
    }

    if (ui.foodManagerSearch) {
        ui.foodManagerSearch.addEventListener('input', () => {
            renderFoodManagerList();
        });
    }

    if (ui.foodManagerCategoryChipButton) {
        ui.foodManagerCategoryChipButton.addEventListener('click', () => {
            openCategoryModal(
                (selectedCategory) => {
                    state.foodManagerCategory = selectedCategory;
                    updateFoodManagerFiltersUI();
                    renderFoodManagerList();
                },
                state.foodManagerCategory || 'all',
                'Kategorie filtern',
                'Wähle eine Kategorie, um die Lebensmittel einzugrenzen.'
            );
        });
    }

    if (ui.foodManagerCategoryClearButton) {
        ui.foodManagerCategoryClearButton.addEventListener('click', () => {
            state.foodManagerCategory = 'all';
            updateFoodManagerFiltersUI();
            renderFoodManagerList();
        });
    }

    if (ui.foodManagerToleranceChipButton) {
        ui.foodManagerToleranceChipButton.addEventListener('click', () => {
            openStatusModal(
                (selectedStatus) => {
                    state.foodManagerTolerance = selectedStatus;
                    updateFoodManagerFiltersUI();
                    renderFoodManagerList();
                },
                state.foodManagerTolerance || 'all'
            );
        });
    }

    if (ui.foodManagerToleranceClearButton) {
        ui.foodManagerToleranceClearButton.addEventListener('click', () => {
            state.foodManagerTolerance = 'all';
            updateFoodManagerFiltersUI();
            renderFoodManagerList();
        });
    }

    if (ui.openAddFoodBtn) {
        ui.openAddFoodBtn.addEventListener('click', () => {
            openFoodForm(null);
        });
    }

    if (ui.foodFormCancelBtn) {
        ui.foodFormCancelBtn.addEventListener('click', closeFoodForm);
    }

    if (ui.foodFormCancelBtn2) {
        ui.foodFormCancelBtn2.addEventListener('click', closeFoodForm);
    }

    if (ui.foodFormSaveBtn) {
        ui.foodFormSaveBtn.addEventListener('click', async () => {
            const name = ui.foodFormName ? ui.foodFormName.value.trim() : '';
            const category = ui.foodFormCategory ? ui.foodFormCategory.value.trim() || 'Sonstiges' : 'Sonstiges';
            const originalName = ui.foodFormOriginalName ? ui.foodFormOriginalName.value.trim() : '';
            const checkedRadio = ui.foodFormContainer ? ui.foodFormContainer.querySelector('input[name="foodFormTolerance"]:checked') : null;
            const tolerance = checkedRadio ? checkedRadio.value : 'green';

            if (!name) {
                alert('Bitte gib einen Namen für das Lebensmittel ein.');
                if (ui.foodFormName) ui.foodFormName.focus();
                return;
            }

            const normName = normalizeText(name);
            const existing = state.foods.find((f) => normalizeText(f.name) === normName);
            if (existing && (!originalName || normalizeText(originalName) !== normName)) {
                alert(`Ein Lebensmittel mit dem Namen "${existing.name}" existiert bereits.`);
                return;
            }

            if (originalName && normalizeText(originalName) !== normName) {
                await idbDeleteFood(originalName);
                state.foods = state.foods.filter((f) => normalizeText(f.name) !== normalizeText(originalName));
            }

            const saved = await idbPutFood({ name, category, tolerance });
            if (!saved) {
                alert('Speichern in der Datenbank fehlgeschlagen.');
                return;
            }

            const foodObj = { name, category, tolerance };
            const idx = state.foods.findIndex((f) => normalizeText(f.name) === normName);
            if (idx >= 0) {
                state.foods[idx] = foodObj;
            } else {
                state.foods.push(foodObj);
            }
            state.foods.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

            closeFoodForm();
            createCategoryOptions();
            renderFoodManagerCategoryOptions();
            renderFoodManagerList();
            renderEverything(isSearchOverlayOpen);
            updateFoodCountBadge();
        });
    }

    if (ui.foodManagerList) {
        ui.foodManagerList.addEventListener('click', async (event) => {
            const pill = event.target.closest('.tolerance-pill');
            if (pill) {
                const foodName = pill.dataset.name;
                const newTol = pill.dataset.tol;
                const food = state.foods.find((f) => f.name === foodName);
                if (food && getFoodTolerance(food) !== newTol) {
                    food.tolerance = newTol;
                    await idbPutFood(food);
                    const row = pill.closest('.food-item-row');
                    if (row) {
                        row.querySelectorAll('.tolerance-pill').forEach((p) => {
                            p.classList.toggle('active', p.dataset.tol === newTol);
                        });
                    }
                    renderEverything(isSearchOverlayOpen);
                }
                return;
            }

            const editBtn = event.target.closest('.edit-food-btn');
            if (editBtn) {
                const foodName = editBtn.dataset.name;
                const food = state.foods.find((f) => f.name === foodName);
                if (food) {
                    openFoodForm(food);
                    if (ui.foodFormContainer) {
                        ui.foodFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
                return;
            }

            const deleteBtn = event.target.closest('.delete-food-btn');
            if (deleteBtn) {
                const foodName = deleteBtn.dataset.name;
                const food = state.foods.find((f) => f.name === foodName);
                if (!food) return;

                const usageCount = state.entries.filter(
                    (e) => normalizeText(e.name) === normalizeText(food.name)
                ).length;

                const confirmed = await promptFoodDeleteConfirmation(food.name, usageCount);
                if (confirmed) {
                    await idbDeleteFood(food.name);
                    state.foods = state.foods.filter((f) => f.name !== food.name);
                    createCategoryOptions();
                    renderFoodManagerCategoryOptions();
                    renderFoodManagerList();
                    renderEverything(isSearchOverlayOpen);
                    updateFoodCountBadge();
                }
            }
        });
    }

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (ui.foodManagerModal && !ui.foodManagerModal.classList.contains('hidden')) {
                closeFoodManagerModal();
            }
        }
    });
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
    await loadFoodDatabase();
    createCategoryOptions();
    await loadVersionInfo();
    updateHistoryControls();
    renderEverything(isSearchOverlayOpen);
    updateFoodCountBadge();
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
