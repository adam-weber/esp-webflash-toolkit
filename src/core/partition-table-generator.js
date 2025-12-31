/**
 * Partition Table Generator for ESP32
 *
 * Generates partition table binaries that can be flashed to ESP32 devices.
 * This is a client-side JavaScript implementation of ESP-IDF's gen_esp32part.py.
 *
 * @author Adam Weber (github: adam-weber)
 *
 * Partition Table Format:
 * - Located at 0x8000 in flash (default)
 * - Each entry is 32 bytes
 * - Maximum 95 entries (0xC00 bytes)
 * - Full sector size: 0x1000 (4KB)
 * - MD5 checksum at end for integrity
 */

class PartitionTableGenerator {
    constructor() {
        this.PARTITION_TABLE_SIZE = 0x1000;  // 4KB sector
        this.MAX_PARTITION_LENGTH = 0xC00;   // 3KB (96 entries max)
        this.ENTRY_SIZE = 32;
        this.MAGIC_BYTES = 0xAA50;
        this.MD5_PARTITION_BEGIN = [0xEB, 0xEB];

        // Partition types
        this.TYPE_APP = 0x00;
        this.TYPE_DATA = 0x01;

        // App subtypes
        this.SUBTYPE_APP_FACTORY = 0x00;
        this.SUBTYPE_APP_OTA_MIN = 0x10;
        this.SUBTYPE_APP_OTA_MAX = 0x1F;
        this.SUBTYPE_APP_TEST = 0x20;

        // Data subtypes
        this.SUBTYPE_DATA_OTA = 0x00;
        this.SUBTYPE_DATA_RF = 0x01;
        this.SUBTYPE_DATA_WIFI = 0x02;
        this.SUBTYPE_DATA_NVS = 0x02;  // Same as WIFI
        this.SUBTYPE_DATA_COREDUMP = 0x03;
        this.SUBTYPE_DATA_NVS_KEYS = 0x04;
        this.SUBTYPE_DATA_EFUSE_EM = 0x05;
        this.SUBTYPE_DATA_ESPHTTPD = 0x80;
        this.SUBTYPE_DATA_FAT = 0x81;
        this.SUBTYPE_DATA_SPIFFS = 0x82;
        this.SUBTYPE_DATA_LITTLEFS = 0x83;

        // Flags
        this.FLAG_ENCRYPTED = 1 << 0;
        this.FLAG_READONLY = 1 << 1;

        // Alignment requirement
        this.PARTITION_ALIGNMENT = 0x1000;  // 4KB
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
        binary.fill(0xFF);  // Initialize with 0xFF (erased flash state)

        let offset = 0;

        // Write each partition entry
        for (let i = 0; i < partitions.length; i++) {
            const partition = this.normalizePartition(partitions[i]);
            this.validatePartition(partition, i);
            this.writeEntry(binary, offset, partition);
            offset += this.ENTRY_SIZE;

            if (offset >= this.MAX_PARTITION_LENGTH) {
                throw new Error('Too many partition entries (max 95)');
            }
        }

        // Calculate MD5 checksum over all entries
        const tableData = binary.slice(0, offset);
        const md5sum = this.calculateMD5(tableData);

        // Write MD5 entry
        this.writeMD5Entry(binary, offset, md5sum);

        return binary;
    }

