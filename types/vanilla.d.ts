/**
 * ESP WebFlash Toolkit — Vanilla Adapter Type Declarations
 */

import { ESPFlasher, Field } from './index';

export interface UIElements {
    statusBox?: HTMLElement;
    progressContainer?: HTMLElement;
    progressFill?: HTMLElement;
    progressPercent?: HTMLElement;
    progressTime?: HTMLElement;
    logContainer?: HTMLElement;
    chipType?: HTMLElement;
    chipMac?: HTMLElement;
    configContainer?: HTMLElement;
    connectBtn?: HTMLElement;
    flashBtn?: HTMLElement;
    stageLabel?: HTMLElement;
}

export interface CreateFlasherOptions {
    chip?: string;
    firmwareUrl?: string;
    fields?: Array<string | Field>;
    configSections?: any[];
    elements: UIElements;
    storageKey?: string;
}

export function createFlasher(options: CreateFlasherOptions): {
    flasher: ESPFlasher;
    ui: FlasherUI;
    dispose: () => void;
};

export class FlasherUI {
    constructor(flasher: ESPFlasher, elements: UIElements, options?: { bindings?: any; groupBySection?: boolean });

    dispose(): void;
    renderConfigForm(schema: Field[]): void;
    clearLog(): void;
    showProgress(): void;
    hideProgress(): void;
    setPostFlash(postFlash: { title?: string; steps?: string[]; link?: { label: string; url: string } }): void;
}

export class FlasherApp {
    constructor(projects: Record<string, any>);

    flasher: ESPFlasher | null;
    ui: FlasherUI | null;

    init(): void;
    initFlasher(): void;
    loadProjectUI(): void;
    handleConnect(): Promise<void>;
    handleFlash(): Promise<void>;
    handleWriteConfig(): Promise<void>;
}
