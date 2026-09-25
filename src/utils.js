export const LEGACY_STORAGE_KEY = 'ernaehrungstagebuch-diary-v1';
export const DRAFT_STORAGE_KEY = 'ernaehrungstagebuch-draft-v1';
export const THEME_STORAGE_KEY = 'ernaehrungstagebuch-theme';
export const IDB_NAME = 'ernaehrungstagebuch_db';
export const IDB_VERSION = 2;
export const IDB_STORE_ENTRIES = 'entries';
export const IDB_STORE_FOOD_TOLERANCES = 'food_tolerances';
export const IDB_KEY_ENTRIES = 'current_entries';
export const FOOD_DB_PATH = './food-tolerance.json';
export const APP_VERSION_PATH = './version.json';
export const MAX_SUGGESTIONS = 20;
export const ROTATION_WARNING_DAYS = 3;
export const BACKUP_FILENAME_PREFIX = 'backup';
export const TOLERANCES_BACKUP_PREFIX = 'food-tolerances';

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function normalizeText(value) {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

export function normalizeStatus(rawStatus) {
    const value = String(rawStatus || '').toLowerCase();
    if (value === 'red' || value.includes('rot')) return 'red';
    if (value === 'orange' || value.includes('orange')) return 'orange';
    return 'green';
}

export const normalizeTolerance = normalizeStatus;

export function toStatusLabel(status) {
    if (status === 'orange') return 'Orange';
    if (status === 'red') return 'Rot';
    return 'Grün';
}

export const toToleranceLabel = toStatusLabel;

export function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getTodayString() {
    return formatDateInput(new Date());
}

export function parseDateInput(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

export function diffInDays(left, right) {
    const leftDate = parseDateInput(left);
    const rightDate = parseDateInput(right);
    const diffMs = leftDate.getTime() - rightDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatFriendlyDate(dateString) {
    const date = parseDateInput(dateString);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

export function formatShortFriendlyDate(dateString) {
    const date = parseDateInput(dateString);
    const today = getTodayString();
    const diff = diffInDays(today, dateString);

    const formatted = new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
    }).format(date);

    if (diff === 0) {
        return `Heute (${formatted})`;
    }
    if (diff === 1) {
        return `Gestern (${formatted})`;
    }
    if (diff === -1) {
        return `Morgen (${formatted})`;
    }
    return formatted;
}

export function getDateStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getDateTimeStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function getBackupFilename(date = new Date(), includeTime = true) {
    const stamp = includeTime ? getDateTimeStamp(date) : getDateStamp(date);
    return `${BACKUP_FILENAME_PREFIX}_${stamp}.json`;
}

export function getTolerancesBackupFilename(date = new Date(), includeTime = true) {
    const stamp = includeTime ? getDateTimeStamp(date) : getDateStamp(date);
    return `${TOLERANCES_BACKUP_PREFIX}_${stamp}.json`;
}

export function generateEntryId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};
