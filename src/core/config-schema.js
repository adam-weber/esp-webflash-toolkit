/**
 * Config Schema v2 — normalizer, resolver, validator
 * Pure functions, no side effects, no browser APIs
 */

/**
 * @typedef {Object} Variant
 * @property {string} [id] - Unique identifier
 * @property {string} [name] - Display name
 * @property {string} [description] - Description text
 * @property {string} firmware - Firmware filename or URL
 * @property {string} [chip] - Chip type (overrides top-level)
 * @property {string} [offset] - Firmware offset (overrides top-level)
 * @property {string} [nvsOffset] - NVS offset (overrides top-level)
 * @property {Array} [fields] - Config field definitions
 */

/**
 * @typedef {Object} ConfigV2
 * @property {number} version - Always 2
 * @property {string} name - Project name
 * @property {string} [repo] - GitHub repo (user/repo)
 * @property {string} [release] - Release tag or "latest"
 * @property {Object} [branding] - Branding options
 * @property {string} [branding.logo] - Logo URL
 * @property {string} [branding.primaryColor] - Primary color hex
 * @property {string} [branding.theme] - "light" or "dark"
 * @property {Variant[]} variants - Firmware variants
 * @property {Object} [postFlash] - Post-flash instructions
 * @property {string} [postFlash.title] - Completion title
 * @property {string[]} [postFlash.steps] - Step instructions
 * @property {Object} [postFlash.link] - Link to show
 */

/**
 * Normalize a v1 or v2 config to v2 format.
 * No `version` field = v1. Handles both `firmware` and `bin` keys.
 * @param {Object} json - Raw config JSON
 * @returns {ConfigV2}
 */
export function normalizeConfig(json) {
    if (json.version === 2) {
        return { ...json, variants: json.variants.map(v => ({ ...v })) };
    }

    // v1 → v2: wrap as single-variant config
    return {
        version: 2,
        name: json.name || 'ESP Project',
        repo: json.repo || null,
        release: json.release || 'latest',
        branding: json.branding || null,
        variants: [{
            id: 'default',
            name: 'Default',
            firmware: json.firmware || json.bin,
            chip: json.chip || 'esp32',
            offset: json.offset,
            nvsOffset: json.nvsOffset,
            fields: json.fields
        }],
        postFlash: json.postFlash || null
    };
}

/**
 * Resolve the firmware download URL for a variant.
 * Handles relative filenames (resolved against repo releases) and absolute URLs.
 * @param {Variant} variant
 * @param {ConfigV2} config
 * @returns {string|null}
 */
export function resolveVariantFirmwareUrl(variant, config) {
    const firmware = variant.firmware;
    if (!firmware) return null;

    // Already an absolute URL
    if (firmware.startsWith('http://') || firmware.startsWith('https://')) {
        return firmware;
    }

    // Relative filename — resolve against repo releases
    if (config.repo) {
        const release = config.release || 'latest';
        if (release === 'latest') {
            return `https://github.com/${config.repo}/releases/latest/download/${firmware}`;
        }
        return `https://github.com/${config.repo}/releases/download/${release}/${firmware}`;
    }

    // No repo context, return as-is
    return firmware;
}

/**
 * Validate a v2 config.
 * @param {ConfigV2} config - Normalized v2 config
 * @returns {{valid: boolean, errors: string[]}}
 */
/**
 * Map an ESP binary chip ID to a chip name.
 * ESP binaries have magic 0xE9 at byte 0, chip_id as uint16 LE at byte 12.
 * @param {number} chipId - uint16 chip ID from binary header
 * @returns {string|null}
 */
export function chipIdToName(chipId) {
    const map = {
        0x0000: 'esp32',
        0x0002: 'esp32s2',
        0x0005: 'esp32c3',
        0x0009: 'esp32s3',
        0x000C: 'esp32c2',
        0x000D: 'esp32h2',
        0x0012: 'esp32c6',
    };
    return map[chipId] || null;
}

export function validateConfig(config) {
    const errors = [];

    if (!config.name) {
        errors.push('Missing "name" field');
    }

    if (!config.variants || config.variants.length === 0) {
        errors.push('At least one variant is required');
    } else {
        for (let i = 0; i < config.variants.length; i++) {
            const v = config.variants[i];
            if (!v.firmware) {
                errors.push(`Variant ${i} ("${v.name || v.id || i}") missing "firmware" field`);
            }
        }
    }

    if (config.branding) {
        if (config.branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(config.branding.primaryColor)) {
            errors.push('branding.primaryColor must be a 6-digit hex color (e.g., "#0071e3")');
        }
        if (config.branding.theme && !['light', 'dark'].includes(config.branding.theme)) {
            errors.push('branding.theme must be "light" or "dark"');
        }
    }

    return { valid: errors.length === 0, errors };
}
