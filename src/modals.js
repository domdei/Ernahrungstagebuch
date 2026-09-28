import { state, ui } from './state.js';
import { escapeHtml, normalizeText, toToleranceLabel, getFoodTolerance } from './utils.js';

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
            const icon = isRed
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"></path><line x1="12" y1="9" x2="12" y2="14"></line><line x1="12" y1="17" x2="12" y2="17.01"></line></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline></svg>';
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

let onGenericConfirmResolve = null;

/** Reusable themed replacement for window.confirm/alert; falls back to native dialogs if the modal markup is missing. */
export function showConfirmDialog({
    title = 'Bestätigen',
    message = '',
    confirmLabel = 'Bestätigen',
    cancelLabel = 'Abbrechen',
    danger = false,
    infoOnly = false,
} = {}) {
    if (!ui.genericConfirmModal) {
        if (infoOnly) {
            window.alert(message);
            return Promise.resolve(true);
        }
        return Promise.resolve(window.confirm(message));
    }

    if (onGenericConfirmResolve) {
        onGenericConfirmResolve(false);
        onGenericConfirmResolve = null;
    }

    return new Promise((resolve) => {
        onGenericConfirmResolve = resolve;

        if (ui.genericConfirmTitle) ui.genericConfirmTitle.textContent = title;
        if (ui.genericConfirmText) ui.genericConfirmText.textContent = message;
        if (ui.genericConfirmProceedLabel) ui.genericConfirmProceedLabel.textContent = confirmLabel;
        if (ui.genericConfirmCancelLabel) ui.genericConfirmCancelLabel.textContent = cancelLabel;
        if (ui.genericConfirmProceedButton) {
            ui.genericConfirmProceedButton.classList.toggle('modal-btn-danger', danger);
            ui.genericConfirmProceedButton.classList.toggle('modal-btn-confirm', !danger);
        }
        if (ui.genericConfirmCancelButton) {
            ui.genericConfirmCancelButton.classList.toggle('hidden', infoOnly);
        }

        ui.genericConfirmModal.classList.remove('hidden');

        const cleanup = () => {
            ui.genericConfirmModal.classList.add('hidden');
            ui.genericConfirmProceedButton.removeEventListener('click', onConfirm);
            ui.genericConfirmCancelButton.removeEventListener('click', onCancel);
            ui.genericConfirmCloseButton?.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeyDown);
            ui.genericConfirmModal.removeEventListener('click', onBackdropClick);
            onGenericConfirmResolve = null;
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(infoOnly);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            }
        };

        const onBackdropClick = (event) => {
            if (event.target === ui.genericConfirmModal) {
                onCancel();
            }
        };

        ui.genericConfirmProceedButton.addEventListener('click', onConfirm);
        ui.genericConfirmCancelButton.addEventListener('click', onCancel);
        ui.genericConfirmCloseButton?.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);
        ui.genericConfirmModal.addEventListener('click', onBackdropClick);
    });
}

export function openSelectionModal({
    items,
    activeItem = 'all',
    title = 'Auswahl',
    description = 'Wähle eine Option.',
    onSelect,
}) {
    if (!ui.categoryModal || !ui.categoryModalGrid) {
        return;
    }

    if (ui.categoryModalTitle) {
        ui.categoryModalTitle.textContent = title;
    }
    if (ui.categoryModalDescription) {
        ui.categoryModalDescription.textContent = description;
    }

    ui.categoryModalGrid.innerHTML = items
        .map((item) => {
            const isSelected = item.value === activeItem;
            return `
        <button type="button" class="category-modal-item ${isSelected ? 'selected' : ''}" data-value="${escapeHtml(item.value)}">
          <span class="category-modal-item-name">${item.icon ? `<span style="margin-right:8px; display:inline-flex; align-items:center;">${item.icon}</span>` : ''}${escapeHtml(item.label)}</span>
          ${isSelected ? '<span class="category-modal-check">✓</span>' : ''}
        </button>
      `;
        })
        .join('');

    ui.categoryModalGrid.onclick = (e) => {
        const btn = e.target.closest('.category-modal-item');
        if (!btn) return;
        const val = btn.dataset.value;
        closeCategoryModal();
        if (typeof onSelect === 'function') {
            onSelect(val);
        }
    };

    ui.categoryModal.classList.remove('hidden');
}

export function openCategoryModal(
    onSelectCategory,
    activeCategory = 'all',
    title = 'Kategorie auswählen',
    description = 'Wähle eine Kategorie, um die Anzeige einzugrenzen.'
) {
    const categories = ['all', ...[...new Set(state.foods.map((food) => food.category))].sort()];
    const items = categories.map((cat) => ({
        value: cat,
        label: cat === 'all' ? 'Alle Kategorien' : cat,
        icon: '',
    }));

    openSelectionModal({
        items,
        activeItem: activeCategory,
        title,
        description,
        onSelect: onSelectCategory,
    });
}

