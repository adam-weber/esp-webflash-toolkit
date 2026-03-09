/**
 * ESP WebFlash Toolkit - Core Library
 *
 * Simple API:
 * @example
 * import { flashDevice } from 'esp-webflash-toolkit';
 *
 * await flashDevice({
 *   firmware: 'https://example.com/firmware.bin',
 *   config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
 *   onProgress: (percent) => console.log(`${percent}%`)
 * });
 *
 * Advanced API (for custom UIs):
 * @example
 * import { ESPFlasher } from 'esp-webflash-toolkit';
 *
 * const flasher = new ESPFlasher({ chip: 'esp32', firmwareUrl: '...' });
 * flasher.addEventListener('progress', e => updateUI(e.detail.percent));
 * await flasher.connect();
 * await flasher.flash();
 */

// Main API
export { ESPFlasher, flashDevice } from './flasher.js';

// Low-level components (for advanced usage)
export { DeviceConnection } from './device-connection.js';
export { FirmwareFlasher } from './firmware-flasher.js';
export { NVSGenerator } from './nvs-generator.js';

// Config utilities
export { ConfigStore, FieldPresets, expandFieldPresets } from './config-store.js';

// Config schema v2
export { normalizeConfig, resolveVariantFirmwareUrl, validateConfig } from './config-schema.js';

// Flash states
export { FlashStates, FlashStateLabels, FlashStateMachine, VALID_TRANSITIONS } from './flash-states.js';

// Error catalog
export { classifyError, isBrowserSupported, isMobile } from './error-catalog.js';
