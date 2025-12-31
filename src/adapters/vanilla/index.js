/**
 * Vanilla JS Adapter for ESP WebFlash Toolkit
 *
 * Provides a batteries-included setup for vanilla JavaScript projects.
 *
 * @example
 * import { createFlasher } from 'esp-webflash-toolkit/adapters/vanilla';
 *
 * const { flasher, ui } = createFlasher({
 *   chip: 'esp32s3',
 *   firmwareUrl: 'https://...',
 *   fields: ['wifi'],
 *   elements: {
 *     statusBox: document.getElementById('status'),
 *     progressFill: document.getElementById('progress'),
 *     logContainer: document.getElementById('log'),
 *     configContainer: document.getElementById('config'),
 *     connectBtn: document.getElementById('connect'),
 *     flashBtn: document.getElementById('flash')
 *   },
 *   // Optional: persist config to localStorage
 *   storageKey: 'my-flasher-config'
 * });
 *
 * // Buttons are auto-wired if provided
 * // Or manually: await flasher.connect(); await flasher.flash();
 */

import { ESPFlasher } from '../../core/flasher.js';
import { FlasherUI } from './ui.js';

/**
 * @typedef {Object} VanillaFlasherOptions
 * @property {string} [chip] - Expected chip type
 * @property {string} [firmwareUrl] - Firmware URL
 * @property {Array} [fields] - Config field definitions
 * @property {Object} elements - DOM element references
 * @property {string} [storageKey] - localStorage key for config persistence
 */

/**
 * Create a complete flasher setup with UI bindings
 * @param {VanillaFlasherOptions} options
 * @returns {{flasher: ESPFlasher, ui: FlasherUI}}
 */
export function createFlasher(options) {
    const { elements, storageKey, ...flasherOptions } = options;

    // Create core flasher
    const flasher = new ESPFlasher(flasherOptions);

    // Create UI adapter
    const ui = new FlasherUI(flasher, elements);

    // Load persisted config if storageKey provided
    if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                flasher.setConfig(JSON.parse(saved));
            } catch (e) {
                console.warn('Failed to load saved config:', e);
            }
        }

        // Persist on change
        flasher.addEventListener('change', () => {
            localStorage.setItem(storageKey, JSON.stringify(flasher.getConfig()));
        });
    }

    // Wire up buttons if provided
    if (elements.connectBtn) {
        elements.connectBtn.addEventListener('click', async () => {
            elements.connectBtn.disabled = true;
            try {
                await flasher.connect();
            } catch (e) {
                elements.connectBtn.disabled = false;
            }
        });
    }

    if (elements.flashBtn) {
        elements.flashBtn.addEventListener('click', async () => {
            elements.flashBtn.disabled = true;
            try {
                await flasher.flash();
            } catch (e) {
                elements.flashBtn.disabled = false;
            }
        });
    }

    return { flasher, ui };
}

// Re-export UI class for advanced usage
export { FlasherUI } from './ui.js';
