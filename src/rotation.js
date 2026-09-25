import { ROTATION_WARNING_DAYS, diffInDays, normalizeText, getTodayString, getFoodTolerance } from './utils.js';
import { state } from './state.js';

export function getFoodByName(name) {
    return state.foods.find((food) => food.name.toLowerCase() === name.trim().toLowerCase()) || null;
}

export function isFoodLoggedOnDate(foodName, targetDate) {
    if (!foodName || !targetDate) {
        return false;
    }
    const norm = foodName.trim().toLowerCase();
    return state.entries.some((entry) => entry.date === targetDate && entry.name.toLowerCase() === norm);
}

export function findMostRecentOccurrence(foodName, targetDate) {
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

export function getRecentMealLabel(foodName, referenceDate) {
    const mostRecent = findMostRecentOccurrence(foodName, referenceDate);
    if (!mostRecent || Math.abs(mostRecent.daysDifference) < 1 || Math.abs(mostRecent.daysDifference) > ROTATION_WARNING_DAYS) {
        return '';
    }
    return `${mostRecent.daysDifference}T`;
}

export function getRecentMealTitle(recentLabel) {
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

export function getWarningsForFood(foodName, selectedDate) {
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

    const tolerance = getFoodTolerance(food);
    if (tolerance === 'orange' || tolerance === 'red') {
        warnings.push({
            kind: 'red',
            title: 'Unverträglichkeit',
            text: 'Unverträglichkeit laut der eigenen Bewertung – dieses Lebensmittel sollte gemieden werden.',
        });
    }

    return warnings;
}

export function isFoodAvailableForSelectedDate(foodName, selectedDateValue) {
    const referenceDate = selectedDateValue || state.selectedDate || getTodayString();
    const hasRecentOrUpcomingOccurrence = state.entries.some((entry) => {
        if (entry.name !== foodName) {
            return false;
        }
        return Math.abs(diffInDays(referenceDate, entry.date)) <= ROTATION_WARNING_DAYS;
    });

    return !hasRecentOrUpcomingOccurrence;
}

export function getSuggestions(query) {
    const normalizedQuery = normalizeText(query);
    const category = state.searchCategory;
    const onlyFreshGreen = state.onlyFreshGreen;
    const selectedDateValue = state.selectedDate;

    return state.foods
        .filter((food) => {
            const matchesCategory = category === 'all' || food.category === category;
            const matchesQuery = !normalizedQuery || normalizeText(food.name).includes(normalizedQuery);
            const matchesGreenFilter = !onlyFreshGreen || (getFoodTolerance(food) === 'green' && isFoodAvailableForSelectedDate(food.name, selectedDateValue));
            return matchesCategory && matchesQuery && matchesGreenFilter;
        })
        .sort((a, b) => {
            if (normalizedQuery) {
                const scoreDiff = getSearchScore(a.name, normalizedQuery) - getSearchScore(b.name, normalizedQuery);
                if (scoreDiff !== 0) {
                    return scoreDiff;
                }
            }

            return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
        });
}

export function getSearchScore(name, query) {
    const normName = normalizeText(name);
    if (normName === query) return 0;
    if (normName.startsWith(query)) return 1;

    const words = normName.split(/\s+/);
    if (words.some((w) => w.startsWith(query))) return 2;

    const index = normName.indexOf(query);
    if (index !== -1) return 3 + index;

    return Number.POSITIVE_INFINITY;
}

export function filterEntries() {
    const fromDate = state.filterFromDate;
    const toDate = state.filterToDate;
    const category = state.filterCategory;
    const status = state.filterStatus;

    return state.entries.filter((entry) => {
        const matchesDate = (!fromDate || entry.date >= fromDate) && (!toDate || entry.date <= toDate);
        const matchesCategory = category === 'all' || entry.category === category;
        const matchesStatus = status === 'all' || (entry.tolerance || entry.status) === status;
        return matchesDate && matchesCategory && matchesStatus;
    });
}
