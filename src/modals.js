import { state, ui } from './state.js';
import { escapeHtml } from './utils.js';

let onConfirmSaveCallback = null;

export function openSettingsModal() {
    if (!ui.settingsModal) {
        return;
    }
    ui.settingsModal.classList.remove('hidden');
}

export function closeSettingsModal() {
    if (!ui.settingsModal) {
        return;
    }
    ui.settingsModal.classList.add('hidden');
}

export function openConfirmModal(conflicts, onProceed) {
    if (!ui.confirmModal || !ui.confirmModalList) {
        if (typeof onProceed === 'function') {
            onProceed();
        }
        return;
    }

    onConfirmSaveCallback = onProceed;

    const itemsCount = conflicts.length;
    if (ui.confirmModalText) {
        ui.confirmModalText.textContent = itemsCount === 1
            ? 'Bei 1 ausgewählten Lebensmittel gibt es einen Hinweis (Rotation oder Unverträglichkeit). Möchtest du trotzdem speichern?'
            : `Bei ${itemsCount} ausgewählten Lebensmitteln gibt es Hinweise (Rotation oder Unverträglichkeit). Möchtest du trotzdem speichern?`;
    }

    ui.confirmModalList.innerHTML = conflicts
        .map((conflict) => {
            const warningsText = conflict.warnings.map((w) => w.text).join('<br>');
            const isRed = conflict.warnings.some((w) => w.kind === 'red');
            const kindClass = isRed ? 'kind-red' : 'kind-yellow';
            const icon = isRed ? '⚠️' : '⏱️';
            return `
        <div class="confirm-modal-item ${kindClass}">
          <span class="confirm-item-icon">${icon}</span>
          <div class="confirm-item-content">
            <strong>${escapeHtml(conflict.name)}</strong>
            <span>${warningsText}</span>
          </div>
        </div>
      `;
        })
        .join('');

    ui.confirmProceedButton.onclick = () => {
        const callback = onConfirmSaveCallback;
        closeConfirmModal();
        if (typeof callback === 'function') {
            callback();
        }
    };

    ui.confirmModal.classList.remove('hidden');
}

export function closeConfirmModal() {
    if (!ui.confirmModal) {
        return;
    }
    ui.confirmModal.classList.add('hidden');
    onConfirmSaveCallback = null;
}

export function openCategoryModal(onSelectCategory) {
    if (!ui.categoryModal || !ui.categoryModalGrid) {
        return;
    }

    const categories = ['all', ...[...new Set(state.foods.map((food) => food.category))].sort()];
    const current = state.searchCategory || 'all';

    ui.categoryModalGrid.innerHTML = categories
        .map((cat) => {
            const isAll = cat === 'all';
            const label = isAll ? 'Alle Kategorien' : cat;
            const isSelected = cat === current;
            return `
        <button type="button" class="category-modal-item ${isSelected ? 'selected' : ''}" data-category="${escapeHtml(cat)}">
          <span class="category-modal-item-name">${escapeHtml(label)}</span>
          ${isSelected ? '<span class="category-modal-check">✓</span>' : ''}
        </button>
      `;
        })
        .join('');

    ui.categoryModalGrid.onclick = (e) => {
        const btn = e.target.closest('.category-modal-item');
        if (!btn) return;
        const cat = btn.dataset.category;
        closeCategoryModal();
        if (typeof onSelectCategory === 'function') {
            onSelectCategory(cat);
        }
    };

    ui.categoryModal.classList.remove('hidden');
}

export function closeCategoryModal() {
    if (!ui.categoryModal) {
        return;
    }
    ui.categoryModal.classList.add('hidden');
}

export function promptImportAction(importedCount, currentCount) {
    return new Promise((resolve) => {
        if (!ui.importModal) {
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
