# Partition Table Generator

The Partition Table Generator is a browser-based implementation of ESP-IDF's `gen_esp32part.py` tool. It allows you to create, parse, and validate ESP32 partition table binaries entirely in JavaScript, without requiring ESP-IDF installation.

## Features

- ✅ **Generate partition table binaries** from JavaScript objects
- ✅ **Parse existing binaries** back to partition definitions
- ✅ **Validate partition tables** for alignment, overlaps, and gaps
- ✅ **Built-in templates** for common partition layouts (minimal, OTA, factory)
- ✅ **MD5 checksum** calculation for integrity verification
- ✅ **100% browser-compatible** - no build tools required

## Binary Format

The generated binaries are byte-for-byte compatible with ESP-IDF's partition tables:

- **Location:** 0x8000 in flash (default)
- **Entry size:** 32 bytes
- **Maximum entries:** 95 (0xC00 bytes)
- **Total sector size:** 0x1000 (4KB)
- **Integrity:** MD5 checksum

### Entry Structure (32 bytes)

| Offset | Size | Field     | Description                                      |
|--------|------|-----------|--------------------------------------------------|
| 0-1    | 2    | Magic     | 0xAA50 (little-endian)                          |
| 2      | 1    | Type      | 0x00 (app) or 0x01 (data)                       |
| 3      | 1    | Subtype   | Type-specific subtype                           |
| 4-7    | 4    | Offset    | Flash offset (little-endian, 4KB aligned)       |
| 8-11   | 4    | Size      | Partition size in bytes (little-endian)         |
| 12-27  | 16   | Name      | Null-terminated string (max 15 chars)           |
| 28-31  | 4    | Flags     | Bit 0: encrypted, Bit 1: readonly               |

## Installation

```bash
npm install esp-webflash-toolkit
```

## Usage

### Basic Example

```javascript
import { PartitionTableGenerator } from 'esp-webflash-toolkit/partition-table-generator';

const generator = new PartitionTableGenerator();

// Define partitions
const partitions = [
  { name: 'nvs', type: 'data', subtype: 'nvs', offset: 0x9000, size: 0x6000 },
  { name: 'phy_init', type: 'data', subtype: 'rf', offset: 0xf000, size: 0x1000 },
  { name: 'factory', type: 'app', subtype: 'factory', offset: 0x10000, size: 0x100000 }
];

// Generate binary
const binary = generator.generate(partitions);

// binary is a Uint8Array ready to flash at 0x8000
```

### Using Templates

```javascript
const templates = PartitionTableGenerator.getTemplates();

// Available templates: minimal, ota, ota-spiffs, factory
const otaPartitions = templates.ota;

const binary = generator.generate(otaPartitions);
```

### Parsing Existing Partition Tables

```javascript
// Read from uploaded file or firmware
const binary = new Uint8Array(partitionTableData);

const parsed = generator.parse(binary);

console.log('Partitions:', parsed.partitions);
console.log('MD5:', Array.from(parsed.md5).map(b =>
  b.toString(16).padStart(2, '0')).join(''));

// parsed.partitions contains:
// [
//   {
//     name: 'nvs',
//     type: 'data',
//     typeValue: 1,
//     subtype: 'nvs',
//     subtypeValue: 2,
//     offset: 36864,
//     size: 24576,
//     flags: { encrypted: false, readonly: false }
//   },
//   ...
// ]
```

### Validation

```javascript
const validation = generator.validateTable(partitions);

if (validation.errors.length > 0) {
  console.error('Validation errors:', validation.errors);
  // Example: "Partition 'app' (ends at 0x200000) overlaps with 'spiffs'"
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
  // Example: "Gap of 4096 bytes between 'nvs' and 'factory'"
}
```

### Partition Definition Format

```javascript
{
  name: string,        // Max 16 characters (including null terminator)
  type: string|number, // 'app' | 'data' | 0x00 | 0x01
  subtype: string|number,
  offset: number|string, // Hex string (e.g., '0x10000') or number
  size: number|string,   // Hex string (e.g., '0x100000') or number
  flags: {               // Optional
    encrypted: boolean,
    readonly: boolean
  }
}
```

## Partition Types and Subtypes

### App Partition (type = 0x00 or 'app')

| Subtype   | Value | Description                                |
|-----------|-------|--------------------------------------------|
| factory   | 0x00  | Factory app partition                      |
| ota_0     | 0x10  | OTA app partition 0                        |
| ota_1     | 0x11  | OTA app partition 1                        |
| ...       | ...   | OTA partitions 2-15 (0x12-0x1F)           |
| test      | 0x20  | Test app partition                         |

### Data Partition (type = 0x01 or 'data')

| Subtype    | Value | Description                                |
|------------|-------|--------------------------------------------|
| ota        | 0x00  | OTA selection data                         |
| rf         | 0x01  | PHY init data                              |
| nvs        | 0x02  | Non-volatile storage                       |
| coredump   | 0x03  | Core dump storage                          |
| nvs_keys   | 0x04  | NVS encryption keys                        |
| efuse_em   | 0x05  | eFuse emulation                            |
| esphttpd   | 0x80  | ESPHTTPD storage                           |
| fat        | 0x81  | FAT filesystem                             |
| spiffs     | 0x82  | SPIFFS filesystem                          |
| littlefs   | 0x83  | LittleFS filesystem                        |

## Built-in Templates

### Minimal
Basic single-app partition layout:
- nvs (24KB)
- phy_init (4KB)
- factory app (1MB)

### OTA
Dual partition for over-the-air updates:
- nvs (20KB)
- otadata (8KB)
- phy_init (4KB)
- ota_0 (1.5MB)
- ota_1 (1.5MB)

