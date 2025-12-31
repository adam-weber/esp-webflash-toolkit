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

  // src/bundle-full.js
  var bundle_full_exports = {};
  __export(bundle_full_exports, {
    ConfigStore: () => ConfigStore,
    DeviceConnection: () => DeviceConnection,
    ESPFlasher: () => ESPFlasher,
    FieldPresets: () => FieldPresets,
    FirmwareFlasher: () => FirmwareFlasher,
    FlasherApp: () => FlasherApp,
    FlasherUI: () => FlasherUI,
    NVSGenerator: () => NVSGenerator,
    createFlasher: () => createFlasher,
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
  function groupFieldsBySection(fields) {
    if (!fields) return [];
    const groups = /* @__PURE__ */ new Map();
    for (const field of fields) {
      const section = field.section || "default";
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(field);
    }
    return Array.from(groups.entries()).map(([title, fields2]) => ({ title, fields: fields2 }));
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

  // src/adapters/vanilla/ui.js
  var DEFAULT_BINDINGS = {
    "status": "handleStatus",
    "progress": "handleProgress",
    "log": "handleLog",
    "connected": "handleConnected",
    "disconnected": "handleDisconnected",
    "error": "handleError",
    "chip-mismatch": "handleChipMismatch",
    "complete": "handleComplete",
    "schema-changed": "handleSchemaChanged"
  };
  var FlasherUI = class {
    /**
     * @param {ESPFlasher} flasher - Core flasher instance
     * @param {UIElements} elements - DOM element references
     * @param {Object} [options] - Configuration options
     * @param {Object} [options.bindings] - Custom event bindings (event -> handler name)
     * @param {boolean} [options.groupBySection] - Group config fields by section (default: true)
     */
    constructor(flasher, elements = {}, options = {}) {
      this.flasher = flasher;
      this.elements = elements;
      this.options = {
        groupBySection: options.groupBySection !== false,
        bindings: { ...DEFAULT_BINDINGS, ...options.bindings }
      };
      this.flashStartTime = null;
      this.lastDisplayedPercent = 0;
      this.targetPercent = 0;
      this.animationFrame = null;
      this._boundHandlers = [];
      this._inputHandlers = [];
      this._bindEvents();
    }
    /**
     * Bind to core flasher events with cleanup tracking
     * @private
     */
    _bindEvents() {
      for (const [event, handlerName] of Object.entries(this.options.bindings)) {
        if (typeof this[handlerName] === "function") {
          const handler = (e) => this[handlerName](e.detail);
          this.flasher.addEventListener(event, handler);
          this._boundHandlers.push({ event, handler });
        }
      }
    }
    /**
     * Clean up all event listeners
     * Call this when disposing of the UI instance
     */
    dispose() {
      for (const { event, handler } of this._boundHandlers) {
        this.flasher.removeEventListener(event, handler);
      }
      this._boundHandlers = [];
      for (const { element, event, handler } of this._inputHandlers) {
        element.removeEventListener(event, handler);
      }
      this._inputHandlers = [];
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }
    /**
     * Handle schema changes - renders config form
     * @private
     */
    handleSchemaChanged({ schema }) {
      this.renderConfigForm(schema);
    }
    /**
     * Handle status updates
     */
    handleStatus({ state, message }) {
      if (!this.elements.statusBox) return;
      const stateClasses = {
        connecting: "waiting",
        connected: "connected",
        downloading: "flashing",
        generating: "flashing",
        flashing: "flashing",
        complete: "success",
        error: "error"
      };
      this.elements.statusBox.className = `status-box ${stateClasses[state] || state}`;
      this.elements.statusBox.innerHTML = `
            <div class="status-text">${message}</div>
            <div class="status-subtext"></div>
        `;
    }
    /**
     * Handle progress updates
     */
    handleProgress({ percent, written, total }) {
      this.targetPercent = percent;
      if (!this.animationFrame) {
        this.animateProgress();
      }
      if (this.elements.progressContainer) {
        this.elements.progressContainer.classList.add("active");
      }
      if (this.flashStartTime && percent > 0 && percent < 100 && this.elements.progressTime) {
        const elapsed = (Date.now() - this.flashStartTime) / 1e3;
        const remaining = Math.max(0, Math.round(elapsed / percent * (100 - percent)));
        this.elements.progressTime.textContent = `~${remaining}s remaining`;
      }
    }
    /**
     * Animate progress bar smoothly
     * @private
     */
    animateProgress() {
      const diff = this.targetPercent - this.lastDisplayedPercent;
      if (Math.abs(diff) > 0.1) {
        this.lastDisplayedPercent += diff * 0.1;
        if (this.elements.progressFill) {
          this.elements.progressFill.style.width = `${this.lastDisplayedPercent}%`;
        }
        if (this.elements.progressPercent) {
          this.elements.progressPercent.textContent = `${Math.round(this.lastDisplayedPercent)}%`;
        }
        this.animationFrame = requestAnimationFrame(() => this.animateProgress());
      } else {
        this.lastDisplayedPercent = this.targetPercent;
        if (this.elements.progressFill) {
          this.elements.progressFill.style.width = `${this.targetPercent}%`;
        }
        if (this.elements.progressPercent) {
          this.elements.progressPercent.textContent = `${Math.round(this.targetPercent)}%`;
        }
        this.animationFrame = null;
      }
    }
    /**
     * Handle log messages
     */
    handleLog({ message, level }) {
      if (!this.elements.logContainer) return;
      const line = document.createElement("div");
      line.className = `serial-line ${level}`;
      line.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${message}`;
      this.elements.logContainer.appendChild(line);
      this.elements.logContainer.scrollTop = this.elements.logContainer.scrollHeight;
    }
    /**
     * Handle successful connection
     */
    handleConnected({ chipType, macAddr }) {
      if (this.elements.chipType) {
        this.elements.chipType.textContent = chipType;
      }
      if (this.elements.chipMac) {
        this.elements.chipMac.textContent = macAddr || "-";
      }
      if (this.elements.connectBtn) {
        this.elements.connectBtn.style.display = "none";
      }
      if (this.elements.flashBtn) {
        this.elements.flashBtn.style.display = "block";
        this.elements.flashBtn.disabled = false;
      }
      this.flashStartTime = Date.now();
    }
    /**
     * Handle disconnection
     */
    handleDisconnected() {
      if (this.elements.connectBtn) {
        this.elements.connectBtn.style.display = "block";
        this.elements.connectBtn.disabled = false;
      }
      if (this.elements.flashBtn) {
        this.elements.flashBtn.style.display = "none";
      }
    }
    /**
     * Handle errors
     */
    handleError({ message }) {
      if (this.elements.statusBox) {
        this.elements.statusBox.className = "status-box error";
        this.elements.statusBox.innerHTML = `
                <div class="status-text">Error</div>
                <div class="status-subtext">${message}</div>
            `;
      }
    }
    /**
     * Handle chip mismatch - show dialog
     */
    async handleChipMismatch({ expected, detected, proceed, cancel }) {
      const shouldProceed = confirm(
        `Chip mismatch detected!

Expected: ${expected}
Detected: ${detected}

Do you want to continue anyway?`
      );
      if (shouldProceed) {
        proceed();
      } else {
        cancel();
      }
    }
    /**
     * Handle flash complete
     */
    handleComplete() {
      if (this.elements.progressTime) {
        this.elements.progressTime.textContent = "Complete";
      }
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }
    /**
     * Render config form from schema
     * @param {Array} schema - Field definitions
     */
    renderConfigForm(schema) {
      if (!this.elements.configContainer || !schema) return;
      for (const { element, event, handler } of this._inputHandlers) {
        element.removeEventListener(event, handler);
      }
      this._inputHandlers = [];
      this.elements.configContainer.innerHTML = "";
      if (this.options.groupBySection) {
        const sections = groupFieldsBySection(schema);
        for (const section of sections) {
          const sectionEl = document.createElement("div");
          sectionEl.className = "config-section";
          if (section.title && section.title !== "default") {
            const header = document.createElement("h3");
            header.className = "config-section-title";
            header.textContent = section.title;
            sectionEl.appendChild(header);
          }
          for (const field of section.fields) {
            sectionEl.appendChild(this._createFieldElement(field));
          }
          this.elements.configContainer.appendChild(sectionEl);
        }
      } else {
        for (const field of schema) {
          this.elements.configContainer.appendChild(this._createFieldElement(field));
        }
      }
    }
    /**
     * Create a form field element
     * @private
     */
    _createFieldElement(field) {
      const group = document.createElement("div");
      group.className = "form-group";
      const escapedPlaceholder = (field.placeholder || "").replace(/"/g, "&quot;");
      const escapedDefault = (field.default || "").replace(/"/g, "&quot;");
      group.innerHTML = `
            <label for="config-${field.key}">
                ${field.label}
                ${field.required ? '<span class="required-marker">*</span>' : '<span class="optional-marker">(optional)</span>'}
            </label>
            <input
                type="${field.type || "text"}"
                id="config-${field.key}"
                data-key="${field.key}"
                placeholder="${escapedPlaceholder}"
                value="${escapedDefault}"
                ${field.required ? "required" : ""}
                ${field.pattern ? `pattern="${field.pattern}"` : ""}>
            ${field.help ? `<span class="help-text">${field.help}</span>` : ""}
        `;
      const input = group.querySelector("input");
      const handler = () => {
        input.classList.remove("error");
        const errorEl = group.querySelector(".field-error");
        if (errorEl) errorEl.remove();
        this.flasher.setConfig({ [field.key]: input.value });
      };
      input.addEventListener("input", handler);
      this._inputHandlers.push({ element: input, event: "input", handler });
      return group;
    }
    /**
     * Clear the log
     */
    clearLog() {
      if (this.elements.logContainer) {
        this.elements.logContainer.innerHTML = '<div class="serial-line info">Log cleared</div>';
      }
    }
    /**
     * Show progress bar
     */
    showProgress() {
      this.flashStartTime = Date.now();
      this.lastDisplayedPercent = 0;
      this.targetPercent = 0;
      if (this.elements.progressContainer) {
        this.elements.progressContainer.classList.add("active");
      }
      if (this.elements.progressFill) {
        this.elements.progressFill.style.width = "0%";
      }
      if (this.elements.progressPercent) {
        this.elements.progressPercent.textContent = "0%";
      }
    }
    /**
     * Hide progress bar
     */
    hideProgress() {
      if (this.elements.progressContainer) {
        this.elements.progressContainer.classList.remove("active");
      }
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }
  };

  // src/adapters/vanilla/app.js
  var FlasherApp = class {
    /**
     * @param {Object<string, ProjectConfig>} projects - Project configurations
     */
    constructor(projects) {
      this.projects = projects;
      const projectKeys = Object.keys(projects);
      this.selectedProject = projectKeys.length > 0 ? projects[projectKeys[0]] : null;
      this.btnConnect = document.getElementById("btn-connect");
      this.btnFlash = document.getElementById("btn-flash");
      this.btnWriteConfig = document.getElementById("btn-write-config");
      this.btnClearMonitor = document.getElementById("btn-clear-monitor");
      this.flasher = null;
      this.ui = null;
      this.config = this.loadConfig();
      this.init();
    }
    /**
     * Initialize the application
     */
    init() {
      if (!("serial" in navigator)) {
        document.getElementById("browser-check").style.display = "block";
        this.log("Web Serial API not available", "error");
        return;
      }
      if (!this.selectedProject) {
        this.log("ERROR: No projects found", "error");
        return;
      }
      this.initFlasher();
      this.attachEventListeners();
      this.loadProjectUI();
      this.initializeUIElements();
      this.log("Flasher ready", "success");
      this.attemptAutoReconnect();
    }
    /**
     * Initialize the core flasher from project config
     */
    initFlasher() {
      const project = this.selectedProject;
      const nvsOffset = project.nvsOffset ?? (project.nvsPartition ? parseInt(project.nvsPartition.offset, 16) : 36864);
      const nvsSize = project.nvsSize ?? (project.nvsPartition ? parseInt(project.nvsPartition.size, 16) : 24576);
      const nvsNamespace = project.nvsPartition?.namespace || "config";
      const flasherOptions = {
        chip: project.chip,
        firmwareUrl: project.firmwareUrl,
        firmwareOffset: project.firmwareOffset ?? 65536,
        nvsOffset,
        nvsSize,
        nvsNamespace
      };
      if (project.fields) {
        flasherOptions.fields = project.fields;
      } else if (project.configSections) {
        flasherOptions.configSections = project.configSections;
      }
      this.flasher = new ESPFlasher(flasherOptions);
      const elements = {
        statusBox: document.getElementById("status-box"),
        progressContainer: document.getElementById("progress-container"),
        progressFill: document.getElementById("progress-fill"),
        progressPercent: document.getElementById("progress-percent"),
        progressTime: document.getElementById("progress-time"),
        logContainer: document.getElementById("serial-monitor"),
        chipType: document.getElementById("chip-type"),
        chipMac: document.getElementById("chip-mac"),
        configContainer: document.getElementById("config-container"),
        connectBtn: this.btnConnect,
        flashBtn: this.btnFlash
      };
      this.ui = new FlasherUI(this.flasher, elements);
      this.flasher.addEventListener("chip-mismatch", async (e) => {
        const { expected, detected, proceed, cancel } = e.detail;
        const result = await this.showChipMismatchDialog(expected, detected);
        if (result === "cancel") {
          cancel();
        } else {
          if (result === "always") {
            this.saveChipOverride(detected, expected);
          }
          proceed();
        }
      });
      this.loadSavedConfigIntoFlasher();
    }
    /**
     * Load saved config from localStorage into flasher
     */
    loadSavedConfigIntoFlasher() {
      const schema = this.flasher.getSchema();
      if (!schema || schema.length === 0) return;
      const savedConfig = {};
      for (const field of schema) {
        if (this.config[field.key] !== void 0) {
          savedConfig[field.key] = this.config[field.key];
        }
      }
      if (Object.keys(savedConfig).length > 0) {
        this.flasher.setConfig(savedConfig, { validate: false });
      }
    }
    /**
     * Attempt to reconnect to previously used device
     */
    async attemptAutoReconnect() {
      try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          const lastIndex = localStorage.getItem("lastSerialDeviceIndex");
          const portIndex = lastIndex ? parseInt(lastIndex) : 0;
          const port = ports[portIndex] || ports[0];
          this.log("Attempting to reconnect to previous device...", "info");
          try {
            const device = this.flasher.getDevice();
            await device.connect(this.selectedProject.chip, { port });
            this.log("Auto-reconnected", "success");
            this.btnFlash.disabled = false;
            this.btnFlash.style.display = "block";
            this.btnWriteConfig.disabled = false;
            this.btnConnect.style.display = "none";
          } catch (e) {
            console.log("Auto-reconnect failed:", e.message);
            this.btnConnect.disabled = false;
            this.btnConnect.textContent = "Connect Device";
          }
        }
      } catch (e) {
        console.log("Auto-reconnect not available:", e.message);
      }
    }
    /**
     * Load project UI
     */
    loadProjectUI() {
      const project = this.selectedProject;
      this.log("Loading project: " + project.name, "info");
      this.updateHeader(project);
      this.showProjectDetails(project);
      document.getElementById("project-details").classList.add("active");
      this.renderConfigFields(project);
      this.btnConnect.disabled = false;
      this.btnConnect.textContent = "Connect Device";
      this.btnWriteConfig.title = "Connect device first";
      this.updateStatus("waiting", "Configure Settings", "Fill in configuration, then connect your device");
      this.log("UI loaded. Connect button enabled.", "success");
    }
    /**
     * Update page header with project info
     */
    updateHeader(project) {
      const title = document.getElementById("app-header-title");
      if (title && project.name) {
        title.textContent = project.name;
        document.title = project.name + " - ESP32 Web Flasher";
      }
      const nav = document.getElementById("app-header-nav");
      if (nav) {
        const links = project.navbarLinks || project.headerLinks || [];
        if (links.length > 0) {
          nav.innerHTML = links.map(
            (link) => `<a href="${link.url}" target="_blank" class="app-header-link">${link.label}</a>`
          ).join("");
        }
      }
    }
    /**
     * Show project details in the left panel
     */
    showProjectDetails(project) {
      const hardware = project.hardware.map((h) => `<li>${h}</li>`).join("");
      const software = project.software.map((s) => `<li>${s}</li>`).join("");
      const docLink = project.documentation ? `<a href="${project.documentation.url}" target="_blank" class="doc-link">
                 <span>${project.documentation.label}</span>
                 <span class="external-icon">\u2197</span>
               </a>` : "";
      const hasConfig = project.fields?.length > 0 || project.configSections?.length > 0;
      const configStep = hasConfig ? "Configure settings in the center panel" : "No configuration needed";
      document.getElementById("project-details").innerHTML = `
            <p style="margin-bottom: 24px;">${project.description}</p>
            ${docLink}
            <div class="section section-bg" style="margin-top: 32px;">
                <h3>Hardware</h3>
                <ul class="requirement-list">${hardware}</ul>
            </div>
            <div class="section section-bg">
                <h3>Steps</h3>
                <ul class="instruction-list">
                    <li data-step="1">${configStep}</li>
                    <li data-step="2">Connect your ESP32 device via USB</li>
                    <li data-step="3">Click "Connect Device" and select the serial port</li>
                    <li data-step="4">Click "Flash Firmware" to begin</li>
                    <li data-step="5">Wait for flashing to complete (do not disconnect)</li>
                </ul>
            </div>
        `;
    }
    /**
     * Render config form fields
     * Supports both new 'fields' format and legacy 'configSections' format
     */
    renderConfigFields(project) {
      const container = document.getElementById("config-container");
      const schema = this.flasher.getSchema();
      if (!schema || schema.length === 0) {
        container.innerHTML = '<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';
        return;
      }
      container.innerHTML = "";
      const sections = groupFieldsBySection(schema);
      for (const section of sections) {
        const group = document.createElement("div");
        group.className = "config-group";
        let html = "";
        if (section.title && section.title !== "default") {
          html += `<h3>${section.title}</h3>`;
        }
        for (const field of section.fields) {
          const savedValue = this.config[field.key] || field.default || "";
          const escapedPlaceholder = (field.placeholder || "").replace(/"/g, "&quot;");
          const escapedValue = String(savedValue).replace(/"/g, "&quot;");
          html += `
                    <div class="form-group">
                        <label for="config-${field.key}">
                            ${field.label}
                            ${field.required ? '<span style="color: #ff3b30;">*</span>' : '<span style="color: #86868b; font-weight: 400;">(optional)</span>'}
                        </label>
                        <input
                            type="${field.type || "text"}"
                            id="config-${field.key}"
                            placeholder="${escapedPlaceholder}"
                            value="${escapedValue}"
                            ${field.required ? "required" : ""}
                            ${field.pattern ? `pattern="${field.pattern}"` : ""}
                            data-key="${field.key}">
                        ${field.help ? `<span class="help-text">${field.help}</span>` : ""}
                    </div>
                `;
        }
        group.innerHTML = html;
        container.appendChild(group);
      }
      container.querySelectorAll("[data-key]").forEach((input) => {
        input.addEventListener("input", () => {
          const key = input.dataset.key;
          this.config[key] = input.value;
          this.saveConfig();
          this.flasher.setConfig({ [key]: input.value });
        });
      });
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
      this.btnConnect.addEventListener("click", () => this.handleConnect());
      this.btnFlash.addEventListener("click", () => this.handleFlash());
      this.btnWriteConfig.addEventListener("click", () => this.handleWriteConfig());
      this.btnClearMonitor?.addEventListener("click", () => this.clearLog());
      this.attachDevOptionsListeners();
      const troubleToggle = document.getElementById("troubleshooting-toggle");
      troubleToggle?.addEventListener("click", () => this.toggleTroubleshooting());
      this.attachAboutPanelListeners();
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeDevPanel();
          this.closeAboutPanel();
        }
      });
    }
    /**
     * Attach developer options panel listeners
     */
    attachDevOptionsListeners() {
      const toggle = document.getElementById("dev-mode-toggle");
      const close = document.getElementById("dev-options-close");
      const backdrop = document.getElementById("dev-panel-backdrop");
      toggle?.addEventListener("click", () => this.toggleDevPanel());
      close?.addEventListener("click", () => this.closeDevPanel());
      backdrop?.addEventListener("click", () => this.closeDevPanel());
      document.querySelectorAll(".dev-tab").forEach((tab) => {
        tab.addEventListener("click", () => this.handleDevTabClick(tab));
      });
      document.querySelectorAll('input[name="firmware-source"]').forEach((radio) => {
        radio.addEventListener("change", (e) => this.handleFirmwareSourceChange(e));
      });
      const customFile = document.getElementById("dev-custom-file");
      customFile?.addEventListener("change", (e) => this.handleCustomFileUpload(e));
      const exportBtn = document.getElementById("btn-export-log");
      exportBtn?.addEventListener("click", () => this.exportLog());
    }
    /**
     * Attach about panel listeners
     */
    attachAboutPanelListeners() {
      const aboutLink = document.getElementById("about-link");
      const aboutClose = document.getElementById("about-close");
      const aboutBackdrop = document.getElementById("about-backdrop");
      aboutLink?.addEventListener("click", (e) => {
        e.preventDefault();
        this.openAboutPanel();
      });
      aboutClose?.addEventListener("click", () => this.closeAboutPanel());
      aboutBackdrop?.addEventListener("click", () => this.closeAboutPanel());
    }
    /**
     * Handle connect button click
     */
    async handleConnect() {
      if (!this.selectedProject) return;
      try {
        const skipChipCheck = document.getElementById("dev-skip-chip-check")?.checked || false;
        const device = this.flasher.getDevice();
        await this.flasher.connect();
        this.btnConnect.style.display = "none";
        this.btnFlash.style.display = "block";
        this.btnFlash.disabled = false;
        this.btnWriteConfig.disabled = false;
        this.btnWriteConfig.title = "Write configuration to device NVS partition";
      } catch (e) {
        console.error("Connection failed:", e);
      }
    }
    /**
     * Handle flash button click
     */
    async handleFlash() {
      if (!this.selectedProject) return;
      try {
        this.btnFlash.disabled = true;
        const firmwareSource = document.querySelector('input[name="firmware-source"]:checked')?.value || "release";
        const options = {};
        if (firmwareSource === "custom") {
          const fileInput = document.getElementById("dev-custom-file");
          if (fileInput.files.length > 0) {
            options.customFirmware = fileInput.files[0];
          } else {
            this.log("No custom firmware file selected", "error");
            this.updateStatus("error", "No file selected", "Please select a .bin file in Developer Options");
            this.btnFlash.disabled = false;
            return;
          }
        }
        await this.flasher.flash(options);
        this.btnFlash.style.display = "none";
        this.btnFlash.textContent = "Flash Complete";
      } catch (e) {
        this.btnFlash.disabled = false;
        this.btnFlash.textContent = "Retry Flash";
      }
    }
    /**
     * Handle write config button click
     */
    async handleWriteConfig() {
      if (!this.selectedProject) return;
      if (!this.flasher.isConnected()) {
        this.log("Please connect to device first", "warning");
        this.updateStatus("waiting", "Not connected", 'Click "Connect Device" first');
        return;
      }
      if (!this.selectedProject.nvsPartition) {
        this.log("This project does not have NVS configuration", "warning");
        return;
      }
      try {
        this.btnWriteConfig.disabled = true;
        this.btnWriteConfig.textContent = "Writing...";
        await this.flasher.flashConfig();
        this.updateStatus("success", "Configuration written!", "Config updated on device");
        this.btnWriteConfig.style.display = "none";
      } catch (e) {
        this.log(`Failed to write configuration: ${e.message}`, "error");
        this.updateStatus("error", "Write failed", e.message);
        this.btnWriteConfig.disabled = false;
        this.btnWriteConfig.textContent = "Write Config";
      }
    }
    /**
     * Show chip mismatch dialog
     * @returns {Promise<'cancel'|'once'|'always'>}
     */
    showChipMismatchDialog(expected, detected) {
      return new Promise((resolve) => {
        const statusBox = document.getElementById("status-box");
        const originalHTML = statusBox.innerHTML;
        statusBox.className = "status-box waiting";
        statusBox.innerHTML = `
                <div class="status-text">Chip Mismatch</div>
                <div class="status-subtext" style="margin-bottom: 12px;">Expected ${expected}, found ${detected}</div>
                <div style="display: flex; gap: 8px;">
                    <button id="chip-btn-cancel" class="btn btn-primary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Cancel</button>
                    <button id="chip-btn-once" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Continue</button>
                    <button id="chip-btn-always" class="btn btn-secondary" style="flex: 1; font-size: 13px; padding: 8px 12px;">Always Allow</button>
                </div>
            `;
        const restore = () => {
          statusBox.innerHTML = originalHTML;
        };
        document.getElementById("chip-btn-cancel").addEventListener("click", () => {
          restore();
          resolve("cancel");
        });
        document.getElementById("chip-btn-once").addEventListener("click", () => {
          restore();
          resolve("once");
        });
        document.getElementById("chip-btn-always").addEventListener("click", () => {
          restore();
          resolve("always");
        });
      });
    }
    /**
     * Chip override persistence
     */
    getChipOverrides() {
      const stored = localStorage.getItem("chip-overrides");
      return stored ? JSON.parse(stored) : {};
    }
    saveChipOverride(detected, expected) {
      const overrides = this.getChipOverrides();
      overrides[detected] = expected;
      localStorage.setItem("chip-overrides", JSON.stringify(overrides));
    }
    /**
     * Config persistence
     */
    loadConfig() {
      const stored = localStorage.getItem("esp-flasher-config");
      return stored ? JSON.parse(stored) : {};
    }
    saveConfig() {
      localStorage.setItem("esp-flasher-config", JSON.stringify(this.config));
    }
    /**
     * Logging helpers (delegate to flasher events or direct DOM)
     */
    log(message, level = "info") {
      if (this.flasher) {
        this.flasher.dispatchEvent(new CustomEvent("log", {
          detail: { message, level }
        }));
      } else {
        const monitor = document.getElementById("serial-monitor");
        if (monitor) {
          const line = document.createElement("div");
          line.className = `serial-line ${level}`;
          line.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${message}`;
          monitor.appendChild(line);
          monitor.scrollTop = monitor.scrollHeight;
        }
      }
    }
    updateStatus(state, text, subtext) {
      const statusBox = document.getElementById("status-box");
      if (statusBox) {
        statusBox.className = `status-box ${state}`;
        statusBox.innerHTML = `
                <div class="status-text">${text}</div>
                <div class="status-subtext">${subtext}</div>
            `;
      }
    }
    clearLog() {
      const monitor = document.getElementById("serial-monitor");
      if (monitor) {
        monitor.innerHTML = '<div class="serial-line info">Monitor cleared</div>';
      }
    }
    /**
     * Developer panel methods
     */
    toggleDevPanel() {
      const panel = document.getElementById("dev-options-panel");
      const backdrop = document.getElementById("dev-panel-backdrop");
      const toggle = document.getElementById("dev-mode-toggle");
      panel?.classList.toggle("active");
      backdrop?.classList.toggle("active");
      toggle?.classList.toggle("active");
      document.body.classList.toggle("dev-panel-open");
    }
    closeDevPanel() {
      const panel = document.getElementById("dev-options-panel");
      const backdrop = document.getElementById("dev-panel-backdrop");
      const toggle = document.getElementById("dev-mode-toggle");
      panel?.classList.remove("active");
      backdrop?.classList.remove("active");
      toggle?.classList.remove("active");
      document.body.classList.remove("dev-panel-open");
    }
    handleDevTabClick(tab) {
      const tabName = tab.dataset.tab;
      document.querySelectorAll(".dev-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".dev-tab-content").forEach((c) => c.classList.remove("active"));
      document.querySelector(`.dev-tab-content[data-tab="${tabName}"]`)?.classList.add("active");
    }
    handleFirmwareSourceChange(e) {
      const isRelease = e.target.value === "release";
      document.getElementById("release-options").style.display = isRelease ? "block" : "none";
      document.getElementById("custom-options").style.display = isRelease ? "none" : "block";
    }
    handleCustomFileUpload(e) {
      const file = e.target.files[0];
      const info = document.getElementById("custom-file-info");
      if (file) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        info.textContent = `${file.name} (${sizeMB} MB)`;
      } else {
        info.textContent = "";
      }
    }
    exportLog() {
      const lines = document.getElementById("serial-monitor")?.querySelectorAll(".serial-line");
      const text = Array.from(lines || []).map((l) => l.textContent).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flasher-log-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.log("Log exported successfully", "success");
    }
    toggleTroubleshooting() {
      const toggle = document.getElementById("troubleshooting-toggle");
      const content = document.getElementById("troubleshooting-content");
      toggle?.classList.toggle("collapsed");
      content?.classList.toggle("active");
    }
    openAboutPanel() {
      document.getElementById("about-panel")?.classList.add("active");
      document.getElementById("about-backdrop")?.classList.add("active");
      document.body.classList.add("dev-panel-open");
    }
    closeAboutPanel() {
      document.getElementById("about-panel")?.classList.remove("active");
      document.getElementById("about-backdrop")?.classList.remove("active");
      document.body.classList.remove("dev-panel-open");
    }
    initializeUIElements() {
    }
  };

  // src/adapters/vanilla/index.js
  function createFlasher(options) {
    const { elements, storageKey, ...flasherOptions } = options;
    const buttonListeners = [];
    const flasher = new ESPFlasher(flasherOptions);
    const ui = new FlasherUI(flasher, elements);
    let changeHandler = null;
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          flasher.setConfig(JSON.parse(saved), { validate: false });
        } catch (e) {
          console.warn("Failed to load saved config:", e);
        }
      }
      changeHandler = () => {
        localStorage.setItem(storageKey, JSON.stringify(flasher.getConfig()));
      };
      flasher.addEventListener("change", changeHandler);
    }
    if (elements.connectBtn) {
      const connectHandler = async () => {
        elements.connectBtn.disabled = true;
        try {
          await flasher.connect();
        } catch (e) {
          elements.connectBtn.disabled = false;
        }
      };
      elements.connectBtn.addEventListener("click", connectHandler);
      buttonListeners.push({ element: elements.connectBtn, event: "click", handler: connectHandler });
    }
    if (elements.flashBtn) {
      const flashHandler = async () => {
        elements.flashBtn.disabled = true;
        try {
          await flasher.flash();
        } catch (e) {
          elements.flashBtn.disabled = false;
        }
      };
      elements.flashBtn.addEventListener("click", flashHandler);
      buttonListeners.push({ element: elements.flashBtn, event: "click", handler: flashHandler });
    }
    function dispose() {
      for (const { element, event, handler } of buttonListeners) {
        element.removeEventListener(event, handler);
      }
      if (changeHandler) {
        flasher.removeEventListener("change", changeHandler);
      }
      ui.dispose();
      flasher.dispose();
    }
    return { flasher, ui, dispose };
  }
  return __toCommonJS(bundle_full_exports);
})();
//# sourceMappingURL=esp-webflash-toolkit-full.js.map
