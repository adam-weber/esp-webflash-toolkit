/**
 * NVS Partition Generator for ESP32
 *
 * Generates NVS (Non-Volatile Storage) partition binaries that can be flashed
 * to ESP32 devices. This is a client-side JavaScript implementation of the
 * ESP-IDF nvs_partition_gen.py functionality.
 *
 * NVS Format:
 * - Partition divided into pages (4096 bytes each)
 * - Each page contains entries (32 bytes each)
 * - First page contains partition state
 * - Entries store key-value pairs with type information
 */

class NVSGenerator {
    constructor() {
        this.PAGE_SIZE = 4096;
        this.ENTRY_SIZE = 32;
        this.ENTRIES_PER_PAGE = 126; // (4096 - 32) / 32

        // NVS entry types
        this.TYPE_U8 = 0x01;
        this.TYPE_I8 = 0x11;
        this.TYPE_U16 = 0x02;
        this.TYPE_I16 = 0x12;
        this.TYPE_U32 = 0x04;
        this.TYPE_I32 = 0x14;
        this.TYPE_STR = 0x21;
        this.TYPE_BLOB = 0x41;

        // Page states
        this.PAGE_STATE_ACTIVE = 0xFFFFFFFE;
        this.PAGE_STATE_FULL = 0xFFFFFFFC;
        this.PAGE_STATE_EMPTY = 0xFFFFFFFF;
    }