### OTA + SPIFFS
OTA with filesystem storage:
- nvs (20KB)
- otadata (8KB)
- phy_init (4KB)
- ota_0 (1.25MB)
- ota_1 (1.25MB)
- spiffs (1.4MB)

### Factory
Factory app with OTA fallback:
- nvs (16KB)
- otadata (8KB)
- phy_init (4KB)
- factory (1MB)
- ota_0 (1MB)
- ota_1 (1MB)

## Flash with Firmware

```javascript
import { FirmwareFlasher } from 'esp-webflash-toolkit/firmware-flasher';
import { PartitionTableGenerator } from 'esp-webflash-toolkit/partition-table-generator';

const generator = new PartitionTableGenerator();
const partitions = PartitionTableGenerator.getTemplates().ota;
const partitionBinary = generator.generate(partitions);

// Flash to device at 0x8000
const flasher = new FirmwareFlasher(connection);
await flasher.flashMultiple([
  { offset: 0x1000, data: bootloaderBinary },
  { offset: 0x8000, data: partitionBinary },
  { offset: 0x10000, data: firmwareBinary }
]);
```

## Validation Rules

The generator validates:

1. **Name length:** Max 16 characters (including null terminator)
2. **Offset alignment:** Must be aligned to 4KB (0x1000) boundaries
3. **Overlaps:** Partitions cannot overlap
4. **Entry count:** Maximum 95 partition entries
5. **Required fields:** name, type, subtype, offset, size

Warnings are issued for:
- **Gaps:** Unused space between partitions

## Interactive Example

Open `examples/partition-table-example.html` in a browser to see the generator in action:

```bash
cd esp-webflash-toolkit
# Open examples/partition-table-example.html in Chrome/Edge
```

The example demonstrates:
- Generating from templates
- Parsing uploaded binaries
- Validation with error/warning display
- Hex dump visualization
- Binary download
- Code export

## API Reference

### PartitionTableGenerator

#### Methods

##### `generate(partitions: Array): Uint8Array`
Generate partition table binary from partition definitions.

##### `parse(binary: Uint8Array): Object`
Parse partition table binary to partition definitions.
Returns: `{ partitions: Array, md5: Uint8Array }`

##### `validateTable(partitions: Array): Object`
Validate partition table for errors and warnings.
Returns: `{ errors: Array<string>, warnings: Array<string> }`

##### `static getTemplates(): Object`
Get built-in partition table templates.
Returns: `{ minimal, ota, 'ota-spiffs', factory }`

#### Constants

```javascript
generator.TYPE_APP = 0x00;
generator.TYPE_DATA = 0x01;

generator.SUBTYPE_APP_FACTORY = 0x00;
generator.SUBTYPE_APP_OTA_MIN = 0x10;
generator.SUBTYPE_DATA_NVS = 0x02;
generator.SUBTYPE_DATA_SPIFFS = 0x82;
// ... (see source for full list)
```

## Advanced Usage

### Custom Partition Layouts

```javascript
const customPartitions = [
  // Boot partitions
  { name: 'nvs', type: 'data', subtype: 'nvs',
    offset: 0x9000, size: 0x4000 },

  { name: 'otadata', type: 'data', subtype: 'ota',
    offset: 0xd000, size: 0x2000 },

  { name: 'phy_init', type: 'data', subtype: 'rf',
    offset: 0xf000, size: 0x1000 },

  // App partitions
  { name: 'ota_0', type: 'app', subtype: 'ota_0',
    offset: 0x10000, size: 0x1A0000 },

  { name: 'ota_1', type: 'app', subtype: 'ota_1',
    offset: 0x1B0000, size: 0x1A0000 },

  // Data storage
  { name: 'spiffs', type: 'data', subtype: 'spiffs',
    offset: 0x350000, size: 0xA0000,
    flags: { readonly: true } },

  { name: 'coredump', type: 'data', subtype: 'coredump',
    offset: 0x3F0000, size: 0x10000 }
];

const binary = generator.generate(customPartitions);
```

### Encrypted Partitions

```javascript
const partitions = [
  { name: 'nvs', type: 'data', subtype: 'nvs',
    offset: 0x9000, size: 0x6000,
    flags: { encrypted: true } }, // Enable encryption

  { name: 'factory', type: 'app', subtype: 'factory',
    offset: 0x10000, size: 0x100000,
    flags: { encrypted: true } }
];
```

## Comparison with ESP-IDF

| Feature | ESP-IDF gen_esp32part.py | This Generator |
|---------|--------------------------|----------------|
| Generate binary | ✅ | ✅ |
| Parse binary | ✅ | ✅ |
| MD5 checksum | ✅ | ✅ |
| CSV input | ✅ | ❌ (uses JS objects) |
| Runs in browser | ❌ | ✅ |
| Requires Python | ✅ | ❌ |
| Requires ESP-IDF | ✅ | ❌ |

## Troubleshooting

### "Offset not aligned" error
Partition offsets must be multiples of 4KB (0x1000):
```javascript
// ❌ Wrong
{ offset: 0x10500 }  // Not aligned

// ✅ Correct
{ offset: 0x10000 }  // 4KB aligned
```

### "Partition overlaps" error
Check that partition regions don't overlap:
```javascript
// Partition 1 ends at: offset + size = 0x10000 + 0x100000 = 0x110000
// Partition 2 must start at: >= 0x110000
```

### "Name too long" error
Partition names are limited to 15 characters (plus null terminator):
```javascript
// ❌ Wrong
{ name: 'my_very_long_partition_name' }

// ✅ Correct
{ name: 'my_partition' }
```

## See Also

- [NVS Generator](./nvs-generator.md) - Generate NVS partition data
- [Firmware Flasher](./firmware-flasher.md) - Flash binaries to ESP32
- [ESP-IDF Partition Tables](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html)
