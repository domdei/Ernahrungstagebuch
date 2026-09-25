import { THEME_STORAGE_KEY, escapeHtml, formatFriendlyDate, formatShortFriendlyDate, toStatusLabel, MAX_SUGGESTIONS, getTodayString } from './utils.js';
import { state, ui, isMobileView, getDefaultHistoryFromDate } from './state.js';
import {
    getFoodByName,
    getWarningsForFood,
    getRecentMealLabel,
    getRecentMealTitle,
    isFoodLoggedOnDate,
    getSuggestions,
    filterEntries,
} from './rotation.js';

export function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme, false);
}

export function applyTheme(theme, save = true) {
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

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
}

export function updateDateChipUI() {
    const selected = state.selectedDate || getTodayString();
    const today = getTodayString();
    const isToday = selected === today;

    if (ui.entryDate) {
        ui.entryDate.value = selected;
    }

    if (ui.dateChipText) {
        ui.dateChipText.textContent = formatShortFriendlyDate(selected);
    }

    if (ui.dateChipButton) {
        ui.dateChipButton.classList.toggle('is-custom-date', !isToday);
    }

    if (ui.todayButton) {
        ui.todayButton.classList.toggle('hidden', isToday);
    }
}

export function updateSearchClearButton() {
    if (!ui.searchClearButton) {
        return;
    }
    const hasText = Boolean(ui.foodSearch && ui.foodSearch.value.length > 0);
    ui.searchClearButton.classList.toggle('hidden', !hasText);
}

export function updateSearchDoneButton() {
    if (!ui.searchDoneButton) {
        return;
    }
    const count = state.selectedFoods.length;
    ui.searchDoneButton.textContent = count > 0 ? `Speichern (${count})` : 'Speichern';
    ui.searchDoneButton.classList.toggle('hidden', count === 0);
}

export function updateCategoryClearButton() {
    if (!ui.searchCategory) {
        return;
    }
    const hasFilter = ui.searchCategory.value !== 'all';
    if (ui.categoryClearButton) {
        ui.categoryClearButton.classList.toggle('hidden', !hasFilter);
    }
    if (ui.categoryChipButton) {
        ui.categoryChipButton.classList.toggle('has-filter', hasFilter);
    }
    if (ui.categoryChipText) {
        ui.categoryChipText.textContent = hasFilter ? ui.searchCategory.value : 'Alle Kategorien';
    }
    updateSearchFilterBarVisibility();
}

export function updateHistoryCategoryFilterUI() {
    const hasFilter = Boolean(state.filterCategory && state.filterCategory !== 'all');
    if (ui.filterCategory) {
        ui.filterCategory.value = state.filterCategory || 'all';
    }
    if (ui.historyCategoryClearButton) {
        ui.historyCategoryClearButton.classList.toggle('hidden', !hasFilter);
    }
    if (ui.historyCategoryChipButton) {
        ui.historyCategoryChipButton.classList.toggle('has-filter', hasFilter);
    }
    if (ui.historyCategoryChipText) {
        ui.historyCategoryChipText.textContent = hasFilter ? state.filterCategory : 'Alle Kategorien';
    }
}

export function updateHistoryStatusFilterUI() {
    const hasFilter = Boolean(state.filterStatus && state.filterStatus !== 'all');
    if (ui.filterStatus) {
        ui.filterStatus.value = state.filterStatus || 'all';
    }
    if (ui.historyStatusClearButton) {
        ui.historyStatusClearButton.classList.toggle('hidden', !hasFilter);
    }
    if (ui.historyStatusChipButton) {
        ui.historyStatusChipButton.classList.toggle('has-filter', hasFilter);
    }
    if (ui.historyStatusChipText) {
        const labels = {
            all: 'Alle Status',
            green: 'Grün',
            orange: 'Orange',
            red: 'Rot',
        };
        ui.historyStatusChipText.textContent = hasFilter ? labels[state.filterStatus] || state.filterStatus : 'Alle Status';
    }
}