    /**
     * Normalize partition object to standard format
     */
    normalizePartition(partition) {
        const normalized = { ...partition };

        // Convert type string to number
        if (typeof normalized.type === 'string') {
            const typeMap = { 'app': this.TYPE_APP, 'data': this.TYPE_DATA };
            normalized.type = typeMap[normalized.type.toLowerCase()];
            if (normalized.type === undefined) {
                throw new Error(`Unknown partition type: ${partition.type}`);
            }
        }

        // Convert subtype string to number
        if (typeof normalized.subtype === 'string') {
            normalized.subtype = this.parseSubtype(normalized.subtype, normalized.type);
        }

        // Parse hex strings to numbers
        if (typeof normalized.offset === 'string') {
            normalized.offset = parseInt(normalized.offset, 16);
        }
        if (typeof normalized.size === 'string') {
            normalized.size = parseInt(normalized.size, 16);
        }

        // Parse flags
        if (!normalized.flags) {
            normalized.flags = 0;
        } else if (typeof normalized.flags === 'object') {
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
                'factory': this.SUBTYPE_APP_FACTORY,
                'test': this.SUBTYPE_APP_TEST
            };
            // Handle ota_0 through ota_15
            if (subtypeLower.startsWith('ota_')) {
                const otaNum = parseInt(subtypeLower.substring(4));
                if (otaNum >= 0 && otaNum <= 15) {
                    return this.SUBTYPE_APP_OTA_MIN + otaNum;
                }
            }
            return appSubtypes[subtypeLower];
        } else if (type === this.TYPE_DATA) {
            const dataSubtypes = {
                'ota': this.SUBTYPE_DATA_OTA,
                'rf': this.SUBTYPE_DATA_RF,
                'wifi': this.SUBTYPE_DATA_WIFI,
                'nvs': this.SUBTYPE_DATA_NVS,
                'coredump': this.SUBTYPE_DATA_COREDUMP,
                'nvs_keys': this.SUBTYPE_DATA_NVS_KEYS,
                'efuse_em': this.SUBTYPE_DATA_EFUSE_EM,
                'esphttpd': this.SUBTYPE_DATA_ESPHTTPD,
                'fat': this.SUBTYPE_DATA_FAT,
                'spiffs': this.SUBTYPE_DATA_SPIFFS,
                'littlefs': this.SUBTYPE_DATA_LITTLEFS
            };
            return dataSubtypes[subtypeLower];
        }

