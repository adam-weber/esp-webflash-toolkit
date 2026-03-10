const FlashStates = {
  IDLE: "idle",
  READY: "ready",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DOWNLOADING: "downloading",
  GENERATING: "generating",
  WRITING: "writing",
  VERIFYING: "verifying",
  COMPLETE: "complete",
  ERROR: "error"
};
const FlashStateLabels = {
  [FlashStates.IDLE]: "Idle",
  [FlashStates.READY]: "Ready",
  [FlashStates.CONNECTING]: "Connecting...",
  [FlashStates.CONNECTED]: "Connected",
  [FlashStates.DOWNLOADING]: "Downloading firmware...",
  [FlashStates.GENERATING]: "Generating config...",
  [FlashStates.WRITING]: "Writing to device...",
  [FlashStates.VERIFYING]: "Verifying...",
  [FlashStates.COMPLETE]: "Complete",
  [FlashStates.ERROR]: "Error"
};
const VALID_TRANSITIONS = {
  [FlashStates.IDLE]: [FlashStates.READY, FlashStates.CONNECTING, FlashStates.ERROR],
  [FlashStates.READY]: [FlashStates.CONNECTING, FlashStates.ERROR],
  [FlashStates.CONNECTING]: [FlashStates.CONNECTED, FlashStates.ERROR, FlashStates.IDLE],
  [FlashStates.CONNECTED]: [FlashStates.DOWNLOADING, FlashStates.GENERATING, FlashStates.WRITING, FlashStates.ERROR, FlashStates.IDLE],
  [FlashStates.DOWNLOADING]: [FlashStates.GENERATING, FlashStates.WRITING, FlashStates.ERROR],
  [FlashStates.GENERATING]: [FlashStates.WRITING, FlashStates.ERROR],
  [FlashStates.WRITING]: [FlashStates.VERIFYING, FlashStates.COMPLETE, FlashStates.ERROR],
  [FlashStates.VERIFYING]: [FlashStates.COMPLETE, FlashStates.ERROR],
  [FlashStates.COMPLETE]: [FlashStates.IDLE, FlashStates.READY, FlashStates.CONNECTING],
  [FlashStates.ERROR]: [FlashStates.IDLE, FlashStates.READY, FlashStates.CONNECTING]
};
class FlashStateMachine extends EventTarget {
  constructor() {
    super();
    this._state = FlashStates.IDLE;
  }
  /** @returns {string} Current state */
  get state() {
    return this._state;
  }
  /** @returns {string} Human-readable label for current state */
  get label() {
    return FlashStateLabels[this._state] || this._state;
  }
  /**
   * Transition to a new state.
   * @param {string} newState - Target state from FlashStates
   * @returns {boolean} Whether the transition was valid
   */
  transition(newState) {
    const valid = VALID_TRANSITIONS[this._state];
    if (!valid || !valid.includes(newState)) {
      return false;
    }
    const from = this._state;
    this._state = newState;
    this.dispatchEvent(new CustomEvent("state-change", {
      detail: {
        from,
        to: newState,
        label: FlashStateLabels[newState] || newState
      }
    }));
    return true;
  }
  /**
   * Force transition (skips validation). Use for error recovery.
   * @param {string} newState
   */
  force(newState) {
    const from = this._state;
    this._state = newState;
    this.dispatchEvent(new CustomEvent("state-change", {
      detail: {
        from,
        to: newState,
        label: FlashStateLabels[newState] || newState
      }
    }));
  }
  /**
   * Reset to IDLE state.
   */
  reset() {
    this.force(FlashStates.IDLE);
  }
}
export {
  FlashStateLabels,
  FlashStateMachine,
  FlashStates,
  VALID_TRANSITIONS
};
//# sourceMappingURL=flash-states.js.map
