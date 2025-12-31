/**
 * Vanilla JS UI Adapter for ESP WebFlash Toolkit
 * Binds core events to DOM elements with proper lifecycle management
 *
 * @author Adam Weber (github: adam-weber)
 */

import { groupFieldsBySection } from '../../core/config-store.js';

/**
 * @typedef {Object} UIElements
 * @property {HTMLElement} [statusBox] - Status display container
 * @property {HTMLElement} [progressContainer] - Progress bar container
 * @property {HTMLElement} [progressFill] - Progress bar fill element
 * @property {HTMLElement} [progressPercent] - Progress percentage text
 * @property {HTMLElement} [progressTime] - Progress time remaining text
 * @property {HTMLElement} [logContainer] - Log/console container
 * @property {HTMLElement} [chipType] - Chip type display
 * @property {HTMLElement} [chipMac] - MAC address display
 * @property {HTMLElement} [configContainer] - Config form container
 * @property {HTMLElement} [connectBtn] - Connect button
 * @property {HTMLElement} [flashBtn] - Flash button
 * @property {HTMLElement} [retryBtn] - Retry button (shown on retryable errors)
 */

/**
 * Declarative binding configuration
 * Maps flasher events to UI update functions
 */
const DEFAULT_BINDINGS = {
    'status': 'handleStatus',
    'progress': 'handleProgress',
    'log': 'handleLog',
    'connected': 'handleConnected',
    'disconnected': 'handleDisconnected',
    'error': 'handleError',
    'chip-mismatch': 'handleChipMismatch',
    'complete': 'handleComplete',
    'schema-changed': 'handleSchemaChanged',
    'validation-failed': 'handleValidationFailed'
};

export class FlasherUI {
    /**
     * @param {ESPFlasher} flasher - Core flasher instance
     * @param {UIElements} elements - DOM element references
     * @param {Object} [options] - Configuration options
     * @param {Object} [options.bindings] - Custom event bindings (event -> handler name)
     * @param {boolean} [options.groupBySection] - Group config fields by section (default: true)
     */
    constructor(flasher, elements = {}, options = {}) {
        this.flasher = flasher;
        this.elements = elements;
        this.options = {
            groupBySection: options.groupBySection !== false,
            bindings: { ...DEFAULT_BINDINGS, ...options.bindings }
        };

        // Animation state
        this.flashStartTime = null;
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;
        this.animationFrame = null;

        // Track event listeners for cleanup
        this._boundHandlers = [];
        this._inputHandlers = [];

        // Bind to flasher events
        this._bindEvents();
    }

    /**
     * Bind to core flasher events with cleanup tracking
     * @private
     */
    _bindEvents() {
        for (const [event, handlerName] of Object.entries(this.options.bindings)) {
            if (typeof this[handlerName] === 'function') {
                const handler = (e) => this[handlerName](e.detail);
                this.flasher.addEventListener(event, handler);
                this._boundHandlers.push({ event, handler });
            }
        }
    }