        throw new Error(`Unknown subtype: ${subtypeStr}`);
    }

    /**
     * Validate partition entry
     */
    validatePartition(partition, index) {
        // Check name length
        if (!partition.name || partition.name.length === 0) {
            throw new Error(`Partition ${index}: name is required`);
        }
        if (partition.name.length > 16) {
            throw new Error(`Partition ${index}: name too long (max 16 chars): ${partition.name}`);
        }

        // Check type and subtype
        if (partition.type === undefined) {
            throw new Error(`Partition ${index}: type is required`);
        }
        if (partition.subtype === undefined) {
            throw new Error(`Partition ${index}: subtype is required`);
        }

        // Check offset alignment
        if (partition.offset % this.PARTITION_ALIGNMENT !== 0) {
            throw new Error(
                `Partition ${index} (${partition.name}): offset 0x${partition.offset.toString(16)} ` +
                `is not aligned to 0x${this.PARTITION_ALIGNMENT.toString(16)} bytes`
            );
        }

        // Check size
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

        // Sort by offset
        const sorted = [...partitions].sort((a, b) => a.offset - b.offset);

        // Check for overlaps
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            const currentEnd = current.offset + current.size;

            if (currentEnd > next.offset) {
                errors.push(
                    `Partition '${current.name}' (ends at 0x${currentEnd.toString(16)}) ` +
                    `overlaps with '${next.name}' (starts at 0x${next.offset.toString(16)})`
                );
            } else if (currentEnd < next.offset) {
                const gap = next.offset - currentEnd;
                warnings.push(
                    `Gap of ${gap} bytes (0x${gap.toString(16)}) between ` +
                    `'${current.name}' and '${next.name}'`
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

        // Entry format (32 bytes):
        // [0-1]   Magic bytes (0xAA50)
        // [2]     Type
        // [3]     Subtype
        // [4-7]   Offset (little-endian)
        // [8-11]  Size (little-endian)
        // [12-27] Name (16 bytes, null-terminated)
        // [28-31] Flags (little-endian)

        view.setUint16(offset + 0, this.MAGIC_BYTES, true);  // Little-endian
        view.setUint8(offset + 2, partition.type);
        view.setUint8(offset + 3, partition.subtype);
        view.setUint32(offset + 4, partition.offset, true);
        view.setUint32(offset + 8, partition.size, true);

        // Write name (max 16 bytes including null terminator)
        const nameBytes = new TextEncoder().encode(partition.name.substring(0, 15));
        binary.set(nameBytes, offset + 12);
        // Null-terminate and pad
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

        // MD5 entry format:
        // [0-1]   0xEBEB marker
        // [2-15]  0xFF padding
        // [16-31] MD5 hash (16 bytes)

        view.setUint8(offset + 0, this.MD5_PARTITION_BEGIN[0]);
        view.setUint8(offset + 1, this.MD5_PARTITION_BEGIN[1]);

        // Padding (already 0xFF from initialization)
        for (let i = 2; i < 16; i++) {
            binary[offset + i] = 0xFF;
        }

        // Write MD5 hash
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
            // Read magic bytes
            const magic = view.getUint16(offset, true);

            // Check for end of table (0xFFFF)
            if (magic === 0xFFFF) {
                break;
            }

            // Check for MD5 entry
            if (view.getUint8(offset) === this.MD5_PARTITION_BEGIN[0] &&
                view.getUint8(offset + 1) === this.MD5_PARTITION_BEGIN[1]) {
                md5 = new Uint8Array(binary.buffer, binary.byteOffset + offset + 16, 16);
                break;
            }

            // Check for valid magic
            if (magic !== this.MAGIC_BYTES) {
                console.warn(`Invalid magic bytes at offset ${offset}: 0x${magic.toString(16)}`);
                break;
            }

            // Parse partition entry
            const type = view.getUint8(offset + 2);
            const subtype = view.getUint8(offset + 3);
            const partOffset = view.getUint32(offset + 4, true);
            const size = view.getUint32(offset + 8, true);

            // Read name (null-terminated)
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
                size: size,
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
            [this.TYPE_APP]: 'app',
            [this.TYPE_DATA]: 'data'
        };
        return types[type] || `0x${type.toString(16)}`;
    }

    /**
     * Get human-readable subtype name
     */
    getSubtypeName(type, subtype) {
        if (type === this.TYPE_APP) {
            if (subtype === this.SUBTYPE_APP_FACTORY) return 'factory';
            if (subtype === this.SUBTYPE_APP_TEST) return 'test';
            if (subtype >= this.SUBTYPE_APP_OTA_MIN && subtype <= this.SUBTYPE_APP_OTA_MAX) {
                return `ota_${subtype - this.SUBTYPE_APP_OTA_MIN}`;
            }
        } else if (type === this.TYPE_DATA) {
            const subtypes = {
                [this.SUBTYPE_DATA_OTA]: 'ota',
                [this.SUBTYPE_DATA_RF]: 'rf',
                [this.SUBTYPE_DATA_NVS]: 'nvs',
                [this.SUBTYPE_DATA_COREDUMP]: 'coredump',
                [this.SUBTYPE_DATA_NVS_KEYS]: 'nvs_keys',
                [this.SUBTYPE_DATA_EFUSE_EM]: 'efuse_em',
                [this.SUBTYPE_DATA_ESPHTTPD]: 'esphttpd',
                [this.SUBTYPE_DATA_FAT]: 'fat',
                [this.SUBTYPE_DATA_SPIFFS]: 'spiffs',
                [this.SUBTYPE_DATA_LITTLEFS]: 'littlefs'
            };
            if (subtypes[subtype]) return subtypes[subtype];
        }
        return `0x${subtype.toString(16)}`;
    }

    /**
     * Calculate MD5 hash
     * @param {Uint8Array} data - Data to hash
     * @returns {Uint8Array} - MD5 hash (16 bytes)
     *
     * Implementation verified against RFC 1321 test vectors:
     * - MD5("") = d41d8cd98f00b204e9800998ecf8427e
     * - MD5("a") = 0cc175b9c0f1b6a831c399e269772661
     * - MD5("abc") = 900150983cd24fb0d6963f7d28e17f72
     * - MD5("message digest") = f96b697d7cb7938d525a2f31aaf161d0
     */
    calculateMD5(data) {
        return this._md5Core(data);
    }

    /**
     * MD5 hash implementation following RFC 1321
     * This is a complete, correct implementation suitable for partition table checksums.
     *
     * @private
     * @param {Uint8Array} data - Input data
     * @returns {Uint8Array} - 16-byte MD5 hash
     */
    _md5Core(data) {
        // Helper functions
        function add32(a, b) {
            return (a + b) & 0xFFFFFFFF;
        }

        function rotl(x, n) {
            return ((x << n) | (x >>> (32 - n))) >>> 0;
        }

        function F(x, y, z) { return (x & y) | (~x & z); }
        function G(x, y, z) { return (x & z) | (y & ~z); }
        function H(x, y, z) { return x ^ y ^ z; }
        function I(x, y, z) { return y ^ (x | ~z); }

        function step(fn, a, b, c, d, x, s, t) {
            return add32(rotl(add32(add32(a, fn(b, c, d)), add32(x, t)), s), b);
        }

        // Pre-processing: adding padding bits
        const msgLen = data.length;
        // Message length in bits (as 64-bit value, but we only use low 32 bits for now)
        const bitLen = msgLen * 8;

        // Padding: message + 1 bit + zeros + 64-bit length
        // Total length must be congruent to 448 mod 512 (56 mod 64 bytes)
        const padLen = (msgLen % 64 < 56) ? (56 - msgLen % 64) : (120 - msgLen % 64);
        const totalLen = msgLen + padLen + 8;

        const padded = new Uint8Array(totalLen);
        padded.set(data);
        padded[msgLen] = 0x80;  // Append bit '1'

        // Append original length in bits as 64-bit little-endian
        const view = new DataView(padded.buffer);
        view.setUint32(totalLen - 8, bitLen >>> 0, true);       // Low 32 bits
        view.setUint32(totalLen - 4, Math.floor(bitLen / 0x100000000), true);  // High 32 bits

        // Initialize hash values
        let a = 0x67452301;
        let b = 0xEFCDAB89;
        let c = 0x98BADCFE;
        let d = 0x10325476;

        // Process each 64-byte (512-bit) block
        for (let i = 0; i < totalLen; i += 64) {
            const aa = a, bb = b, cc = c, dd = d;

            // Load block into 16 32-bit words (little-endian)
            const x = new Uint32Array(16);
            for (let j = 0; j < 16; j++) {
                x[j] = view.getUint32(i + j * 4, true);
            }

            // Round 1
            a = step(F, a, b, c, d, x[0],  7,  0xd76aa478);
            d = step(F, d, a, b, c, x[1],  12, 0xe8c7b756);
            c = step(F, c, d, a, b, x[2],  17, 0x242070db);
            b = step(F, b, c, d, a, x[3],  22, 0xc1bdceee);
            a = step(F, a, b, c, d, x[4],  7,  0xf57c0faf);
            d = step(F, d, a, b, c, x[5],  12, 0x4787c62a);
            c = step(F, c, d, a, b, x[6],  17, 0xa8304613);
            b = step(F, b, c, d, a, x[7],  22, 0xfd469501);
            a = step(F, a, b, c, d, x[8],  7,  0x698098d8);
            d = step(F, d, a, b, c, x[9],  12, 0x8b44f7af);
            c = step(F, c, d, a, b, x[10], 17, 0xffff5bb1);
            b = step(F, b, c, d, a, x[11], 22, 0x895cd7be);
            a = step(F, a, b, c, d, x[12], 7,  0x6b901122);
            d = step(F, d, a, b, c, x[13], 12, 0xfd987193);
            c = step(F, c, d, a, b, x[14], 17, 0xa679438e);
            b = step(F, b, c, d, a, x[15], 22, 0x49b40821);

            // Round 2
            a = step(G, a, b, c, d, x[1],  5,  0xf61e2562);
            d = step(G, d, a, b, c, x[6],  9,  0xc040b340);
            c = step(G, c, d, a, b, x[11], 14, 0x265e5a51);
            b = step(G, b, c, d, a, x[0],  20, 0xe9b6c7aa);
            a = step(G, a, b, c, d, x[5],  5,  0xd62f105d);
            d = step(G, d, a, b, c, x[10], 9,  0x02441453);
            c = step(G, c, d, a, b, x[15], 14, 0xd8a1e681);
            b = step(G, b, c, d, a, x[4],  20, 0xe7d3fbc8);
            a = step(G, a, b, c, d, x[9],  5,  0x21e1cde6);
            d = step(G, d, a, b, c, x[14], 9,  0xc33707d6);
            c = step(G, c, d, a, b, x[3],  14, 0xf4d50d87);
            b = step(G, b, c, d, a, x[8],  20, 0x455a14ed);
            a = step(G, a, b, c, d, x[13], 5,  0xa9e3e905);
            d = step(G, d, a, b, c, x[2],  9,  0xfcefa3f8);
            c = step(G, c, d, a, b, x[7],  14, 0x676f02d9);
            b = step(G, b, c, d, a, x[12], 20, 0x8d2a4c8a);

            // Round 3
            a = step(H, a, b, c, d, x[5],  4,  0xfffa3942);
            d = step(H, d, a, b, c, x[8],  11, 0x8771f681);
            c = step(H, c, d, a, b, x[11], 16, 0x6d9d6122);
            b = step(H, b, c, d, a, x[14], 23, 0xfde5380c);
            a = step(H, a, b, c, d, x[1],  4,  0xa4beea44);
            d = step(H, d, a, b, c, x[4],  11, 0x4bdecfa9);
            c = step(H, c, d, a, b, x[7],  16, 0xf6bb4b60);
            b = step(H, b, c, d, a, x[10], 23, 0xbebfbc70);
            a = step(H, a, b, c, d, x[13], 4,  0x289b7ec6);
            d = step(H, d, a, b, c, x[0],  11, 0xeaa127fa);
            c = step(H, c, d, a, b, x[3],  16, 0xd4ef3085);
            b = step(H, b, c, d, a, x[6],  23, 0x04881d05);
            a = step(H, a, b, c, d, x[9],  4,  0xd9d4d039);
            d = step(H, d, a, b, c, x[12], 11, 0xe6db99e5);
            c = step(H, c, d, a, b, x[15], 16, 0x1fa27cf8);
            b = step(H, b, c, d, a, x[2],  23, 0xc4ac5665);

            // Round 4
            a = step(I, a, b, c, d, x[0],  6,  0xf4292244);
            d = step(I, d, a, b, c, x[7],  10, 0x432aff97);
            c = step(I, c, d, a, b, x[14], 15, 0xab9423a7);
            b = step(I, b, c, d, a, x[5],  21, 0xfc93a039);
            a = step(I, a, b, c, d, x[12], 6,  0x655b59c3);
            d = step(I, d, a, b, c, x[3],  10, 0x8f0ccc92);
            c = step(I, c, d, a, b, x[10], 15, 0xffeff47d);
            b = step(I, b, c, d, a, x[1],  21, 0x85845dd1);
            a = step(I, a, b, c, d, x[8],  6,  0x6fa87e4f);
            d = step(I, d, a, b, c, x[15], 10, 0xfe2ce6e0);
            c = step(I, c, d, a, b, x[6],  15, 0xa3014314);
            b = step(I, b, c, d, a, x[13], 21, 0x4e0811a1);
            a = step(I, a, b, c, d, x[4],  6,  0xf7537e82);
            d = step(I, d, a, b, c, x[11], 10, 0xbd3af235);
            c = step(I, c, d, a, b, x[2],  15, 0x2ad7d2bb);
            b = step(I, b, c, d, a, x[9],  21, 0xeb86d391);

            // Add this block's hash to result so far
            a = add32(a, aa);
            b = add32(b, bb);
            c = add32(c, cc);
            d = add32(d, dd);
        }

        // Output hash (little-endian)
        const hash = new Uint8Array(16);
        const hashView = new DataView(hash.buffer);
        hashView.setUint32(0, a, true);
        hashView.setUint32(4, b, true);
        hashView.setUint32(8, c, true);
        hashView.setUint32(12, d, true);

        return hash;
    }

    /**
     * Verify MD5 implementation against known test vectors
     * Call this to validate the implementation is correct
     * @returns {boolean} - True if all test vectors pass
     */
    static verifyMD5() {
        const gen = new PartitionTableGenerator();
        const encoder = new TextEncoder();

        const testVectors = [
            { input: '', expected: 'd41d8cd98f00b204e9800998ecf8427e' },
            { input: 'a', expected: '0cc175b9c0f1b6a831c399e269772661' },
            { input: 'abc', expected: '900150983cd24fb0d6963f7d28e17f72' },
            { input: 'message digest', expected: 'f96b697d7cb7938d525a2f31aaf161d0' },
            { input: 'abcdefghijklmnopqrstuvwxyz', expected: 'c3fcd3d76192e4007dfb496cca67e13b' }
        ];

        for (const { input, expected } of testVectors) {
            const data = encoder.encode(input);
            const hash = gen.calculateMD5(data);
            const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
            if (hashHex !== expected) {
                console.error(`MD5 verification failed for "${input}": got ${hashHex}, expected ${expected}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Get predefined partition table templates
     */
    static getTemplates() {
        return {
            minimal: [
                { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x6000 },
                { name: 'phy_init', type: 'data', subtype: 'rf', offset: 0xf000, size: 0x1000 },
                { name: 'factory', type: 'app', subtype: 'factory', offset: 0x10000, size: 0x100000 }
            ],
            ota: [
                { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x6000 },
                { name: 'otadata', type: 'data', subtype: 'ota', offset: 0xf000, size: 0x2000 },
                { name: 'ota_0', type: 'app', subtype: 'ota_0', offset: 0x20000, size: 0x180000 },
                { name: 'ota_1', type: 'app', subtype: 'ota_1', offset: 0x1A0000, size: 0x180000 }
            ],
            'ota-spiffs': [
                { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x6000 },
                { name: 'otadata', type: 'data', subtype: 'ota', offset: 0xf000, size: 0x2000 },
                { name: 'ota_0', type: 'app', subtype: 'ota_0', offset: 0x20000, size: 0x180000 },
                { name: 'ota_1', type: 'app', subtype: 'ota_1', offset: 0x1A0000, size: 0x180000 },
                { name: 'spiffs', type: 'data', subtype: 'spiffs', offset: 0x320000, size: 0xE0000 }
            ],
            factory: [
                { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x4000 },
                { name: 'otadata', type: 'data', subtype: 'ota', offset: 0xd000, size: 0x2000 },
                { name: 'phy_init', type: 'data', subtype: 'rf', offset: 0xf000, size: 0x1000 },
                { name: 'factory', type: 'app', subtype: 'factory', offset: 0x10000, size: 0x100000 },
                { name: 'ota_0', type: 'app', subtype: 'ota_0', offset: 0x110000, size: 0x100000 },
                { name: 'ota_1', type: 'app', subtype: 'ota_1', offset: 0x210000, size: 0x100000 }
            ]
        };
    }
}

// Expose to browser global scope and for module exports
if (typeof window !== 'undefined') {
    window.PartitionTableGenerator = PartitionTableGenerator;
}

export { PartitionTableGenerator };
