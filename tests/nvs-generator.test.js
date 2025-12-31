/**
 * NVS Generator Tests
 *
 * Run with: node tests/nvs-generator.test.js
 */

import { NVSGenerator } from '../src/core/nvs-generator.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`✗ ${name}`);
        console.log(`  ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Tests

test('generates valid NVS binary with correct size', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { wifi_ssid: 'test' } }, 0x6000);

    assertEquals(binary.length, 0x6000, 'Binary size should match partition size');
});

test('generates binary filled with 0xFF initially', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: {} }, 0x6000);

    // Check that unused area is 0xFF
    let allFF = true;
    for (let i = 100; i < 1000; i++) {
        if (binary[i] !== 0xFF) {
            allFF = false;
            break;
        }
    }
    assert(allFF, 'Unused area should be 0xFF');
});

test('stores string values correctly', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { wifi_ssid: 'TestNetwork' } }, 0x6000);

    // Parse it back and verify
    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.wifi_ssid, 'TestNetwork', 'Should parse back the same value');
});

test('stores numeric values correctly', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { port: 8080 } }, 0x6000);

    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.port, 8080, 'Should parse back numeric value');
});

test('handles multiple namespaces', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({
        config: { wifi_ssid: 'Test' },
        settings: { debug: 1 }
    }, 0x6000);

    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.wifi_ssid, 'Test');
    assertEquals(parsed.settings?.debug, 1);
});

test('handles long strings (multi-entry span)', () => {
    const generator = new NVSGenerator();
    const longString = 'A'.repeat(100); // 100 chars = spans multiple entries
    const binary = generator.generate({ config: { data: longString } }, 0x6000);

    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.data, longString, 'Should handle long strings');
});

test('handles empty strings', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { empty: '' } }, 0x6000);

    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.empty, '', 'Should handle empty strings');
});

test('handles special characters in strings', () => {
    const generator = new NVSGenerator();
    const special = 'Test@123!#$%';
    const binary = generator.generate({ config: { pass: special } }, 0x6000);

    const parsed = generator.parse(binary);
    assertEquals(parsed.config?.pass, special, 'Should handle special characters');
});

test('page header has correct state', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { test: 'value' } }, 0x6000);

    // Page state at offset 0 should be ACTIVE (0xFFFFFFFE)
    const view = new DataView(binary.buffer);
    const pageState = view.getUint32(0, true);
    assertEquals(pageState, 0xFFFFFFFE, 'Page state should be ACTIVE');
});

test('CRC32 is calculated for entries', () => {
    const generator = new NVSGenerator();
    const binary = generator.generate({ config: { test: 'value' } }, 0x6000);

    // Entry CRC is at offset 32 + 4 (first entry after header, CRC field)
    // Just verify it's not 0xFFFFFFFF (uninitialized)
    const view = new DataView(binary.buffer);
    const entryCrc = view.getUint32(32 + 32 + 4, true); // Skip header + bitmap entry
    assert(entryCrc !== 0xFFFFFFFF, 'Entry CRC should be calculated');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
