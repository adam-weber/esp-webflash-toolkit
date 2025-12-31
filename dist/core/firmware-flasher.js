import { NVSGenerator } from "./nvs-generator.js";
class FirmwareFlasher extends EventTarget {
  constructor() {
    super();
  }
  /**
   * Emit a typed event
   * @private
   */
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  /**
   * Flash firmware to device
   * @param {DeviceConnection} device - Connected device
   * @param {string} firmwareUrl - URL to download firmware from
   * @param {FlashOptions} [options] - Flash options
   */
  async flash(device, firmwareUrl, options = {}) {
    const {
      customFirmware,
      nvsData,
      nvsNamespace = "config",
      nvsOffset = 36864,
      nvsSize = 24576,
      firmwareOffset = 0
    } = options;
    try {
      this.emit("status", { state: "downloading", message: "Preparing firmware..." });
      this.emit("log", { message: "Starting flash process...", level: "info" });
      let firmwareData;
      if (customFirmware) {
        this.emit("log", { message: `Using custom firmware: ${customFirmware.name || "blob"}`, level: "info" });
        firmwareData = await customFirmware.arrayBuffer();
      } else {
        this.emit("log", { message: `Downloading from: ${firmwareUrl}`, level: "info" });
        this.emit("status", { state: "downloading", message: "Downloading firmware..." });
        const response = await fetch(firmwareUrl);
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        firmwareData = await response.arrayBuffer();
      }
      const firmwareBytes = new Uint8Array(firmwareData);
      this.emit("log", { message: `Firmware size: ${(firmwareBytes.length / 1024).toFixed(1)} KB`, level: "success" });
      const files = [];
      if (nvsData && Object.keys(nvsData).length > 0) {
        this.emit("status", { state: "generating", message: "Generating NVS partition..." });
        this.emit("log", { message: "Generating NVS partition...", level: "info" });
        const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);
        files.push({
          data: nvsBytes,
          address: nvsOffset
        });
        this.emit("log", {
          message: `NVS: ${nvsBytes.length} bytes at 0x${nvsOffset.toString(16)}`,
          level: "info"
        });
      }
      files.push({
        data: firmwareBytes,
        address: firmwareOffset
      });
      this.emit("log", {
        message: `Firmware: ${firmwareBytes.length} bytes at 0x${firmwareOffset.toString(16)}`,
        level: "info"
      });
      this.emit("status", { state: "flashing", message: "Writing to flash..." });
      this.emit("log", { message: "Writing to flash...", level: "info" });
      await device.writeFlash(files, (percent, written, total) => {
        this.emit("progress", { percent, written, total });
      });
      this.emit("status", { state: "complete", message: "Flash complete!" });
      this.emit("log", { message: "Flash completed successfully", level: "success" });
      this.emit("complete", {});
      return true;
    } catch (error) {
      this.emit("error", { error, message: error.message });
      this.emit("log", { message: `Flash failed: ${error.message}`, level: "error" });
      throw error;
    }
  }
  /**
   * Generate NVS partition binary
   * @param {Object} data - Key-value pairs
   * @param {string} namespace - NVS namespace
   * @param {number} size - Partition size
   * @returns {Uint8Array}
   */
  generateNVS(data, namespace = "config", size = 24576) {
    const generator = new NVSGenerator();
    const nvsData = { [namespace]: data };
    return generator.generate(nvsData, size);
  }
  /**
   * Flash only NVS configuration (without firmware)
   * @param {DeviceConnection} device - Connected device
   * @param {Object} nvsData - Key-value pairs
   * @param {Object} [options] - Options
   */
  async flashNVS(device, nvsData, options = {}) {
    const {
      nvsNamespace = "config",
      nvsOffset = 36864,
      nvsSize = 24576
    } = options;
    try {
      this.emit("status", { state: "generating", message: "Generating NVS..." });
      this.emit("log", { message: "Generating NVS partition...", level: "info" });
      const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);
      const keys = Object.keys(nvsData);
      this.emit("log", { message: `NVS keys: ${keys.join(", ")}`, level: "info" });
      this.emit("status", { state: "flashing", message: "Writing config..." });
      this.emit("log", { message: `Writing ${nvsBytes.length} bytes to 0x${nvsOffset.toString(16)}...`, level: "info" });
      await device.writeFlash([{ data: nvsBytes, address: nvsOffset }], (percent) => {
        this.emit("progress", { percent });
      });
      this.emit("status", { state: "complete", message: "Config written!" });
      this.emit("log", { message: `Wrote ${keys.length} config values`, level: "success" });
      this.emit("complete", {});
      return true;
    } catch (error) {
      this.emit("error", { error, message: error.message });
      this.emit("log", { message: `Config write failed: ${error.message}`, level: "error" });
      throw error;
    }
  }
}
export {
  FirmwareFlasher
};
//# sourceMappingURL=firmware-flasher.js.map
