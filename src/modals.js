import { state, ui } from './state.js';
import { escapeHtml, normalizeText, toToleranceLabel } from './utils.js';

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
          <span class="category-modal-item-name">${item.icon ? `<span style="margin-right:8px;">${item.icon}</span>` : ''}${escapeHtml(item.label)}</span>
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
        icon: '🏷️',
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
        { value: 'all', label: 'Alle Status', icon: '🚦' },
        { value: 'green', label: 'Grün (Verträglich)', icon: '🟢' },
        { value: 'orange', label: 'Orange (Eingeschränkt)', icon: '🟠' },
        { value: 'red', label: 'Rot (Unverträglich)', icon: '🔴' },
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

export function openFoodManagerModal() {
    if (!ui.foodManagerModal) return;
    ui.foodManagerModal.classList.remove('hidden');
    renderFoodManagerCategoryOptions();
    renderFoodManagerList();
    closeFoodForm();
}

export function closeFoodManagerModal() {
    if (!ui.foodManagerModal) return;
    ui.foodManagerModal.classList.add('hidden');
    closeFoodForm();
}

export function renderFoodManagerCategoryOptions() {
    if (!ui.foodManagerCategoryFilter) return;
    const currentVal = ui.foodManagerCategoryFilter.value || 'all';
    const categories = [...new Set(state.foods.map((f) => f.category))].sort((a, b) =>
        a.localeCompare(b, 'de', { sensitivity: 'base' })
    );
    const options = [
        '<option value="all">Alle Kategorien</option>',
        ...categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`),
    ].join('');
    ui.foodManagerCategoryFilter.innerHTML = options;
    ui.foodManagerCategoryFilter.value = categories.includes(currentVal) ? currentVal : 'all';

    if (ui.foodCategoryDatalist) {
        ui.foodCategoryDatalist.innerHTML = categories
            .map((c) => `<option value="${escapeHtml(c)}"></option>`)
            .join('');
    }
}

export function renderFoodManagerList() {
    if (!ui.foodManagerList) return;

    const query = ui.foodManagerSearch ? normalizeText(ui.foodManagerSearch.value) : '';
    const category = ui.foodManagerCategoryFilter ? ui.foodManagerCategoryFilter.value : 'all';
    const tolerance = ui.foodManagerToleranceFilter ? ui.foodManagerToleranceFilter.value : 'all';

    const filtered = state.foods.filter((food) => {
        const matchesQuery = !query || normalizeText(food.name).includes(query);
        const matchesCategory = category === 'all' || food.category === category;
        const matchesTol = tolerance === 'all' || (food.tolerance || food.status) === tolerance;
        return matchesQuery && matchesCategory && matchesTol;
    });

    if (ui.foodManagerCount) {
        ui.foodManagerCount.textContent = `${filtered.length} von ${state.foods.length}`;
    }

    if (filtered.length === 0) {
        ui.foodManagerList.innerHTML = `
          <div class="empty-food-state">
            <span class="empty-state-icon">🔍</span>
            <p>Keine passenden Lebensmittel gefunden.</p>
          </div>
        `;
        return;
    }

    ui.foodManagerList.innerHTML = filtered
        .map((food) => {
            const tol = food.tolerance || food.status || 'green';
            return `
        <div class="food-item-row" data-name="${escapeHtml(food.name)}">
          <div class="food-item-info">
            <strong class="food-item-name">${escapeHtml(food.name)}</strong>
            <span class="food-item-category">${escapeHtml(food.category)}</span>
          </div>
          <div class="food-item-controls">
            <div class="tolerance-segmented-toggle" role="radiogroup" aria-label="Verträglichkeit von ${escapeHtml(food.name)}">
              <button type="button" class="tolerance-pill pill-green ${tol === 'green' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="green" title="Verträglich (Grün)">🟢</button>
              <button type="button" class="tolerance-pill pill-orange ${tol === 'orange' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="orange" title="Eingeschränkt (Orange)">🟠</button>
              <button type="button" class="tolerance-pill pill-red ${tol === 'red' ? 'active' : ''}" data-name="${escapeHtml(food.name)}" data-tol="red" title="Unverträglich (Rot)">🔴</button>
            </div>
            <button type="button" class="icon-button small-icon-button edit-food-btn" data-name="${escapeHtml(food.name)}" title="Bearbeiten" aria-label="Bearbeiten">✎</button>
            <button type="button" class="icon-button small-icon-button delete-food-btn" data-name="${escapeHtml(food.name)}" title="Löschen" aria-label="Löschen">🗑️</button>
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
        const tol = food.tolerance || food.status || 'green';
        const radio = ui.foodFormContainer.querySelector(`input[name="foodFormTolerance"][value="${tol}"]`);
        if (radio) radio.checked = true;
    } else {
        if (ui.foodFormTitle) ui.foodFormTitle.textContent = 'Neues Lebensmittel';
        if (ui.foodFormName) ui.foodFormName.value = '';
        if (ui.foodFormCategory) {
            const currentCat = ui.foodManagerCategoryFilter ? ui.foodManagerCategoryFilter.value : '';
            ui.foodFormCategory.value = currentCat !== 'all' ? currentCat : '';
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
    return new Promise((resolve) => {
        let message = '';
        if (usageCount > 0) {
            const entryText = usageCount === 1 ? '1 Tagebucheintrag' : `${usageCount} Tagebucheinträgen`;
            message = `Dieses Lebensmittel wurde in ${entryText} verwendet. Soll es wirklich aus der Liste der Lebensmittel gelöscht werden?\n\n(Historische Einträge bleiben erhalten)`;
        } else {
            message = `Möchtest du "${foodName}" wirklich aus der Liste der Lebensmittel löschen?`;
        }
        resolve(window.confirm(message));
    });
}

export function promptTolerancesImportAction(importedCount, currentCount) {
    return new Promise((resolve) => {
        const text = `In der Datei wurden ${importedCount} Lebensmittel gefunden. Aktuell sind ${currentCount} vorhanden.\n\n[OK] = Ergänzen (Bestehendes behalten, neue/geänderte übernehmen)\n[Abbrechen] = Ersetzen (Alle bisherigen Lebensmittel durch den Import ersetzen)`;
        resolve(window.confirm(text) ? 'merge' : 'replace');
    });
}