    /**
     * Generate NVS partition binary from key-value pairs
     * @param {Object} data - Key-value pairs organized by namespace
     * @param {number} partitionSize - Size of partition in bytes (default: 0x6000 = 24KB)
     * @returns {Uint8Array} - Binary data ready to flash
     */
    generate(data, partitionSize = 0x6000) {
        const numPages = Math.floor(partitionSize / this.PAGE_SIZE);
        const binary = new Uint8Array(partitionSize);
        binary.fill(0xFF); // Initialize with 0xFF (erased flash state)

        let pageIndex = 0;
        let entryIndex = 1;  // Start at 1 (entry 0 reserved for bitmap)
        let namespaceIndex = 0;  // Sequential namespace index

        // Build namespace map
        const namespaceMap = {};
        for (const namespace of Object.keys(data)) {
            if (Object.keys(data[namespace]).length > 0) {
                namespaceMap[namespace] = ++namespaceIndex;
            }
        }

        // Write bitmap entry at index 0 (ESP-IDF format)
        // Bitmap marks which entries are in use (0xAA = first few entries used)
        const bitmapOffset = pageIndex * this.PAGE_SIZE + 32;
        binary[bitmapOffset] = 0xAA;  // Bitmap pattern
        binary[bitmapOffset + 1] = 0xAA;

        // Process each namespace
        for (const [namespace, entries] of Object.entries(data)) {
            // Add namespace entry if we have data
            if (Object.keys(entries).length > 0) {
                const nsIndex = namespaceMap[namespace];
                this.writeEntry(binary, pageIndex, entryIndex++, {
                    namespace: 0, // Namespace entries use index 0
                    type: 0x01, // Namespace type (ESP-IDF uses 0x01)
                    span: 1,
                    key: namespace,
                    data: new Uint8Array([nsIndex])  // Store the index in data
                });

                // Add key-value entries
                for (const [key, value] of Object.entries(entries)) {
                    const entry = this.createEntry(nsIndex, key, value);
                    this.writeEntry(binary, pageIndex, entryIndex, entry);
                    entryIndex += entry.span; // Increment by span, not just 1

                    // Move to next page if current page is full
                    if (entryIndex >= this.ENTRIES_PER_PAGE) {
                        this.finalizePage(binary, pageIndex, entryIndex);
                        pageIndex++;
                        entryIndex = 1;  // Start at 1 (entry 0 reserved for bitmap)

                        // Write bitmap for new page
                        const newBitmapOffset = pageIndex * this.PAGE_SIZE + 32;
                        binary[newBitmapOffset] = 0xAA;
                        binary[newBitmapOffset + 1] = 0xAA;

                        if (pageIndex >= numPages) {
                            throw new Error('NVS partition size too small for data');
                        }
                    }
                }
            }
        }

        // Finalize last page
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

        if (typeof value === 'string') {
            type = this.TYPE_STR;
            const encoder = new TextEncoder();
            const strBytes = encoder.encode(value);
            data = new Uint8Array(strBytes.length + 1); // +1 for null terminator
            data.set(strBytes);
            data[strBytes.length] = 0; // Null terminator
            console.log(`[NVS Writer] Key: ${key}, value: "${value}", data.length: ${data.length}, bytes:`, Array.from(data));
        } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                if (value >= 0 && value <= 255) {
                    type = this.TYPE_U8;
                    data = new Uint8Array([value]);
                } else if (value >= 0 && value <= 65535) {
                    type = this.TYPE_U16;
                    data = new Uint8Array(2);
                    new DataView(data.buffer).setUint16(0, value, true); // little-endian
                } else {
                    type = this.TYPE_U32;
                    data = new Uint8Array(4);
                    new DataView(data.buffer).setUint32(0, value, true); // little-endian
                }
            } else {
                throw new Error('Float values not supported yet');
            }
        } else {
            throw new Error(`Unsupported value type for key ${key}: ${typeof value}`);
        }

        // Calculate span correctly:
        // - Strings/blobs ALWAYS use at least 2 entries (span >= 2)
        // - First entry: metadata (length at offset 24)
        // - Second+ entries: data (32 bytes per entry)
        let span = 1;
        if (type === this.TYPE_STR || type === this.TYPE_BLOB) {
            // Minimum span is 2 for strings/blobs
            span = 1 + Math.ceil(data.length / this.ENTRY_SIZE);
        } else {
            // For numeric types, span is always 1
            span = 1;
        }

        return {
            namespace: namespaceIndex,  // Use sequential index
            type: type,
            span: span,
            key: key,
            data: data
        };
    }

    /**
     * Write an entry to the binary at the specified page and entry index
     */
    writeEntry(binary, pageIndex, entryIndex, entry) {
        const offset = pageIndex * this.PAGE_SIZE + 32 + entryIndex * this.ENTRY_SIZE;
        const view = new DataView(binary.buffer);

        // Entry format (32 bytes) - ESP-IDF official format:
        // [0] Namespace (1 byte)
        // [1] Type (1 byte)
        // [2] Span (1 byte)
        // [3] Reserved (1 byte)
        // [4-7] CRC32 (4 bytes)
        // [8-23] Key (16 bytes, null-padded)
        // [24-31] Data (8 bytes for values ≤8 bytes)

        binary[offset + 0] = entry.namespace;
        binary[offset + 1] = entry.type;
        binary[offset + 2] = entry.span;
        binary[offset + 3] = 0xFF; // Reserved

        // Write key (max 15 chars + null terminator)
        const keyBytes = new TextEncoder().encode(entry.key.substring(0, 15));
        binary.set(keyBytes, offset + 8);  // Key starts at offset 8
        for (let i = keyBytes.length; i < 16; i++) {
            binary[offset + 8 + i] = 0;
        }

        // For strings/blobs, write length at offset 24, ALL data goes to continuation entries
        if (entry.type === this.TYPE_STR || entry.type === this.TYPE_BLOB) {
            view.setUint16(offset + 24, entry.data.length, true);  // Length at offset 24-25
            // Bytes 26-31 are unused/padding (0xFF)

            // ALL string data goes into continuation entries (starting from entry index + 1)
            let dataOffset = 0;
            for (let i = 1; i < entry.span; i++) {
                const nextEntryOffset = offset + i * this.ENTRY_SIZE;
                const chunk = entry.data.slice(dataOffset, dataOffset + this.ENTRY_SIZE);
                binary.set(chunk, nextEntryOffset);
                dataOffset += this.ENTRY_SIZE;
            }
        } else {
            // Numeric types: write data inline at offset 24
            binary.set(entry.data, offset + 24);
        }

        // Calculate and write CRC32 at offset 4-7
        // CRC is calculated over: namespace(1) + type(1) + span(1) + reserved(1) + key(16) + data(8) = 28 bytes
        const crcData = new Uint8Array(28);
        crcData[0] = binary[offset + 0];  // namespace
        crcData[1] = binary[offset + 1];  // type
        crcData[2] = binary[offset + 2];  // span
        crcData[3] = binary[offset + 3];  // reserved
        crcData.set(binary.slice(offset + 8, offset + 24), 4);   // key (16 bytes)
        crcData.set(binary.slice(offset + 24, offset + 32), 20); // data (8 bytes)

        const crc = this.calculateCRC32(crcData);
        view.setUint32(offset + 4, crc, true);  // CRC at offset 4
    }

    /**
     * Finalize a page by writing the page header
     */
    finalizePage(binary, pageIndex, numEntries) {
        const offset = pageIndex * this.PAGE_SIZE;
        const view = new DataView(binary.buffer);

        // Page header (32 bytes):
        // [0-3] Page state (4 bytes)
        // [4-7] Sequence number (4 bytes)
        // [8-11] Version (4 bytes) - set to 0xFFFFFFFF (unused)
        // [12-31] Reserved

        view.setUint32(offset + 0, this.PAGE_STATE_ACTIVE, true);
        view.setUint32(offset + 4, pageIndex, true); // Sequence number
        view.setUint32(offset + 8, 0xFFFFFFFF, true); // Version (unused)

        // Calculate page CRC and store at end of header
        const headerCRC = this.calculateCRC32(binary.slice(offset, offset + 28));
        view.setUint32(offset + 28, headerCRC, true);
    }


    /**
     * Calculate CRC32 checksum
     * This is a simplified implementation - ESP-IDF uses proper CRC32
     */
    calculateCRC32(data) {
        let crc = 0xFFFFFFFF;

        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
            }
        }

        return ~crc >>> 0; // Convert to unsigned 32-bit
    }
}

