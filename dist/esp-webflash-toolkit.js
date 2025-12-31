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
    PartitionTableGenerator: () => PartitionTableGenerator,
    expandFieldPresets: () => expandFieldPresets
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
          const expected = expectedChip.toUpperCase();
          const detected = chipType.toUpperCase();
          const isMatch = detected.includes(expected.replace("ESP32-", ""));
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
  };

  // src/core/config-store.js
  var ConfigStore = class extends EventTarget {
    /**
     * @param {Object} [initialConfig] - Initial config values
     */
    constructor(initialConfig = {}) {
      super();
      this.config = { ...initialConfig };
      this.schema = null;
    }
    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    /**
     * Set the config schema (field definitions)
     * @param {Array<FieldDefinition>} fields - Field definitions
     */
    setSchema(fields) {
      this.schema = fields;
      fields.forEach((field) => {
        if (field.default !== void 0 && this.config[field.key] === void 0) {
          this.config[field.key] = field.default;
        }
      });
      this.emit("schema-changed", { schema: this.schema });
    }
    /**
     * Get schema
     * @returns {Array<FieldDefinition>|null}
     */
    getSchema() {
      return this.schema;
    }
    /**
     * Set a config value
     * @param {string} key - Config key
     * @param {any} value - Config value
     */
    set(key, value) {
      const oldValue = this.config[key];
      this.config[key] = value;
      this.emit("change", { key, value, oldValue });
    }
    /**
     * Get a config value
     * @param {string} key - Config key
     * @returns {any}
     */
    get(key) {
      return this.config[key];
    }
    /**
     * Get all config values
     * @returns {Object}
     */
    getAll() {
      return { ...this.config };
    }
    /**
     * Set multiple values at once
     * @param {Object} values - Key-value pairs
     */
    setAll(values) {
      Object.entries(values).forEach(([key, value]) => {
        this.config[key] = value;
      });
      this.emit("change", { bulk: true, values });
    }
    /**
     * Clear all config
     */
    clear() {
      const oldConfig = { ...this.config };
      this.config = {};
      if (this.schema) {
        this.schema.forEach((field) => {
          if (field.default !== void 0) {
            this.config[field.key] = field.default;
          }
        });
      }
      this.emit("clear", { oldConfig });
    }
    /**
     * Check if config is valid (all required fields present)
     * @returns {{valid: boolean, missing: string[]}}
     */
    validate() {
      if (!this.schema) {
        return { valid: true, missing: [] };
      }
      const missing = this.schema.filter((field) => field.required && !this.config[field.key]).map((field) => field.key);
      return {
        valid: missing.length === 0,
        missing
      };
    }
    /**
     * Get config formatted for NVS generation
     * Only includes non-empty values
     * @returns {Object}
     */
    toNVS() {
      const nvsData = {};
      Object.entries(this.config).forEach(([key, value]) => {
        if (value !== void 0 && value !== null && value !== "") {
          nvsData[key] = String(value);
        }
      });
      return nvsData;
    }
    /**
     * Load config from serialized data (e.g., localStorage)
     * @param {string|Object} data - JSON string or object
     */
    load(data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      this.config = { ...parsed };
      this.emit("load", { config: this.config });
    }
    /**
     * Serialize config for storage
     * @returns {string}
     */
    serialize() {
      return JSON.stringify(this.config);
    }
  };
  var FieldPresets = {
    wifi: [
      { key: "wifi_ssid", label: "WiFi SSID", type: "text", placeholder: "MyNetwork", required: true },
      { key: "wifi_pass", label: "WiFi Password", type: "password", required: true }
    ],
    mqtt: [
      { key: "mqtt_host", label: "MQTT Host", type: "text", placeholder: "mqtt.example.com" },
      { key: "mqtt_user", label: "MQTT Username", type: "text" },
      { key: "mqtt_pass", label: "MQTT Password", type: "password" }
    ],
    device_name: [
      { key: "device_name", label: "Device Name", type: "text", placeholder: "my-device-001" }
    ],
    api_key: [
      { key: "api_key", label: "API Key", type: "password" }
    ],
    server_url: [
      { key: "server_url", label: "Server URL", type: "text", placeholder: "https://api.example.com" }
    ]
  };
  function expandFieldPresets(fields) {
    const expanded = [];
    fields.forEach((field) => {
      if (typeof field === "string" && FieldPresets[field]) {
        expanded.push(...FieldPresets[field]);
      } else if (typeof field === "object") {
        expanded.push(field);
      }
    });
    return expanded;
  }

  // src/core/partition-table-generator.js
  var PartitionTableGenerator = class {
    constructor() {
      this.PARTITION_TABLE_SIZE = 4096;
      this.MAX_PARTITION_LENGTH = 3072;
      this.ENTRY_SIZE = 32;
      this.MAGIC_BYTES = 43600;
      this.MD5_PARTITION_BEGIN = [235, 235];
      this.TYPE_APP = 0;
      this.TYPE_DATA = 1;
      this.SUBTYPE_APP_FACTORY = 0;
      this.SUBTYPE_APP_OTA_MIN = 16;
      this.SUBTYPE_APP_OTA_MAX = 31;
      this.SUBTYPE_APP_TEST = 32;
      this.SUBTYPE_DATA_OTA = 0;
      this.SUBTYPE_DATA_RF = 1;
      this.SUBTYPE_DATA_WIFI = 2;
      this.SUBTYPE_DATA_NVS = 2;
      this.SUBTYPE_DATA_COREDUMP = 3;
      this.SUBTYPE_DATA_NVS_KEYS = 4;
      this.SUBTYPE_DATA_EFUSE_EM = 5;
      this.SUBTYPE_DATA_ESPHTTPD = 128;
      this.SUBTYPE_DATA_FAT = 129;
      this.SUBTYPE_DATA_SPIFFS = 130;
      this.SUBTYPE_DATA_LITTLEFS = 131;
      this.FLAG_ENCRYPTED = 1 << 0;
      this.FLAG_READONLY = 1 << 1;
      this.PARTITION_ALIGNMENT = 4096;
    }
    /**
     * Generate partition table binary from partition definitions
     * @param {Array} partitions - Array of partition objects
     * @returns {Uint8Array} - Binary data ready to flash
     *
     * Partition object format:
     * {
     *   name: string (max 16 chars),
     *   type: number or string ('app', 'data'),
     *   subtype: number or string,
     *   offset: number (hex or decimal),
     *   size: number (hex or decimal),
     *   flags: {encrypted: boolean, readonly: boolean}
     * }
     */
    generate(partitions) {
      const binary = new Uint8Array(this.PARTITION_TABLE_SIZE);
      binary.fill(255);
      let offset = 0;
      for (let i = 0; i < partitions.length; i++) {
        const partition = this.normalizePartition(partitions[i]);
        this.validatePartition(partition, i);
        this.writeEntry(binary, offset, partition);
        offset += this.ENTRY_SIZE;
        if (offset >= this.MAX_PARTITION_LENGTH) {
          throw new Error("Too many partition entries (max 95)");
        }
      }
      const tableData = binary.slice(0, offset);
      const md5sum = this.calculateMD5(tableData);
      this.writeMD5Entry(binary, offset, md5sum);
      return binary;
    }
    /**
     * Normalize partition object to standard format
     */
    normalizePartition(partition) {
      const normalized = { ...partition };
      if (typeof normalized.type === "string") {
        const typeMap = { "app": this.TYPE_APP, "data": this.TYPE_DATA };
        normalized.type = typeMap[normalized.type.toLowerCase()];
        if (normalized.type === void 0) {
          throw new Error(`Unknown partition type: ${partition.type}`);
        }
      }
      if (typeof normalized.subtype === "string") {
        normalized.subtype = this.parseSubtype(normalized.subtype, normalized.type);
      }
      if (typeof normalized.offset === "string") {
        normalized.offset = parseInt(normalized.offset, 16);
      }
      if (typeof normalized.size === "string") {
        normalized.size = parseInt(normalized.size, 16);
      }
      if (!normalized.flags) {
        normalized.flags = 0;
      } else if (typeof normalized.flags === "object") {
        let flagBits = 0;
        if (normalized.flags.encrypted) flagBits |= this.FLAG_ENCRYPTED;
        if (normalized.flags.readonly) flagBits |= this.FLAG_READONLY;
        normalized.flags = flagBits;
      }
      return normalized;
    }
    /**
     * Parse subtype string to number based on partition type
     */
    parseSubtype(subtypeStr, type) {
      const subtypeLower = subtypeStr.toLowerCase();
      if (type === this.TYPE_APP) {
        const appSubtypes = {
          "factory": this.SUBTYPE_APP_FACTORY,
          "test": this.SUBTYPE_APP_TEST
        };
        if (subtypeLower.startsWith("ota_")) {
          const otaNum = parseInt(subtypeLower.substring(4));
          if (otaNum >= 0 && otaNum <= 15) {
            return this.SUBTYPE_APP_OTA_MIN + otaNum;
          }
        }
        return appSubtypes[subtypeLower];
      } else if (type === this.TYPE_DATA) {
        const dataSubtypes = {
          "ota": this.SUBTYPE_DATA_OTA,
          "rf": this.SUBTYPE_DATA_RF,
          "wifi": this.SUBTYPE_DATA_WIFI,
          "nvs": this.SUBTYPE_DATA_NVS,
          "coredump": this.SUBTYPE_DATA_COREDUMP,
          "nvs_keys": this.SUBTYPE_DATA_NVS_KEYS,
          "efuse_em": this.SUBTYPE_DATA_EFUSE_EM,
          "esphttpd": this.SUBTYPE_DATA_ESPHTTPD,
          "fat": this.SUBTYPE_DATA_FAT,
          "spiffs": this.SUBTYPE_DATA_SPIFFS,
          "littlefs": this.SUBTYPE_DATA_LITTLEFS
        };
        return dataSubtypes[subtypeLower];
      }
      throw new Error(`Unknown subtype: ${subtypeStr}`);
    }
    /**
     * Validate partition entry
     */
    validatePartition(partition, index) {
      if (!partition.name || partition.name.length === 0) {
        throw new Error(`Partition ${index}: name is required`);
      }
      if (partition.name.length > 16) {
        throw new Error(`Partition ${index}: name too long (max 16 chars): ${partition.name}`);
      }
      if (partition.type === void 0) {
        throw new Error(`Partition ${index}: type is required`);
      }
      if (partition.subtype === void 0) {
        throw new Error(`Partition ${index}: subtype is required`);
      }
      if (partition.offset % this.PARTITION_ALIGNMENT !== 0) {
        throw new Error(
          `Partition ${index} (${partition.name}): offset 0x${partition.offset.toString(16)} is not aligned to 0x${this.PARTITION_ALIGNMENT.toString(16)} bytes`
        );
      }
      if (!partition.size || partition.size <= 0) {
        throw new Error(`Partition ${index} (${partition.name}): size must be positive`);
      }
    }
    /**
     * Validate entire partition table for overlaps and gaps
     */
    validateTable(partitions) {
      const errors = [];
      const warnings = [];
      const sorted = [...partitions].sort((a, b) => a.offset - b.offset);
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const currentEnd = current.offset + current.size;
        if (currentEnd > next.offset) {
          errors.push(
            `Partition '${current.name}' (ends at 0x${currentEnd.toString(16)}) overlaps with '${next.name}' (starts at 0x${next.offset.toString(16)})`
          );
        } else if (currentEnd < next.offset) {
          const gap = next.offset - currentEnd;
          warnings.push(
            `Gap of ${gap} bytes (0x${gap.toString(16)}) between '${current.name}' and '${next.name}'`
          );
        }
      }
      return { errors, warnings };
    }
    /**
     * Write a partition entry to the binary
     */
    writeEntry(binary, offset, partition) {
      const view = new DataView(binary.buffer);
      view.setUint16(offset + 0, this.MAGIC_BYTES, true);
      view.setUint8(offset + 2, partition.type);
      view.setUint8(offset + 3, partition.subtype);
      view.setUint32(offset + 4, partition.offset, true);
      view.setUint32(offset + 8, partition.size, true);
      const nameBytes = new TextEncoder().encode(partition.name.substring(0, 15));
      binary.set(nameBytes, offset + 12);
      for (let i = nameBytes.length; i < 16; i++) {
        binary[offset + 12 + i] = 0;
      }
      view.setUint32(offset + 28, partition.flags, true);
    }
    /**
     * Write MD5 checksum entry
     */
    writeMD5Entry(binary, offset, md5Hash) {
      const view = new DataView(binary.buffer);
      view.setUint8(offset + 0, this.MD5_PARTITION_BEGIN[0]);
      view.setUint8(offset + 1, this.MD5_PARTITION_BEGIN[1]);
      for (let i = 2; i < 16; i++) {
        binary[offset + i] = 255;
      }
      binary.set(md5Hash, offset + 16);
    }
    /**
     * Parse partition table binary back to partition objects
     * @param {Uint8Array} binary - Partition table binary data
     * @returns {Object} - {partitions: Array, md5: Uint8Array}
     */
    parse(binary) {
      const partitions = [];
      const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
      let offset = 0;
      let md5 = null;
      while (offset < this.MAX_PARTITION_LENGTH) {
        const magic = view.getUint16(offset, true);
        if (magic === 65535) {
          break;
        }
        if (view.getUint8(offset) === this.MD5_PARTITION_BEGIN[0] && view.getUint8(offset + 1) === this.MD5_PARTITION_BEGIN[1]) {
          md5 = new Uint8Array(binary.buffer, binary.byteOffset + offset + 16, 16);
          break;
        }
        if (magic !== this.MAGIC_BYTES) {
          console.warn(`Invalid magic bytes at offset ${offset}: 0x${magic.toString(16)}`);
          break;
        }
        const type = view.getUint8(offset + 2);
        const subtype = view.getUint8(offset + 3);
        const partOffset = view.getUint32(offset + 4, true);
        const size = view.getUint32(offset + 8, true);
        const nameBytes = new Uint8Array(binary.buffer, binary.byteOffset + offset + 12, 16);
        const nameEnd = nameBytes.indexOf(0);
        const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd > 0 ? nameEnd : 16));
        const flags = view.getUint32(offset + 28, true);
        partitions.push({
          name,
          type: this.getTypeName(type),
          typeValue: type,
          subtype: this.getSubtypeName(type, subtype),
          subtypeValue: subtype,
          offset: partOffset,
          size,
          flags: {
            encrypted: !!(flags & this.FLAG_ENCRYPTED),
            readonly: !!(flags & this.FLAG_READONLY)
          }
        });
        offset += this.ENTRY_SIZE;
      }
      return { partitions, md5 };
    }
    /**
     * Get human-readable type name
     */
    getTypeName(type) {
      const types = {
        [this.TYPE_APP]: "app",
        [this.TYPE_DATA]: "data"
      };
      return types[type] || `0x${type.toString(16)}`;
    }
    /**
     * Get human-readable subtype name
     */
    getSubtypeName(type, subtype) {
      if (type === this.TYPE_APP) {
        if (subtype === this.SUBTYPE_APP_FACTORY) return "factory";
        if (subtype === this.SUBTYPE_APP_TEST) return "test";
        if (subtype >= this.SUBTYPE_APP_OTA_MIN && subtype <= this.SUBTYPE_APP_OTA_MAX) {
          return `ota_${subtype - this.SUBTYPE_APP_OTA_MIN}`;
        }
      } else if (type === this.TYPE_DATA) {
        const subtypes = {
          [this.SUBTYPE_DATA_OTA]: "ota",
          [this.SUBTYPE_DATA_RF]: "rf",
          [this.SUBTYPE_DATA_NVS]: "nvs",
          [this.SUBTYPE_DATA_COREDUMP]: "coredump",
          [this.SUBTYPE_DATA_NVS_KEYS]: "nvs_keys",
          [this.SUBTYPE_DATA_EFUSE_EM]: "efuse_em",
          [this.SUBTYPE_DATA_ESPHTTPD]: "esphttpd",
          [this.SUBTYPE_DATA_FAT]: "fat",
          [this.SUBTYPE_DATA_SPIFFS]: "spiffs",
          [this.SUBTYPE_DATA_LITTLEFS]: "littlefs"
        };
        if (subtypes[subtype]) return subtypes[subtype];
      }
      return `0x${subtype.toString(16)}`;
    }
    /**
     * Calculate MD5 hash using Web Crypto API
     * @param {Uint8Array} data - Data to hash
     * @returns {Promise<Uint8Array>} - MD5 hash (16 bytes)
     */
    async calculateMD5Async(data) {
      return this.calculateMD5(data);
    }
    /**
     * Calculate MD5 hash (simple implementation)
     * Based on: https://github.com/satazor/js-spark-md5
     */
    calculateMD5(data) {
      return this.md5(data);
    }
    /**
     * Simple MD5 implementation for client-side use
     * Reference: https://www.ietf.org/rfc/rfc1321.txt
     */
    md5(data) {
      const hexChars = "0123456789abcdef";
      function add32(a2, b2) {
        return a2 + b2 & 4294967295;
      }
      function cmn(q, a2, b2, x, s, t) {
        a2 = add32(add32(a2, q), add32(x, t));
        return add32(a2 << s | a2 >>> 32 - s, b2);
      }
      function ff(a2, b2, c2, d2, x, s, t) {
        return cmn(b2 & c2 | ~b2 & d2, a2, b2, x, s, t);
      }
      function gg(a2, b2, c2, d2, x, s, t) {
        return cmn(b2 & d2 | c2 & ~d2, a2, b2, x, s, t);
      }
      function hh(a2, b2, c2, d2, x, s, t) {
        return cmn(b2 ^ c2 ^ d2, a2, b2, x, s, t);
      }
      function ii(a2, b2, c2, d2, x, s, t) {
        return cmn(c2 ^ (b2 | ~d2), a2, b2, x, s, t);
      }
      const msgLen = data.length;
      const padLen = (msgLen + 8 >>> 6 << 4) + 14;
      const padded = new Uint8Array((padLen + 2) * 4);
      padded.set(data);
      padded[msgLen] = 128;
      const view = new DataView(padded.buffer);
      view.setUint32((padLen + 1) * 4, msgLen * 8, true);
      let a = 1732584193;
      let b = 4023233417;
      let c = 2562383102;
      let d = 271733878;
      for (let i = 0; i < padded.length; i += 64) {
        const aa = a, bb = b, cc = c, dd = d;
        const x = new Uint32Array(16);
        for (let j = 0; j < 16; j++) {
          x[j] = view.getUint32(i + j * 4, true);
        }
        a = ff(a, b, c, d, x[0], 7, 3614090360);
        d = ff(d, a, b, c, x[1], 12, 3905402710);
        c = ff(c, d, a, b, x[2], 17, 606105819);
        b = ff(b, c, d, a, x[3], 22, 3250441966);
        a = ff(a, b, c, d, x[4], 7, 4118548399);
        d = ff(d, a, b, c, x[5], 12, 1200080426);
        c = ff(c, d, a, b, x[6], 17, 2821735955);
        b = ff(b, c, d, a, x[7], 22, 4249261313);
        a = ff(a, b, c, d, x[8], 7, 1770035416);
        d = ff(d, a, b, c, x[9], 12, 2336552879);
        c = ff(c, d, a, b, x[10], 17, 4294925233);
        b = ff(b, c, d, a, x[11], 22, 2304563134);
        a = ff(a, b, c, d, x[12], 7, 1804603682);
        d = ff(d, a, b, c, x[13], 12, 4254626195);
        c = ff(c, d, a, b, x[14], 17, 2792965006);
        b = ff(b, c, d, a, x[15], 22, 1236535329);
        a = gg(a, b, c, d, x[1], 5, 4129170786);
        d = gg(d, a, b, c, x[6], 9, 3225465664);
        c = gg(c, d, a, b, x[11], 14, 643717713);
        b = gg(b, c, d, a, x[0], 20, 3921069994);
        a = gg(a, b, c, d, x[5], 5, 3593408605);
        d = gg(d, a, b, c, x[10], 9, 38016083);
        c = gg(c, d, a, b, x[15], 14, 3634488961);
        b = gg(b, c, d, a, x[4], 20, 3889429448);
        a = gg(a, b, c, d, x[9], 5, 568446438);
        d = gg(d, a, b, c, x[14], 9, 3275163606);
        c = gg(c, d, a, b, x[3], 14, 4107603335);
        b = gg(b, c, d, a, x[8], 20, 1163531501);
        a = gg(a, b, c, d, x[13], 5, 2850285829);
        d = gg(d, a, b, c, x[2], 9, 4243563512);
        c = gg(c, d, a, b, x[7], 14, 1735328473);
        b = gg(b, c, d, a, x[12], 20, 2368359562);
        a = hh(a, b, c, d, x[5], 4, 4294588738);
        d = hh(d, a, b, c, x[8], 11, 2272392833);
        c = hh(c, d, a, b, x[11], 16, 1839030562);
        b = hh(b, c, d, a, x[14], 23, 4259657740);
        a = hh(a, b, c, d, x[1], 4, 2763975236);
        d = hh(d, a, b, c, x[4], 11, 1272893353);
        c = hh(c, d, a, b, x[7], 16, 4139469664);
        b = hh(b, c, d, a, x[10], 23, 3200236656);
        a = hh(a, b, c, d, x[13], 4, 681279174);
        d = hh(d, a, b, c, x[0], 11, 3936430074);
        c = hh(c, d, a, b, x[3], 16, 3572445317);
        b = hh(b, c, d, a, x[6], 23, 76029189);
        a = hh(a, b, c, d, x[9], 4, 3654602809);
        d = hh(d, a, b, c, x[12], 11, 3873151461);
        c = hh(c, d, a, b, x[15], 16, 530742520);
        b = hh(b, c, d, a, x[2], 23, 3299628645);
        a = ii(a, b, c, d, x[0], 6, 4096336452);
        d = ii(d, a, b, c, x[7], 10, 1126891415);
        c = ii(c, d, a, b, x[14], 15, 2878612391);
        b = ii(b, c, d, a, x[5], 21, 4237533241);
        a = ii(a, b, c, d, x[12], 6, 1700485571);
        d = ii(d, a, b, c, x[3], 10, 2399980690);
        c = ii(c, d, a, b, x[10], 15, 4293915773);
        b = ii(b, c, d, a, x[1], 21, 2240044497);
        a = ii(a, b, c, d, x[8], 6, 1873313359);
        d = ii(d, a, b, c, x[15], 10, 4264355552);
        c = ii(c, d, a, b, x[6], 15, 2734768916);
        b = ii(b, c, d, a, x[13], 21, 1309151649);
        a = ii(a, b, c, d, x[4], 6, 4149444226);
        d = ii(d, a, b, c, x[11], 10, 3174756917);
        c = ii(c, d, a, b, x[2], 15, 718787259);
        b = ii(b, c, d, a, x[9], 21, 3951481745);
        a = add32(a, aa);
        b = add32(b, bb);
        c = add32(c, cc);
        d = add32(d, dd);
      }
      const hash = new Uint8Array(16);
      const hashView = new DataView(hash.buffer);
      hashView.setUint32(0, a, true);
      hashView.setUint32(4, b, true);
      hashView.setUint32(8, c, true);
      hashView.setUint32(12, d, true);
      return hash;
    }
    /**
     * Get predefined partition table templates
     */
    static getTemplates() {
      return {
        minimal: [
          { name: "nvs", type: "data", subtype: "nvs", offset: 36864, size: 24576 },
          { name: "phy_init", type: "data", subtype: "rf", offset: 61440, size: 4096 },
          { name: "factory", type: "app", subtype: "factory", offset: 65536, size: 1048576 }
        ],
        ota: [
          { name: "nvs", type: "data", subtype: "nvs", offset: 36864, size: 24576 },
          { name: "otadata", type: "data", subtype: "ota", offset: 61440, size: 8192 },
          { name: "ota_0", type: "app", subtype: "ota_0", offset: 131072, size: 1572864 },
          { name: "ota_1", type: "app", subtype: "ota_1", offset: 1703936, size: 1572864 }
        ],
        "ota-spiffs": [
          { name: "nvs", type: "data", subtype: "nvs", offset: 36864, size: 24576 },
          { name: "otadata", type: "data", subtype: "ota", offset: 61440, size: 8192 },
          { name: "ota_0", type: "app", subtype: "ota_0", offset: 131072, size: 1572864 },
          { name: "ota_1", type: "app", subtype: "ota_1", offset: 1703936, size: 1572864 },
          { name: "spiffs", type: "data", subtype: "spiffs", offset: 3276800, size: 917504 }
        ],
        factory: [
          { name: "nvs", type: "data", subtype: "nvs", offset: 36864, size: 16384 },
          { name: "otadata", type: "data", subtype: "ota", offset: 53248, size: 8192 },
          { name: "phy_init", type: "data", subtype: "rf", offset: 61440, size: 4096 },
          { name: "factory", type: "app", subtype: "factory", offset: 65536, size: 1048576 },
          { name: "ota_0", type: "app", subtype: "ota_0", offset: 1114112, size: 1048576 },
          { name: "ota_1", type: "app", subtype: "ota_1", offset: 2162688, size: 1048576 }
        ]
      };
    }
  };
  if (typeof window !== "undefined") {
    window.PartitionTableGenerator = PartitionTableGenerator;
  }

  // src/core/flasher.js
  var ESPFlasher = class extends EventTarget {
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
  };
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=esp-webflash-toolkit.js.map
