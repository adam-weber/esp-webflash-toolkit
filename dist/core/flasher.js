import { DeviceConnection } from "./device-connection.js";
import { FirmwareFlasher } from "./firmware-flasher.js";
import { ConfigStore, expandFieldPresets } from "./config-store.js";
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
      timeout: options.timeout || 15e3
    };
    this.device = new DeviceConnection();
    this.flasher = new FirmwareFlasher();
    this.config = new ConfigStore();
    if (options.fields) {
      const fields = expandFieldPresets(options.fields);
      this.config.setSchema(fields);
    }
    this.forwardEvents(this.device, ["log", "status", "progress", "error", "connected", "disconnected", "chip-mismatch"]);
    this.forwardEvents(this.flasher, ["log", "status", "progress", "error", "complete"]);
    this.forwardEvents(this.config, ["change", "schema-changed"]);
  }
  /**
   * Forward events from a component to this orchestrator
   * @private
   */
  forwardEvents(source, events) {
    events.forEach((event) => {
      source.addEventListener(event, (e) => {
        this.dispatchEvent(new CustomEvent(event, { detail: e.detail }));
      });
    });
  }
  /**
   * Emit a typed event
   * @private
   */
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  /**
   * Set configuration values
   * @param {Object} values - Key-value pairs
   */
  setConfig(values) {
    this.config.setAll(values);
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
    return this.device.connect(this.options.chip, {
      baudrate: this.options.baudrate,
      timeout: this.options.timeout
    });
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
   * @returns {Promise<boolean>}
   */
  async flash(options = {}) {
    const firmwareUrl = options.firmwareUrl || this.options.firmwareUrl;
    if (!firmwareUrl && !options.customFirmware) {
      throw new Error("No firmware URL specified");
    }
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected to device");
    }
    const nvsData = this.config.toNVS();
    const hasConfig = Object.keys(nvsData).length > 0;
    return this.flasher.flash(this.device, firmwareUrl, {
      customFirmware: options.customFirmware,
      nvsData: hasConfig ? nvsData : null,
      nvsNamespace: this.options.nvsNamespace,
      nvsOffset: this.options.nvsOffset,
      nvsSize: this.options.nvsSize,
      firmwareOffset: options.firmwareOffset ?? this.options.firmwareOffset
    });
  }
  /**
   * Flash only NVS configuration (without firmware)
   * @returns {Promise<boolean>}
   */
  async flashConfig() {
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected to device");
    }
    const nvsData = this.config.toNVS();
    if (Object.keys(nvsData).length === 0) {
      throw new Error("No configuration to flash");
    }
    return this.flasher.flashNVS(this.device, nvsData, {
      nvsNamespace: this.options.nvsNamespace,
      nvsOffset: this.options.nvsOffset,
      nvsSize: this.options.nvsSize
    });
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
