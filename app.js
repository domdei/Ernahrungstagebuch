const STORAGE_KEY = 'ernaehrungstagebuch-diary-v1';
const FOOD_DB_PATH = './food-data.json';
const MAX_SUGGESTIONS = 20;

const state = {
    foods: [],
    entries: [],
    selectedFoods: [],
    selectedDate: getTodayString(),
    filterDate: '',
    searchCategory: 'all',
    filterCategory: 'all',
    filterStatus: 'all',
    historyDeleteMode: false,
};

const ui = {
    entryDate: document.getElementById('entryDate'),
    searchCategory: document.getElementById('searchCategory'),
    foodSearch: document.getElementById('foodSearch'),
    suggestions: document.getElementById('suggestions'),
    selectedFoods: document.getElementById('selectedFoods'),
    selectionWarnings: document.getElementById('selectionWarnings'),
    saveButton: document.getElementById('saveButton'),
    historyList: document.getElementById('historyList'),
    filterDate: document.getElementById('filterDate'),
    filterCategory: document.getElementById('filterCategory'),
    filterStatus: document.getElementById('filterStatus'),
    daySummary: document.getElementById('daySummary'),
    historyDeleteToggle: document.getElementById('historyDeleteToggle'),
    installButton: document.getElementById('installButton'),
    exportJsonButton: document.getElementById('exportJsonButton'),
    exportCsvButton: document.getElementById('exportCsvButton'),
    importFile: document.getElementById('importFile'),
};

let deferredPrompt = null;

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
    ui.entryDate.value = state.selectedDate;
    ui.filterDate.value = state.filterDate;
    createCategoryOptions();
    restoreEntries();
    await loadFoodDatabase();
    renderEverything();
    bindEvents();
    registerServiceWorker();
    bindInstallPrompt();
});

