/**
 * FlasherApp - Complete Flasher Application
 * Full-featured UI application using the core library
 *
 * This is the main application class used by the template flasher.
 * It wraps ESPFlasher and FlasherUI with additional features:
 * - Project configuration support
 * - Developer options panel
 * - Auto-reconnect
 * - Log export
 * - Custom firmware upload
 *
 * @author Adam Weber (github: adam-weber)
 */

import { ESPFlasher, NVSGenerator, expandFieldPresets, groupFieldsBySection } from '../../core/index.js';
import { FlasherUI } from './ui.js';

/**
 * @typedef {Object} ProjectConfig
 * @property {string} name - Project display name
 * @property {string} description - Project description
 * @property {string} chip - Expected chip type
 * @property {string} firmwareUrl - Firmware download URL
 * @property {Array} [fields] - Config field definitions (new format)
 * @property {Array} [configSections] - Config form sections (legacy format)
 * @property {number} [nvsOffset] - NVS partition offset (new format)
 * @property {number} [nvsSize] - NVS partition size (new format)
 * @property {Object} [nvsPartition] - NVS partition settings (legacy format)
 * @property {number} [firmwareOffset] - Firmware offset
 * @property {Array} [hardware] - Hardware requirements list
 * @property {Array} [software] - Software features list
 * @property {Object} [documentation] - Documentation link
 * @property {Array} [navbarLinks] - Header navigation links
 */

export class FlasherApp {
    /**
     * @param {Object<string, ProjectConfig>} projects - Project configurations
     */
    constructor(projects) {
        this.projects = projects;

        // Get first project as default
        const projectKeys = Object.keys(projects);
        this.selectedProject = projectKeys.length > 0 ? projects[projectKeys[0]] : null;

        // DOM elements
        this.btnConnect = document.getElementById('btn-connect');
        this.btnFlash = document.getElementById('btn-flash');
        this.btnWriteConfig = document.getElementById('btn-write-config');
        this.btnClearMonitor = document.getElementById('btn-clear-monitor');

        // Core flasher and UI adapter
        this.flasher = null;
        this.ui = null;

        // Config state (stored in localStorage)
        this.config = this.loadConfig();

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Check browser support
        if (!('serial' in navigator)) {
            document.getElementById('browser-check').style.display = 'block';
            this.log('Web Serial API not available', 'error');
            return;
        }

        if (!this.selectedProject) {
            this.log('ERROR: No projects found', 'error');
            return;
        }

        // Initialize core flasher with project config
        this.initFlasher();

        // Set up UI
        this.attachEventListeners();
        this.loadProjectUI();
        this.initializeUIElements();

        this.log('Flasher ready', 'success');
        this.attemptAutoReconnect();
    }