    /**
     * Clean up all event listeners
     * Call this when disposing of the UI instance
     */
    dispose() {
        // Remove flasher event listeners
        for (const { event, handler } of this._boundHandlers) {
            this.flasher.removeEventListener(event, handler);
        }
        this._boundHandlers = [];

        // Remove input handlers
        for (const { element, event, handler } of this._inputHandlers) {
            element.removeEventListener(event, handler);
        }
        this._inputHandlers = [];

        // Cancel any animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Handle schema changes - renders config form
     * @private
     */
    handleSchemaChanged({ schema }) {
        this.renderConfigForm(schema);
    }

    /**
     * Handle validation failures
     * @private
     */
    handleValidationFailed({ errors, missing }) {
        // Highlight fields with errors
        if (this.elements.configContainer) {
            for (const key of Object.keys(errors)) {
                const input = this.elements.configContainer.querySelector(`[data-key="${key}"]`);
                if (input) {
                    input.classList.add('error');
                    // Find or create error message
                    let errorEl = input.parentNode.querySelector('.field-error');
                    if (!errorEl) {
                        errorEl = document.createElement('span');
                        errorEl.className = 'field-error';
                        input.parentNode.appendChild(errorEl);
                    }
                    errorEl.textContent = errors[key];
                }
            }
        }
    }

    /**
     * Handle status updates
     */
    handleStatus({ state, message }) {
        if (!this.elements.statusBox) return;

        const stateClasses = {
            connecting: 'waiting',
            connected: 'connected',
            downloading: 'flashing',
            generating: 'flashing',
            flashing: 'flashing',
            complete: 'success',
            error: 'error'
        };

        this.elements.statusBox.className = `status-box ${stateClasses[state] || state}`;
        this.elements.statusBox.innerHTML = `
            <div class="status-text">${message}</div>
            <div class="status-subtext"></div>
        `;
    }

    /**
     * Handle progress updates
     */
    handleProgress({ percent, written, total }) {
        this.targetPercent = percent;

        if (!this.animationFrame) {
            this.animateProgress();
        }

        // Show progress container
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.add('active');
        }

        // Update time estimate
        if (this.flashStartTime && percent > 0 && percent < 100 && this.elements.progressTime) {
            const elapsed = (Date.now() - this.flashStartTime) / 1000;
            const remaining = Math.max(0, Math.round((elapsed / percent) * (100 - percent)));
            this.elements.progressTime.textContent = `~${remaining}s remaining`;
        }
    }

    /**
     * Animate progress bar smoothly
     * @private
     */
    animateProgress() {
        const diff = this.targetPercent - this.lastDisplayedPercent;

        if (Math.abs(diff) > 0.1) {
            this.lastDisplayedPercent += diff * 0.1;

            if (this.elements.progressFill) {
                this.elements.progressFill.style.width = `${this.lastDisplayedPercent}%`;
            }
            if (this.elements.progressPercent) {
                this.elements.progressPercent.textContent = `${Math.round(this.lastDisplayedPercent)}%`;
            }

            this.animationFrame = requestAnimationFrame(() => this.animateProgress());
        } else {
            this.lastDisplayedPercent = this.targetPercent;

            if (this.elements.progressFill) {
                this.elements.progressFill.style.width = `${this.targetPercent}%`;
            }
            if (this.elements.progressPercent) {
                this.elements.progressPercent.textContent = `${Math.round(this.targetPercent)}%`;
            }

            this.animationFrame = null;
        }
    }