export function openStatusModal(onSelectStatus, activeStatus = 'all') {
    const items = [
        { value: 'all', label: 'Alle Status', icon: '' },
        { value: 'green', label: 'Grün (Verträglich)', icon: '<span class="tolerance-dot dot-green" aria-hidden="true"></span>' },
        { value: 'orange', label: 'Orange (Eingeschränkt)', icon: '<span class="tolerance-dot dot-orange" aria-hidden="true"></span>' },
        { value: 'red', label: 'Rot (Unverträglich)', icon: '<span class="tolerance-dot dot-red" aria-hidden="true"></span>' },
    ];

    openSelectionModal({
        items,
        activeItem: activeStatus,
        title: 'Verlauf: Status filtern',
        description: 'Wähle einen Verträglichkeitsstatus, um den Verlauf zu filtern.',
        onSelect: onSelectStatus,
    });
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
            ui.importCloseButton?.removeEventListener('click', onCancel);
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
        ui.importCloseButton?.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);
        ui.importModal.addEventListener('click', onBackdropClick);
    });
}

export function openFoodManagerModal() {
    if (!ui.foodManagerModal) return;
    ui.foodManagerModal.classList.remove('hidden');
    renderFoodManagerCategoryOptions();
    updateFoodManagerFiltersUI();
    renderFoodManagerList();
    closeFoodForm();
}

export function closeFoodManagerModal() {
    if (!ui.foodManagerModal) return;
    ui.foodManagerModal.classList.add('hidden');
    closeFoodForm();
}

export function renderFoodManagerCategoryOptions() {
    const categories = [...new Set(state.foods.map((f) => f.category))].sort((a, b) =>
        a.localeCompare(b, 'de', { sensitivity: 'base' })
    );

    if (ui.foodCategoryDatalist) {
        ui.foodCategoryDatalist.innerHTML = categories
            .map((c) => `<option value="${escapeHtml(c)}"></option>`)
            .join('');
    }
}

export function updateFoodManagerFiltersUI() {
    const cat = state.foodManagerCategory || 'all';
    const hasCatFilter = Boolean(cat && cat !== 'all');
    if (ui.foodManagerCategoryChipText) {
        ui.foodManagerCategoryChipText.textContent = hasCatFilter ? cat : 'Alle Kategorien';
    }
    if (ui.foodManagerCategoryChipButton) {
        ui.foodManagerCategoryChipButton.classList.toggle('has-filter', hasCatFilter);
    }
    if (ui.foodManagerCategoryClearButton) {
        ui.foodManagerCategoryClearButton.classList.toggle('hidden', !hasCatFilter);
    }

    const tol = state.foodManagerTolerance || 'all';
    const hasTolFilter = Boolean(tol && tol !== 'all');
    const tolLabels = {
        all: 'Alle Status',
        green: 'Grün',
        orange: 'Orange',
        red: 'Rot',
    };
    if (ui.foodManagerToleranceChipText) {
        ui.foodManagerToleranceChipText.textContent = hasTolFilter ? tolLabels[tol] || tol : 'Alle Status';
    }
    if (ui.foodManagerToleranceChipButton) {
        ui.foodManagerToleranceChipButton.classList.toggle('has-filter', hasTolFilter);
    }
    if (ui.foodManagerToleranceClearButton) {
        ui.foodManagerToleranceClearButton.classList.toggle('hidden', !hasTolFilter);
    }
}

