/**
 * MCP tool definitions and handlers for ESP WebFlash.
 *
 * Tools:
 *   create_flasher     — Generate a hosted flash page URL
 *   validate_config    — Validate a flash-config.json
 *   resolve_repo       — Resolve a GitHub repo to a flash config
 *   list_chips         — List supported ESP32 chip types
 *   list_field_presets — List available config field presets
 */

import { normalizeConfig, resolveVariantFirmwareUrl, validateConfig } from '../../../src/core/config-schema.js';
import { FieldPresets } from '../../../src/core/config-store.js';
import { fetchConfig, buildConfigFromReleases } from '../lib/github.js';

// --- Tool Definitions (JSON Schema for MCP) ---

const CHIPS = [
    { name: 'esp32', hexId: '0x0000', description: 'Xtensa dual-core, the original ESP32' },
    { name: 'esp32s2', hexId: '0x0002', description: 'Xtensa single-core with native USB' },
    { name: 'esp32s3', hexId: '0x0009', description: 'Xtensa dual-core with AI acceleration and USB' },
    { name: 'esp32c3', hexId: '0x0005', description: 'RISC-V single-core, low power' },
    { name: 'esp32c2', hexId: '0x000C', description: 'RISC-V ultra-low-power, minimal' },
    { name: 'esp32c6', hexId: '0x0012', description: 'RISC-V with WiFi 6 and Thread' },
    { name: 'esp32h2', hexId: '0x000D', description: 'RISC-V with Thread and Zigbee (no WiFi)' },
    { name: 'esp8266', hexId: 'N/A', description: 'Legacy chip, WiFi only' },
];

const CHIP_NAMES = CHIPS.map(c => c.name);

/**
 * Build the tools map: { name: { definition, handler } }
 */
export function buildTools() {
    return {
        create_flasher: {
            definition: {
                name: 'create_flasher',
                description: 'Generate a hosted flash page config. If a repo is provided, returns a flash page URL.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Project display name' },
                        repo: { type: 'string', description: 'GitHub repo in "user/repo" format. Firmware filenames are resolved against this repo\'s releases.' },
                        firmware: { type: 'string', description: 'Firmware filename (e.g., "firmware.bin") or absolute URL' },
                        chip: {
                            type: 'string',
                            enum: CHIP_NAMES,
                            description: 'Target chip type (default: esp32)',
                        },
                        release: { type: 'string', description: 'Release tag (e.g., "v1.0.0") or "latest" (default)' },
                        fields: {
                            type: 'array',
                            items: {
                                oneOf: [
                                    { type: 'string', enum: ['wifi', 'mqtt', 'device_name'], description: 'Field preset name' },
                                    {
                                        type: 'object',
                                        properties: {
                                            key: { type: 'string', description: 'NVS key name' },
                                            label: { type: 'string', description: 'Display label' },
                                            type: { type: 'string', description: 'Input type (text, password, email, number)' },
                                            required: { type: 'boolean' },
                                        },
                                        required: ['key', 'label'],
                                    },
                                ],
                            },
                            description: 'Config fields for the flash page. Use preset names ("wifi", "mqtt", "device_name") or custom field objects.',
                        },
                        variants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    firmware: { type: 'string' },
                                    chip: { type: 'string', enum: CHIP_NAMES },
                                    fields: { type: 'array' },
                                },
                                required: ['firmware'],
                            },
                            description: 'Multiple firmware variants. If provided, overrides the top-level firmware/chip/fields.',
                        },
                        branding: {
                            type: 'object',
                            properties: {
                                logo: { type: 'string', description: 'Logo image URL' },
                                primaryColor: { type: 'string', description: 'Accent color as "#rrggbb"' },
                                theme: { type: 'string', enum: ['light', 'dark'], description: 'Default theme' },
                            },
                            description: 'Branding options for the flash page',
                        },
                        postFlash: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                steps: { type: 'array', items: { type: 'string' } },
                                link: {
                                    type: 'object',
                                    properties: { label: { type: 'string' }, url: { type: 'string' } },
                                },
                            },
                            description: 'Instructions shown after successful flash',
                        },
                    },
                    required: ['name'],
                },
            },
            handler: handleCreateFlasher,
        },

        validate_config: {
            definition: {
                name: 'validate_config',
                description: 'Validate a flash-config.json object. Checks required fields, variant firmware URLs, branding colors, and theme values. Accepts both v1 and v2 formats.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        config: {
                            type: 'object',
                            description: 'The flash-config.json content to validate',
                        },
                    },
                    required: ['config'],
                },
            },
            handler: handleValidateConfig,
        },

        resolve_repo: {
            definition: {
                name: 'resolve_repo',
                description: 'Resolve a GitHub repo to a flash config. Looks for flash-config.json in the repo, or falls back to auto-detecting firmware from GitHub Releases.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo: { type: 'string', description: 'GitHub repo in "user/repo" format' },
                        tag: { type: 'string', description: 'Release tag (optional, defaults to latest)' },
                    },
                    required: ['repo'],
                },
            },
            handler: handleResolveRepo,
        },

        list_chips: {
            definition: {
                name: 'list_chips',
                description: 'List all supported ESP32 chip types with their binary header hex IDs and descriptions.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                },
            },
            handler: handleListChips,
        },

        list_field_presets: {
            definition: {
                name: 'list_field_presets',
                description: 'List available config field presets. Presets are shorthand names that expand to common NVS key/value field definitions (e.g., "wifi" expands to wifi_ssid + wifi_pass).',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                },
            },
            handler: handleListFieldPresets,
        },
    };
}

// --- Tool Handlers ---

