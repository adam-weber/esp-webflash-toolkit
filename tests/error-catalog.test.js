/**
 * Error Catalog Tests
 *
 * Run with: node tests/error-catalog.test.js
 */

import { classifyError, isBrowserSupported, isMobile } from '../src/core/error-catalog.js';

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

// --- classifyError ---

test('classifies connection timeout', () => {
    const result = classifyError('Connection timeout - device not responding');
    assertEquals(result.type, 'connection_timeout');
    assertEquals(result.title, 'Connection Timed Out');
    assert(result.steps.length > 0, 'Should have recovery steps');
});

test('classifies timeout from Error object', () => {
    const result = classifyError(new Error('Connection timed out'));
    assertEquals(result.type, 'connection_timeout');
});

test('classifies port in use', () => {
    const result = classifyError('Failed to open serial port');
    assertEquals(result.type, 'port_in_use');
    assertEquals(result.title, 'Port In Use');
});

test('classifies download failure', () => {
    const result = classifyError('Download failed: 404 Not Found');
    assertEquals(result.type, 'download_failed');
});

test('classifies CORS error as download failure', () => {
    const result = classifyError('CORS error: request blocked');
    assertEquals(result.type, 'download_failed');
});

test('classifies write failure', () => {
    const result = classifyError('Flash write failed at address 0x10000');
    assertEquals(result.type, 'write_failed');
});

test('classifies disconnection during flash', () => {
    const result = classifyError('Device disconnected unexpectedly');
    assertEquals(result.type, 'disconnected_during_flash');
});

test('classifies chip mismatch', () => {
    const result = classifyError('Chip mismatch: expected ESP32-S3, got ESP32');
    assertEquals(result.type, 'chip_mismatch');
});

test('classifies no port selected', () => {
    const result = classifyError('No port selected');
    assertEquals(result.type, 'no_port_selected');
});

test('unknown error returns generic recovery', () => {
    const result = classifyError('Something completely unexpected happened');
    assertEquals(result.type, 'unknown');
    assertEquals(result.title, 'Something Went Wrong');
    assert(result.steps.length > 0);
});

test('includes chip-specific BOOT instructions for esp32s3', () => {
    const result = classifyError('Connection timeout', { chip: 'esp32s3' });
    assert(result.steps.some(s => s.includes('BOOT')), 'Should include BOOT instructions');
    assert(result.steps.some(s => s.includes('RST')), 'ESP32-S3 should mention RST');
});

test('includes chip-specific BOOT instructions for esp8266', () => {
    const result = classifyError('Connection timeout', { chip: 'esp8266' });
    assert(result.steps.some(s => s.includes('GPIO0')), 'ESP8266 should mention GPIO0');
});

test('handles chip with dashes in name', () => {
    const result = classifyError('Connection timeout', { chip: 'ESP32-C3' });
    assertEquals(result.type, 'connection_timeout');
    assert(result.steps.some(s => s.includes('USB-JTAG')), 'ESP32-C3 should mention USB-JTAG');
});

test('classifies string error', () => {
    const result = classifyError('timeout');
    assertEquals(result.type, 'connection_timeout');
});

test('handles null/undefined error gracefully', () => {
    const result = classifyError(null);
    assertEquals(result.type, 'unknown');
});

// --- isBrowserSupported ---

test('isBrowserSupported returns object with supported and reason', () => {
    const result = isBrowserSupported();
    assert(typeof result.supported === 'boolean');
    // In Node.js, navigator is undefined, so it should return unsupported
    assertEquals(result.supported, false);
    assert(result.reason !== null);
});

// --- isMobile ---

test('isMobile returns false in Node.js', () => {
    assertEquals(isMobile(), false);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
