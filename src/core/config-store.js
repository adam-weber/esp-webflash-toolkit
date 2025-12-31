/**
 * Pure Configuration Store
 * Manages config state without DOM or storage dependencies
 *
 * @author Adam Weber (github: adam-weber)
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} key - Field key (used in NVS)
 * @property {string} label - Display label
 * @property {string} [type] - Input type (text, password, number)
 * @property {string} [placeholder] - Placeholder text
 * @property {string} [default] - Default value
 * @property {boolean} [required] - Is required
 * @property {string} [section] - Optional section grouping for UI
 * @property {string} [pattern] - Optional regex pattern for validation
 * @property {string} [help] - Optional help text
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} missing - Required fields that are empty
 * @property {Object<string, string>} errors - Field-specific validation errors
 */

export class ConfigStore extends EventTarget {
    /**
     * @param {Object} [initialConfig] - Initial config values
     */
    constructor(initialConfig = {}) {
        super();
        this.config = { ...initialConfig };
        this.schema = null;
        this._listeners = new Map(); // Track listeners for cleanup
    }

    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * Set the config schema (field definitions)
     * @param {Array<FieldDefinition>} fields - Field definitions
     */
    setSchema(fields) {
        this.schema = fields;

        // Apply defaults for any missing values
        fields.forEach(field => {
            if (field.default !== undefined && this.config[field.key] === undefined) {
                this.config[field.key] = field.default;
            }
        });

        this.emit('schema-changed', { schema: this.schema });
    }

    /**
     * Get schema
     * @returns {Array<FieldDefinition>|null}
     */
    getSchema() {
        return this.schema;
    }

    /**
     * Set a config value
     * @param {string} key - Config key
     * @param {any} value - Config value
     */
    set(key, value) {
        const oldValue = this.config[key];
        this.config[key] = value;

        this.emit('change', { key, value, oldValue });
    }

    /**
     * Get a config value
     * @param {string} key - Config key
     * @returns {any}
     */
    get(key) {
        return this.config[key];
    }

    /**
     * Get all config values
     * @returns {Object}
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Set multiple values at once
     * @param {Object} values - Key-value pairs
     */
    setAll(values) {
        Object.entries(values).forEach(([key, value]) => {
            this.config[key] = value;
        });

        this.emit('change', { bulk: true, values });
    }

    /**
     * Clear all config
     */
    clear() {
        const oldConfig = { ...this.config };
        this.config = {};

        // Re-apply defaults if schema exists
        if (this.schema) {
            this.schema.forEach(field => {
                if (field.default !== undefined) {
                    this.config[field.key] = field.default;
                }
            });
        }

        this.emit('clear', { oldConfig });
    }

    /**
     * Check if config is valid (all required fields present, patterns match)
     * @returns {ValidationResult}
     */
    validate() {
        if (!this.schema) {
            return { valid: true, missing: [], errors: {} };
        }

        const missing = [];
        const errors = {};

        for (const field of this.schema) {
            const value = this.config[field.key];
            const isEmpty = value === undefined || value === null || value === '';

            // Check required fields
            if (field.required && isEmpty) {
                missing.push(field.key);
                errors[field.key] = `${field.label || field.key} is required`;
                continue;
            }

            // Skip pattern validation for empty optional fields
            if (isEmpty) continue;

            // Validate pattern if specified
            if (field.pattern) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(String(value))) {
                    errors[field.key] = `${field.label || field.key} format is invalid`;
                }
            }

            // Type-specific validation
            if (field.type === 'number') {
                const num = Number(value);
                if (isNaN(num)) {
                    errors[field.key] = `${field.label || field.key} must be a number`;
                }
            }
        }

        return {
            valid: missing.length === 0 && Object.keys(errors).length === 0,
            missing,
            errors
        };
    }

    /**
     * Check if a specific key exists in the schema
     * @param {string} key - Field key to check
     * @returns {boolean}
     */
    hasField(key) {
        if (!this.schema) return true; // No schema = accept anything
        return this.schema.some(field => field.key === key);
    }

    /**
     * Get field definition by key
     * @param {string} key - Field key
     * @returns {FieldDefinition|null}
     */
    getField(key) {
        if (!this.schema) return null;
        return this.schema.find(field => field.key === key) || null;
    }

    /**
     * Get config formatted for NVS generation
     * Only includes non-empty values
     * @returns {Object}
     */
    toNVS() {
        const nvsData = {};

        Object.entries(this.config).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                nvsData[key] = String(value);
            }
        });

        return nvsData;
    }

    /**
     * Load config from serialized data (e.g., localStorage)
     * @param {string|Object} data - JSON string or object
     */
    load(data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        this.config = { ...parsed };
        this.emit('load', { config: this.config });
    }

    /**
     * Serialize config for storage
     * @returns {string}
     */
    serialize() {
        return JSON.stringify(this.config);
    }
}

