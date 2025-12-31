import { DeviceConnection } from "./device-connection.js";
import { FirmwareFlasher } from "./firmware-flasher.js";
import { ConfigStore, expandFieldPresets, flattenConfigSections } from "./config-store.js";
class ESPFlasher extends EventTarget {
  /**
   * @param {ESPFlasherOptions} options
   */
  constructor(options = {}) {
    super();
    this.options = {
      chip: options.chip || null,
      firmwareUrl: options.firmwareUrl || null,
      firmwareOffset: options.firmwareOffset ?? 0,
      nvsOffset: options.nvsOffset ?? 36864,
      nvsSize: options.nvsSize ?? 24576,
      nvsNamespace: options.nvsNamespace || "config",
      baudrate: options.baudrate || 115200,
      timeout: options.timeout || 15e3,
      validateOnFlash: options.validateOnFlash !== false
    };
    this.device = new DeviceConnection();
    this.flasher = new FirmwareFlasher();
    this.config = new ConfigStore();
    this._state = {
      status: "idle",
      progress: 0,
      error: null,
      canRetry: false,
      lastOperation: null,
      lastOperationOptions: null
    };
    this._forwardedListeners = [];
    if (options.configSections) {
      const fields = flattenConfigSections(options.configSections);
      this.config.setSchema(fields);
    } else if (options.fields) {
      const fields = expandFieldPresets(options.fields);
      this.config.setSchema(fields);
    }
    this._setupEventForwarding();
  }
  /**
   * Set up event forwarding with cleanup tracking
   * @private
   */
  _setupEventForwarding() {
    this._forwardEvents(this.device, ["log", "status", "progress", "error", "connected", "disconnected", "chip-mismatch"]);
    this._forwardEvents(this.flasher, ["log", "status", "progress", "error", "complete"]);
    this._forwardEvents(this.config, ["change", "schema-changed"]);
  }
  /**
   * Forward events from a component with cleanup tracking
   * @private
   */
  _forwardEvents(source, events) {
    events.forEach((event) => {
      const handler = (e) => {
        this._updateStateFromEvent(event, e.detail);
        this.dispatchEvent(new CustomEvent(event, { detail: e.detail }));
      };
      source.addEventListener(event, handler);
      this._forwardedListeners.push({ source, event, handler });
    });
  }
  /**
   * Update internal state based on events
   * @private
   */
  _updateStateFromEvent(event, detail) {
    switch (event) {
      case "status":
        this._state.status = detail.state;
        if (detail.state === "error") {
          this._state.error = detail.message;
          this._state.canRetry = true;
        } else if (detail.state === "complete") {
          this._state.canRetry = false;
        }
        break;
      case "progress":
        this._state.progress = detail.percent;
        break;
      case "error":
        this._state.status = "error";
        this._state.error = detail.message;
        this._state.canRetry = this._isRetryableError(detail.error);
        break;
      case "connected":
        this._state.status = "connected";
        this._state.error = null;
        break;
      case "complete":
        this._state.status = "complete";
        this._state.progress = 100;
        break;
    }
  }
  /**
   * Check if an error is retryable
   * @private
   */
  _isRetryableError(error) {
    if (!error) return false;
    const message = error.message || "";
    return message.includes("timeout") || message.includes("network") || message.includes("disconnect") || message.includes("fetch") || message.includes("Download failed");
  }
  /**
   * Get current flash state
   * @returns {FlashState}
   */
  getState() {
    return { ...this._state };
  }
  /**
   * Retry the last failed operation
   * @returns {Promise<boolean>}
   */
  async retry() {
    if (!this._state.canRetry || !this._state.lastOperation) {
      throw new Error("No operation to retry");
    }
    const { lastOperation, lastOperationOptions } = this._state;
    this._state.error = null;
    this._state.canRetry = false;
    if (lastOperation === "connect") {
      return this.connect();
    } else if (lastOperation === "flash") {
      return this.flash(lastOperationOptions);
    } else if (lastOperation === "flashConfig") {
      return this.flashConfig();
    }
    throw new Error(`Unknown operation: ${lastOperation}`);
  }
  /**
   * Emit a typed event
   * @private
   */
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  /**
   * Clean up all event listeners and resources
   * Call this when disposing of the flasher instance
   */
  dispose() {
    for (const { source, event, handler } of this._forwardedListeners) {
      source.removeEventListener(event, handler);
    }
    this._forwardedListeners = [];
    if (this.device.getIsConnected()) {
      this.device.disconnect().catch(() => {
      });
    }
    this._state = {
      status: "idle",
      progress: 0,
      error: null,
      canRetry: false,
      lastOperation: null,
      lastOperationOptions: null
    };
  }
  /**
   * Set configuration values
   * @param {Object} values - Key-value pairs
   * @param {Object} [options] - Options
   * @param {boolean} [options.validate=true] - Emit warnings for unknown keys
   */
  setConfig(values, options = {}) {
    const { validate = true } = options;
    if (validate && this.config.getSchema()) {
      for (const key of Object.keys(values)) {
        if (!this.config.hasField(key)) {
          this.emit("log", {
            message: `Unknown config key "${key}" - not in schema. This may not be saved to NVS correctly.`,
            level: "warning"
          });
        }
      }
    }
    this.config.setAll(values);
  }
  /**
   * Validate current configuration
   * @returns {import('./config-store.js').ValidationResult}
   */
  validateConfig() {
    return this.config.validate();
  }
  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return this.config.getAll();
  }
  /**
   * Get config field schema
   * @returns {Array|null}
   */
  getSchema() {
    return this.config.getSchema();
  }
  /**
   * Connect to ESP device
   * @returns {Promise<{chipType: string, macAddr: string}>}
   */
  async connect() {
    this._state.lastOperation = "connect";
    this._state.lastOperationOptions = null;
    this._state.status = "connecting";
    try {
      const result = await this.device.connect(this.options.chip, {
        baudrate: this.options.baudrate,
        timeout: this.options.timeout
      });
      this._state.canRetry = false;
      return result;
    } catch (error) {
      this._state.canRetry = this._isRetryableError(error);
      throw error;
    }
  }
  /**
   * Disconnect from device
   */
  async disconnect() {
    return this.device.disconnect();
  }
  /**
   * Cancel in-progress connection
   */
  cancelConnection() {
    this.device.cancel();
  }
  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.device.getIsConnected();
  }
  /**
   * Flash firmware (and NVS config if set)
   * @param {Object} [options] - Override options
   * @param {boolean} [options.skipValidation] - Skip config validation
   * @returns {Promise<boolean>}
   */
  async flash(options = {}) {
    this._state.lastOperation = "flash";
    this._state.lastOperationOptions = options;
    this._state.progress = 0;
    const firmwareUrl = options.firmwareUrl || this.options.firmwareUrl;
    if (!firmwareUrl && !options.customFirmware) {
      throw new Error("No firmware URL specified");
    }
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected to device. Call connect() first.");
    }
    if (this.options.validateOnFlash && !options.skipValidation) {
      const validation = this.config.validate();
      if (!validation.valid) {
        const errorMessages = Object.values(validation.errors);
        this.emit("log", {
          message: `Config validation failed: ${errorMessages.join(", ")}`,
          level: "error"
        });
        this.emit("validation-failed", {
          validation,
          errors: validation.errors,
          missing: validation.missing
        });
        throw new Error(`Configuration validation failed: ${validation.missing.join(", ")} required`);
      }
    }
    const nvsData = this.config.toNVS();
    const hasConfig = Object.keys(nvsData).length > 0;
    try {
      const result = await this.flasher.flash(this.device, firmwareUrl, {
        customFirmware: options.customFirmware,
        nvsData: hasConfig ? nvsData : null,
        nvsNamespace: this.options.nvsNamespace,
        nvsOffset: this.options.nvsOffset,
        nvsSize: this.options.nvsSize,
        firmwareOffset: options.firmwareOffset ?? this.options.firmwareOffset
      });
      this._state.canRetry = false;
      return result;
    } catch (error) {
      this._state.canRetry = this._isRetryableError(error);
      throw error;
    }
  }
  /**
   * Flash only NVS configuration (without firmware)
   * @param {Object} [options] - Options
   * @param {boolean} [options.skipValidation] - Skip config validation
   * @returns {Promise<boolean>}
   */
  async flashConfig(options = {}) {
    this._state.lastOperation = "flashConfig";
    this._state.lastOperationOptions = options;
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected to device. Call connect() first.");
    }
    if (this.options.validateOnFlash && !options.skipValidation) {
      const validation = this.config.validate();
      if (!validation.valid) {
        this.emit("validation-failed", {
          validation,
          errors: validation.errors,
          missing: validation.missing
        });
        throw new Error(`Configuration validation failed: ${validation.missing.join(", ")} required`);
      }
    }
    const nvsData = this.config.toNVS();
    if (Object.keys(nvsData).length === 0) {
      throw new Error("No configuration to flash");
    }
    try {
      const result = await this.flasher.flashNVS(this.device, nvsData, {
        nvsNamespace: this.options.nvsNamespace,
        nvsOffset: this.options.nvsOffset,
        nvsSize: this.options.nvsSize
      });
      this._state.canRetry = false;
      return result;
    } catch (error) {
      this._state.canRetry = this._isRetryableError(error);
      throw error;
    }
  }
  /**
   * Hard reset the device
   */
  async reset() {
    return this.device.hardReset();
  }
  /**
   * Get the underlying device connection (for advanced usage)
   * @returns {DeviceConnection}
   */
  getDevice() {
    return this.device;
  }
}
import { DeviceConnection as DeviceConnection2 } from "./device-connection.js";
import { FirmwareFlasher as FirmwareFlasher2 } from "./firmware-flasher.js";
import { ConfigStore as ConfigStore2, FieldPresets, expandFieldPresets as expandFieldPresets2 } from "./config-store.js";
import { NVSGenerator } from "./nvs-generator.js";
import { PartitionTableGenerator } from "./partition-table-generator.js";
export {
  ConfigStore2 as ConfigStore,
  DeviceConnection2 as DeviceConnection,
  ESPFlasher,
  FieldPresets,
  FirmwareFlasher2 as FirmwareFlasher,
  NVSGenerator,
  PartitionTableGenerator,
  expandFieldPresets2 as expandFieldPresets
};
//# sourceMappingURL=flasher.js.map
