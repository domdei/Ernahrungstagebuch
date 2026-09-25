import { getTodayString, formatDateInput } from './utils.js';

export function getDefaultHistoryFromDate() {
    const today = new Date();
    today.setDate(today.getDate() - 3);
    return formatDateInput(today);
}

export const state = {
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

export const ui = {
    dateChipButton: document.getElementById('dateChipButton'),
    dateChipText: document.getElementById('dateChipText'),
    entryDate: document.getElementById('entryDate'),
    todayButton: document.getElementById('todayButton'),
    categoryChipButton: document.getElementById('categoryChipButton'),
    categoryChipText: document.getElementById('categoryChipText'),
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
    confirmModal: document.getElementById('confirmModal'),
    confirmModalText: document.getElementById('confirmModalText'),
    confirmModalList: document.getElementById('confirmModalList'),
    confirmProceedButton: document.getElementById('confirmProceedButton'),
    confirmCancelButton: document.getElementById('confirmCancelButton'),
};

export function isMobileView() {
    return window.matchMedia('(max-width: 760px), (max-height: 500px)').matches;
}