/**
 * Preset field configurations for common use cases
 */
export const FieldPresets = {
    wifi: [
        { key: 'wifi_ssid', label: 'WiFi SSID', type: 'text', placeholder: 'MyNetwork', required: true },
        { key: 'wifi_pass', label: 'WiFi Password', type: 'password', required: true }
    ],

    mqtt: [
        { key: 'mqtt_host', label: 'MQTT Host', type: 'text', placeholder: 'mqtt.example.com' },
        { key: 'mqtt_user', label: 'MQTT Username', type: 'text' },
        { key: 'mqtt_pass', label: 'MQTT Password', type: 'password' }
    ],

    device_name: [
        { key: 'device_name', label: 'Device Name', type: 'text', placeholder: 'my-device-001' }
    ],

    api_key: [
        { key: 'api_key', label: 'API Key', type: 'password' }
    ],

    server_url: [
        { key: 'server_url', label: 'Server URL', type: 'text', placeholder: 'https://api.example.com' }
    ]
};

/**
 * Expand field preset names to full field definitions
 * @param {Array<string|FieldDefinition>} fields - Mix of preset names and custom fields
 * @returns {Array<FieldDefinition>}
 */
export function expandFieldPresets(fields) {
    const expanded = [];

    fields.forEach(field => {
        if (typeof field === 'string' && FieldPresets[field]) {
            expanded.push(...FieldPresets[field]);
        } else if (typeof field === 'object') {
            expanded.push(field);
        }
    });

    return expanded;
}

/**
 * Convert section-based config format to flat field definitions
 * This bridges the legacy FlasherApp format to the core format
 *
 * @param {Array<{id?: string, name?: string, title?: string, description?: string, fields: Array}>} sections
 * @returns {Array<FieldDefinition>}
 *
 * @example
 * // Input (legacy FlasherApp format):
 * [{
 *   id: 'wifi',
 *   title: 'WiFi Settings',
 *   fields: [
 *     { id: 'ssid', nvsKey: 'wifi_ssid', label: 'SSID', required: true }
 *   ]
 * }]
 *
 * // Output (core format):
 * [{ key: 'wifi_ssid', label: 'SSID', required: true, section: 'wifi' }]
 */
export function flattenConfigSections(sections) {
    if (!sections || !Array.isArray(sections)) {
        return [];
    }

    const fields = [];

    for (const section of sections) {
        const sectionId = section.id || section.name || section.title || 'default';
        const sectionTitle = section.title || section.name || sectionId;

        if (!section.fields || !Array.isArray(section.fields)) {
            continue;
        }

        for (const field of section.fields) {
            // Support both nvsKey (legacy) and key (standard) formats
            const key = field.nvsKey || field.key;
            if (!key) continue;

            fields.push({
                key,
                label: field.label || key,
                type: field.type || 'text',
                placeholder: field.placeholder,
                default: field.default,
                required: field.required || false,
                pattern: field.pattern,
                help: field.help,
                section: sectionId,
                sectionTitle
            });
        }
    }

    return fields;
}

/**
 * Group flat field definitions by section for UI rendering
 * @param {Array<FieldDefinition>} fields - Flat field definitions
 * @returns {Array<{id: string, title: string, fields: Array<FieldDefinition>}>}
 */
export function groupFieldsBySection(fields) {
    if (!fields || !Array.isArray(fields)) {
        return [];
    }

    const sectionMap = new Map();

    for (const field of fields) {
        const sectionId = field.section || 'default';
        const sectionTitle = field.sectionTitle || sectionId;

        if (!sectionMap.has(sectionId)) {
            sectionMap.set(sectionId, {
                id: sectionId,
                title: sectionTitle,
                fields: []
            });
        }

        sectionMap.get(sectionId).fields.push(field);
    }

    return Array.from(sectionMap.values());
}
