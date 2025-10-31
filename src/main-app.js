/**
 * Main Application for ESP32 Web Flasher
 * Coordinates UI, configuration, device connection, and firmware flashing
 */

import { FlasherUI } from './flasher-ui.js';
import { ConfigManager } from './config-manager.js';
import { DeviceConnection } from './device-connection.js';
import { FirmwareFlasher } from './firmware-flasher.js';

export class FlasherApp {
    constructor(projects) {
        this.projects = projects;

        // Initialize components
        this.ui = new FlasherUI();
        this.configManager = new ConfigManager();
        this.deviceConnection = new DeviceConnection(this.ui);
        this.firmwareFlasher = new FirmwareFlasher(this.ui, this.configManager);

        // DOM elements
        this.btnConnect = document.getElementById('btn-connect');
        this.btnFlash = document.getElementById('btn-flash');
        this.btnWriteConfig = document.getElementById('btn-write-config');
        this.btnClearMonitor = document.getElementById('btn-clear-monitor');

        // State - auto-select the only project (active-wing)
        this.selectedProject = this.projects['active-wing'];

        // Initialize
        this.init();
    }

    init() {
        // Check browser support
        if (!('serial' in navigator)) {
            document.getElementById('browser-check').style.display = 'block';
            this.ui.updateStatus('error', 'Browser not supported', 'Please use Chrome, Edge, or Opera');
            this.ui.log('Web Serial API not available', 'error');
            return;
        }

        // Check if project loaded
        if (!this.selectedProject) {
            this.ui.log('ERROR: active-wing project not found. Available projects: ' + Object.keys(this.projects).join(', '), 'error');
            this.ui.updateStatus('error', 'Project not found', 'Configuration error - check console');
            return;
        }

        // Attach event listeners
        this.attachEventListeners();

        // Auto-load the active-wing project UI
        this.loadProjectUI();

        // Initialize UI elements
        this.initializeUIElements();

        this.ui.log('Flasher ready', 'success');

        // Attempt auto-reconnect to previously connected device
        this.attemptAutoReconnect();
    }

    async attemptAutoReconnect() {
        try {
            // Get list of previously approved devices
            const ports = await navigator.serial.getPorts();

            if (ports.length > 0) {
                // Get the last used device from localStorage
                const lastDeviceIndex = localStorage.getItem('lastSerialDeviceIndex');
                const deviceIndex = lastDeviceIndex ? parseInt(lastDeviceIndex) : 0;
                const port = ports[deviceIndex] || ports[0];

                this.ui.log('Attempting to reconnect to previous device...', 'info');

                try {
                    // Connect using the device connection handler, passing the port
                    const { chipType, macAddr } = await this.deviceConnection.connect(this.selectedProject, {
                        port: port,
                        skipChipCheck: false
                    });

                    if (chipType) {
                        this.ui.log(`✓ Auto-reconnected to ${chipType}`, 'success');

                        // Enable flash and write config buttons
                        this.btnFlash.disabled = false;
                        this.btnFlash.style.display = 'block';
                        this.btnWriteConfig.disabled = false;
                        this.btnWriteConfig.title = 'Write configuration to device NVS partition';
                        this.btnConnect.style.display = 'none';
                    }
                } catch (connectError) {
                    // Auto-reconnect failed - fail silently
                    console.log('Auto-reconnect failed:', connectError.message);
                    // Reset UI state
                    this.btnConnect.disabled = false;
                    this.btnConnect.textContent = 'Connect Device';
                }
            }
        } catch (error) {
            // Auto-reconnect not available - fail silently
            console.log('Auto-reconnect not available:', error.message);
        }
    }

