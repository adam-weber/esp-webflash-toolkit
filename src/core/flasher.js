/**
 * ESPFlasher - Main orchestrator for ESP32 web flashing
 *
 * Simple. Event-driven. No bloated state machines.
 */

import { DeviceConnection } from './device-connection.js';
import { FirmwareFlasher } from './firmware-flasher.js';
import { ConfigStore, expandFieldPresets, flattenConfigSections } from './config-store.js';
import { FlashStateMachine, FlashStates } from './flash-states.js';
import { classifyError } from './error-catalog.js';

/**
 * @typedef {Object} FlasherOptions
 * @property {string} [chip] - Expected chip type
 * @property {string} [firmwareUrl] - Firmware URL
 * @property {Array} [fields] - Config field definitions or preset names
 * @property {number} [firmwareOffset=0x10000] - Firmware flash offset
 * @property {number} [nvsOffset=0x9000] - NVS partition offset
 * @property {number} [nvsSize=0x6000] - NVS partition size
 * @property {string} [nvsNamespace='config'] - NVS namespace
 */

export class ESPFlasher extends EventTarget {
    /**
     * @param {FlasherOptions} options
     */
    constructor(options = {}) {
        super();

        this.options = {
            chip: options.chip || null,
            firmwareUrl: options.firmwareUrl || null,
            firmwareOffset: options.firmwareOffset ?? 0x10000,
            nvsOffset: options.nvsOffset ?? 0x9000,
            nvsSize: options.nvsSize ?? 0x6000,
            nvsNamespace: options.nvsNamespace || 'config'
        };

        // Components
        this.device = new DeviceConnection();
        this.firmware = new FirmwareFlasher();
        this.config = new ConfigStore();

        // State machine (additive — existing events unchanged)
        this.stateMachine = new FlashStateMachine();
        this._forward(this.stateMachine, ['state-change']);

        // Set schema if fields provided (support both formats)
        if (options.fields) {
            this.config.setSchema(expandFieldPresets(options.fields));
        } else if (options.configSections) {
            // Legacy format support
            this.config.setSchema(flattenConfigSections(options.configSections));
        }

        // Forward events from components
        this._forward(this.device, ['log', 'status', 'progress', 'error', 'connected', 'disconnected', 'chip-mismatch']);
        this._forward(this.firmware, ['log', 'status', 'progress', 'error', 'complete']);
        this._forward(this.config, ['change', 'schema-changed']);
    }

    /** Forward events from source to this */
    _forward(source, events) {
        for (const event of events) {
            source.addEventListener(event, e =>
                this.dispatchEvent(new CustomEvent(event, { detail: e.detail }))
            );
        }
    }

    // --- Config ---

    setConfig(values) { this.config.setAll(values); }
    getConfig() { return this.config.getAll(); }
    getSchema() { return this.config.getSchema(); }

    /**
     * Set the active firmware variant (v2 config).
     * Updates chip, firmware URL, offsets, and fields.
     * @param {Object} variant - Variant object from v2 config
     * @param {Object} [resolvedUrl] - Pre-resolved firmware URL
     */
    setVariant(variant, resolvedUrl) {
        if (variant.chip) {
            this.options.chip = variant.chip;
        }
        if (resolvedUrl || variant.firmware) {
            this.options.firmwareUrl = resolvedUrl || variant.firmware;
        }
        if (variant.offset !== undefined) {
            this.options.firmwareOffset = typeof variant.offset === 'string'
                ? parseInt(variant.offset, 16) : variant.offset;
        }
        if (variant.nvsOffset !== undefined) {
            this.options.nvsOffset = typeof variant.nvsOffset === 'string'
                ? parseInt(variant.nvsOffset, 16) : variant.nvsOffset;
        }
        if (variant.fields) {
            this.config.setSchema(expandFieldPresets(variant.fields));
        }
    }

    // --- Connection ---

    async connect() {
        this.stateMachine.transition(FlashStates.CONNECTING);
        try {
            const result = await this.device.connect(this.options.chip, {
                baudrate: 115200,
                timeout: 15000
            });
            this.stateMachine.transition(FlashStates.CONNECTED);
            return result;
        } catch (error) {
            this.stateMachine.transition(FlashStates.ERROR);
            const classified = classifyError(error, { chip: this.options.chip });
            this.dispatchEvent(new CustomEvent('error-classified', { detail: classified }));
            throw error;
        }
    }

