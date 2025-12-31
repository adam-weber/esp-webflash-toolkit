/**
 * Headless Device Connection for ESP32
 * Manages serial connection and chip detection without DOM dependencies
 *
 * @author Adam Weber (github: adam-weber)
 */

/**
 * @typedef {Object} ConnectionOptions
 * @property {SerialPort} [port] - Existing port to use (skips requestPort)
 * @property {boolean} [skipChipCheck] - Skip chip validation
 * @property {number} [baudrate] - Connection baudrate (default: 115200)
 * @property {number} [timeout] - Connection timeout in ms (default: 15000)
 */

/**
 * @typedef {Object} ChipMismatchEvent
 * @property {string} expected - Expected chip type
 * @property {string} detected - Detected chip type
 * @property {Function} proceed - Call to continue despite mismatch
 * @property {Function} cancel - Call to cancel connection
 */

export class DeviceConnection extends EventTarget {
    constructor() {
        super();
        this.transport = null;
        this.espStub = null;
        this.isConnected = false;
        this.abortController = null;
    }

    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * Connect to an ESP device
     * @param {string} expectedChip - Expected chip type (e.g., 'esp32s3')
     * @param {ConnectionOptions} [options] - Connection options
     * @returns {Promise<{chipType: string, macAddr: string}>}
     */
    async connect(expectedChip, options = {}) {
        // Clean up any existing connection
        if (this.transport || this.isConnected) {
            this.emit('log', { message: 'Cleaning up previous connection...', level: 'warning' });
            await this.disconnect();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        const timeout = options.timeout || 15000;
        const baudrate = options.baudrate || 115200;

        try {
            let port = options.port;

            if (!port) {
                this.emit('status', { state: 'connecting', message: 'Select your device' });
                this.emit('log', { message: 'Requesting serial port...', level: 'info' });

                port = await navigator.serial.requestPort();
            }

            if (signal.aborted) {
                throw new Error('Connection cancelled');
            }

            this.emit('status', { state: 'connecting', message: 'Opening port...' });
            this.emit('log', { message: 'Opening serial port...', level: 'info' });

            // Dynamic import of esptool-js
            const { Transport, ESPLoader } = await import('https://unpkg.com/esptool-js@0.4.5/bundle.js');

            if (signal.aborted) {
                throw new Error('Connection cancelled');
            }

            this.transport = new Transport(port, true);

            this.emit('status', { state: 'connecting', message: 'Detecting chip...' });
            this.emit('log', { message: 'Initializing esptool...', level: 'info' });

            this.espStub = new ESPLoader({
                transport: this.transport,
                baudrate,
                terminal: {
                    clean: () => {},
                    writeLine: (data) => this.emit('log', { message: data, level: 'debug' }),
                    write: (data) => this.emit('log', { message: data, level: 'debug' })
                }
            });

            // Race between connection, timeout, and cancellation
            const chipType = await Promise.race([
                this.espStub.main(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout - device not responding')), timeout)
                ),
                new Promise((_, reject) =>
                    signal.addEventListener('abort', () => reject(new Error('Connection cancelled')))
                )
            ]);

            this.emit('log', { message: `Chip detected: ${chipType}`, level: 'info' });

            // Get MAC address if available
            let macAddr = null;
            if (this.espStub.chip?.macAddr) {
                macAddr = this.espStub.chip.macAddr();
                this.emit('log', { message: `MAC Address: ${macAddr}`, level: 'info' });
            }

            // Chip validation
            if (expectedChip && chipType && !options.skipChipCheck) {
                const expected = expectedChip.toUpperCase().replace('ESP32-', 'ESP32').replace('ESP32', '');
                const detected = chipType.toUpperCase().replace('ESP32-', 'ESP32').replace('ESP32', '');
                // Compare normalized forms: "esp32c3" and "ESP32-C3" both become "C3"
                const isMatch = detected.includes(expected) || expected.includes(detected.split(' ')[0]);

                if (!isMatch) {
                    // Emit chip mismatch event and wait for resolution
                    const shouldProceed = await this.handleChipMismatch(expected, detected);

                    if (!shouldProceed) {
                        await this.disconnect();
                        throw new Error(`Chip mismatch: expected ${expected}, detected ${detected}`);
                    }

                    this.emit('log', { message: `Proceeding with ${chipType} (user override)`, level: 'warning' });
                }
            }

            this.isConnected = true;
            this.emit('status', { state: 'connected', message: `Connected to ${chipType}` });
            this.emit('log', { message: `Connected to ${chipType}`, level: 'success' });
            this.emit('connected', { chipType, macAddr });

            return { chipType, macAddr };

        } catch (error) {
            await this.disconnect();
            this.emit('error', { error, message: error.message });
            this.emit('log', { message: `Connection failed: ${error.message}`, level: 'error' });
            throw error;
        }
    }

    /**
     * Handle chip mismatch - emits event and waits for resolution
     * @private
     * @returns {Promise<boolean>} - true to proceed, false to cancel
     */
    handleChipMismatch(expected, detected) {
        return new Promise((resolve) => {
            this.emit('chip-mismatch', {
                expected,
                detected,
                proceed: () => resolve(true),
                cancel: () => resolve(false)
            });

            // Default: auto-cancel after 30 seconds if no response
            setTimeout(() => resolve(false), 30000);
        });
    }

    /**
     * Cancel an in-progress connection
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Disconnect from device
     */
    async disconnect() {
        if (this.transport) {
            try {
                await this.transport.disconnect();
                this.emit('log', { message: 'Disconnected', level: 'info' });
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        this.transport = null;
        this.espStub = null;
        this.isConnected = false;
        this.emit('disconnected', {});
    }

    /**
     * Get the ESPLoader stub for direct operations
     * @returns {ESPLoader|null}
     */
    getStub() {
        return this.espStub;
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    getIsConnected() {
        return this.isConnected;
    }

    /**
     * Read flash memory from device
     * @param {number} offset - Flash offset to read from
     * @param {number} size - Number of bytes to read
     * @returns {Promise<Uint8Array>}
     */
    async readFlash(offset, size) {
        if (!this.espStub) {
            throw new Error('Device not connected');
        }

        this.emit('log', { message: `Reading ${size} bytes from 0x${offset.toString(16)}...`, level: 'info' });

        const data = await this.espStub.readFlash(offset, size);

        this.emit('log', { message: `Read ${data.length} bytes`, level: 'success' });
        return new Uint8Array(data);
    }

    /**
     * Write to flash memory
     * @param {Array<{data: Uint8Array|string, address: number}>} files - Files to flash
     * @param {Function} [onProgress] - Progress callback (percent, written, total)
     */
    async writeFlash(files, onProgress) {
        if (!this.espStub) {
            throw new Error('Device not connected');
        }

        // Convert Uint8Array to binary string if needed
        const fileArray = files.map(f => ({
            data: f.data instanceof Uint8Array
                ? Array.from(f.data).map(b => String.fromCharCode(b)).join('')
                : f.data,
            address: f.address
        }));

        await this.espStub.writeFlash({
            fileArray,
            flashSize: 'keep',
            compress: true,
            reportProgress: (idx, written, total) => {
                const percent = Math.round((written / total) * 100);
                this.emit('progress', { percent, written, total });
                if (onProgress) onProgress(percent, written, total);
            }
        });
    }

    /**
     * Hard reset the device
     */
    async hardReset() {
        if (this.espStub) {
            await this.espStub.hardReset();
            this.emit('log', { message: 'Device reset', level: 'info' });
        }
    }
}