/**
 * Helper function to generate NVS partition from web form inputs
 * @param {Object} config - Configuration object from form
 * @param {string} namespace - NVS namespace (default: 'config')
 * @param {number} partitionSize - Partition size in bytes
 * @returns {Uint8Array} - NVS partition binary
 */
function generateNVSFromConfig(config, namespace = 'config', partitionSize = 0x6000) {
    const generator = new NVSGenerator();

    // Flatten config structure into namespace data
    const nvsData = {};
    nvsData[namespace] = {};

    for (const [section, fields] of Object.entries(config)) {
        for (const [field, value] of Object.entries(fields)) {
            // Create NVS key from section and field (e.g., 'wifi_ssid')
            const key = `${section}_${field}`;
            nvsData[namespace][key] = value;
        }
    }

    return generator.generate(nvsData, partitionSize);
}

/**
 * Parse NVS partition binary back into key-value pairs
 * @param {Uint8Array} binary - NVS partition binary data
 * @returns {Object} - Parsed data organized by namespace
 */
NVSGenerator.prototype.parse = function(binary) {
    const data = {};
    const namespaces = {}; // Map namespace index to name

    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    const numPages = Math.floor(binary.length / this.PAGE_SIZE);

    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
        const pageOffset = pageIdx * this.PAGE_SIZE;

        // Read page header
        const pageState = view.getUint32(pageOffset, true);

        // Skip empty or invalid pages
        if (pageState === this.PAGE_STATE_EMPTY || pageState === 0) {
            continue;
        }

        // Read entries in this page (start at 1, entry 0 is bitmap)
        for (let entryIdx = 1; entryIdx < this.ENTRIES_PER_PAGE; ) {
            const entryOffset = pageOffset + 32 + (entryIdx * this.ENTRY_SIZE);

            // Check if entry is used (namespace byte != 0xFF)
            const namespace = view.getUint8(entryOffset);
            if (namespace === 0xFF) {
                entryIdx++;
                continue; // Empty entry
            }

            const type = view.getUint8(entryOffset + 1);
            const span = view.getUint8(entryOffset + 2);

            // Read key (16 bytes, null-terminated) - starts at offset 8
            const keyBytes = new Uint8Array(binary.buffer, binary.byteOffset + entryOffset + 8, 16);
            const keyEnd = keyBytes.indexOf(0);
            const key = new TextDecoder().decode(keyBytes.slice(0, keyEnd > 0 ? keyEnd : 16));

            // Handle namespace entries (type 0x01 AND namespace 0)
            if (type === 0x01 && namespace === 0) {
                // Namespace entries have index 0, actual index is in data[0]
                const nsIndex = view.getUint8(entryOffset + 24);
                namespaces[nsIndex] = key;
                if (!data[key]) {
                    data[key] = {};
                }
                entryIdx += span;
                continue;
            }

            // Get namespace name
            const namespaceName = namespaces[namespace] || `ns_${namespace}`;
            if (!data[namespaceName]) {
                data[namespaceName] = {};
            }

            // Parse value based on type
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
                // String: length at offset+24 (2 bytes), ALL data in continuation entries
                const strLen = view.getUint16(entryOffset + 24, true);
                const totalBytes = new Uint8Array(strLen);
                let bytesRead = 0;

                // Read from continuation entries ONLY (skip first entry, it only has length)
                for (let s = 1; s < span; s++) {
                    const spanOffset = entryOffset + (s * this.ENTRY_SIZE);
                    const chunkSize = Math.min(strLen - bytesRead, this.ENTRY_SIZE);

                    totalBytes.set(
                        new Uint8Array(binary.buffer, binary.byteOffset + spanOffset, chunkSize),
                        bytesRead
                    );
                    bytesRead += chunkSize;
                }

                // Find null terminator and decode only up to that point
                const nullIndex = totalBytes.indexOf(0);
                const actualLen = nullIndex >= 0 ? nullIndex : strLen;
                console.log(`[NVS Parser] Key: ${key}, strLen: ${strLen}, span: ${span}, bytes:`, Array.from(totalBytes.slice(0, actualLen + 1)));
                value = new TextDecoder().decode(totalBytes.slice(0, actualLen));
            } else if (type === this.TYPE_BLOB) {
                // Blob: similar to string but return as Uint8Array
                const blobLen = view.getUint16(entryOffset + 20, true);
                value = new Uint8Array(binary.buffer, binary.byteOffset + entryOffset + 24, Math.min(blobLen, 8));
            } else {
                // Unknown type
                entryIdx++;
                continue;
            }

            data[namespaceName][key] = value;
            entryIdx += span;  // Skip span entries (includes this one + continuation entries)
        }
    }

    return data;
};

/**
 * Parse NVS partition and return config matching the expected structure
 * @param {Uint8Array} binary - NVS partition binary data
 * @param {string} namespace - Expected namespace (default: 'config')
 * @returns {Object} - Parsed config with nvsKey mappings
 */
function parseNVSConfig(binary, namespace = 'config') {
    const generator = new NVSGenerator();
    const parsed = generator.parse(binary);

    // Return the namespace data directly
    return parsed[namespace] || {};
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NVSGenerator, generateNVSFromConfig, parseNVSConfig };
}

// Also expose globally for browser usage
if (typeof window !== 'undefined') {
    window.NVSGenerator = NVSGenerator;
    window.generateNVSFromConfig = generateNVSFromConfig;
    window.parseNVSConfig = parseNVSConfig;
}
