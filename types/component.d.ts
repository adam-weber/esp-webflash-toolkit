/**
 * ESP WebFlash Toolkit — Web Component Type Declarations
 */

import { ESPFlasher } from './index';

export class ESPFlasherElement extends HTMLElement {
    static readonly observedAttributes: string[];

    /** Internal ESPFlasher instance (available after connectedCallback) */
    readonly flasher: ESPFlasher | null;

    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void;
}

declare global {
    interface HTMLElementTagNameMap {
        'esp-flasher': ESPFlasherElement;
    }

    interface HTMLElementEventMap {
        'esp-flasher:connected': CustomEvent<{ chipType: string; macAddr: string | null }>;
        'esp-flasher:complete': CustomEvent<{}>;
        'esp-flasher:error': CustomEvent<{ error: Error; message: string }>;
    }
}