async function handleCreateFlasher(args, env) {
    const { name, repo, firmware, chip, release, fields, variants, branding, postFlash } = args;

    if (!firmware && (!variants || variants.length === 0)) {
        return {
            content: [{ type: 'text', text: 'Either "firmware" or "variants" (with firmware in each) is required.' }],
            isError: true,
        };
    }

    // Build v2 config
    const builtVariants = variants
        ? variants.map(v => ({
            ...v,
            // Propagate top-level fields as defaults for variants that don't specify their own
            fields: v.fields || fields || [],
            chip: v.chip || chip || 'esp32',
        }))
        : [{
            id: 'default',
            name: 'Default',
            firmware,
            chip: chip || 'esp32',
            fields: fields || [],
        }];

    const config = {
        version: 2,
        name,
        release: release || 'latest',
        variants: builtVariants,
    };

    if (repo) config.repo = repo;
    if (branding) config.branding = branding;
    if (postFlash) config.postFlash = postFlash;

    // Validate
    const normalized = normalizeConfig(config);
    const validation = validateConfig(normalized);
    if (!validation.valid) {
        return {
            content: [{
                type: 'text',
                text: `Config validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`,
            }],
            isError: true,
        };
    }

    // Resolve firmware URLs for display
    const resolvedUrls = normalized.variants.map(v => ({
        variant: v.name || v.id || 'default',
        url: resolveVariantFirmwareUrl(v, normalized),
    }));

    // Generate flash page URL
    let flashUrl = null;
    if (repo) {
        flashUrl = `https://esp-webflash.workers.dev/${repo}`;
    }

    const parts = [`Flash page created for "${name}".`];

    if (flashUrl) {
        parts.push(`\nFlash page: ${flashUrl}`);
    }

    parts.push(`\nConfig:\n${JSON.stringify(normalized, null, 2)}`);

    parts.push(`\nFirmware URLs:`);
    for (const r of resolvedUrls) {
        parts.push(`  ${r.variant}: ${r.url}`);
    }

    if (!flashUrl) {
        parts.push(`\nTo get a hosted flash page, add a "repo" field (e.g., "user/repo") and push a flash-config.json to your repo.`);
        parts.push(`\nOr use the <esp-flasher> web component directly:`);
        parts.push(`<esp-flasher config-data='${JSON.stringify(normalized).replace(/'/g, '&#39;')}'></esp-flasher>`);
    }

    return {
        content: [{ type: 'text', text: parts.join('\n') }],
    };
}

async function handleValidateConfig(args) {
    const { config } = args;

    try {
        const normalized = normalizeConfig(config);
        const result = validateConfig(normalized);

        if (result.valid) {
            const variantSummary = normalized.variants.map(v =>
                `  - ${v.name || v.id || 'default'}: ${v.firmware} (${v.chip || 'esp32'})`
            ).join('\n');

            return {
                content: [{
                    type: 'text',
                    text: `Config is valid.\n\nProject: ${normalized.name}\nVariants:\n${variantSummary}`,
                }],
            };
        }

        return {
            content: [{
                type: 'text',
                text: `Config validation failed:\n${result.errors.map(e => `  - ${e}`).join('\n')}`,
            }],
            isError: true,
        };
    } catch (err) {
        return {
            content: [{ type: 'text', text: `Failed to parse config: ${err.message}` }],
            isError: true,
        };
    }
}

async function handleResolveRepo(args, env) {
    const { repo, tag } = args;

    const parts = repo.split('/');
    if (parts.length !== 2) {
        return {
            content: [{ type: 'text', text: 'Invalid repo format. Expected "user/repo".' }],
            isError: true,
        };
    }

    const [user, repoName] = parts;
    const token = env.GITHUB_TOKEN || null;

    // Try flash-config.json first
    let config = await fetchConfig(user, repoName, token, tag);

    if (config) {
        const normalized = normalizeConfig(config);
        return {
            content: [{
                type: 'text',
                text: `Found flash-config.json in ${repo}.\n\n${JSON.stringify(normalized, null, 2)}`,
            }],
        };
    }

    // Fall back to GitHub Releases
    config = await buildConfigFromReleases(user, repoName, tag, token);

    if (config) {
        return {
            content: [{
                type: 'text',
                text: `No flash-config.json found. Auto-detected from GitHub Releases:\n\n${JSON.stringify(config, null, 2)}`,
            }],
        };
    }

    return {
        content: [{
            type: 'text',
            text: `Could not resolve ${repo}. No flash-config.json found and no .bin assets in releases.`,
        }],
        isError: true,
    };
}

async function handleListChips() {
    const text = CHIPS.map(c =>
        `${c.name} (${c.hexId}): ${c.description}`
    ).join('\n');

    return {
        content: [{
            type: 'text',
            text: `Supported ESP32 chip types:\n\n${text}\n\nDefault flash offset: 0x10000\nDefault NVS offset: 0x9000`,
        }],
    };
}

async function handleListFieldPresets() {
    const lines = [];
    for (const [name, fields] of Object.entries(FieldPresets)) {
        lines.push(`"${name}" expands to:`);
        for (const f of fields) {
            const parts = [`  - ${f.key} (${f.type || 'text'}): "${f.label}"`];
            if (f.required) parts.push(' [required]');
            lines.push(parts.join(''));
        }
        lines.push('');
    }

    lines.push('Usage in flash-config.json:');
    lines.push('  "fields": ["wifi", "device_name", { "key": "custom_key", "label": "Custom Field" }]');

    return {
        content: [{ type: 'text', text: lines.join('\n') }],
    };
}
