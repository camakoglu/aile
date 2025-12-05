import { store } from '../../services/state/store';
import type { Family } from '../../utils/familyDetection';

/**
 * Family filter dropdown component
 * Allows users to toggle visibility of different family branches
 */
export class FamilyDropdown {
  private container: HTMLElement;
  private dropdown: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private menu: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }
    this.container = container;
  }

  /**
   * Initialize and render the dropdown
   */
  init(): void {
    this.render();
    this.attachEvents();

    // Subscribe to store updates
    this.unsubscribe = store.subscribe(() => {
      this.updateDisplay();
    });
  }

  /**
   * Create DOM structure
   */
  private render(): void {
    const state = store.getState();
    const families = state.families;

    if (families.length === 0) {
      // No families detected, don't show dropdown
      this.container.innerHTML = '';
      return;
    }

    // If only one family, no need for filtering
    if (families.length === 1) {
      this.container.innerHTML = '';
      return;
    }

    const activeCount = state.activeFamilyIds.size;
    const totalCount = families.length;

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'family-dropdown';

    // Toggle button
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'family-dropdown-toggle';
    this.toggleButton.innerHTML = `
      <span class="icon">🏠</span>
      <span class="text">Families</span>
      <span class="count">(${activeCount}/${totalCount})</span>
      <span class="arrow">▼</span>
    `;

    // Dropdown menu
    this.menu = document.createElement('div');
    this.menu.className = 'family-dropdown-menu';
    this.menu.hidden = true;

    this.menu.innerHTML = `
      <div class="family-dropdown-header">
        <h3>Family Filters</h3>
        <button class="close-btn" aria-label="Close">×</button>
      </div>

      <div class="family-dropdown-all">
        <label>
          <input type="checkbox" id="family-all" ${activeCount === totalCount ? 'checked' : ''}>
          <span class="family-name">All Families</span>
        </label>
      </div>

      <div class="family-dropdown-divider"></div>

      <div class="family-dropdown-list">
        ${families.map(family => this.renderFamilyItem(family)).join('')}
      </div>

      <div class="family-dropdown-divider"></div>

      <div class="family-dropdown-actions">
        <button class="btn-select-all">Select All</button>
        <button class="btn-clear-all">Clear All</button>
      </div>
    `;

    this.dropdown.appendChild(this.toggleButton);
    this.dropdown.appendChild(this.menu);
    this.container.appendChild(this.dropdown);
  }

  /**
   * Render a single family item
   */
  private renderFamilyItem(family: Family): string {
    const isActive = store.isFamilyActive(family.id);

    return `
      <label class="family-item">
        <input type="checkbox" data-family-id="${family.id}" ${isActive ? 'checked' : ''}>
        <span class="color-indicator" style="background: ${family.color}"></span>
        <span class="family-name">${this.escapeHtml(family.name)}</span>
        <span class="member-count">${family.memberCount} member${family.memberCount !== 1 ? 's' : ''}</span>
      </label>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEvents(): void {
    if (!this.toggleButton || !this.menu) return;

    // Toggle dropdown on button click
    this.toggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Close button
    const closeBtn = this.menu.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeMenu();
      });
    }

    // "All Families" checkbox
    const allCheckbox = this.menu.querySelector('#family-all') as HTMLInputElement;
    if (allCheckbox) {
      allCheckbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          store.activateAllFamilies();
        } else {
          store.deactivateAllFamilies();
        }
      });
    }

    // Individual family checkboxes
    const familyCheckboxes = this.menu.querySelectorAll('input[data-family-id]');
    familyCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const familyId = target.dataset.familyId;
        if (familyId) {
          store.toggleFamily(familyId);
        }
      });
    });

    // Select All button
    const selectAllBtn = this.menu.querySelector('.btn-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        store.activateAllFamilies();
      });
    }

    // Clear All button
    const clearAllBtn = this.menu.querySelector('.btn-clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        store.deactivateAllFamilies();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdown && !this.dropdown.contains(e.target as Node)) {
        this.closeMenu();
      }
    });
  }

  /**
   * Toggle dropdown menu visibility
   */
  private toggleMenu(): void {
    if (!this.menu) return;

    if (this.menu.hidden) {
      this.openMenu();
    } else {
      this.closeMenu();
    }
  }

  /**
   * Open dropdown menu
   */
  private openMenu(): void {
    if (!this.menu) return;
    this.menu.hidden = false;
    this.toggleButton?.classList.add('open');
  }

  /**
   * Close dropdown menu
   */
  private closeMenu(): void {
    if (!this.menu) return;
    this.menu.hidden = true;
    this.toggleButton?.classList.remove('open');
  }

  /**
   * Update display when state changes
   */
  private updateDisplay(): void {
    const state = store.getState();
    const activeCount = state.activeFamilyIds.size;
    const totalCount = state.families.length;

    // Update count in toggle button
    const countSpan = this.toggleButton?.querySelector('.count');
    if (countSpan) {
      countSpan.textContent = `(${activeCount}/${totalCount})`;
    }

    // Update "All Families" checkbox
    const allCheckbox = this.menu?.querySelector('#family-all') as HTMLInputElement;
    if (allCheckbox) {
      allCheckbox.checked = activeCount === totalCount;
      allCheckbox.indeterminate = activeCount > 0 && activeCount < totalCount;
    }

    // Update individual checkboxes
    const familyCheckboxes = this.menu?.querySelectorAll('input[data-family-id]');
    familyCheckboxes?.forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      const familyId = input.dataset.familyId;
      if (familyId) {
        input.checked = store.isFamilyActive(familyId);
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the dropdown and clean up
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }

    this.toggleButton = null;
    this.menu = null;
  }
}
