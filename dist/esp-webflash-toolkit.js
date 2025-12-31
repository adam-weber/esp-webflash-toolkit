var ESPWebFlash = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/core/index.js
  var index_exports = {};
  __export(index_exports, {
    ConfigStore: () => ConfigStore,
    DeviceConnection: () => DeviceConnection,
    ESPFlasher: () => ESPFlasher,
    FieldPresets: () => FieldPresets,
    FirmwareFlasher: () => FirmwareFlasher,
    NVSGenerator: () => NVSGenerator,
    expandFieldPresets: () => expandFieldPresets,
    flashDevice: () => flashDevice
  });

  // src/core/device-connection.js
  var DeviceConnection = class extends EventTarget {
    constructor() {
      super();
      this.transport = null;
      this.espStub = null;
      this.isConnected = false;
      this.abortController = null;
    }
    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    /**
     * Connect to an ESP device
     * @param {string} expectedChip - Expected chip type (e.g., 'esp32s3')
     * @param {ConnectionOptions} [options] - Connection options
     * @returns {Promise<{chipType: string, macAddr: string}>}
     */
    async connect(expectedChip, options = {}) {
      if (this.transport || this.isConnected) {
        this.emit("log", { message: "Cleaning up previous connection...", level: "warning" });
        await this.disconnect();
      }
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      const timeout = options.timeout || 15e3;
      const baudrate = options.baudrate || 115200;
      try {
        let port = options.port;
        if (!port) {
          this.emit("status", { state: "connecting", message: "Select your device" });
          this.emit("log", { message: "Requesting serial port...", level: "info" });
          port = await navigator.serial.requestPort();
        }
        if (signal.aborted) {
          throw new Error("Connection cancelled");
        }
        this.emit("status", { state: "connecting", message: "Opening port..." });
        this.emit("log", { message: "Opening serial port...", level: "info" });
        const { Transport, ESPLoader } = await import("https://unpkg.com/esptool-js@0.4.5/bundle.js");
        if (signal.aborted) {
          throw new Error("Connection cancelled");
        }
        this.transport = new Transport(port, true);
        this.emit("status", { state: "connecting", message: "Detecting chip..." });
        this.emit("log", { message: "Initializing esptool...", level: "info" });
        this.espStub = new ESPLoader({
          transport: this.transport,
          baudrate,
          terminal: {
            clean: () => {
            },
            writeLine: (data) => this.emit("log", { message: data, level: "debug" }),
            write: (data) => this.emit("log", { message: data, level: "debug" })
          }
        });
        const chipType = await Promise.race([
          this.espStub.main(),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error("Connection timeout - device not responding")), timeout)
          ),
          new Promise(
            (_, reject) => signal.addEventListener("abort", () => reject(new Error("Connection cancelled")))
          )
        ]);
        this.emit("log", { message: `Chip detected: ${chipType}`, level: "info" });
        let macAddr = null;
        if (this.espStub.chip?.macAddr) {
          macAddr = this.espStub.chip.macAddr();
          this.emit("log", { message: `MAC Address: ${macAddr}`, level: "info" });
        }
        if (expectedChip && chipType && !options.skipChipCheck) {
          const expected = expectedChip.toUpperCase().replace("ESP32-", "ESP32").replace("ESP32", "");
          const detected = chipType.toUpperCase().replace("ESP32-", "ESP32").replace("ESP32", "");
          const isMatch = detected.includes(expected) || expected.includes(detected.split(" ")[0]);
          if (!isMatch) {
            const shouldProceed = await this.handleChipMismatch(expected, detected);
            if (!shouldProceed) {
              await this.disconnect();
              throw new Error(`Chip mismatch: expected ${expected}, detected ${detected}`);
            }
            this.emit("log", { message: `Proceeding with ${chipType} (user override)`, level: "warning" });
          }
        }
        this.isConnected = true;
        this.emit("status", { state: "connected", message: `Connected to ${chipType}` });
        this.emit("log", { message: `Connected to ${chipType}`, level: "success" });
        this.emit("connected", { chipType, macAddr });
        return { chipType, macAddr };
      } catch (error) {
        await this.disconnect();
        this.emit("error", { error, message: error.message });
        this.emit("log", { message: `Connection failed: ${error.message}`, level: "error" });
        throw error;
      }
    }
    /**
     * Handle chip mismatch - emits event and waits for resolution
     * @private
     * @returns {Promise<boolean>} - true to proceed, false to cancel
     */
    handleChipMismatch(expected, detected) {
      return new Promise((resolve) => {
        this.emit("chip-mismatch", {
          expected,
          detected,
          proceed: () => resolve(true),
          cancel: () => resolve(false)
        });
        setTimeout(() => resolve(false), 3e4);
      });
    }
    /**
     * Cancel an in-progress connection
     */
    cancel() {
      if (this.abortController) {
        this.abortController.abort();
      }
    }
    /**
     * Disconnect from device
     */
    async disconnect() {
      if (this.transport) {
        try {
          await this.transport.disconnect();
          this.emit("log", { message: "Disconnected", level: "info" });
        } catch (e) {
        }
      }
      this.transport = null;
      this.espStub = null;
      this.isConnected = false;
      this.emit("disconnected", {});
    }
    /**
     * Get the ESPLoader stub for direct operations
     * @returns {ESPLoader|null}
     */
    getStub() {
      return this.espStub;
    }
    /**
     * Check if connected
     * @returns {boolean}
     */
    getIsConnected() {
      return this.isConnected;
    }
    /**
     * Read flash memory from device
     * @param {number} offset - Flash offset to read from
     * @param {number} size - Number of bytes to read
     * @returns {Promise<Uint8Array>}
     */
    async readFlash(offset, size) {
      if (!this.espStub) {
        throw new Error("Device not connected");
      }
      this.emit("log", { message: `Reading ${size} bytes from 0x${offset.toString(16)}...`, level: "info" });
      const data = await this.espStub.readFlash(offset, size);
      this.emit("log", { message: `Read ${data.length} bytes`, level: "success" });
      return new Uint8Array(data);
    }
    /**
     * Write to flash memory
     * @param {Array<{data: Uint8Array|string, address: number}>} files - Files to flash
     * @param {Function} [onProgress] - Progress callback (percent, written, total)
     */
    async writeFlash(files, onProgress) {
      if (!this.espStub) {
        throw new Error("Device not connected");
      }
      const fileArray = files.map((f) => ({
        data: f.data instanceof Uint8Array ? Array.from(f.data).map((b) => String.fromCharCode(b)).join("") : f.data,
        address: f.address
      }));
      await this.espStub.writeFlash({
        fileArray,
        flashSize: "keep",
        compress: true,
        reportProgress: (idx, written, total) => {
          const percent = Math.round(written / total * 100);
          this.emit("progress", { percent, written, total });
          if (onProgress) onProgress(percent, written, total);
        }
      });
    }
    /**
     * Hard reset the device
     */
    async hardReset() {
      if (this.espStub) {
        await this.espStub.hardReset();
        this.emit("log", { message: "Device reset", level: "info" });
      }
    }
  };

  // src/core/nvs-generator.js
  var NVSGenerator = class {
    constructor() {
      this.PAGE_SIZE = 4096;
      this.ENTRY_SIZE = 32;
      this.ENTRIES_PER_PAGE = 126;
      this.TYPE_U8 = 1;
      this.TYPE_I8 = 17;
      this.TYPE_U16 = 2;
      this.TYPE_I16 = 18;
      this.TYPE_U32 = 4;
      this.TYPE_I32 = 20;
      this.TYPE_STR = 33;
      this.TYPE_BLOB = 65;
      this.PAGE_STATE_ACTIVE = 4294967294;
      this.PAGE_STATE_FULL = 4294967292;
      this.PAGE_STATE_EMPTY = 4294967295;
    }
    /**
     * Generate NVS partition binary from key-value pairs
     * @param {Object} data - Key-value pairs organized by namespace
     * @param {number} partitionSize - Size of partition in bytes (default: 0x6000 = 24KB)
     * @returns {Uint8Array} - Binary data ready to flash
     */
    generate(data, partitionSize = 24576) {
      const numPages = Math.floor(partitionSize / this.PAGE_SIZE);
      const binary = new Uint8Array(partitionSize);
      binary.fill(255);
      let pageIndex = 0;
      let entryIndex = 1;
      let namespaceIndex = 0;
      const namespaceMap = {};
      for (const namespace of Object.keys(data)) {
        if (Object.keys(data[namespace]).length > 0) {
          namespaceMap[namespace] = ++namespaceIndex;
        }
      }
      const bitmapOffset = pageIndex * this.PAGE_SIZE + 32;
      binary[bitmapOffset] = 170;
      binary[bitmapOffset + 1] = 170;
      for (const [namespace, entries] of Object.entries(data)) {
        if (Object.keys(entries).length > 0) {
          const nsIndex = namespaceMap[namespace];
          this.writeEntry(binary, pageIndex, entryIndex++, {
            namespace: 0,
            // Namespace entries use index 0
            type: 1,
            // Namespace type (ESP-IDF uses 0x01)
            span: 1,
            key: namespace,
            data: new Uint8Array([nsIndex])
            // Store the index in data
          });
          for (const [key, value] of Object.entries(entries)) {
            const entry = this.createEntry(nsIndex, key, value);
            this.writeEntry(binary, pageIndex, entryIndex, entry);
            entryIndex += entry.span;
            if (entryIndex >= this.ENTRIES_PER_PAGE) {
              this.finalizePage(binary, pageIndex, entryIndex);
              pageIndex++;
              entryIndex = 1;
              const newBitmapOffset = pageIndex * this.PAGE_SIZE + 32;
              binary[newBitmapOffset] = 170;
              binary[newBitmapOffset + 1] = 170;
              if (pageIndex >= numPages) {
                throw new Error("NVS partition size too small for data");
              }
            }
          }
        }
      }
      if (entryIndex > 0) {
        this.finalizePage(binary, pageIndex, entryIndex);
      }
      return binary;
    }
    /**
     * Create an NVS entry from a key-value pair
     */
    createEntry(namespaceIndex, key, value) {
      let type, data;
      if (typeof value === "string") {
        type = this.TYPE_STR;
        const encoder = new TextEncoder();
        const strBytes = encoder.encode(value);
        data = new Uint8Array(strBytes.length + 1);
        data.set(strBytes);
        data[strBytes.length] = 0;
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          if (value >= 0 && value <= 255) {
            type = this.TYPE_U8;
            data = new Uint8Array([value]);
          } else if (value >= 0 && value <= 65535) {
            type = this.TYPE_U16;
            data = new Uint8Array(2);
            new DataView(data.buffer).setUint16(0, value, true);
          } else {
            type = this.TYPE_U32;
            data = new Uint8Array(4);
            new DataView(data.buffer).setUint32(0, value, true);
          }
        } else {
          throw new Error("Float values not supported yet");
        }
      } else {
        throw new Error(`Unsupported value type for key ${key}: ${typeof value}`);
      }
      let span = 1;
      if (type === this.TYPE_STR || type === this.TYPE_BLOB) {
        span = 1 + Math.ceil(data.length / this.ENTRY_SIZE);
      } else {
        span = 1;
      }
      return {
        namespace: namespaceIndex,
        // Use sequential index
        type,
        span,
        key,
        data
      };
    }
    /**
     * Write an entry to the binary at the specified page and entry index
     */
    writeEntry(binary, pageIndex, entryIndex, entry) {
      const offset = pageIndex * this.PAGE_SIZE + 32 + entryIndex * this.ENTRY_SIZE;
      const view = new DataView(binary.buffer);
      binary[offset + 0] = entry.namespace;
      binary[offset + 1] = entry.type;
      binary[offset + 2] = entry.span;
      binary[offset + 3] = 255;
      const keyBytes = new TextEncoder().encode(entry.key.substring(0, 15));
      binary.set(keyBytes, offset + 8);
      for (let i = keyBytes.length; i < 16; i++) {
        binary[offset + 8 + i] = 0;
      }
      if (entry.type === this.TYPE_STR || entry.type === this.TYPE_BLOB) {
        view.setUint16(offset + 24, entry.data.length, true);
        let dataOffset = 0;
        for (let i = 1; i < entry.span; i++) {
          const nextEntryOffset = offset + i * this.ENTRY_SIZE;
          const chunk = entry.data.slice(dataOffset, dataOffset + this.ENTRY_SIZE);
          binary.set(chunk, nextEntryOffset);
          dataOffset += this.ENTRY_SIZE;
        }
      } else {
        binary.set(entry.data, offset + 24);
      }
      const crcData = new Uint8Array(28);
      crcData[0] = binary[offset + 0];
      crcData[1] = binary[offset + 1];
      crcData[2] = binary[offset + 2];
      crcData[3] = binary[offset + 3];
      crcData.set(binary.slice(offset + 8, offset + 24), 4);
      crcData.set(binary.slice(offset + 24, offset + 32), 20);
      const crc = this.calculateCRC32(crcData);
      view.setUint32(offset + 4, crc, true);
    }
    /**
     * Finalize a page by writing the page header
     */
    finalizePage(binary, pageIndex, numEntries) {
      const offset = pageIndex * this.PAGE_SIZE;
      const view = new DataView(binary.buffer);
      view.setUint32(offset + 0, this.PAGE_STATE_ACTIVE, true);
      view.setUint32(offset + 4, pageIndex, true);
      view.setUint32(offset + 8, 4294967295, true);
      const headerCRC = this.calculateCRC32(binary.slice(offset, offset + 28));
      view.setUint32(offset + 28, headerCRC, true);
    }
    /**
     * Calculate CRC32 checksum
     * This is a simplified implementation - ESP-IDF uses proper CRC32
     */
    calculateCRC32(data) {
      let crc = 4294967295;
      for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
          crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
        }
      }
      return ~crc >>> 0;
    }
  };
  function generateNVSFromConfig(config, namespace = "config", partitionSize = 24576) {
    const generator = new NVSGenerator();
    const nvsData = {};
    nvsData[namespace] = {};
    for (const [section, fields] of Object.entries(config)) {
      for (const [field, value] of Object.entries(fields)) {
        const key = `${section}_${field}`;
        nvsData[namespace][key] = value;
      }
    }
    return generator.generate(nvsData, partitionSize);
  }
  NVSGenerator.prototype.parse = function(binary) {
    const data = {};
    const namespaces = {};
    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    const numPages = Math.floor(binary.length / this.PAGE_SIZE);
    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
      const pageOffset = pageIdx * this.PAGE_SIZE;
      const pageState = view.getUint32(pageOffset, true);
      if (pageState === this.PAGE_STATE_EMPTY || pageState === 0) {
        continue;
      }
      for (let entryIdx = 1; entryIdx < this.ENTRIES_PER_PAGE; ) {
        const entryOffset = pageOffset + 32 + entryIdx * this.ENTRY_SIZE;
        const namespace = view.getUint8(entryOffset);
        if (namespace === 255) {
          entryIdx++;
          continue;
        }
        const type = view.getUint8(entryOffset + 1);
        const span = view.getUint8(entryOffset + 2);
        const keyBytes = new Uint8Array(binary.buffer, binary.byteOffset + entryOffset + 8, 16);
        const keyEnd = keyBytes.indexOf(0);
        const key = new TextDecoder().decode(keyBytes.slice(0, keyEnd > 0 ? keyEnd : 16));
        if (type === 1 && namespace === 0) {
          const nsIndex = view.getUint8(entryOffset + 24);
          namespaces[nsIndex] = key;
          if (!data[key]) {
            data[key] = {};
          }
          entryIdx += span;
          continue;
        }
        const namespaceName = namespaces[namespace] || `ns_${namespace}`;
        if (!data[namespaceName]) {
          data[namespaceName] = {};
        }
        let value;
        if (type === this.TYPE_U8) {
          value = view.getUint8(entryOffset + 24);
        } else if (type === this.TYPE_I8) {
          value = view.getInt8(entryOffset + 24);
        } else if (type === this.TYPE_U16) {
          value = view.getUint16(entryOffset + 24, true);
        } else if (type === this.TYPE_I16) {
          value = view.getInt16(entryOffset + 24, true);
        } else if (type === this.TYPE_U32) {
          value = view.getUint32(entryOffset + 24, true);
        } else if (type === this.TYPE_I32) {
          value = view.getInt32(entryOffset + 24, true);
        } else if (type === this.TYPE_STR) {
          const strLen = view.getUint16(entryOffset + 24, true);
          const totalBytes = new Uint8Array(strLen);
          let bytesRead = 0;
          for (let s = 1; s < span; s++) {
            const spanOffset = entryOffset + s * this.ENTRY_SIZE;
            const chunkSize = Math.min(strLen - bytesRead, this.ENTRY_SIZE);
            totalBytes.set(
              new Uint8Array(binary.buffer, binary.byteOffset + spanOffset, chunkSize),
              bytesRead
            );
            bytesRead += chunkSize;
          }
          const nullIndex = totalBytes.indexOf(0);
          const actualLen = nullIndex >= 0 ? nullIndex : strLen;
          value = new TextDecoder().decode(totalBytes.slice(0, actualLen));
        } else if (type === this.TYPE_BLOB) {
          const blobLen = view.getUint16(entryOffset + 20, true);
          value = new Uint8Array(binary.buffer, binary.byteOffset + entryOffset + 24, Math.min(blobLen, 8));
        } else {
          entryIdx++;
          continue;
        }
        data[namespaceName][key] = value;
        entryIdx += span;
      }
    }
    return data;
  };
  function parseNVSConfig(binary, namespace = "config") {
    const generator = new NVSGenerator();
    const parsed = generator.parse(binary);
    return parsed[namespace] || {};
  }
  if (typeof window !== "undefined") {
    window.NVSGenerator = NVSGenerator;
    window.generateNVSFromConfig = generateNVSFromConfig;
    window.parseNVSConfig = parseNVSConfig;
  }

  // src/core/firmware-flasher.js
  var FirmwareFlasher = class extends EventTarget {
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
          let response;
          try {
            response = await fetch(firmwareUrl);
            if (!response.ok) {
              throw new Error(`${response.status}`);
            }
          } catch (e) {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(firmwareUrl)}`;
            this.emit("log", { message: "Using CORS proxy...", level: "info" });
            response = await fetch(proxyUrl);
            if (!response.ok) {
              throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }
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
  };

  // src/core/config-store.js
  var FieldPresets = {
    wifi: [
      { key: "wifi_ssid", label: "WiFi SSID", type: "text", required: true },
      { key: "wifi_pass", label: "WiFi Password", type: "password", required: true }
    ],
    mqtt: [
      { key: "mqtt_host", label: "MQTT Host", type: "text" },
      { key: "mqtt_user", label: "MQTT Username", type: "text" },
      { key: "mqtt_pass", label: "MQTT Password", type: "password" }
    ],
    device_name: [
      { key: "device_name", label: "Device Name", type: "text" }
    ]
  };
  function expandFieldPresets(fields) {
    if (!fields) return [];
    return fields.flatMap(
      (f) => typeof f === "string" && FieldPresets[f] ? FieldPresets[f] : [f]
    );
  }
  function flattenConfigSections(sections) {
    if (!sections) return [];
    return sections.flatMap(
      (section) => (section.fields || []).map((f) => ({
        key: f.nvsKey || f.key || f.id,
        label: f.label,
        type: f.type || "text",
        placeholder: f.placeholder,
        required: f.required || false,
        default: f.default,
        pattern: f.pattern,
        help: f.help,
        section: section.title || section.id
      }))
    );
  }
  var ConfigStore = class extends EventTarget {
    constructor(initialConfig = {}) {
      super();
      this.data = { ...initialConfig };
      this.schema = null;
    }
    /**
     * Set field schema
     * @param {Field[]} fields
     */
    setSchema(fields) {
      this.schema = fields;
      for (const f of fields) {
        if (f.default !== void 0 && this.data[f.key] === void 0) {
          this.data[f.key] = f.default;
        }
      }
      this.dispatchEvent(new CustomEvent("schema-changed", { detail: { schema: fields } }));
    }
    /** @returns {Field[]|null} */
    getSchema() {
      return this.schema;
    }
    /** Set a value */
    set(key, value) {
      this.data[key] = value;
      this.dispatchEvent(new CustomEvent("change", { detail: { key, value } }));
    }
    /** Get a value */
    get(key) {
      return this.data[key];
    }
    /** Get all values */
    getAll() {
      return { ...this.data };
    }
    /** Set multiple values */
    setAll(values) {
      Object.assign(this.data, values);
      this.dispatchEvent(new CustomEvent("change", { detail: { values } }));
    }
    /**
     * Validate required fields
     * @returns {{valid: boolean, missing: string[]}}
     */
    validate() {
      if (!this.schema) return { valid: true, missing: [] };
      const missing = this.schema.filter((f) => f.required && !this.data[f.key]).map((f) => f.key);
      return { valid: missing.length === 0, missing };
    }
    /**
     * Get data formatted for NVS (non-empty string values only)
     * @returns {Object<string, string>}
     */
    toNVS() {
      const result = {};
      for (const [k, v] of Object.entries(this.data)) {
        if (v !== void 0 && v !== null && v !== "") {
          result[k] = String(v);
        }
      }
      return result;
    }
    /** Serialize for storage */
    serialize() {
      return JSON.stringify(this.data);
    }
    /** Load from storage */
    load(data) {
      this.data = typeof data === "string" ? JSON.parse(data) : { ...data };
    }
  };

  // src/core/flasher.js
  var ESPFlasher = class extends EventTarget {
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
  };
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
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=esp-webflash-toolkit.js.map