    /**
     * Initialize the core flasher from project config
     */
    initFlasher() {
        const project = this.selectedProject;

        // Determine NVS settings (support both new and legacy formats)
        const nvsOffset = project.nvsOffset ??
            (project.nvsPartition ? parseInt(project.nvsPartition.offset, 16) : 0x9000);
        const nvsSize = project.nvsSize ??
            (project.nvsPartition ? parseInt(project.nvsPartition.size, 16) : 0x6000);
        const nvsNamespace = project.nvsPartition?.namespace || 'config';

        // Build flasher options
        const flasherOptions = {
            chip: project.chip,
            firmwareUrl: project.firmwareUrl,
            firmwareOffset: project.firmwareOffset ?? 0x10000,
            nvsOffset,
            nvsSize,
            nvsNamespace
        };

        // Support both new 'fields' format and legacy 'configSections' format
        if (project.fields) {
            // New format: use fields directly (with preset expansion)
            flasherOptions.fields = project.fields;
        } else if (project.configSections) {
            // Legacy format: pass configSections for conversion
            flasherOptions.configSections = project.configSections;
        }

        // Create ESPFlasher with project settings
        this.flasher = new ESPFlasher(flasherOptions);

        // Get UI elements
        const elements = {
            statusBox: document.getElementById('status-box'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressPercent: document.getElementById('progress-percent'),
            progressTime: document.getElementById('progress-time'),
            logContainer: document.getElementById('serial-monitor'),
            chipType: document.getElementById('chip-type'),
            chipMac: document.getElementById('chip-mac'),
            configContainer: document.getElementById('config-container'),
            connectBtn: this.btnConnect,
            flashBtn: this.btnFlash
        };

        // Create UI adapter
        this.ui = new FlasherUI(this.flasher, elements);

        // Handle chip mismatch with custom dialog
        this.flasher.addEventListener('chip-mismatch', async (e) => {
            const { expected, detected, proceed, cancel } = e.detail;
            const result = await this.showChipMismatchDialog(expected, detected);

            if (result === 'cancel') {
                cancel();
            } else {
                if (result === 'always') {
                    this.saveChipOverride(detected, expected);
                }
                proceed();
            }
        });

        // Load saved config into flasher
        this.loadSavedConfigIntoFlasher();
    }

    /**
     * Load saved config from localStorage into flasher
     */
    loadSavedConfigIntoFlasher() {
        // Get schema keys to filter config
        const schema = this.flasher.getSchema();
        if (!schema || schema.length === 0) return;

        const savedConfig = {};
        for (const field of schema) {
            // Check flat config first (new format)
            if (this.config[field.key] !== undefined) {
                savedConfig[field.key] = this.config[field.key];
            }
        }

        if (Object.keys(savedConfig).length > 0) {
            // Don't validate on load - these are persisted values
            this.flasher.setConfig(savedConfig, { validate: false });
        }
    }

    /**
     * Attempt to reconnect to previously used device
     */
    async attemptAutoReconnect() {
        try {
            const ports = await navigator.serial.getPorts();
            if (ports.length > 0) {
                const lastIndex = localStorage.getItem('lastSerialDeviceIndex');
                const portIndex = lastIndex ? parseInt(lastIndex) : 0;
                const port = ports[portIndex] || ports[0];

                this.log('Attempting to reconnect to previous device...', 'info');

                try {
                    // Use device connection directly for port reuse
                    const device = this.flasher.getDevice();
                    await device.connect(this.selectedProject.chip, { port });

                    this.log('Auto-reconnected', 'success');
                    this.btnFlash.disabled = false;
                    this.btnFlash.style.display = 'block';
                    this.btnWriteConfig.disabled = false;
                    this.btnConnect.style.display = 'none';
                } catch (e) {
                    console.log('Auto-reconnect failed:', e.message);
                    this.btnConnect.disabled = false;
                    this.btnConnect.textContent = 'Connect Device';
                }
            }
        } catch (e) {
            console.log('Auto-reconnect not available:', e.message);
        }
    }

    /**
     * Load project UI
     */
    loadProjectUI() {
        const project = this.selectedProject;

        this.log('Loading project: ' + project.name, 'info');
        this.updateHeader(project);
        this.showProjectDetails(project);

        document.getElementById('project-details').classList.add('active');

        this.renderConfigFields(project);

        this.btnConnect.disabled = false;
        this.btnConnect.textContent = 'Connect Device';
        this.btnWriteConfig.title = 'Connect device first';

        this.updateStatus('waiting', 'Configure Settings', 'Fill in configuration, then connect your device');
        this.log('UI loaded. Connect button enabled.', 'success');
    }

    /**
     * Update page header with project info
     */
    updateHeader(project) {
        const title = document.getElementById('app-header-title');
        if (title && project.name) {
            title.textContent = project.name;
            document.title = project.name + ' - ESP32 Web Flasher';
        }

        const nav = document.getElementById('app-header-nav');
        if (nav) {
            const links = project.navbarLinks || project.headerLinks || [];
            if (links.length > 0) {
                nav.innerHTML = links.map(link =>
                    `<a href="${link.url}" target="_blank" class="app-header-link">${link.label}</a>`
                ).join('');
            }
        }
    }

    /**
     * Show project details in the left panel
     */
    showProjectDetails(project) {
        const hardware = project.hardware.map(h => `<li>${h}</li>`).join('');
        const software = project.software.map(s => `<li>${s}</li>`).join('');

        const docLink = project.documentation
            ? `<a href="${project.documentation.url}" target="_blank" class="doc-link">
                 <span>${project.documentation.label}</span>
                 <span class="external-icon">↗</span>
               </a>`
            : '';

        const configNames = project.configSections?.map(s => s.title).join(', ') || '';
        const configStep = configNames
            ? `Configure ${configNames} in the center panel`
            : 'Review configuration in the center panel';

        document.getElementById('project-details').innerHTML = `
            <p style="margin-bottom: 24px;">${project.description}</p>
            ${docLink}
            <div class="section section-bg" style="margin-top: 32px;">
                <h3>Hardware</h3>
                <ul class="requirement-list">${hardware}</ul>
            </div>
            <div class="section section-bg">
                <h3>Steps</h3>
                <ul class="instruction-list">
                    <li data-step="1">${configStep}</li>
                    <li data-step="2">Connect your ESP32 device via USB</li>
                    <li data-step="3">Click "Connect Device" and select the serial port</li>
                    <li data-step="4">Click "Flash Firmware" to begin</li>
                    <li data-step="5">Wait for flashing to complete (do not disconnect)</li>
                </ul>
            </div>
        `;
    }

    /**
     * Render config form fields
     * Supports both new 'fields' format and legacy 'configSections' format
     */
    renderConfigFields(project) {
        const container = document.getElementById('config-container');

        // Get schema from flasher (already unified in constructor)
        const schema = this.flasher.getSchema();

        if (!schema || schema.length === 0) {
            container.innerHTML = '<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';
            return;
        }

        container.innerHTML = '';

        // Group fields by section for display
        const sections = groupFieldsBySection(schema);

        for (const section of sections) {
            const group = document.createElement('div');
            group.className = 'config-group';

            let html = '';
            if (section.title && section.title !== 'default') {
                html += `<h3>${section.title}</h3>`;
            }

            for (const field of section.fields) {
                const savedValue = this.config[field.key] || field.default || '';
                const escapedPlaceholder = (field.placeholder || '').replace(/"/g, '&quot;');
                const escapedValue = String(savedValue).replace(/"/g, '&quot;');

                html += `
                    <div class="form-group">
                        <label for="config-${field.key}">
                            ${field.label}
                            ${field.required
                                ? '<span style="color: #ff3b30;">*</span>'
                                : '<span style="color: #86868b; font-weight: 400;">(optional)</span>'}
                        </label>
                        <input
                            type="${field.type || 'text'}"
                            id="config-${field.key}"
                            placeholder="${escapedPlaceholder}"
                            value="${escapedValue}"
                            ${field.required ? 'required' : ''}
                            ${field.pattern ? `pattern="${field.pattern}"` : ''}
                            data-key="${field.key}">
                        ${field.help ? `<span class="help-text">${field.help}</span>` : ''}
                    </div>
                `;
            }

            group.innerHTML = html;
            container.appendChild(group);
        }

        // Attach input listeners
        container.querySelectorAll('[data-key]').forEach(input => {
            input.addEventListener('input', () => {
                const key = input.dataset.key;

                // Save to local config (flat structure now)
                this.config[key] = input.value;
                this.saveConfig();

                // Update flasher config
                this.flasher.setConfig({ [key]: input.value });
            });
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.btnConnect.addEventListener('click', () => this.handleConnect());
        this.btnFlash.addEventListener('click', () => this.handleFlash());
        this.btnWriteConfig.addEventListener('click', () => this.handleWriteConfig());
        this.btnClearMonitor?.addEventListener('click', () => this.clearLog());

        // Developer options panel
        this.attachDevOptionsListeners();

        // Troubleshooting toggle
        const troubleToggle = document.getElementById('troubleshooting-toggle');
        troubleToggle?.addEventListener('click', () => this.toggleTroubleshooting());

        // About panel
        this.attachAboutPanelListeners();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDevPanel();
                this.closeAboutPanel();
            }
        });
    }

    /**
     * Attach developer options panel listeners
     */
    attachDevOptionsListeners() {
        const toggle = document.getElementById('dev-mode-toggle');
        const close = document.getElementById('dev-options-close');
        const backdrop = document.getElementById('dev-panel-backdrop');

        toggle?.addEventListener('click', () => this.toggleDevPanel());
        close?.addEventListener('click', () => this.closeDevPanel());
        backdrop?.addEventListener('click', () => this.closeDevPanel());

        // Tab switching
        document.querySelectorAll('.dev-tab').forEach(tab => {
            tab.addEventListener('click', () => this.handleDevTabClick(tab));
        });

        // Firmware source toggle
        document.querySelectorAll('input[name="firmware-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleFirmwareSourceChange(e));
        });

        // Custom file upload
        const customFile = document.getElementById('dev-custom-file');
        customFile?.addEventListener('change', (e) => this.handleCustomFileUpload(e));

        // Export log
        const exportBtn = document.getElementById('btn-export-log');
        exportBtn?.addEventListener('click', () => this.exportLog());
    }

    /**
     * Attach about panel listeners
     */
    attachAboutPanelListeners() {
        const aboutLink = document.getElementById('about-link');
        const aboutClose = document.getElementById('about-close');
        const aboutBackdrop = document.getElementById('about-backdrop');

        aboutLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAboutPanel();
        });
        aboutClose?.addEventListener('click', () => this.closeAboutPanel());
        aboutBackdrop?.addEventListener('click', () => this.closeAboutPanel());
    }

    /**
     * Handle connect button click
     */
    async handleConnect() {
        if (!this.selectedProject) return;

        try {
            const skipChipCheck = document.getElementById('dev-skip-chip-check')?.checked || false;

            // Get device for advanced options
            const device = this.flasher.getDevice();

            await this.flasher.connect();

            this.btnConnect.style.display = 'none';
            this.btnFlash.style.display = 'block';
            this.btnFlash.disabled = false;
            this.btnWriteConfig.disabled = false;
            this.btnWriteConfig.title = 'Write configuration to device NVS partition';
        } catch (e) {
            console.error('Connection failed:', e);
        }
    }

    /**
     * Handle flash button click
     */
    async handleFlash() {
        if (!this.selectedProject) return;

        try {
            this.btnFlash.disabled = true;

            const firmwareSource = document.querySelector('input[name="firmware-source"]:checked')?.value || 'release';
            const options = {};

            if (firmwareSource === 'custom') {
                const fileInput = document.getElementById('dev-custom-file');
                if (fileInput.files.length > 0) {
                    options.customFirmware = fileInput.files[0];
                } else {
                    this.log('No custom firmware file selected', 'error');
                    this.updateStatus('error', 'No file selected', 'Please select a .bin file in Developer Options');
                    this.btnFlash.disabled = false;
                    return;
                }
            }

            await this.flasher.flash(options);

            this.btnFlash.style.display = 'none';
            this.btnFlash.textContent = 'Flash Complete';
        } catch (e) {
            this.btnFlash.disabled = false;
            this.btnFlash.textContent = 'Retry Flash';
        }
    }

    /**
     * Handle write config button click
     */
    async handleWriteConfig() {
        if (!this.selectedProject) return;

        if (!this.flasher.isConnected()) {
            this.log('Please connect to device first', 'warning');
            this.updateStatus('waiting', 'Not connected', 'Click "Connect Device" first');
            return;
        }

        if (!this.selectedProject.nvsPartition) {
            this.log('This project does not have NVS configuration', 'warning');
            return;
        }

        try {
            this.btnWriteConfig.disabled = true;
            this.btnWriteConfig.textContent = 'Writing...';

            await this.flasher.flashConfig();

            this.updateStatus('success', 'Configuration written!', 'Config updated on device');
            this.btnWriteConfig.style.display = 'none';
        } catch (e) {
            this.log(`Failed to write configuration: ${e.message}`, 'error');
            this.updateStatus('error', 'Write failed', e.message);
            this.btnWriteConfig.disabled = false;
            this.btnWriteConfig.textContent = 'Write Config';
        }
    }

    /**
     * Show chip mismatch dialog
     * @returns {Promise<'cancel'|'once'|'always'>}
     */
    showChipMismatchDialog(expected, detected) {
        return new Promise(resolve => {
            const statusBox = document.getElementById('status-box');
            const originalHTML = statusBox.innerHTML;

            statusBox.className = 'status-box waiting';
            statusBox.innerHTML = `
                <div class="status-text">Chip Mismatch</div>
                <div class="status-subtext" style="margin-bottom: 12px;">Expected ${expected}, found ${detected}</div>
                <div style="display: flex; gap: 8px;">
                    <button id="chip-btn-cancel" class="btn btn-primary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Cancel</button>
                    <button id="chip-btn-once" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Continue</button>
                    <button id="chip-btn-always" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Always Allow</button>
                </div>
            `;

            const restore = () => { statusBox.innerHTML = originalHTML; };

            document.getElementById('chip-btn-cancel').addEventListener('click', () => { restore(); resolve('cancel'); });
            document.getElementById('chip-btn-once').addEventListener('click', () => { restore(); resolve('once'); });
            document.getElementById('chip-btn-always').addEventListener('click', () => { restore(); resolve('always'); });
        });
    }

    /**
     * Chip override persistence
     */
    getChipOverrides() {
        const stored = localStorage.getItem('chip-overrides');
        return stored ? JSON.parse(stored) : {};
    }

    saveChipOverride(detected, expected) {
        const overrides = this.getChipOverrides();
        overrides[detected] = expected;
        localStorage.setItem('chip-overrides', JSON.stringify(overrides));
    }

    /**
     * Config persistence
     */
    loadConfig() {
        const stored = localStorage.getItem('esp-flasher-config');
        return stored ? JSON.parse(stored) : {};
    }

    saveConfig() {
        localStorage.setItem('esp-flasher-config', JSON.stringify(this.config));
    }

    /**
     * Logging helpers (delegate to flasher events or direct DOM)
     */
    log(message, level = 'info') {
        // Dispatch to flasher which forwards to UI
        if (this.flasher) {
            this.flasher.dispatchEvent(new CustomEvent('log', {
                detail: { message, level }
            }));
        } else {
            // Fallback: direct DOM update
            const monitor = document.getElementById('serial-monitor');
            if (monitor) {
                const line = document.createElement('div');
                line.className = `serial-line ${level}`;
                line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
                monitor.appendChild(line);
                monitor.scrollTop = monitor.scrollHeight;
            }
        }
    }

    updateStatus(state, text, subtext) {
        const statusBox = document.getElementById('status-box');
        if (statusBox) {
            statusBox.className = `status-box ${state}`;
            statusBox.innerHTML = `
                <div class="status-text">${text}</div>
                <div class="status-subtext">${subtext}</div>
            `;
        }
    }

    clearLog() {
        const monitor = document.getElementById('serial-monitor');
        if (monitor) {
            monitor.innerHTML = '<div class="serial-line info">Monitor cleared</div>';
        }
    }

    /**
     * Developer panel methods
     */
    toggleDevPanel() {
        const panel = document.getElementById('dev-options-panel');
        const backdrop = document.getElementById('dev-panel-backdrop');
        const toggle = document.getElementById('dev-mode-toggle');

        panel?.classList.toggle('active');
        backdrop?.classList.toggle('active');
        toggle?.classList.toggle('active');
        document.body.classList.toggle('dev-panel-open');
    }

    closeDevPanel() {
        const panel = document.getElementById('dev-options-panel');
        const backdrop = document.getElementById('dev-panel-backdrop');
        const toggle = document.getElementById('dev-mode-toggle');

        panel?.classList.remove('active');
        backdrop?.classList.remove('active');
        toggle?.classList.remove('active');
        document.body.classList.remove('dev-panel-open');
    }

    handleDevTabClick(tab) {
        const tabName = tab.dataset.tab;

        document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.dev-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.dev-tab-content[data-tab="${tabName}"]`)?.classList.add('active');
    }

    handleFirmwareSourceChange(e) {
        const isRelease = e.target.value === 'release';
        document.getElementById('release-options').style.display = isRelease ? 'block' : 'none';
        document.getElementById('custom-options').style.display = isRelease ? 'none' : 'block';
    }

    handleCustomFileUpload(e) {
        const file = e.target.files[0];
        const info = document.getElementById('custom-file-info');
        if (file) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            info.textContent = `${file.name} (${sizeMB} MB)`;
        } else {
            info.textContent = '';
        }
    }

    exportLog() {
        const lines = document.getElementById('serial-monitor')?.querySelectorAll('.serial-line');
        const text = Array.from(lines || []).map(l => l.textContent).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `flasher-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        a.click();

        URL.revokeObjectURL(url);
        this.log('Log exported successfully', 'success');
    }

    toggleTroubleshooting() {
        const toggle = document.getElementById('troubleshooting-toggle');
        const content = document.getElementById('troubleshooting-content');
        toggle?.classList.toggle('collapsed');
        content?.classList.toggle('active');
    }

    openAboutPanel() {
        document.getElementById('about-panel')?.classList.add('active');
        document.getElementById('about-backdrop')?.classList.add('active');
        document.body.classList.add('dev-panel-open');
    }

    closeAboutPanel() {
        document.getElementById('about-panel')?.classList.remove('active');
        document.getElementById('about-backdrop')?.classList.remove('active');
        document.body.classList.remove('dev-panel-open');
    }

    initializeUIElements() {
        // Additional initialization if needed
    }
}

export { FlasherUI } from './ui.js';