    /**
     * Handle log messages
     */
    handleLog({ message, level }) {
        if (!this.elements.logContainer) return;

        const line = document.createElement('div');
        line.className = `serial-line ${level}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.logContainer.appendChild(line);
        this.elements.logContainer.scrollTop = this.elements.logContainer.scrollHeight;
    }

    /**
     * Handle successful connection
     */
    handleConnected({ chipType, macAddr }) {
        if (this.elements.chipType) {
            this.elements.chipType.textContent = chipType;
        }
        if (this.elements.chipMac) {
            this.elements.chipMac.textContent = macAddr || '-';
        }

        // Update buttons
        if (this.elements.connectBtn) {
            this.elements.connectBtn.style.display = 'none';
        }
        if (this.elements.flashBtn) {
            this.elements.flashBtn.style.display = 'block';
            this.elements.flashBtn.disabled = false;
        }

        // Start timing for progress estimates
        this.flashStartTime = Date.now();
    }

    /**
     * Handle disconnection
     */
    handleDisconnected() {
        if (this.elements.connectBtn) {
            this.elements.connectBtn.style.display = 'block';
            this.elements.connectBtn.disabled = false;
        }
        if (this.elements.flashBtn) {
            this.elements.flashBtn.style.display = 'none';
        }
    }

    /**
     * Handle errors
     */
    handleError({ message, error }) {
        if (this.elements.statusBox) {
            const state = this.flasher.getState();
            const retryHtml = state.canRetry && this.elements.retryBtn
                ? ''  // Retry button handled separately
                : (state.canRetry
                    ? `<button class="retry-btn" onclick="this.closest('.status-box').dispatchEvent(new CustomEvent('retry'))">Retry</button>`
                    : '');

            this.elements.statusBox.className = 'status-box error';
            this.elements.statusBox.innerHTML = `
                <div class="status-text">Error</div>
                <div class="status-subtext">${message}</div>
                ${retryHtml}
            `;

            // Wire up inline retry button if present
            const retryBtn = this.elements.statusBox.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', async () => {
                    try {
                        await this.flasher.retry();
                    } catch (e) {
                        // Error will be emitted through events
                    }
                });
            }
        }

        // Show dedicated retry button if available
        if (this.elements.retryBtn) {
            const state = this.flasher.getState();
            this.elements.retryBtn.style.display = state.canRetry ? 'block' : 'none';
        }
    }

    /**
     * Handle chip mismatch - show dialog
     */
    async handleChipMismatch({ expected, detected, proceed, cancel }) {
        // Default: use confirm dialog
        const shouldProceed = confirm(
            `Chip mismatch detected!\n\n` +
            `Expected: ${expected}\n` +
            `Detected: ${detected}\n\n` +
            `Do you want to continue anyway?`
        );

        if (shouldProceed) {
            proceed();
        } else {
            cancel();
        }
    }

    /**
     * Handle flash complete
     */
    handleComplete() {
        if (this.elements.progressTime) {
            this.elements.progressTime.textContent = 'Complete';
        }

        // Reset animation state
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Render config form from schema
     * @param {Array} schema - Field definitions
     */
    renderConfigForm(schema) {
        if (!this.elements.configContainer || !schema) return;

        // Clean up existing input handlers
        for (const { element, event, handler } of this._inputHandlers) {
            element.removeEventListener(event, handler);
        }
        this._inputHandlers = [];

        this.elements.configContainer.innerHTML = '';

        // Group fields by section if enabled
        if (this.options.groupBySection) {
            const sections = groupFieldsBySection(schema);

            for (const section of sections) {
                const sectionEl = document.createElement('div');
                sectionEl.className = 'config-section';

                if (section.title && section.title !== 'default') {
                    const header = document.createElement('h3');
                    header.className = 'config-section-title';
                    header.textContent = section.title;
                    sectionEl.appendChild(header);
                }

                for (const field of section.fields) {
                    sectionEl.appendChild(this._createFieldElement(field));
                }

                this.elements.configContainer.appendChild(sectionEl);
            }
        } else {
            // Flat rendering
            for (const field of schema) {
                this.elements.configContainer.appendChild(this._createFieldElement(field));
            }
        }
    }

    /**
     * Create a form field element
     * @private
     */
    _createFieldElement(field) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const escapedPlaceholder = (field.placeholder || '').replace(/"/g, '&quot;');
        const escapedDefault = (field.default || '').replace(/"/g, '&quot;');

        group.innerHTML = `
            <label for="config-${field.key}">
                ${field.label}
                ${field.required
                    ? '<span class="required-marker">*</span>'
                    : '<span class="optional-marker">(optional)</span>'}
            </label>
            <input
                type="${field.type || 'text'}"
                id="config-${field.key}"
                data-key="${field.key}"
                placeholder="${escapedPlaceholder}"
                value="${escapedDefault}"
                ${field.required ? 'required' : ''}
                ${field.pattern ? `pattern="${field.pattern}"` : ''}>
            ${field.help ? `<span class="help-text">${field.help}</span>` : ''}
        `;

        // Bind input to config store with cleanup tracking
        const input = group.querySelector('input');
        const handler = () => {
            // Clear any error state on input
            input.classList.remove('error');
            const errorEl = group.querySelector('.field-error');
            if (errorEl) errorEl.remove();

            this.flasher.setConfig({ [field.key]: input.value });
        };

        input.addEventListener('input', handler);
        this._inputHandlers.push({ element: input, event: 'input', handler });

        return group;
    }

    /**
     * Clear the log
     */
    clearLog() {
        if (this.elements.logContainer) {
            this.elements.logContainer.innerHTML = '<div class="serial-line info">Log cleared</div>';
        }
    }

    /**
     * Show progress bar
     */
    showProgress() {
        this.flashStartTime = Date.now();
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;

        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.add('active');
        }
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = '0%';
        }
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = '0%';
        }
    }

    /**
     * Hide progress bar
     */
    hideProgress() {
        if (this.elements.progressContainer) {
            this.elements.progressContainer.classList.remove('active');
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}