    loadProjectUI() {
        const projectDetails = document.getElementById('project-details');
        const configContainer = document.getElementById('config-container');

        this.ui.log('Loading project: ' + this.selectedProject.name, 'info');
        console.log('Selected project:', this.selectedProject);
        console.log('Config sections:', this.selectedProject.configSections);
        console.log('Config container element:', configContainer);

        // Show project details and render config
        this.ui.showProjectDetails(this.selectedProject);
        projectDetails.classList.add('active');

        this.ui.log('Rendering config fields...', 'info');
        this.configManager.renderConfigFields(this.selectedProject);

        console.log('Config container after render:', configContainer.innerHTML.substring(0, 200));

        this.btnConnect.disabled = false;
        this.btnConnect.textContent = 'Connect Device';
        this.btnWriteConfig.title = 'Connect device first';
        this.ui.updateStatus('waiting', 'Configure Settings', 'Fill in configuration, then connect your device');

        this.ui.log('UI loaded. Connect button enabled.', 'success');
    }

    attachEventListeners() {

        // Connection
        this.btnConnect.addEventListener('click', () => this.handleConnect());

        // Flash
        this.btnFlash.addEventListener('click', () => this.handleFlash());

        // Write config
        this.btnWriteConfig.addEventListener('click', () => this.handleWriteConfig());

        // Clear console
        this.btnClearMonitor.addEventListener('click', () => this.ui.clearLog());

        // Developer options toggle (slide panel)
        const devModeToggle = document.getElementById('dev-mode-toggle');
        if (devModeToggle) {
            devModeToggle.addEventListener('click', () => {
                const panel = document.getElementById('dev-options-panel');
                const backdrop = document.getElementById('dev-panel-backdrop');
                const toggle = document.getElementById('dev-mode-toggle');
                panel?.classList.toggle('active');
                backdrop?.classList.toggle('active');
                toggle?.classList.toggle('active');
                document.body.classList.toggle('dev-panel-open');
            });
        }

        // Developer options close button
        const devOptionsClose = document.getElementById('dev-options-close');
        if (devOptionsClose) {
            devOptionsClose.addEventListener('click', () => {
                const panel = document.getElementById('dev-options-panel');
                const backdrop = document.getElementById('dev-panel-backdrop');
                const toggle = document.getElementById('dev-mode-toggle');
                panel?.classList.remove('active');
                backdrop?.classList.remove('active');
                toggle?.classList.remove('active');
                document.body.classList.remove('dev-panel-open');
            });
        }

        // Close panel when clicking backdrop
        const devPanelBackdrop = document.getElementById('dev-panel-backdrop');
        if (devPanelBackdrop) {
            devPanelBackdrop.addEventListener('click', () => {
                const panel = document.getElementById('dev-options-panel');
                const backdrop = document.getElementById('dev-panel-backdrop');
                const toggle = document.getElementById('dev-mode-toggle');
                panel?.classList.remove('active');
                backdrop?.classList.remove('active');
                toggle?.classList.remove('active');
                document.body.classList.remove('dev-panel-open');
            });
        }

        // Close panel with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const panel = document.getElementById('dev-options-panel');
                const backdrop = document.getElementById('dev-panel-backdrop');
                const toggle = document.getElementById('dev-mode-toggle');
                if (panel?.classList.contains('active')) {
                    panel?.classList.remove('active');
                    backdrop?.classList.remove('active');
                    toggle?.classList.remove('active');
                    document.body.classList.remove('dev-panel-open');
                }
            }
        });

        // Export log button
        const btnExportLog = document.getElementById('btn-export-log');
        if (btnExportLog) {
            btnExportLog.addEventListener('click', () => this.exportLog());
        }

        // Developer tabs
        document.querySelectorAll('.dev-tab').forEach(tab => {
            tab.addEventListener('click', () => this.handleDevTabClick(tab));
        });

        // Firmware source toggle
        document.querySelectorAll('input[name="firmware-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleFirmwareSourceChange(e));
        });

        // Custom file upload
        const devCustomFile = document.getElementById('dev-custom-file');
        if (devCustomFile) {
            devCustomFile.addEventListener('change', (e) => {
                this.handleCustomFileUpload(e);
            });
        }

        // Troubleshooting toggle
        const troubleshootingToggle = document.getElementById('troubleshooting-toggle');
        if (troubleshootingToggle) {
            troubleshootingToggle.addEventListener('click', () => {
                this.toggleTroubleshooting();
            });
        }

        // About panel
        const aboutLink = document.getElementById('about-link');
        if (aboutLink) {
            aboutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAboutPanel();
            });
        }

        const aboutClose = document.getElementById('about-close');
        if (aboutClose) {
            aboutClose.addEventListener('click', () => {
                this.closeAboutPanel();
            });
        }

        const aboutBackdrop = document.getElementById('about-backdrop');
        if (aboutBackdrop) {
            aboutBackdrop.addEventListener('click', () => {
                this.closeAboutPanel();
            });
        }
    }

    async handleConnect() {
        if (!this.selectedProject) return;

        try {
            // Get developer options
            const skipChipCheck = document.getElementById('dev-skip-chip-check')?.checked || false;

            const options = {
                skipChipCheck: skipChipCheck
            };

            const { chipType, macAddr } = await this.deviceConnection.connect(this.selectedProject, options);

            // Connection successful
            this.btnConnect.style.display = 'none';
            this.btnFlash.style.display = 'block';
            this.btnFlash.disabled = false;
            this.btnWriteConfig.disabled = false;
            this.btnWriteConfig.title = 'Write configuration to device NVS partition';

        } catch (error) {
            // Error already handled by DeviceConnection
            console.error('Connection failed:', error);
        }
    }

    async handleFlash() {
        if (!this.selectedProject) return;

        try {
            this.btnFlash.disabled = true;

            const espStub = this.deviceConnection.getESPStub();
            if (!espStub) {
                throw new Error('Device not connected');
            }

            // Get developer options
            const firmwareSource = document.querySelector('input[name="firmware-source"]:checked')?.value || 'release';
            const options = {};

            if (firmwareSource === 'custom') {
                const fileInput = document.getElementById('dev-custom-file');
                if (fileInput.files.length > 0) {
                    options.customFirmware = fileInput.files[0];
                } else {
                    this.ui.log('No custom firmware file selected', 'error');
                    this.ui.updateStatus('error', 'No file selected', 'Please select a .bin file in Developer Options');
                    this.btnFlash.disabled = false;
                    return;
                }
            }

            await this.firmwareFlasher.flash(this.selectedProject, espStub, options);

            // Flash successful
            this.btnFlash.style.display = 'none';
            this.btnFlash.textContent = 'Flash Complete';

        } catch (error) {
            // Error already handled by FirmwareFlasher
            this.btnFlash.disabled = false;
            this.btnFlash.textContent = 'Retry Flash';
        }
    }

    async handleWriteConfig() {
        if (!this.selectedProject) return;

        // Must be connected to device first
        if (!this.deviceConnection.getIsConnected()) {
            this.ui.log('Please connect to device first', 'warning');
            this.ui.updateStatus('waiting', 'Not connected', 'Click "Connect Device" first');
            return;
        }

        // Check if project has NVS configuration
        if (!this.selectedProject.nvsPartition) {
            this.ui.log('This project does not have NVS configuration', 'warning');
            return;
        }

        try {
            // Disable the Write Config button during write
            this.btnWriteConfig.disabled = true;
            this.btnWriteConfig.textContent = 'Writing...';

            this.ui.updateStatus('flashing', 'Writing configuration', 'Generating NVS partition...');
            this.ui.log('Writing configuration to device...', 'info');

            const espStub = this.deviceConnection.getESPStub();
            if (!espStub) {
                throw new Error('Device not connected');
            }

            // Generate NVS partition from current config
            const config = this.configManager.getConfig();
            const namespace = this.selectedProject.nvsPartition.namespace || 'config';
            const nvsData = {};
            nvsData[namespace] = {};

            this.selectedProject.configSections.forEach(section => {
                section.fields.forEach(field => {
                    if (field.nvsKey) {
                        const value = config[section.id]?.[field.id];
                        if (value !== undefined && value !== '') {
                            nvsData[namespace][field.nvsKey] = value;
                        }
                    }
                });
            });

            // Log what we're about to write
            const nvsKeys = Object.keys(nvsData[namespace]);
            this.ui.log(`NVS data to write: ${nvsKeys.join(', ')}`, 'info');
            nvsKeys.forEach(key => {
                const value = nvsData[namespace][key];
                this.ui.log(`  ${key} = ${value}`, 'info');
            });

            // Generate NVS partition binary
            const generator = new NVSGenerator();
            const partitionSize = parseInt(this.selectedProject.nvsPartition.size, 16);
            const nvsBytes = generator.generate(nvsData, partitionSize);

            // Convert NVS bytes to binary string
            let nvsBinary = '';
            for (let i = 0; i < nvsBytes.length; i++) {
                nvsBinary += String.fromCharCode(nvsBytes[i]);
            }

            this.ui.log(`Generated NVS partition: ${nvsBytes.length} bytes`, 'info');

            // Write just the NVS partition to flash
            const nvsOffset = parseInt(this.selectedProject.nvsPartition.offset, 16);
            const fileArray = [{ data: nvsBinary, address: nvsOffset }];

            this.ui.updateStatus('flashing', 'Writing to flash...', 'Do not disconnect');
            this.ui.showProgress();

            await espStub.writeFlash({
                fileArray: fileArray,
                flashSize: 'keep',
                compress: true,
                reportProgress: (idx, written, total) => {
                    const percent = Math.round((written / total) * 100);
                    this.ui.updateProgress(percent, written, total);
                }
            });

            this.ui.updateStatus('success', 'Configuration written!', 'Config updated on device');
            this.ui.log(`✓ Wrote ${nvsKeys.length} configuration values to device`, 'success');

            // Hide button after successful write
            this.btnWriteConfig.style.display = 'none';

        } catch (error) {
            this.ui.log(`Failed to write configuration: ${error.message}`, 'error');
            this.ui.updateStatus('error', 'Write failed', error.message);
            this.btnWriteConfig.disabled = false;
            this.btnWriteConfig.textContent = 'Write Config';
        }
    }

    exportLog() {
        const monitor = document.getElementById('serial-monitor');
        const lines = monitor.querySelectorAll('.serial-line');
        const logText = Array.from(lines).map(line => line.textContent).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flasher-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.ui.log('Log exported successfully', 'success');
    }

    initializeUIElements() {
        // No special initialization needed
    }


    handleDevTabClick(tab) {
        const tabName = tab.dataset.tab;

        // Update tab buttons (use classes only, let CSS handle styling)
        document.querySelectorAll('.dev-tab').forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');

        // Update tab content (use classes only, let CSS handle display)
        document.querySelectorAll('.dev-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelector(`.dev-tab-content[data-tab="${tabName}"]`).classList.add('active');
    }

    handleFirmwareSourceChange(e) {
        if (e.target.value === 'release') {
            document.getElementById('release-options').style.display = 'block';
            document.getElementById('custom-options').style.display = 'none';
        } else {
            document.getElementById('release-options').style.display = 'none';
            document.getElementById('custom-options').style.display = 'block';
        }
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

    toggleTroubleshooting() {
        const toggle = document.getElementById('troubleshooting-toggle');
        const content = document.getElementById('troubleshooting-content');
        toggle.classList.toggle('collapsed');
        content.classList.toggle('active');
    }

    openAboutPanel() {
        const panel = document.getElementById('about-panel');
        const backdrop = document.getElementById('about-backdrop');
        panel.classList.add('active');
        backdrop.classList.add('active');
        document.body.classList.add('dev-panel-open');
    }

    closeAboutPanel() {
        const panel = document.getElementById('about-panel');
        const backdrop = document.getElementById('about-backdrop');
        panel.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.classList.remove('dev-panel-open');
    }
}