export function updateGreenFilterUI() {
    if (ui.onlyFreshGreenFoods) {
        ui.onlyFreshGreenFoods.setAttribute('aria-pressed', String(state.onlyFreshGreen));
        ui.onlyFreshGreenFoods.classList.toggle('active', state.onlyFreshGreen);
    }
    if (ui.foodSearchLabel) {
        ui.foodSearchLabel.textContent = state.onlyFreshGreen ? 'Lebensmittel erfassen (gefiltert)' : 'Lebensmittel erfassen';
    }
    updateSearchFilterBarVisibility();
}

export function updateSearchFilterBarVisibility() {
    if (!ui.searchFilterBar) {
        ui.searchFilterBar = document.querySelector('.search-filter-bar');
    }
    if (ui.searchFilterBar) {
        const hasActiveFilter = (state.searchCategory && state.searchCategory !== 'all') || Boolean(state.onlyFreshGreen);
        ui.searchFilterBar.classList.toggle('has-active-filter', hasActiveFilter);
    }
}

export function createCategoryOptions() {
    const categories = [...new Set(state.foods.map((food) => food.category))].sort();
    const categoryOptions = '<option value="all">Alle</option>' +
        categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');

    const currentFilter = ui.filterCategory ? ui.filterCategory.value : 'all';
    if (ui.filterCategory) {
        ui.filterCategory.innerHTML = categoryOptions;
        ui.filterCategory.value = categories.includes(currentFilter) ? currentFilter : 'all';
        state.filterCategory = ui.filterCategory.value;
    }

    const currentSearch = ui.searchCategory ? ui.searchCategory.value : 'all';
    if (ui.searchCategory) {
        ui.searchCategory.innerHTML = categoryOptions;
        ui.searchCategory.value = categories.includes(currentSearch) ? currentSearch : 'all';
        state.searchCategory = ui.searchCategory.value;
    }
    updateCategoryClearButton();
    updateHistoryCategoryFilterUI();
}

export function renderFoodChipHtml(foodName, selectedDate) {
    const food = getFoodByName(foodName);
    const status = food ? (food.tolerance || food.status) : 'green';
    const warnings = getWarningsForFood(foodName, selectedDate);
    const recentLabel = getRecentMealLabel(foodName, selectedDate);
    const recentTitle = getRecentMealTitle(recentLabel);

    let conflictClass = '';
    let conflictBadge = '';

    const hasIntolerance = status === 'orange' || status === 'red';
    const hasRotation = Boolean(recentLabel);

    if (hasIntolerance) {
        conflictClass = 'has-conflict conflict-intolerance';
        conflictBadge = `<span class="chip-conflict-badge chip-conflict-intolerance" title="Unverträglichkeit">!</span>`;
    } else if (hasRotation) {
        conflictClass = 'has-conflict conflict-rotation';
        conflictBadge = `<span class="chip-conflict-badge chip-conflict-rotation" title="${recentTitle}">${recentLabel}</span>`;
    }

    const titleAttr = warnings.length ? ` title="${escapeHtml(warnings.map((w) => `${w.title}: ${w.text}`).join(' | '))}"` : '';

    return `
      <div class="selection-chip ${conflictClass}"${titleAttr}>
        <span class="badge badge-${status}"></span>
        <span class="chip-label">${escapeHtml(foodName)}</span>
        ${conflictBadge}
        <button type="button" class="remove-chip" data-name="${escapeHtml(foodName)}" aria-label="Entfernen">×</button>
      </div>
    `;
}

export function updateOverlaySelectedFoods() {
    if (!ui.overlaySelectedFoods) {
        return;
    }
    if (!state.selectedFoods.length) {
        ui.overlaySelectedFoods.innerHTML = '';
        ui.overlaySelectedFoods.classList.add('hidden');
        return;
    }

    const targetDate = ui.entryDate.value || state.selectedDate || getTodayString();
    const chips = state.selectedFoods
        .map((foodName) => renderFoodChipHtml(foodName, targetDate))
        .join('');

    ui.overlaySelectedFoods.innerHTML = chips;
    ui.overlaySelectedFoods.classList.remove('hidden');
}

