/**
 * Headless Firmware Flasher for ESP32
 * Handles firmware download and flashing without DOM dependencies
 *
 * @author Adam Weber (github: adam-weber)
 */

import { NVSGenerator } from './nvs-generator.js';

/**
 * @typedef {Object} FlashOptions
 * @property {File|Blob} [customFirmware] - Custom firmware file instead of URL
 * @property {Object} [nvsData] - Key-value pairs for NVS partition
 * @property {string} [nvsNamespace] - NVS namespace (default: 'config')
 * @property {number} [nvsOffset] - NVS partition offset (default: 0x9000)
 * @property {number} [nvsSize] - NVS partition size (default: 0x6000)
 * @property {number} [firmwareOffset] - Firmware offset (default: 0x0)
 */

export class FirmwareFlasher extends EventTarget {
    constructor() {
        super();
    }

    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * Flash firmware to device
     * @param {DeviceConnection} device - Connected device
     * @param {string} firmwareUrl - URL to download firmware from
     * @param {FlashOptions} [options] - Flash options
     */
    async flash(device, firmwareUrl, options = {}) {
        const {
            customFirmware,
            nvsData,
            nvsNamespace = 'config',
            nvsOffset = 0x9000,
            nvsSize = 0x6000,
            firmwareOffset = 0x0
        } = options;

        try {
            this.emit('status', { state: 'downloading', message: 'Preparing firmware...' });
            this.emit('log', { message: 'Starting flash process...', level: 'info' });

            // Get firmware data
            let firmwareData;

            if (customFirmware) {
                this.emit('log', { message: `Using custom firmware: ${customFirmware.name || 'blob'}`, level: 'info' });
                firmwareData = await customFirmware.arrayBuffer();
            } else {
                this.emit('log', { message: `Downloading from: ${firmwareUrl}`, level: 'info' });
                this.emit('status', { state: 'downloading', message: 'Downloading firmware...' });

                // Try direct fetch first, fall back to CORS proxy for cross-origin requests
                let response;
                try {
                    response = await fetch(firmwareUrl);
                    if (!response.ok) {
                        throw new Error(`${response.status}`);
                    }
                } catch (e) {
                    // CORS or network error - try proxy
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(firmwareUrl)}`;
                    this.emit('log', { message: 'Using CORS proxy...', level: 'info' });
                    response = await fetch(proxyUrl);
                    if (!response.ok) {
                        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                    }
                }

                firmwareData = await response.arrayBuffer();
            }

            const firmwareBytes = new Uint8Array(firmwareData);
            this.emit('log', { message: `Firmware size: ${(firmwareBytes.length / 1024).toFixed(1)} KB`, level: 'success' });

            // Prepare files to flash
            const files = [];

            // Add NVS partition if config provided
            if (nvsData && Object.keys(nvsData).length > 0) {
                this.emit('status', { state: 'generating', message: 'Generating NVS partition...' });
                this.emit('log', { message: 'Generating NVS partition...', level: 'info' });

                const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);

                files.push({
                    data: nvsBytes,
                    address: nvsOffset
                });

                this.emit('log', {
                    message: `NVS: ${nvsBytes.length} bytes at 0x${nvsOffset.toString(16)}`,
                    level: 'info'
                });
            }

            // Add firmware
            files.push({
                data: firmwareBytes,
                address: firmwareOffset
            });

            this.emit('log', {
                message: `Firmware: ${firmwareBytes.length} bytes at 0x${firmwareOffset.toString(16)}`,
                level: 'info'
            });

            // Flash
            this.emit('status', { state: 'flashing', message: 'Writing to flash...' });
            this.emit('log', { message: 'Writing to flash...', level: 'info' });

            await device.writeFlash(files, (percent, written, total) => {
                this.emit('progress', { percent, written, total });
            });

            this.emit('status', { state: 'complete', message: 'Flash complete!' });
            this.emit('log', { message: 'Flash completed successfully', level: 'success' });
            this.emit('complete', {});

            return true;

        } catch (error) {
            this.emit('error', { error, message: error.message });
            this.emit('log', { message: `Flash failed: ${error.message}`, level: 'error' });
            throw error;
        }
    }

    /**
     * Generate NVS partition binary
     * @param {Object} data - Key-value pairs
     * @param {string} namespace - NVS namespace
     * @param {number} size - Partition size
     * @returns {Uint8Array}
     */
    generateNVS(data, namespace = 'config', size = 0x6000) {
        const generator = new NVSGenerator();
        const nvsData = { [namespace]: data };
        return generator.generate(nvsData, size);
    }

    /**
     * Flash only NVS configuration (without firmware)
     * @param {DeviceConnection} device - Connected device
     * @param {Object} nvsData - Key-value pairs
     * @param {Object} [options] - Options
     */
    async flashNVS(device, nvsData, options = {}) {
        const {
            nvsNamespace = 'config',
            nvsOffset = 0x9000,
            nvsSize = 0x6000
        } = options;

        try {
            this.emit('status', { state: 'generating', message: 'Generating NVS...' });
            this.emit('log', { message: 'Generating NVS partition...', level: 'info' });

            const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);

            const keys = Object.keys(nvsData);
            this.emit('log', { message: `NVS keys: ${keys.join(', ')}`, level: 'info' });

            this.emit('status', { state: 'flashing', message: 'Writing config...' });
            this.emit('log', { message: `Writing ${nvsBytes.length} bytes to 0x${nvsOffset.toString(16)}...`, level: 'info' });

            await device.writeFlash([{ data: nvsBytes, address: nvsOffset }], (percent) => {
                this.emit('progress', { percent });
            });

            this.emit('status', { state: 'complete', message: 'Config written!' });
            this.emit('log', { message: `Wrote ${keys.length} config values`, level: 'success' });
            this.emit('complete', {});

            return true;

        } catch (error) {
            this.emit('error', { error, message: error.message });
            this.emit('log', { message: `Config write failed: ${error.message}`, level: 'error' });
            throw error;
        }
    }
}
