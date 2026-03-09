/**
 * Component Bundle Entry Point (IIFE)
 * Self-registers <esp-flasher> custom element.
 *
 * Usage:
 *   <script src="esp-flasher-component.min.js"></script>
 *   <esp-flasher config="..." mode="full"></esp-flasher>
 */

import { ESPFlasherElement } from './components/esp-flasher.js';

// Self-register if not already defined
if (!customElements.get('esp-flasher')) {
    customElements.define('esp-flasher', ESPFlasherElement);
}

export { ESPFlasherElement };