export function renderSelectedFoods() {
    if (!ui.selectedFoods) {
        return;
    }
    if (!state.selectedFoods.length) {
        ui.selectedFoods.innerHTML = '';
        return;
    }

    const targetDate = ui.entryDate.value || state.selectedDate || getTodayString();
    const chips = state.selectedFoods
        .map((foodName) => renderFoodChipHtml(foodName, targetDate))
        .join('');

    ui.selectedFoods.innerHTML = `<div class="selection-chip-list">${chips}</div>`;
}

export function renderSuggestionList(query, isSearchOverlayOpen = false) {
    const isOverlay = isSearchOverlayOpen || state.isSearchOverlayOpen;
    const allResults = getSuggestions(query);
    const results = query ? allResults.slice(0, MAX_SUGGESTIONS) : allResults;

    if (!query && !results.length) {
        ui.suggestions.innerHTML = '<div class="empty-state">Kein passendes Lebensmittel gefunden.</div>';
        ui.suggestions.classList.add('visible');
        return;
    }

    const isSearchFocused = document.activeElement === ui.foodSearch || ui.foodSearch?.matches(':focus');
    if (!query && !isSearchFocused && !isOverlay) {
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
            const referenceDate = ui.entryDate?.value || state.selectedDate || getTodayString();
            const isLogged = isFoodLoggedOnDate(food.name, referenceDate);
            const isSelected = state.selectedFoods.includes(food.name);
            const isDone = isLogged || isSelected;

            const recentLabel = getRecentMealLabel(food.name, referenceDate);
            const recentTitle = getRecentMealTitle(recentLabel);
            const isRecent = Boolean(recentLabel);

            let statusChip = '';
            if (isLogged) {
                statusChip = `<span class="recent-chip logged-chip" title="Für diesen Tag bereits erfasst">✓</span>`;
            } else if (isSelected) {
                statusChip = `<span class="recent-chip logged-chip" title="Bereits in der aktuellen Auswahl">✓</span>`;
            } else if (recentLabel) {
                statusChip = `<span class="recent-chip recent-chip-alert" title="${recentTitle}">${recentLabel}</span>`;
            }

            const itemClasses = ['suggestion-item'];
            if (isDone) {
                itemClasses.push('is-already-logged');
            } else if (isRecent) {
                itemClasses.push('is-recent');
            }

            return `
        <button type="button" class="${itemClasses.join(' ')}" data-name="${escapeHtml(food.name)}"${isDone ? ' disabled aria-disabled="true"' : ''}>
          <strong>${escapeHtml(food.name)}</strong>
          <div class="suggestion-meta">
            <span class="tag">${escapeHtml(food.category)}</span>
            ${statusChip}
          </div>
          <span class="status-dot status-${food.tolerance || food.status}" title="${toStatusLabel(food.tolerance || food.status)}"></span>
        </button>
      `;
        })
        .join('');

    ui.suggestions.classList.add('visible');
}

export function renderSuggestions(isSearchOverlayOpen = false) {
    const isOverlay = isSearchOverlayOpen || state.isSearchOverlayOpen;
    const query = ui.foodSearch ? ui.foodSearch.value.trim() : '';
    const isSearchFocused = document.activeElement === ui.foodSearch || ui.foodSearch?.matches(':focus');
    if (!query && !isSearchFocused && !isOverlay) {
        if (ui.suggestions) {
            ui.suggestions.classList.remove('visible');
            ui.suggestions.innerHTML = '';
        }
        return;
    }
    renderSuggestionList(query, isOverlay);
}