function bindEvents() {
    ui.foodSearch.addEventListener('input', () => {
        debouncedSearch();
    });

    ui.foodSearch.addEventListener('focus', () => {
        renderSuggestionList(ui.foodSearch.value.trim());
    });

    ui.foodSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const firstSuggestion = ui.suggestions.querySelector('.suggestion-item');
            if (firstSuggestion) {
                addSelectedFood(firstSuggestion.dataset.name);
            }
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
        renderEverything();
    });

    ui.entryDate.addEventListener('change', () => {
        state.selectedDate = ui.entryDate.value || getTodayString();
        renderEverything();
    });

    ui.filterDate.addEventListener('change', () => {
        state.filterDate = ui.filterDate.value || getTodayString();
        renderEverything();
    });

    ui.searchCategory.addEventListener('change', () => {
        state.searchCategory = ui.searchCategory.value;
        renderSuggestions();
    });

    ui.filterCategory.addEventListener('change', () => {
        state.filterCategory = ui.filterCategory.value;
        renderEverything();
    });

    ui.filterStatus.addEventListener('change', () => {
        state.filterStatus = ui.filterStatus.value;
        renderEverything();
    });

    ui.historyDeleteToggle.addEventListener('click', () => {
        state.historyDeleteMode = !state.historyDeleteMode;
        ui.historyDeleteToggle.textContent = state.historyDeleteMode ? 'Löschmodus beenden' : 'Löschmodus';
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

    ui.exportJsonButton.addEventListener('click', exportJson);
    ui.exportCsvButton.addEventListener('click', exportCsv);
    ui.importFile.addEventListener('change', handleImport);
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

function persistEntries() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (error) {
        console.error('Speichern fehlgeschlagen:', error);
        alert('Das Speichern in den lokalen Browser-Daten ist fehlgeschlagen. Bitte prüfe den Speicherplatz oder den Browser-Status.');
    }
}

function renderEverything() {
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
    renderSelectedFoods();
    renderSuggestions();
}

function renderSuggestionList(query) {
    const results = getSuggestions(query).slice(0, MAX_SUGGESTIONS);
    if (!query && !results.length) {
        ui.suggestions.innerHTML = '<div class="empty-state">Kein passendes Lebensmittel gefunden.</div>';
        ui.suggestions.classList.add('visible');
        return;
    }

    if (!query && !results.length && !ui.foodSearch.matches(':focus')) {
        ui.suggestions.innerHTML = '';
        ui.suggestions.classList.remove('visible');
        return;
    }

    if (!query && !results.length) {
        ui.suggestions.innerHTML = '<div class="empty-state">Kein passendes Lebensmittel gefunden.</div>';
        ui.suggestions.classList.add('visible');
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
    if (!query) {
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

    ui.historyList.innerHTML = dates
        .map((date) => {
            const items = grouped[date]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((entry) => {
                    const deleteButton = state.historyDeleteMode
                        ? `<button type="button" class="delete-entry-button" data-entry-id="${escapeHtml(entry.id)}" aria-label="Eintrag löschen">×</button>`
                        : '';

                    return `
          <div class="history-item">
            <div class="name-row">
              <span class="name">${escapeHtml(entry.name)}</span>
              <span class="status-pill status-${entry.status}">${toStatusLabel(entry.status)}</span>
            </div>
            <div class="history-meta-row">
              <span>${escapeHtml(entry.category)}</span>
              ${deleteButton}
            </div>
          </div>
        `;
                })
                .join('');

            return `
        <div class="history-day">
          <h3>${formatFriendlyDate(date)}</h3>
          <div class="history-items">${items}</div>
        </div>
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
    const selectedDate = ui.filterDate.value || state.filterDate;
    const category = ui.filterCategory.value;
    const status = ui.filterStatus.value;

    const visibleDates = new Set();
    if (!selectedDate) {
        const today = parseDateInput(getTodayString());
        for (let offset = 3; offset >= 0; offset -= 1) {
            const date = addDays(today, -offset);
            visibleDates.add(formatDateInput(date));
        }
    }

    return state.entries.filter((entry) => {
        const matchesDate = !selectedDate ? visibleDates.has(entry.date) : entry.date === selectedDate;
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

    if (mostRecent && mostRecent.daysAgo >= 1 && mostRecent.daysAgo <= 4) {
        warnings.push({
            kind: 'yellow',
            title: 'Rotation',
            text: `Dieses Lebensmittel wurde vor ${mostRecent.daysAgo} Tagen bereits gegessen.`,
        });
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
    if (!mostRecent || mostRecent.daysAgo < 1 || mostRecent.daysAgo > 4) {
        return '';
    }

    return `${mostRecent.daysAgo}T`;
}

function getRecentMealTitle(recentLabel) {
    if (!recentLabel) {
        return '';
    }

    const daysAgo = Number.parseInt(recentLabel, 10);
    const text = daysAgo === 1 ? 'vor 1 Tag' : `vor ${daysAgo} Tagen`;
    return `Zuletzt ${text} gegessen`;
}

function findMostRecentOccurrence(foodName, targetDate) {
    const logs = state.entries.filter((entry) => entry.name === foodName && entry.date !== targetDate);
    if (!logs.length) {
        return null;
    }

    const relevant = logs
        .map((entry) => ({
            date: entry.date,
            daysAgo: Math.abs(diffInDays(targetDate, entry.date)),
        }))
        .filter((entry) => entry.daysAgo >= 1 && entry.daysAgo <= 4)
        .sort((a, b) => a.daysAgo - b.daysAgo)
        .shift();

    return relevant || null;
}

function getSuggestions(query) {
    const normalizedQuery = normalizeText(query);
    const category = state.searchCategory;

    const filteredFoods = [...state.foods].filter((food) => category === 'all' || food.category === category);

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

    ui.foodSearch.value = '';
    ui.suggestions.innerHTML = '';
    ui.suggestions.classList.remove('visible');
    renderSelectedFoods();
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

function getLastNDaysString(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return formatDateInput(date);
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

function addDays(date, days) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
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

function formatShortDate(date) {
    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
    }).format(date);
}

function exportJson() {
    const blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'ernaehrungstagebuch.json');
}

function exportCsv() {
    const rows = [
        ['date', 'category', 'name', 'status'],
        ...state.entries.map((entry) => [entry.date, entry.category, entry.name, entry.status]),
    ];

    const csv = rows
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'ernaehrungstagebuch.csv');
}

async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        const content = await file.text();
        const parsed = file.name.toLowerCase().endsWith('.json') ? JSON.parse(content) : parseCsv(content);
        const nextEntries = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : [];

        const imported = nextEntries
            .map((entry) => normalizeImportedEntry(entry))
            .filter(Boolean);

        state.entries = [...state.entries, ...imported];
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

function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) {
        return [];
    }

    const header = lines[0].split(',').map((cell) => cell.trim().toLowerCase());
    return lines.slice(1).map((line) => {
        const values = line.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
        const row = values.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        const obj = {};
        header.forEach((key, index) => {
            obj[key] = row[index] || '';
        });
        return obj;
    });
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
        navigator.serviceWorker.register('./sw.js').catch((error) => {
            console.error('Service Worker konnte nicht registriert werden:', error);
        });
    });
}
