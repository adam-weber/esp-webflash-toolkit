/**
 * ESP WebFlash Toolkit — Type Declarations
 */

// --- Field & Config Types ---

export interface Field {
    key: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    default?: string;
    pattern?: string;
    help?: string;
    section?: string;
}

export interface Variant {
    id?: string;
    name?: string;
    description?: string;
    firmware: string;
    chip?: string;
    offset?: string | number;
    nvsOffset?: string | number;
    nvsSize?: number;
    fields?: Array<string | Field>;
}

export interface Branding {
    logo?: string;
    primaryColor?: string;
    theme?: 'light' | 'dark';
}

export interface PostFlash {
    title?: string;
    steps?: string[];
    link?: { label: string; url: string };
}

export interface ConfigV2 {
    version: 2;
    name: string;
    repo?: string;
    release?: string;
    branding?: Branding;
    variants: Variant[];
    postFlash?: PostFlash;
}

// --- ESPFlasher ---

export interface FlasherOptions {
    chip?: string;
    firmwareUrl?: string;
    fields?: Array<string | Field>;
    firmwareOffset?: number;
    nvsOffset?: number;
    nvsSize?: number;
    nvsNamespace?: string;
    configSections?: any[];
}

export interface DeviceInfo {
    chipType: string;
    macAddr: string | null;
}

export interface FlashOptions {
    firmwareUrl?: string;
    customFirmware?: File | Blob;
    firmwareOffset?: number;
}

export interface ResolvedFlasherOptions {
    chip: string | null;
    firmwareUrl: string | null;
    firmwareOffset: number;
    nvsOffset: number;
    nvsSize: number;
    nvsNamespace: string;
}

export class ESPFlasher extends EventTarget {
    constructor(options?: FlasherOptions);

    options: ResolvedFlasherOptions;
    readonly device: DeviceConnection;
    readonly firmware: FirmwareFlasher;
    readonly config: ConfigStore;
    readonly stateMachine: FlashStateMachine;

    connect(): Promise<DeviceInfo>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getDevice(): DeviceConnection;

    flash(opts?: FlashOptions): Promise<boolean>;
    flashConfig(): Promise<boolean>;
    reset(): Promise<void>;
    dispose(): void;

    setConfig(values: Record<string, any>): void;
    getConfig(): Record<string, any>;
    getSchema(): Field[] | null;
    setVariant(variant: Variant, resolvedUrl?: string): void;
}

// --- flashDevice ---

export interface FlashDeviceOptions {
    firmware: string;
    config?: Record<string, any>;
    chip?: string;
    onProgress?: (percent: number) => void;
    onLog?: (message: string, level: string) => void;
    firmwareOffset?: number;
    nvsOffset?: number;
}

export function flashDevice(options: FlashDeviceOptions): Promise<DeviceInfo>;

// --- DeviceConnection ---

export interface ConnectionOptions {
    port?: SerialPort;
    skipChipCheck?: boolean;
    baudrate?: number;
    timeout?: number;
}

export class DeviceConnection extends EventTarget {
    constructor();

    transport: any;
    espStub: any;
    isConnected: boolean;

    connect(expectedChip: string | null, options?: ConnectionOptions): Promise<DeviceInfo>;
    disconnect(): Promise<void>;
    cancel(): void;
    getStub(): any;
    getIsConnected(): boolean;
    readFlash(offset: number, size: number): Promise<Uint8Array>;
    writeFlash(files: Array<{ data: Uint8Array | string; address: number }>, onProgress?: (percent: number, written: number, total: number) => void): Promise<void>;
    hardReset(): Promise<void>;
}

// --- FirmwareFlasher ---

export interface FirmwareFlashOptions {
    customFirmware?: File | Blob;
    nvsData?: Record<string, string>;
    nvsNamespace?: string;
    nvsOffset?: number;
    nvsSize?: number;
    firmwareOffset?: number;
}

export class FirmwareFlasher extends EventTarget {
    constructor();

    flash(device: DeviceConnection, firmwareUrl: string, options?: FirmwareFlashOptions): Promise<boolean>;
    flashNVS(device: DeviceConnection, nvsData: Record<string, string>, options?: { nvsNamespace?: string; nvsOffset?: number; nvsSize?: number }): Promise<boolean>;
    generateNVS(data: Record<string, any>, namespace?: string, size?: number): Uint8Array;
}

// --- NVSGenerator ---

export class NVSGenerator {
    constructor();

    /** Generate NVS partition binary. Data is { namespace: { key: value } }. */
    generate(data: Record<string, Record<string, any>>, partitionSize?: number): Uint8Array;

    /** Parse NVS partition binary back to { namespace: { key: value } }. */
    parse(binary: Uint8Array): Record<string, Record<string, any>>;
}

/** Generate NVS from form-style config: { section: { field: value } } → flattened keys (section_field). */
export function generateNVSFromConfig(config: Record<string, Record<string, any>>, namespace?: string, partitionSize?: number): Uint8Array;

/** Parse NVS binary and return the data for a specific namespace. */
export function parseNVSConfig(binary: Uint8Array, namespace?: string): Record<string, any>;

// --- ConfigStore ---

export class ConfigStore extends EventTarget {
    constructor(initialConfig?: Record<string, any>);

    setSchema(fields: Field[]): void;
    getSchema(): Field[] | null;
    set(key: string, value: any): void;
    get(key: string): any;
    getAll(): Record<string, any>;
    setAll(values: Record<string, any>): void;
    validate(): { valid: boolean; missing: string[] };
    toNVS(): Record<string, string>;
    serialize(): string;
    load(data: string | Record<string, any>): void;
}

export const FieldPresets: {
    wifi: Field[];
    mqtt: Field[];
    device_name: Field[];
};

export function expandFieldPresets(fields: Array<string | Field>): Field[];
export function flattenConfigSections(sections: any[]): Field[];
export function groupFieldsBySection(fields: Field[]): Array<{ title: string; fields: Field[] }>;

// --- Config Schema ---

export function normalizeConfig(json: any): ConfigV2;
export function resolveVariantFirmwareUrl(variant: Variant, config: ConfigV2): string | null;
export function validateConfig(config: ConfigV2): { valid: boolean; errors: string[] };
export function chipIdToName(chipId: number): string | null;

// --- Flash States ---

export const FlashStates: {
    IDLE: 'idle';
    READY: 'ready';
    CONNECTING: 'connecting';
    CONNECTED: 'connected';
    DOWNLOADING: 'downloading';
    GENERATING: 'generating';
    WRITING: 'writing';
    VERIFYING: 'verifying';
    COMPLETE: 'complete';
    ERROR: 'error';
};

export const FlashStateLabels: Record<string, string>;
export const VALID_TRANSITIONS: Record<string, string[]>;

export class FlashStateMachine extends EventTarget {
    readonly state: string;
    readonly label: string;

    transition(newState: string): boolean;
    force(newState: string): void;
    reset(): void;
}

// --- Error Catalog ---

export interface ClassifiedError {
    type: string;
    title: string;
    steps: string[];
    chipSpecific: boolean;
}

export function classifyError(error: Error | string, context?: { chip?: string }): ClassifiedError;
export function isBrowserSupported(): { supported: boolean; reason: string | null };
export function isMobile(): boolean;
