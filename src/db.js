import {
    IDB_NAME,
    IDB_VERSION,
    IDB_STORE_ENTRIES,
    IDB_STORE_FOOD_TOLERANCES,
    IDB_KEY_ENTRIES,
    LEGACY_STORAGE_KEY,
    DRAFT_STORAGE_KEY,
    THEME_STORAGE_KEY,
    FOOD_DB_PATH,
    APP_VERSION_PATH,
    normalizeTolerance,
    normalizeText,
    getFoodTolerance,
    normalizeFoodRecord,
    getBackupFilename,
    getTolerancesBackupFilename,
    downloadBlob,
    generateEntryId,
    getTodayString,
} from './utils.js';
import { state, ui } from './state.js';

export function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB nicht unterstützt'));
            return;
        }

        const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE_ENTRIES)) {
                db.createObjectStore(IDB_STORE_ENTRIES);
            }
            if (!db.objectStoreNames.contains(IDB_STORE_FOOD_TOLERANCES)) {
                db.createObjectStore(IDB_STORE_FOOD_TOLERANCES, { keyPath: 'name' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function idbGetAllFoods() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_FOOD_TOLERANCES, 'readonly');
            const store = tx.objectStore(IDB_STORE_FOOD_TOLERANCES);
            const req = store.getAll();
            req.onsuccess = () => {
                const list = req.result || [];
                list.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
                resolve(list);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return [];
    }
}

export async function idbPutFood(foodItem) {
    try {
        const db = await openDatabase();
        const record = normalizeFoodRecord(foodItem);
        if (!record.name) {
            throw new Error('Name ist erforderlich');
        }
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_FOOD_TOLERANCES, 'readwrite');
            const store = tx.objectStore(IDB_STORE_FOOD_TOLERANCES);
            const req = store.put(record);
            req.onsuccess = () => resolve(record);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error('Fehler beim Speichern des Lebensmittels:', e);
        return null;
    }
}

export async function idbDeleteFood(foodName) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_FOOD_TOLERANCES, 'readwrite');
            const store = tx.objectStore(IDB_STORE_FOOD_TOLERANCES);
            const req = store.delete(foodName);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error('Fehler beim Löschen des Lebensmittels:', e);
        return false;
    }
}

export async function idbSetAllFoods(foodArray) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_FOOD_TOLERANCES, 'readwrite');
            const store = tx.objectStore(IDB_STORE_FOOD_TOLERANCES);
            store.clear();
            for (const item of foodArray) {
                const record = normalizeFoodRecord(item);
                if (!record.name) continue;
                store.put(record);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaktion abgebrochen'));
        });
    } catch (e) {
        console.error('Fehler beim Batch-Speichern der Lebensmittel:', e);
        return false;
    }
}

export async function idbClearFoods() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_FOOD_TOLERANCES, 'readwrite');
            const store = tx.objectStore(IDB_STORE_FOOD_TOLERANCES);
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return false;
    }
}

export async function idbGetEntries() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_ENTRIES, 'readonly');
            const store = tx.objectStore(IDB_STORE_ENTRIES);
            const req = store.get(IDB_KEY_ENTRIES);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null;
    }
}

export async function idbSaveEntries(entries) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_ENTRIES, 'readwrite');
            const store = tx.objectStore(IDB_STORE_ENTRIES);
            const req = store.put(entries, IDB_KEY_ENTRIES);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return false;
    }
}

export async function restoreEntries() {
    try {
        const idbData = await idbGetEntries();
        if (Array.isArray(idbData) && idbData.length > 0) {
            state.entries = idbData;
        } else {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (raw) {
                const legacyEntries = JSON.parse(raw);
                if (Array.isArray(legacyEntries) && legacyEntries.length > 0) {
                    state.entries = legacyEntries;
                    await idbSaveEntries(state.entries);
                }
            } else {
                state.entries = [];
            }
        }
    } catch (err) {
        console.warn('Fehler beim Laden aus IndexedDB:', err);
        state.entries = [];
    }

    try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {}
}

export function restoreDraftState() {
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
        }
    } catch (error) {
        console.error('Entwurf konnte nicht wiederhergestellt werden:', error);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
}

export function persistEntries() {
    idbSaveEntries(state.entries).catch((err) => {
        console.error('Speichern in IndexedDB fehlgeschlagen:', err);
        alert('Das Speichern in der lokalen Datenbank ist fehlgeschlagen. Bitte prüfe den Gerätespeicher.');
    });
}

