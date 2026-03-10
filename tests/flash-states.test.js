/**
 * Flash States Tests
 *
 * Run with: node tests/flash-states.test.js
 */

import { FlashStates, FlashStateLabels, FlashStateMachine, VALID_TRANSITIONS } from '../src/core/flash-states.js';

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

// --- FlashStates constants ---

test('FlashStates has all required states', () => {
    const expected = ['IDLE', 'READY', 'CONNECTING', 'CONNECTED', 'DOWNLOADING', 'GENERATING', 'WRITING', 'VERIFYING', 'COMPLETE', 'ERROR'];
    for (const state of expected) {
        assert(FlashStates[state] !== undefined, `Missing state: ${state}`);
    }
});

test('FlashStateLabels has labels for all states', () => {
    for (const key of Object.keys(FlashStates)) {
        const state = FlashStates[key];
        assert(FlashStateLabels[state] !== undefined, `Missing label for state: ${state}`);
    }
});

test('VALID_TRANSITIONS has entries for all states', () => {
    for (const key of Object.keys(FlashStates)) {
        const state = FlashStates[key];
        assert(VALID_TRANSITIONS[state] !== undefined, `Missing transitions for state: ${state}`);
    }
});

// --- FlashStateMachine ---

test('starts in IDLE state', () => {
    const sm = new FlashStateMachine();
    assertEquals(sm.state, FlashStates.IDLE);
});

test('label returns human-readable text', () => {
    const sm = new FlashStateMachine();
    assertEquals(sm.label, 'Idle');
});

test('valid transition succeeds', () => {
    const sm = new FlashStateMachine();
    const result = sm.transition(FlashStates.CONNECTING);
    assert(result, 'Transition should succeed');
    assertEquals(sm.state, FlashStates.CONNECTING);
});

test('invalid transition fails silently', () => {
    const sm = new FlashStateMachine();
    const result = sm.transition(FlashStates.COMPLETE);
    assert(!result, 'Transition should fail');
    assertEquals(sm.state, FlashStates.IDLE);
});

test('transition emits state-change event', () => {
    const sm = new FlashStateMachine();
    let eventDetail = null;
    sm.addEventListener('state-change', (e) => {
        eventDetail = e.detail;
    });

    sm.transition(FlashStates.CONNECTING);

    assert(eventDetail !== null, 'Event should have been emitted');
    assertEquals(eventDetail.from, FlashStates.IDLE);
    assertEquals(eventDetail.to, FlashStates.CONNECTING);
    assertEquals(eventDetail.label, FlashStateLabels[FlashStates.CONNECTING]);
});

test('failed transition does not emit event', () => {
    const sm = new FlashStateMachine();
    let eventFired = false;
    sm.addEventListener('state-change', () => {
        eventFired = true;
    });

    sm.transition(FlashStates.COMPLETE);
    assert(!eventFired, 'Event should not fire on invalid transition');
});

test('full happy path: IDLE → CONNECTING → CONNECTED → DOWNLOADING → WRITING → COMPLETE', () => {
    const sm = new FlashStateMachine();
    const states = [];

    sm.addEventListener('state-change', (e) => {
        states.push(e.detail.to);
    });

    assert(sm.transition(FlashStates.CONNECTING));
    assert(sm.transition(FlashStates.CONNECTED));
    assert(sm.transition(FlashStates.DOWNLOADING));
    assert(sm.transition(FlashStates.WRITING));
    assert(sm.transition(FlashStates.COMPLETE));

    assertEquals(states.length, 5);
    assertEquals(sm.state, FlashStates.COMPLETE);
});

test('error transition from any active state', () => {
    const activeStates = [FlashStates.CONNECTING, FlashStates.CONNECTED, FlashStates.DOWNLOADING, FlashStates.WRITING];

    for (const state of activeStates) {
        const sm = new FlashStateMachine();
        sm.force(state);
        const result = sm.transition(FlashStates.ERROR);
        assert(result, `Should transition to ERROR from ${state}`);
    }
});

test('reset returns to IDLE', () => {
    const sm = new FlashStateMachine();
    sm.transition(FlashStates.CONNECTING);
    sm.reset();
    assertEquals(sm.state, FlashStates.IDLE);
});

test('force transition skips validation', () => {
    const sm = new FlashStateMachine();
    sm.force(FlashStates.COMPLETE);
    assertEquals(sm.state, FlashStates.COMPLETE);
});

test('force emits state-change event', () => {
    const sm = new FlashStateMachine();
    let eventDetail = null;
    sm.addEventListener('state-change', (e) => {
        eventDetail = e.detail;
    });

    sm.force(FlashStates.WRITING);
    assert(eventDetail !== null);
    assertEquals(eventDetail.from, FlashStates.IDLE);
    assertEquals(eventDetail.to, FlashStates.WRITING);
});

test('can recover from ERROR to CONNECTING', () => {
    const sm = new FlashStateMachine();
    sm.force(FlashStates.ERROR);
    const result = sm.transition(FlashStates.CONNECTING);
    assert(result, 'Should allow retry from ERROR');
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
