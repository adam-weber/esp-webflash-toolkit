/**
 * ESP WebFlash Toolkit - Core Library
 *
 * Headless, framework-agnostic library for flashing ESP32 devices from the browser.
 *
 * @example
 * import { ESPFlasher } from 'esp-webflash-toolkit';
 *
 * const flasher = new ESPFlasher({
 *   chip: 'esp32s3',
 *   firmwareUrl: 'https://...',
 *   fields: ['wifi', 'device_name']
 * });
 *
 * flasher.on('progress', ({ percent }) => console.log(`${percent}%`));
 *
 * await flasher.connect();
 * flasher.setConfig({ wifi_ssid: 'MyNetwork', wifi_pass: 'secret' });
 * await flasher.flash();
 */

// Main orchestrator
export { ESPFlasher } from './flasher.js';

// Individual components for advanced usage
export { DeviceConnection } from './device-connection.js';
export { FirmwareFlasher } from './firmware-flasher.js';
export {
    ConfigStore,
    FieldPresets,
    expandFieldPresets,
    flattenConfigSections,
    groupFieldsBySection
} from './config-store.js';

// Pure utilities
export { NVSGenerator } from './nvs-generator.js';
export { PartitionTableGenerator } from './partition-table-generator.js';