export function updateHistoryControls() {
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
            if (ui.filterFromDate) ui.filterFromDate.value = state.filterFromDate;
            if (ui.filterToDate) ui.filterToDate.value = state.filterToDate;
            if (ui.filterCategory) ui.filterCategory.value = 'all';
            if (ui.filterStatus) ui.filterStatus.value = 'all';
            updateHistoryCategoryFilterUI();
            updateHistoryStatusFilterUI();
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

export function renderHistory() {
    if (!ui.historyList) {
        return;
    }
    const filteredEntries = filterEntries();

    if (!filteredEntries.length) {
        ui.historyList.innerHTML = '<div class="empty-state">Keine Einträge für die aktuellen Filter vorhanden.</div>';
        return;
    }

    const grouped = filteredEntries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
            acc[entry.date] = [];
        }
        acc[entry.date].push(entry);
        return acc;
    }, {});

    const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    const todayString = getTodayString();

    // Aktuell geöffnete Tage im DOM ermitteln, um ihren Zustand zu bewahren
    const currentlyOpenDates = new Set(
        Array.from(ui.historyList.querySelectorAll('details.history-day[open]'))
            .map((el) => el.dataset.date)
            .filter(Boolean)
    );

    // Falls gar kein Tag geöffnet ist, öffnen wir im Löschmodus benutzerfreundlich den ersten/neuesten Tag
    if (state.historyDeleteMode && currentlyOpenDates.size === 0 && dates.length > 0) {
        currentlyOpenDates.add(dates[0]);
    }

    const html = dates
        .map((date) => {
            const dayEntries = grouped[date];
            const isToday = date === todayString;
            // Zustand beibehalten statt alle Tage ungefragt aufzureißen
            const shouldOpen = currentlyOpenDates.has(date);

            const counts = { green: 0, orange: 0, red: 0 };
            dayEntries.forEach((e) => {
                const s = e.tolerance || e.status || 'green';
                counts[s] = (counts[s] || 0) + 1;
            });

            const statParts = [];
            if (counts.green > 0) statParts.push(`${counts.green} 🟢`);
            if (counts.orange > 0) statParts.push(`${counts.orange} 🟠`);
            if (counts.red > 0) statParts.push(`${counts.red} 🔴`);
            const statChipText = statParts.join(' · ') || `${dayEntries.length} 🟢`;

            const categoryGroups = dayEntries.reduce((acc, entry) => {
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
                            const entryTol = entry.tolerance || entry.status || 'green';
                            const deleteButton = state.historyDeleteMode
                                ? `<button type="button" class="delete-entry-button" data-entry-id="${escapeHtml(entry.id)}" aria-label="Eintrag löschen" title="Eintrag löschen">✕</button>`
                                : '';

                            return `
                <div class="history-item" title="${toStatusLabel(entryTol)}">
                  <span class="name">${escapeHtml(entry.name)}</span>
                  <span class="status-dot status-${entryTol}" title="${toStatusLabel(entryTol)}" aria-label="${toStatusLabel(entryTol)}"></span>
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
        <details class="history-day" data-date="${escapeHtml(date)}" ${shouldOpen ? 'open' : ''}>
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

    ui.historyList.innerHTML = html;
}

export function updateFoodCountBadge() {
    const badge = document.getElementById('foodCountBadge');
    if (badge) {
        badge.textContent = state.foods.length;
    }
}

export function renderEverything(isSearchOverlayOpen = false) {
    updateDateChipUI();
    if (ui.filterFromDate) {
        ui.filterFromDate.value = state.filterFromDate;
    }
    if (ui.filterToDate) {
        ui.filterToDate.value = state.filterToDate;
    }
    createCategoryOptions();
    updateHistoryCategoryFilterUI();
    updateHistoryStatusFilterUI();
    renderSelectedFoods();
    updateOverlaySelectedFoods();
    updateSearchDoneButton();
    renderSuggestions(isSearchOverlayOpen);
    renderHistory();
    updateFoodCountBadge();
}
