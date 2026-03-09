/**
 * Config Schema Tests
 *
 * Run with: node tests/config-schema.test.js
 */

import { normalizeConfig, resolveVariantFirmwareUrl, validateConfig } from '../src/core/config-schema.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`\u2713 ${name}`);
        passed++;
    } catch (e) {
        console.log(`\u2717 ${name}`);
        console.log(`  ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// --- normalizeConfig ---

test('normalizeConfig: v1 with firmware key wraps as single variant', () => {
    const v1 = { name: 'Test', firmware: 'fw.bin', chip: 'esp32s3' };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.version, 2);
    assertEquals(v2.name, 'Test');
    assertEquals(v2.variants.length, 1);
    assertEquals(v2.variants[0].firmware, 'fw.bin');
    assertEquals(v2.variants[0].chip, 'esp32s3');
    assertEquals(v2.variants[0].id, 'default');
});

test('normalizeConfig: v1 with bin key wraps as single variant', () => {
    const v1 = { name: 'Test', bin: 'firmware.bin' };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.variants[0].firmware, 'firmware.bin');
});

test('normalizeConfig: v1 preserves fields', () => {
    const v1 = { name: 'Test', firmware: 'fw.bin', fields: ['wifi', { key: 'name', label: 'Name' }] };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.variants[0].fields.length, 2);
    assertEquals(v2.variants[0].fields[0], 'wifi');
    assertEquals(v2.variants[0].fields[1].key, 'name');
});

test('normalizeConfig: v1 preserves offset values', () => {
    const v1 = { name: 'Test', firmware: 'fw.bin', offset: '0x10000', nvsOffset: '0x9000' };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.variants[0].offset, '0x10000');
    assertEquals(v2.variants[0].nvsOffset, '0x9000');
});

test('normalizeConfig: v1 defaults name to ESP Project', () => {
    const v1 = { firmware: 'fw.bin' };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.name, 'ESP Project');
});

test('normalizeConfig: v1 defaults chip to esp32', () => {
    const v1 = { firmware: 'fw.bin' };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.variants[0].chip, 'esp32');
});

test('normalizeConfig: v2 passes through unchanged', () => {
    const v2Input = {
        version: 2,
        name: 'My Project',
        variants: [{ id: 'a', firmware: 'a.bin', chip: 'esp32' }]
    };
    const result = normalizeConfig(v2Input);

    assertEquals(result, v2Input);
});

test('normalizeConfig: v1 preserves branding if present', () => {
    const v1 = { name: 'Test', firmware: 'fw.bin', branding: { primaryColor: '#ff0000' } };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.branding.primaryColor, '#ff0000');
});

test('normalizeConfig: v1 preserves postFlash if present', () => {
    const v1 = { name: 'Test', firmware: 'fw.bin', postFlash: { title: 'Done!' } };
    const v2 = normalizeConfig(v1);

    assertEquals(v2.postFlash.title, 'Done!');
});

// --- resolveVariantFirmwareUrl ---

test('resolveVariantFirmwareUrl: absolute URL passes through', () => {
    const url = resolveVariantFirmwareUrl(
        { firmware: 'https://example.com/fw.bin' },
        { repo: 'user/repo' }
    );
    assertEquals(url, 'https://example.com/fw.bin');
});

test('resolveVariantFirmwareUrl: relative filename with latest release', () => {
    const url = resolveVariantFirmwareUrl(
        { firmware: 'fw.bin' },
        { repo: 'user/repo', release: 'latest' }
    );
    assertEquals(url, 'https://github.com/user/repo/releases/latest/download/fw.bin');
});

test('resolveVariantFirmwareUrl: relative filename with specific release', () => {
    const url = resolveVariantFirmwareUrl(
        { firmware: 'fw.bin' },
        { repo: 'user/repo', release: 'v1.2.0' }
    );
    assertEquals(url, 'https://github.com/user/repo/releases/download/v1.2.0/fw.bin');
});

test('resolveVariantFirmwareUrl: relative filename without repo returns as-is', () => {
    const url = resolveVariantFirmwareUrl(
        { firmware: 'fw.bin' },
        { name: 'Test' }
    );
    assertEquals(url, 'fw.bin');
});

test('resolveVariantFirmwareUrl: no firmware returns null', () => {
    const url = resolveVariantFirmwareUrl({}, { repo: 'user/repo' });
    assertEquals(url, null);
});

test('resolveVariantFirmwareUrl: defaults release to latest', () => {
    const url = resolveVariantFirmwareUrl(
        { firmware: 'fw.bin' },
        { repo: 'user/repo' }
    );
    assertEquals(url, 'https://github.com/user/repo/releases/latest/download/fw.bin');
});

// --- validateConfig ---

test('validateConfig: valid config passes', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [{ firmware: 'fw.bin', chip: 'esp32' }]
    });
    assert(result.valid, 'Should be valid');
    assertEquals(result.errors.length, 0);
});

test('validateConfig: missing name fails', () => {
    const result = validateConfig({
        variants: [{ firmware: 'fw.bin' }]
    });
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('name')));
});

test('validateConfig: no variants fails', () => {
    const result = validateConfig({ name: 'Test', variants: [] });
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('variant')));
});

test('validateConfig: missing firmware fails', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [{ name: 'Bad', chip: 'esp32' }]
    });
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('firmware')));
});

test('validateConfig: invalid primaryColor fails', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [{ firmware: 'fw.bin' }],
        branding: { primaryColor: 'red' }
    });
    assert(!result.valid);
    assert(result.errors.some(e => e.includes('primaryColor')));
});

test('validateConfig: valid primaryColor passes', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [{ firmware: 'fw.bin' }],
        branding: { primaryColor: '#0071e3' }
    });
    assert(result.valid);
});

test('validateConfig: invalid theme fails', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [{ firmware: 'fw.bin' }],
        branding: { theme: 'blue' }
    });
    assert(!result.valid);
});

test('validateConfig: multiple variants, one missing firmware', () => {
    const result = validateConfig({
        name: 'Test',
        variants: [
            { id: 'a', firmware: 'a.bin' },
            { id: 'b', name: 'Bad' }
        ]
    });
    assert(!result.valid);
    assertEquals(result.errors.length, 1);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
