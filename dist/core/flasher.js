import { DeviceConnection } from "./device-connection.js";
import { FirmwareFlasher } from "./firmware-flasher.js";
import { ConfigStore, expandFieldPresets, flattenConfigSections } from "./config-store.js";
class ESPFlasher extends EventTarget {
  /**
   * @param {FlasherOptions} options
   */
  constructor(options = {}) {
    super();
    this.options = {
      chip: options.chip || null,
      firmwareUrl: options.firmwareUrl || null,
      firmwareOffset: options.firmwareOffset ?? 65536,
      nvsOffset: options.nvsOffset ?? 36864,
      nvsSize: options.nvsSize ?? 24576,
      nvsNamespace: options.nvsNamespace || "config"
    };
    this.device = new DeviceConnection();
    this.firmware = new FirmwareFlasher();
    this.config = new ConfigStore();
    if (options.fields) {
      this.config.setSchema(expandFieldPresets(options.fields));
    } else if (options.configSections) {
      this.config.setSchema(flattenConfigSections(options.configSections));
    }
    this._forward(this.device, ["log", "status", "progress", "error", "connected", "disconnected", "chip-mismatch"]);
    this._forward(this.firmware, ["log", "status", "progress", "error", "complete"]);
    this._forward(this.config, ["change", "schema-changed"]);
  }
  /** Forward events from source to this */
  _forward(source, events) {
    for (const event of events) {
      source.addEventListener(
        event,
        (e) => this.dispatchEvent(new CustomEvent(event, { detail: e.detail }))
      );
    }
  }
  // --- Config ---
  setConfig(values) {
    this.config.setAll(values);
  }
  getConfig() {
    return this.config.getAll();
  }
  getSchema() {
    return this.config.getSchema();
  }
  // --- Connection ---
  async connect() {
    return this.device.connect(this.options.chip, {
      baudrate: 115200,
      timeout: 15e3
    });
  }
  async disconnect() {
    return this.device.disconnect();
  }
  isConnected() {
    return this.device.getIsConnected();
  }
  getDevice() {
    return this.device;
  }
  // --- Flashing ---
  /**
   * Flash firmware and config
   * @param {Object} [opts] - Override options
   */
  async flash(opts = {}) {
    const url = opts.firmwareUrl || this.options.firmwareUrl;
    if (!url && !opts.customFirmware) {
      throw new Error("No firmware URL specified");
    }
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected");
    }
    const nvsData = this.config.toNVS();
    const hasConfig = Object.keys(nvsData).length > 0;
    return this.firmware.flash(this.device, url, {
      customFirmware: opts.customFirmware,
      nvsData: hasConfig ? nvsData : null,
      nvsNamespace: this.options.nvsNamespace,
      nvsOffset: this.options.nvsOffset,
      nvsSize: this.options.nvsSize,
      firmwareOffset: opts.firmwareOffset ?? this.options.firmwareOffset
    });
  }
  /** Flash only NVS config (no firmware) */
  async flashConfig() {
    if (!this.device.getIsConnected()) {
      throw new Error("Not connected");
    }
    const nvsData = this.config.toNVS();
    if (Object.keys(nvsData).length === 0) {
      throw new Error("No config to flash");
    }
    return this.firmware.flashNVS(this.device, nvsData, {
      nvsNamespace: this.options.nvsNamespace,
      nvsOffset: this.options.nvsOffset,
      nvsSize: this.options.nvsSize
    });
  }
  /** Hard reset device */
  async reset() {
    return this.device.hardReset();
  }
  /** Clean up */
  dispose() {
    if (this.device.getIsConnected()) {
      this.device.disconnect().catch(() => {
      });
    }
  }
}
async function flashDevice(options) {
  const {
    firmware,
    config,
    chip,
    onProgress,
    onLog,
    firmwareOffset = 65536,
    nvsOffset = 36864
  } = options;
  if (!firmware) {
    throw new Error("firmware URL is required");
  }
  const flasher = new ESPFlasher({
    chip,
    firmwareUrl: firmware,
    firmwareOffset,
    nvsOffset
  });
  if (onProgress) {
    flasher.addEventListener("progress", (e) => onProgress(e.detail.percent));
  }
  if (onLog) {
    flasher.addEventListener("log", (e) => onLog(e.detail.message, e.detail.level));
  }
  try {
    const deviceInfo = await flasher.connect();
    if (config && Object.keys(config).length > 0) {
      flasher.setConfig(config);
    }
    await flasher.flash();
    await flasher.reset();
    return deviceInfo;
  } finally {
    flasher.dispose();
  }
}
import { DeviceConnection as DeviceConnection2 } from "./device-connection.js";
import { FirmwareFlasher as FirmwareFlasher2 } from "./firmware-flasher.js";
import { NVSGenerator } from "./nvs-generator.js";
import { ConfigStore as ConfigStore2, FieldPresets, expandFieldPresets as expandFieldPresets2 } from "./config-store.js";
export {
  ConfigStore2 as ConfigStore,
  DeviceConnection2 as DeviceConnection,
  ESPFlasher,
  FieldPresets,
  FirmwareFlasher2 as FirmwareFlasher,
  NVSGenerator,
  expandFieldPresets2 as expandFieldPresets,
  flashDevice
};
//# sourceMappingURL=flasher.js.map