export function persistDraftState() {
    try {
        const draft = {
            selectedDate: state.selectedDate,
            selectedFoods: [...state.selectedFoods],
            foodSearch: ui.foodSearch ? ui.foodSearch.value : '',
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
        console.error('Entwurf konnte nicht gespeichert werden:', error);
    }
}

export async function loadFoodDatabase() {
    let foods = await idbGetAllFoods();
    let isFirstRun = false;

    if (!foods || foods.length === 0) {
        try {
            const response = await fetch(FOOD_DB_PATH);
            const defaultFoods = await response.json();
            const normalized = defaultFoods.map(normalizeFoodRecord);
            await idbSetAllFoods(normalized);
            foods = await idbGetAllFoods();
            isFirstRun = true;
        } catch (error) {
            console.error('Standard-Lebensmittel konnten nicht geladen werden:', error);
            foods = [];
        }
    }

    state.foods = foods.map(normalizeFoodRecord);

    if (isFirstRun && !localStorage.getItem('food_tolerances_notice_dismissed')) {
        const noticeEl = document.getElementById('firstRunNotice');
        if (noticeEl) {
            noticeEl.classList.remove('hidden');
        }
    }
}

export async function resetFoodTolerancesToDefault() {
    try {
        const response = await fetch(FOOD_DB_PATH);
        const defaultFoods = await response.json();
        const normalized = defaultFoods.map(normalizeFoodRecord);
        await idbSetAllFoods(normalized);
        state.foods = await idbGetAllFoods();
        return true;
    } catch (e) {
        console.error('Fehler beim Zurücksetzen der Lebensmittel:', e);
        return false;
    }
}

export async function loadVersionInfo() {
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

export async function initPersistentStorage() {
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

export function updateStorageStatus(persisted) {
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

// Tries the native save-file picker, then Web Share, then falls back to a plain download.
async function saveOrShareBackup(payload, fileName, { pickerDescription, shareTitle, shareText }) {
    if (window.showSaveFilePicker && typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: pickerDescription,
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
    const candidateTypes = ['application/json', 'text/plain'];
    for (const mimeType of candidateTypes) {
        try {
            const backupFile = new File([blob], fileName, { type: mimeType });
            if (navigator.canShare && navigator.canShare({ files: [backupFile] })) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
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

    downloadBlob(blob, fileName);
}

export async function exportJsonBackup() {
    const fileName = getBackupFilename(new Date(), true);
    const payload = JSON.stringify({
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        entries: state.entries,
        foodTolerances: state.foods.map((food) => ({
            name: food.name,
            category: food.category,
            tolerance: getFoodTolerance(food),
        })),
    }, null, 2);

    await saveOrShareBackup(payload, fileName, {
        pickerDescription: 'JSON-Backup',
        shareTitle: 'Ernährungstagebuch Backup',
        shareText: `Backup vom ${new Date().toLocaleDateString('de-DE')}`,
    });
}

export async function exportTolerancesBackup() {
    const fileName = getTolerancesBackupFilename(new Date(), true);
    const payload = JSON.stringify({
        type: 'food_tolerances_backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        foods: state.foods.map((food) => ({
            name: food.name,
            category: food.category,
            tolerance: getFoodTolerance(food),
        })),
    }, null, 2);

    await saveOrShareBackup(payload, fileName, {
        pickerDescription: 'JSON-Lebensmittel-Toleranzen',
        shareTitle: 'Lebensmittel & Verträglichkeiten',
        shareText: `Export vom ${new Date().toLocaleDateString('de-DE')}`,
    });
}

export function parseImportedJson(content) {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
        return { entries: parsed, foodTolerances: [] };
    }
    if (parsed && typeof parsed === 'object') {
        const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
        const foodTolerances = Array.isArray(parsed.foodTolerances)
            ? parsed.foodTolerances
            : Array.isArray(parsed.foods)
            ? parsed.foods
            : [];
        return { entries, foodTolerances };
    }
    return { entries: [], foodTolerances: [] };
}

export function parseImportedTolerancesJson(content) {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.foods)) {
        return parsed.foods;
    }
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (parsed && Array.isArray(parsed.foodTolerances)) {
        return parsed.foodTolerances;
    }
    return [];
}

export function normalizeImportedEntry(entry, getFoodByNameFn) {
    const name = entry.name || entry.food || entry['Lebensmittel'];
    if (!name) {
        return null;
    }

    const food = getFoodByNameFn ? getFoodByNameFn(name) : state.foods.find((item) => normalizeText(item.name) === normalizeText(name));
    const tol = normalizeTolerance(entry.tolerance || entry.status || getFoodTolerance(food));
    return {
        id: entry.id || generateEntryId(),
        date: entry.date || entry.day || getTodayString(),
        name: food ? food.name : name,
        category: food ? food.category : entry.category || 'Unbekannt',
        tolerance: tol,
        createdAt: entry.createdAt || Date.now(),
    };
}
