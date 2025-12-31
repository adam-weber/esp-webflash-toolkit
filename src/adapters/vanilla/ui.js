/**
 * Vanilla JS UI Adapter for ESP WebFlash Toolkit
 * Binds core events to DOM elements
 *
 * @author Adam Weber (github: adam-weber)
 */

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
 */

export class FlasherUI {
    /**
     * @param {ESPFlasher} flasher - Core flasher instance
     * @param {UIElements} elements - DOM element references
     */
    constructor(flasher, elements = {}) {
        this.flasher = flasher;
        this.elements = elements;

        // Animation state
        this.flashStartTime = null;
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;
        this.animationFrame = null;

        // Bind to flasher events
        this.bindEvents();
    }

    /**
     * Bind to core flasher events
     * @private
     */
    bindEvents() {
        this.flasher.addEventListener('status', (e) => this.handleStatus(e.detail));
        this.flasher.addEventListener('progress', (e) => this.handleProgress(e.detail));
        this.flasher.addEventListener('log', (e) => this.handleLog(e.detail));
        this.flasher.addEventListener('connected', (e) => this.handleConnected(e.detail));
        this.flasher.addEventListener('disconnected', () => this.handleDisconnected());
        this.flasher.addEventListener('error', (e) => this.handleError(e.detail));
        this.flasher.addEventListener('chip-mismatch', (e) => this.handleChipMismatch(e.detail));
        this.flasher.addEventListener('complete', () => this.handleComplete());
        this.flasher.addEventListener('schema-changed', (e) => this.renderConfigForm(e.detail.schema));
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
    handleError({ message }) {
        if (this.elements.statusBox) {
            this.elements.statusBox.className = 'status-box error';
            this.elements.statusBox.innerHTML = `
                <div class="status-text">Error</div>
                <div class="status-subtext">${message}</div>
            `;
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
     */
    renderConfigForm(schema) {
        if (!this.elements.configContainer || !schema) return;

        this.elements.configContainer.innerHTML = '';

        schema.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label for="config-${field.key}">
                    ${field.label}
                    ${field.required
                        ? '<span style="color: #ff3b30;">*</span>'
                        : '<span style="color: #86868b; font-weight: 400;">(optional)</span>'}
                </label>
                <input
                    type="${field.type || 'text'}"
                    id="config-${field.key}"
                    data-key="${field.key}"
                    placeholder="${field.placeholder || ''}"
                    ${field.default ? `value="${field.default}"` : ''}
                    ${field.required ? 'required' : ''}>
            `;

            // Bind input to config store
            const input = group.querySelector('input');
            input.addEventListener('input', () => {
                this.flasher.setConfig({ [field.key]: input.value });
            });

            this.elements.configContainer.appendChild(group);
        });
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
