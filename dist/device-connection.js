/**
 * Device Connection Handler for ESP32 Web Flasher
 * Manages serial connection and chip detection
 */

export class DeviceConnection {
    constructor(ui) {
        this.ui = ui;
        this.transport = null;
        this.espStub = null;
        this.isConnected = false;
    }

    getChipOverrides() {
        const stored = localStorage.getItem('chip-overrides');
        return stored ? JSON.parse(stored) : {};
    }

    saveChipOverride(detectedChip, expectedChip) {
        const overrides = this.getChipOverrides();
        overrides[detectedChip] = expectedChip;
        localStorage.setItem('chip-overrides', JSON.stringify(overrides));
    }

    clearChipOverride(detectedChip) {
        const overrides = this.getChipOverrides();
        delete overrides[detectedChip];
        localStorage.setItem('chip-overrides', JSON.stringify(overrides));
    }

    async showChipMismatchDialog(expectedChip, detectedChip) {
        return new Promise((resolve) => {
            // Show inline in status box
            const statusBox = document.getElementById('status-box');
            const originalContent = statusBox.innerHTML;

            statusBox.className = 'status-box waiting';
            statusBox.innerHTML = `
                <div class="status-text">Chip Mismatch</div>
                <div class="status-subtext" style="margin-bottom: 12px;">Expected ${expectedChip}, found ${detectedChip}</div>
                <div style="display: flex; gap: 8px;">
                    <button id="chip-btn-cancel" class="btn btn-primary" style="flex: 1; font-size: 13px; padding: 8px 12px;">
                        Cancel
                    </button>
                    <button id="chip-btn-once" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">
                        Continue
                    </button>
                    <button id="chip-btn-always" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">
                        Always Allow
                    </button>
                </div>
            `;

            const cleanup = () => {
                statusBox.innerHTML = originalContent;
            };

            document.getElementById('chip-btn-cancel').addEventListener('click', () => {
                cleanup();
                resolve('cancel');
            });

            document.getElementById('chip-btn-once').addEventListener('click', () => {
                cleanup();
                resolve('once');
            });

            document.getElementById('chip-btn-always').addEventListener('click', () => {
                cleanup();
                resolve('always');
            });
        });
    }

    async disconnect() {
        if (this.transport) {
            try {
                await this.transport.disconnect();
                this.ui.log('Disconnected from device', 'info');
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        this.transport = null;
        this.espStub = null;
        this.isConnected = false;
    }

    async connect(project, options = {}) {
        // Clean up any existing connection first
        if (this.transport || this.isConnected) {
            this.ui.log('Cleaning up previous connection...', 'warning');
            await this.disconnect();
        }

        // Get skip chip check option from developer options
        const devSkipChipCheck = options.skipChipCheck || false;

        try {
            let port = options.port; // Use provided port if available

            if (!port) {
                this.ui.log('Initiating connection to ESP32...', 'info');
                this.ui.updateStatus('waiting', 'Connecting...', 'Select your device from the prompt');

                port = await navigator.serial.requestPort();

                // Store device for auto-reconnect
                const ports = await navigator.serial.getPorts();
                const deviceIndex = ports.indexOf(port);
                if (deviceIndex !== -1) {
                    localStorage.setItem('lastSerialDeviceIndex', deviceIndex.toString());
                }
            }

            this.ui.log('Opening serial port...', 'info');
            this.ui.updateStatus('waiting', 'Opening port...', 'Establishing connection');

            // Import Transport and ESPLoader from esptool-js
            const { Transport, ESPLoader } = await import('https://unpkg.com/esptool-js@0.4.5/bundle.js');

            this.transport = new Transport(port, true);

            this.ui.log('Initializing esptool...', 'info');
            this.ui.updateStatus('waiting', 'Initializing...', 'Detecting chip type');

            this.espStub = new ESPLoader({
                transport: this.transport,
                baudrate: 115200,
                terminal: {
                    clean: () => {},
                    writeLine: (data) => this.ui.log(data, 'info'),
                    write: (data) => this.ui.log(data, 'info')
                }
            });

            // Add timeout to prevent infinite loops
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Connection timeout - device not responding. Make sure you selected the correct serial port (not Bluetooth) and try holding the BOOT button.'));
                }, 15000); // 15 second timeout
            });

            const chipType = await Promise.race([
                this.espStub.main(),
                timeoutPromise
            ]);

            this.ui.log('Chip: ' + chipType, 'info');

            let macAddr = null;
            if (this.espStub.chip && this.espStub.chip.macAddr) {
                macAddr = this.espStub.chip.macAddr();
                this.ui.log('MAC Address: ' + macAddr, 'info');
                this.ui.updateChipInfo(chipType, macAddr);
            }