export function renderFoodManagerList() {
    if (!ui.foodManagerList) return;

    const query = ui.foodManagerSearch ? normalizeText(ui.foodManagerSearch.value) : '';
    const category = state.foodManagerCategory || 'all';
    const tolerance = state.foodManagerTolerance || 'all';

    const filtered = state.foods.filter((food) => {
        const matchesQuery = !query || normalizeText(food.name).includes(query);
        const matchesCategory = category === 'all' || food.category === category;
        const matchesTol = tolerance === 'all' || getFoodTolerance(food) === tolerance;
        return matchesQuery && matchesCategory && matchesTol;
    });

    if (filtered.length === 0) {
        ui.foodManagerList.innerHTML = `
          <div class="empty-food-state">
            <span class="empty-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <p>Keine passenden Lebensmittel gefunden.</p>
          </div>
        `;
        return;
    }

    ui.foodManagerList.innerHTML = filtered
        .map((food) => {
            const tol = getFoodTolerance(food);
            return `
        <div class="food-item-row" data-name="${escapeHtml(food.name)}">
          <div class="food-item-info">
            <strong class="food-item-name">${escapeHtml(food.name)}</strong>
            <span class="food-item-category">${escapeHtml(food.category)}</span>
          </div>
          <div class="food-item-controls">
            <div class="tolerance-segmented-toggle" role="radiogroup" aria-label="Verträglichkeit von ${escapeHtml(food.name)}">
              <button type="button" class="tolerance-pill pill-green ${tol === 'green' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="green" title="Verträglich (Grün)"><span class="tolerance-dot dot-green" aria-hidden="true"></span></button>
              <button type="button" class="tolerance-pill pill-orange ${tol === 'orange' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="orange" title="Eingeschränkt (Orange)"><span class="tolerance-dot dot-orange" aria-hidden="true"></span></button>
              <button type="button" class="tolerance-pill pill-red ${tol === 'red' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="red" title="Unverträglich (Rot)"><span class="tolerance-dot dot-red" aria-hidden="true"></span></button>
            </div>
            <button type="button" class="icon-button small-icon-button edit-food-btn" data-name="${escapeHtml(food.name)}" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
            <button type="button" class="icon-button small-icon-button delete-food-btn" data-name="${escapeHtml(food.name)}" title="Löschen" aria-label="Löschen">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
        })
        .join('');
}

export function openFoodForm(food = null) {
    if (!ui.foodFormContainer) return;
    renderFoodManagerCategoryOptions();

    if (food) {
        if (ui.foodFormTitle) ui.foodFormTitle.textContent = 'Lebensmittel bearbeiten';
        if (ui.foodFormName) ui.foodFormName.value = food.name;
        if (ui.foodFormCategory) ui.foodFormCategory.value = food.category;
        if (ui.foodFormOriginalName) ui.foodFormOriginalName.value = food.name;
        const tol = getFoodTolerance(food);
        const radio = ui.foodFormContainer.querySelector(`input[name="foodFormTolerance"][value="${tol}"]`);
        if (radio) radio.checked = true;
    } else {
        if (ui.foodFormTitle) ui.foodFormTitle.textContent = 'Neues Lebensmittel';
        if (ui.foodFormName) ui.foodFormName.value = '';
        if (ui.foodFormCategory) {
            const currentCat = state.foodManagerCategory;
            ui.foodFormCategory.value = currentCat && currentCat !== 'all' ? currentCat : '';
        }
        if (ui.foodFormOriginalName) ui.foodFormOriginalName.value = '';
        const radio = ui.foodFormContainer.querySelector(`input[name="foodFormTolerance"][value="green"]`);
        if (radio) radio.checked = true;
    }

    ui.foodFormContainer.classList.remove('hidden');
    if (ui.foodFormName) {
        ui.foodFormName.focus();
    }
}

export function closeFoodForm() {
    if (!ui.foodFormContainer) return;
    ui.foodFormContainer.classList.add('hidden');
    if (ui.foodFormOriginalName) ui.foodFormOriginalName.value = '';
    if (ui.foodFormName) ui.foodFormName.value = '';
    if (ui.foodFormCategory) ui.foodFormCategory.value = '';
}

export function promptFoodDeleteConfirmation(foodName, usageCount) {
    let message = '';
    if (usageCount > 0) {
        const entryText = usageCount === 1 ? '1 Tagebucheintrag' : `${usageCount} Tagebucheinträgen`;
        message = `Dieses Lebensmittel wurde in ${entryText} verwendet. Soll es wirklich aus der Liste der Lebensmittel gelöscht werden? (Historische Einträge bleiben erhalten)`;
    } else {
        message = `Möchtest du "${foodName}" wirklich aus der Liste der Lebensmittel löschen?`;
    }
    return showConfirmDialog({
        title: 'Lebensmittel löschen',
        message,
        confirmLabel: 'Löschen',
        danger: true,
    });
}

export function promptTolerancesImportAction(importedCount, currentCount) {
    return new Promise((resolve) => {
        if (!ui.importModal) {
            const shouldMerge = window.confirm('Bestehende Lebensmittel behalten und importierte ergänzen?');
            resolve(shouldMerge ? 'merge' : 'replace');
            return;
        }

        ui.importModalText.textContent = `In der Datei wurden ${importedCount} Lebensmittel gefunden. Aktuell sind ${currentCount} vorhanden. Wie möchtest du fortfahren?`;

        ui.importModal.classList.remove('hidden');

        const cleanup = () => {
            ui.importModal.classList.add('hidden');
            ui.importMergeButton.removeEventListener('click', onMerge);
            ui.importReplaceButton.removeEventListener('click', onReplace);
            ui.importCancelButton.removeEventListener('click', onCancel);
            ui.importCloseButton?.removeEventListener('click', onCancel);
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
                onCancel();
            }
        };

        const onBackdropClick = (event) => {
            if (event.target === ui.importModal) {
                onCancel();
            }
        };

        ui.importMergeButton.addEventListener('click', onMerge);
        ui.importReplaceButton.addEventListener('click', onReplace);
        ui.importCancelButton.addEventListener('click', onCancel);
        ui.importCloseButton?.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);
        ui.importModal.addEventListener('click', onBackdropClick);
    });
}
