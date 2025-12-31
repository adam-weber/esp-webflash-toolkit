/**
 * Vanilla JS Adapter for ESP WebFlash Toolkit
 *
 * Provides a batteries-included setup for vanilla JavaScript projects.
 *
 * @example
 * import { createFlasher } from 'esp-webflash-toolkit/adapters/vanilla';
 *
 * const { flasher, ui, dispose } = createFlasher({
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
 *
 * // Clean up when done:
 * // dispose();
 */

import { ESPFlasher } from '../../core/flasher.js';
import { FlasherUI } from './ui.js';

/**
 * @typedef {Object} VanillaFlasherOptions
 * @property {string} [chip] - Expected chip type
 * @property {string} [firmwareUrl] - Firmware URL
 * @property {Array} [fields] - Config field definitions or preset names
 * @property {Array} [configSections] - Legacy section-based config (auto-converted)
 * @property {Object} elements - DOM element references
 * @property {string} [storageKey] - localStorage key for config persistence
 */

/**
 * @typedef {Object} CreateFlasherResult
 * @property {ESPFlasher} flasher - Core flasher instance
 * @property {FlasherUI} ui - UI adapter instance
 * @property {Function} dispose - Cleanup function
 */

/**
 * Create a complete flasher setup with UI bindings
 * @param {VanillaFlasherOptions} options
 * @returns {CreateFlasherResult}
 */
export function createFlasher(options) {
    const { elements, storageKey, ...flasherOptions } = options;

    // Track all event listeners for cleanup
    const buttonListeners = [];

    // Create core flasher
    const flasher = new ESPFlasher(flasherOptions);

    // Create UI adapter
    const ui = new FlasherUI(flasher, elements);

    // Load persisted config if storageKey provided
    let changeHandler = null;
    if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                // Don't validate on load - these are known good values
                flasher.setConfig(JSON.parse(saved), { validate: false });
            } catch (e) {
                console.warn('Failed to load saved config:', e);
            }
        }

        // Persist on change
        changeHandler = () => {
            localStorage.setItem(storageKey, JSON.stringify(flasher.getConfig()));
        };
        flasher.addEventListener('change', changeHandler);
    }

    // Wire up buttons if provided
    if (elements.connectBtn) {
        const connectHandler = async () => {
            elements.connectBtn.disabled = true;
            try {
                await flasher.connect();
            } catch (e) {
                elements.connectBtn.disabled = false;
            }
        };
        elements.connectBtn.addEventListener('click', connectHandler);
        buttonListeners.push({ element: elements.connectBtn, event: 'click', handler: connectHandler });
    }

    if (elements.flashBtn) {
        const flashHandler = async () => {
            elements.flashBtn.disabled = true;
            try {
                await flasher.flash();
            } catch (e) {
                elements.flashBtn.disabled = false;
            }
        };
        elements.flashBtn.addEventListener('click', flashHandler);
        buttonListeners.push({ element: elements.flashBtn, event: 'click', handler: flashHandler });
    }


    /**
     * Clean up all resources
     */
    function dispose() {
        // Remove button listeners
        for (const { element, event, handler } of buttonListeners) {
            element.removeEventListener(event, handler);
        }

        // Remove change handler
        if (changeHandler) {
            flasher.removeEventListener('change', changeHandler);
        }

        // Dispose UI and flasher
        ui.dispose();
        flasher.dispose();
    }

    return { flasher, ui, dispose };
}

// Re-export classes for direct usage
export { FlasherUI } from './ui.js';
export { FlasherApp } from './app.js';