            // Check chip type matches project
            if (project.chip && chipType) {
                const expectedChip = project.chip.toUpperCase();
                const detectedChip = chipType.toUpperCase();
                const chipMismatch = !detectedChip.includes(expectedChip.replace('ESP32-', ''));

                // Check if user has a stored override for this chip
                const storedOverrides = this.getChipOverrides();
                const hasStoredOverride = storedOverrides[detectedChip] === expectedChip;

                if (chipMismatch) {
                    // Developer option to skip all checks
                    if (devSkipChipCheck) {
                        this.ui.log(`Chip validation skipped (dev option): Expected ${expectedChip}, detected ${chipType}`, 'warning');
                    }
                    // Stored override for this specific chip
                    else if (hasStoredOverride) {
                        this.ui.log(`Chip mismatch allowed (saved preference): Expected ${expectedChip}, detected ${chipType}`, 'warning');
                    }
                    // Show warning dialog
                    else {
                        this.ui.log(`Chip mismatch: Expected ${expectedChip}, but detected ${chipType}`, 'warning');
                        this.ui.updateStatus('waiting', 'Chip mismatch detected', `Expected ${expectedChip} but found ${chipType}`);

                        // Show warning dialog with options
                        const userChoice = await this.showChipMismatchDialog(expectedChip, chipType);

                        if (userChoice === 'cancel') {
                            this.ui.log('Connection cancelled by user', 'info');
                            this.ui.updateStatus('waiting', 'Connection cancelled', 'Select a device and try again');
                            await this.disconnect();
                            const chipError = new Error('Chip mismatch - user cancelled');
                            chipError.isChipMismatch = true;
                            throw chipError;
                        } else if (userChoice === 'always') {
                            this.saveChipOverride(detectedChip, expectedChip);
                            this.ui.log(`Saved override: ${detectedChip} → ${expectedChip}`, 'success');
                        }

                        this.ui.log(`Proceeding with ${chipType} (user override)`, 'warning');
                    }
                }
            }

            this.isConnected = true;
            this.ui.updateStatus('connected', 'Device connected', 'Ready to flash firmware');
            this.ui.log(`Connected to ${chipType}`, 'success');

            return { chipType, macAddr };

        } catch (error) {
            // Clean up on error
            await this.disconnect();
            // Only call handleConnectionError if we haven't already set a specific status
            if (!error.isChipMismatch) {
                this.handleConnectionError(error);
            }
            throw error;
        }
    }

    handleConnectionError(error) {
        // Handle port already open
        if (error.message && error.message.includes('port is already open')) {
            this.ui.log('Port is already open - please refresh the page', 'error');
            this.ui.updateStatus('error', 'Port already open', 'Refresh the page (Ctrl+R or Cmd+R) and try again');
            return;
        }

        // Handle esptool library not loaded
        if (error.message && (error.message.includes('Transport is not defined') || error.message.includes('ESPLoader is not defined'))) {
            this.ui.log('ESPTool library failed to load', 'error');
            this.ui.updateStatus('error', 'Library loading error', 'Please refresh the page and ensure you have internet connection');
            return;
        }

        // Handle user cancellation
        if (error.message && error.message.includes('No port selected')) {
            this.ui.log('Port selection cancelled by user', 'warning');
            this.ui.updateStatus('waiting', 'Connection cancelled', 'Click "Connect Device" to try again');
            return;
        }

        // Handle permission denied
        if (error.message && (error.message.includes('permission') || error.message.includes('access denied'))) {
            this.ui.log('Permission denied: ' + error.message, 'error');
            this.ui.updateStatus('error', 'Permission denied', 'Close other programs using the serial port and try again');
            return;
        }

        // Handle connection timeout
        if (error.message && (error.message.includes('timeout') || error.message.includes('Failed to connect') || error.message.includes('not responding'))) {
            this.ui.log('Connection timeout: ' + error.message, 'error');
            this.ui.updateStatus('error', 'Device not responding', 'Wrong port selected or device not in download mode. Hold BOOT button and try again.');
            return;
        }

        // Handle wrong chip type
        if (error.message && error.message.includes('chip')) {
            this.ui.log('Wrong device type: ' + error.message, 'error');
            this.ui.updateStatus('error', 'Wrong device detected', 'Make sure you selected the correct ESP32 device');
            return;
        }

        // Handle esptool API errors
        if (error.message && (error.message.includes('getInfo') || error.message.includes('main') || error.message.includes('Cannot read properties'))) {
            this.ui.log('ESPTool communication error: ' + error.message, 'error');
            this.ui.updateStatus('error', 'Device communication failed', 'Try holding BOOT button while connecting, or refresh the page');
            return;
        }

        // Generic error
        this.ui.log('Connection error: ' + error.message, 'error');
        this.ui.updateStatus('error', 'Connection failed', 'Check cable connection and try again');
    }

    getESPStub() {
        return this.espStub;
    }

    getIsConnected() {
        return this.isConnected;
    }

    /**
     * Read flash memory from device
     * @param {number} offset - Flash offset to read from (e.g., 0x9000 for NVS)
     * @param {number} size - Number of bytes to read
     * @returns {Uint8Array} - Flash data
     */
    async readFlash(offset, size) {
        if (!this.espStub) {
            throw new Error('Device not connected');
        }

        this.ui.log(`Reading ${size} bytes from flash at offset 0x${offset.toString(16)}...`, 'info');

        try {
            // Read flash using esptool-js API
            const flashData = await this.espStub.readFlash(offset, size);

            this.ui.log(`✓ Read ${flashData.length} bytes successfully`, 'success');
            return new Uint8Array(flashData);
        } catch (error) {
            this.ui.log(`Failed to read flash: ${error.message}`, 'error');
            throw error;
        }
    }
}