    async disconnect() { return this.device.disconnect(); }
    isConnected() { return this.device.getIsConnected(); }
    getDevice() { return this.device; }

    // --- Flashing ---

    /**
     * Flash firmware and config
     * @param {Object} [opts] - Override options
     */
    async flash(opts = {}) {
        const url = opts.firmwareUrl || this.options.firmwareUrl;

        if (!url && !opts.customFirmware) {
            throw new Error('No firmware URL specified');
        }
        if (!this.device.getIsConnected()) {
            throw new Error('Not connected');
        }

        this.stateMachine.transition(FlashStates.DOWNLOADING);

        const nvsData = this.config.toNVS();
        const hasConfig = Object.keys(nvsData).length > 0;

        try {
            const result = await this.firmware.flash(this.device, url, {
                customFirmware: opts.customFirmware,
                nvsData: hasConfig ? nvsData : null,
                nvsNamespace: this.options.nvsNamespace,
                nvsOffset: this.options.nvsOffset,
                nvsSize: this.options.nvsSize,
                firmwareOffset: opts.firmwareOffset ?? this.options.firmwareOffset
            });
            this.stateMachine.transition(FlashStates.COMPLETE);
            return result;
        } catch (error) {
            this.stateMachine.transition(FlashStates.ERROR);
            const classified = classifyError(error, { chip: this.options.chip });
            this.dispatchEvent(new CustomEvent('error-classified', { detail: classified }));
            throw error;
        }
    }

    /** Flash only NVS config (no firmware) */
    async flashConfig() {
        if (!this.device.getIsConnected()) {
            throw new Error('Not connected');
        }

        const nvsData = this.config.toNVS();
        if (Object.keys(nvsData).length === 0) {
            throw new Error('No config to flash');
        }

        return this.firmware.flashNVS(this.device, nvsData, {
            nvsNamespace: this.options.nvsNamespace,
            nvsOffset: this.options.nvsOffset,
            nvsSize: this.options.nvsSize
        });
    }

    /** Hard reset device */
    async reset() { return this.device.hardReset(); }

    /** Clean up */
    dispose() {
        if (this.device.getIsConnected()) {
            this.device.disconnect().catch(() => {});
        }
    }
}

/**
 * Flash a device in one call - the simplest possible API
 *
 * @example
 * await flashDevice({
 *     firmware: 'https://example.com/firmware.bin',
 *     config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
 *     onProgress: (percent) => console.log(`${percent}%`)
 * });
 *
 * @param {Object} options
 * @param {string} options.firmware - Firmware URL
 * @param {Object} [options.config] - Key-value config to write to NVS
 * @param {string} [options.chip] - Expected chip type (e.g., 'esp32', 'esp32s3')
 * @param {Function} [options.onProgress] - Progress callback (percent: number)
 * @param {Function} [options.onLog] - Log callback (message: string, level: string)
 * @param {number} [options.firmwareOffset=0x10000] - Firmware flash offset
 * @param {number} [options.nvsOffset=0x9000] - NVS partition offset
 * @returns {Promise<{chipType: string, macAddr: string}>} - Device info
 */
export async function flashDevice(options) {
    const {
        firmware,
        config,
        chip,
        onProgress,
        onLog,
        firmwareOffset = 0x10000,
        nvsOffset = 0x9000
    } = options;

    if (!firmware) {
        throw new Error('firmware URL is required');
    }

    const flasher = new ESPFlasher({
        chip,
        firmwareUrl: firmware,
        firmwareOffset,
        nvsOffset
    });

    // Wire up callbacks
    if (onProgress) {
        flasher.addEventListener('progress', e => onProgress(e.detail.percent));
    }
    if (onLog) {
        flasher.addEventListener('log', e => onLog(e.detail.message, e.detail.level));
    }

    try {
        // Connect
        const deviceInfo = await flasher.connect();

        // Set config if provided
        if (config && Object.keys(config).length > 0) {
            flasher.setConfig(config);
        }

        // Flash
        await flasher.flash();

        // Reset device
        await flasher.reset();

        return deviceInfo;
    } finally {
        flasher.dispose();
    }
}

// Re-exports for convenience
export { DeviceConnection } from './device-connection.js';
export { FirmwareFlasher } from './firmware-flasher.js';
export { NVSGenerator } from './nvs-generator.js';
export { ConfigStore, FieldPresets, expandFieldPresets } from './config-store.js';
