/**
 * ESPFlasher - Main Orchestrator
 * Single entry point for the ESP WebFlash Toolkit library
 *
 * @author Adam Weber (github: adam-weber)
 *
 * @example
 * // Basic usage
 * const flasher = new ESPFlasher({
 *   chip: 'esp32s3',
 *   firmwareUrl: 'https://github.com/user/repo/releases/latest/download/firmware.bin'
 * });
 *
 * flasher.on('status', ({ state, message }) => console.log(state, message));
 * flasher.on('progress', ({ percent }) => updateProgressBar(percent));
 * flasher.on('log', ({ message, level }) => console.log(`[${level}]`, message));
 *
 * await flasher.connect();
 * await flasher.flash();
 *
 * @example
 * // With NVS configuration
 * const flasher = new ESPFlasher({
 *   chip: 'esp32',
 *   firmwareUrl: 'https://...',
 *   fields: ['wifi', 'device_name'],  // Use presets
 *   nvsOffset: 0x9000
 * });
 *
 * flasher.setConfig({
 *   wifi_ssid: 'MyNetwork',
 *   wifi_pass: 'secret',
 *   device_name: 'sensor-001'
 * });
 *
 * await flasher.connect();
 * await flasher.flash();  // Flashes firmware + NVS
 */

import { DeviceConnection } from './device-connection.js';
import { FirmwareFlasher } from './firmware-flasher.js';
import { ConfigStore, expandFieldPresets } from './config-store.js';

/**
 * @typedef {Object} ESPFlasherOptions
 * @property {string} [chip] - Expected chip type (esp32, esp32s3, etc.)
 * @property {string} [firmwareUrl] - URL to download firmware from
 * @property {Array<string|Object>} [fields] - Config field definitions or preset names
 * @property {number} [firmwareOffset] - Firmware flash offset (default: 0x0)
 * @property {number} [nvsOffset] - NVS partition offset (default: 0x9000)
 * @property {number} [nvsSize] - NVS partition size (default: 0x6000)
 * @property {string} [nvsNamespace] - NVS namespace (default: 'config')
 * @property {number} [baudrate] - Serial baudrate (default: 115200)
 * @property {number} [timeout] - Connection timeout in ms (default: 15000)
 */

export class ESPFlasher extends EventTarget {
    /**
     * @param {ESPFlasherOptions} options
     */
    constructor(options = {}) {
        super();

        this.options = {
            chip: options.chip || null,
            firmwareUrl: options.firmwareUrl || null,
            firmwareOffset: options.firmwareOffset ?? 0x0,
            nvsOffset: options.nvsOffset ?? 0x9000,
            nvsSize: options.nvsSize ?? 0x6000,
            nvsNamespace: options.nvsNamespace || 'config',
            baudrate: options.baudrate || 115200,
            timeout: options.timeout || 15000
        };

        // Initialize components
        this.device = new DeviceConnection();
        this.flasher = new FirmwareFlasher();
        this.config = new ConfigStore();

        // Set up field schema if provided
        if (options.fields) {
            const fields = expandFieldPresets(options.fields);
            this.config.setSchema(fields);
        }

        // Forward events from components
        this.forwardEvents(this.device, ['log', 'status', 'progress', 'error', 'connected', 'disconnected', 'chip-mismatch']);
        this.forwardEvents(this.flasher, ['log', 'status', 'progress', 'error', 'complete']);
        this.forwardEvents(this.config, ['change', 'schema-changed']);
    }

    /**
     * Forward events from a component to this orchestrator
     * @private
     */
    forwardEvents(source, events) {
        events.forEach(event => {
            source.addEventListener(event, (e) => {
                this.dispatchEvent(new CustomEvent(event, { detail: e.detail }));
            });
        });
    }

    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * Set configuration values
     * @param {Object} values - Key-value pairs
     */
    setConfig(values) {
        this.config.setAll(values);
    }

    /**
     * Get current configuration
     * @returns {Object}
     */
    getConfig() {
        return this.config.getAll();
    }

    /**
     * Get config field schema
     * @returns {Array|null}
     */
    getSchema() {
        return this.config.getSchema();
    }

    /**
     * Connect to ESP device
     * @returns {Promise<{chipType: string, macAddr: string}>}
     */
    async connect() {
        return this.device.connect(this.options.chip, {
            baudrate: this.options.baudrate,
            timeout: this.options.timeout
        });
    }

    /**
     * Disconnect from device
     */
    async disconnect() {
        return this.device.disconnect();
    }

    /**
     * Cancel in-progress connection
     */
    cancelConnection() {
        this.device.cancel();
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected() {
        return this.device.getIsConnected();
    }

    /**
     * Flash firmware (and NVS config if set)
     * @param {Object} [options] - Override options
     * @returns {Promise<boolean>}
     */
    async flash(options = {}) {
        const firmwareUrl = options.firmwareUrl || this.options.firmwareUrl;

        if (!firmwareUrl && !options.customFirmware) {
            throw new Error('No firmware URL specified');
        }

        if (!this.device.getIsConnected()) {
            throw new Error('Not connected to device');
        }

        // Get NVS data from config store
        const nvsData = this.config.toNVS();
        const hasConfig = Object.keys(nvsData).length > 0;

        return this.flasher.flash(this.device, firmwareUrl, {
            customFirmware: options.customFirmware,
            nvsData: hasConfig ? nvsData : null,
            nvsNamespace: this.options.nvsNamespace,
            nvsOffset: this.options.nvsOffset,
            nvsSize: this.options.nvsSize,
            firmwareOffset: options.firmwareOffset ?? this.options.firmwareOffset
        });
    }

    /**
     * Flash only NVS configuration (without firmware)
     * @returns {Promise<boolean>}
     */
    async flashConfig() {
        if (!this.device.getIsConnected()) {
            throw new Error('Not connected to device');
        }

        const nvsData = this.config.toNVS();
        if (Object.keys(nvsData).length === 0) {
            throw new Error('No configuration to flash');
        }

        return this.flasher.flashNVS(this.device, nvsData, {
            nvsNamespace: this.options.nvsNamespace,
            nvsOffset: this.options.nvsOffset,
            nvsSize: this.options.nvsSize
        });
    }

    /**
     * Hard reset the device
     */
    async reset() {
        return this.device.hardReset();
    }

    /**
     * Get the underlying device connection (for advanced usage)
     * @returns {DeviceConnection}
     */
    getDevice() {
        return this.device;
    }
}

// Re-export components for advanced usage
export { DeviceConnection } from './device-connection.js';
export { FirmwareFlasher } from './firmware-flasher.js';
export { ConfigStore, FieldPresets, expandFieldPresets } from './config-store.js';
export { NVSGenerator } from './nvs-generator.js';
export { PartitionTableGenerator } from './partition-table-generator.js';
