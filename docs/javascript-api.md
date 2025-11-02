# JavaScript API Reference

Function signatures and parameters for NVS binary generation in JavaScript. Compatible with browser and Node.js environments.

## Installation

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/nvs-generator.js"></script>
```

## NVSGenerator

### Constructor

```javascript
new NVSGenerator()
```

Creates a new NVS generator instance. No parameters required.

### generate(config, size)

Generates an NVS partition binary from a configuration object.

**Parameters:**

- `config` (Object) - Configuration data structured as namespaces containing key-value pairs
- `size` (Number) - Partition size in bytes (hexadecimal or decimal)

**Returns:** `Uint8Array` - Binary data ready for flashing

**Example:**

```javascript
const generator = new NVSGenerator();
const config = {
    wifi: { ssid: "Network", password: "pass123" },
    mqtt: { broker: "192.168.1.100", port: 1883 }
};
const binary = generator.generate(config, 0x6000);  // 24KB partition
```

**Notes:**

- Top-level object keys define NVS namespaces
- Nested keys define entries within namespaces
- Data types inferred from JavaScript types (string, number, boolean)
- Strings limited to 1984 bytes per entry

### NVSGenerator.calculateSize(config)

Calculates appropriate partition size for a given configuration.

**Parameters:**

- `config` (Object) - Configuration object to analyze

**Returns:** `Object`

```javascript
{
    minimum: Number,      // Minimum viable size (hex)
    recommended: Number,  // Recommended size with headroom (hex)
    entries: Number,      // Total number of key-value pairs
    pagesUsed: Number,    // Pages required for entries
    pagesTotal: Number    // Total pages in recommended size
}
```

**Example:**

```javascript
const sizeInfo = NVSGenerator.calculateSize(config);
console.log(sizeInfo.recommended);  // 0x6000
const binary = generator.generate(config, sizeInfo.recommended);
```

**Notes:**

- Accounts for ESP-IDF minimum (3 pages / 12KB)
- Recommended size provides 2× minimum for wear leveling
- Each page holds 126 entries (4096 bytes: 32-byte header + 126 × 32-byte entries)

## detectNVSPartition(espLoader)

Reads partition table from device flash and returns NVS partition information.

**Parameters:**

- `espLoader` (ESPLoader) - Connected esptool-js loader instance

**Returns:** `Promise<Object>`

```javascript
{
    offset: Number,  // Flash address of NVS partition (hex)
    size: Number,    // Partition size in bytes (hex)
    label: String    // Partition label from table
}
```

**Example:**

```javascript
const partition = await detectNVSPartition(espLoader);
const binary = generator.generate(config, partition.size);
await espLoader.writeFlash({
    fileArray: [{ data: binaryToString(binary), address: partition.offset }],
    flashSize: 'keep'
});
```

**Requirements:**

- Firmware must be flashed with partition table
- Partition table at standard location (0x8000)
- Partition table must be unencrypted

**Throws:** Error if partition table cannot be read or parsed

**Notes:**

- Returns first partition with type=data, subtype=nvs
- Reads from flash offset 0x8000 (ESP-IDF default)
- Fails on blank chips or custom partition layouts

## DeviceConnection

Manages serial connection to ESP32 devices via Web Serial API.

### Constructor

```javascript
new DeviceConnection(ui)
```

**Parameters:**

- `ui` (FlasherUI) - UI instance for status updates and logging

### connect(project, options)

Establish serial connection and detect chip type.

**Parameters:**

- `project` (Object) - Project configuration with chip type and settings
- `options` (Object) - Connection options:
  - `port` (SerialPort, optional) - Pre-selected port for auto-reconnect
  - `skipChipCheck` (Boolean, default: false) - Skip chip type validation

**Returns:** `Promise<Object>`

```javascript
{
    chipType: String,  // Detected chip (e.g., "ESP32-C3")
    macAddr: String    // Device MAC address
}
```

**Example:**

```javascript
const connection = new DeviceConnection(ui);
const { chipType, macAddr } = await connection.connect(project);
console.log(`Connected to ${chipType} (${macAddr})`);
```

**Throws:** Error on connection failure, chip mismatch (if user cancels), or timeout

### disconnect()

Close serial connection and clean up resources.

**Returns:** `Promise<void>`

### readFlash(offset, size)

Read data from device flash memory.

**Parameters:**

- `offset` (Number) - Flash address in bytes (e.g., 0x9000)
- `size` (Number) - Number of bytes to read

**Returns:** `Promise<Uint8Array>` - Flash data

**Example:**

```javascript
// Read NVS partition from 0x9000 (24KB)
const nvsData = await connection.readFlash(0x9000, 0x6000);
const config = parseNVSConfig(nvsData);
```

### getESPStub()

Get esptool-js loader instance for direct flash operations.

**Returns:** `ESPLoader` - Active loader instance or null

### getIsConnected()

Check connection status.

**Returns:** `Boolean` - True if connected

## ConfigManager

Handles configuration form rendering and persistence.

### Constructor

```javascript
new ConfigManager()
```

Automatically loads saved configuration from localStorage.

### renderConfigFields(project)

Generate configuration form from project definition.

**Parameters:**

- `project` (Object) - Project with configSections array defining form structure

**Example:**

```javascript
const manager = new ConfigManager();
manager.renderConfigFields({
    configSections: [{
        id: 'wifi',
        title: 'WiFi Settings',
        fields: [
            { id: 'ssid', label: 'SSID', type: 'text', required: true, nvsKey: 'wifi_ssid' },
            { id: 'password', label: 'Password', type: 'password', required: true, nvsKey: 'wifi_pass' }
        ]
    }]
});
```

### getConfig()

Get current configuration values.

**Returns:** `Object` - Configuration organized by section ID

```javascript
{
    wifi: { ssid: "MyNetwork", password: "secret123" },
    mqtt: { broker: "192.168.1.100", port: 1883 }
}
```

### populateFromNVS(nvsData, project)

Load configuration from device into form fields.

**Parameters:**

- `nvsData` (Object) - Parsed NVS data (key-value pairs)
- `project` (Object) - Project definition with field mappings

**Example:**

```javascript
const flashData = await connection.readFlash(0x9000, 0x6000);
const nvsData = parseNVSConfig(flashData);
manager.populateFromNVS(nvsData, project);
```

### saveConfig()

Persist current configuration to localStorage.

### clearConfig()

Clear all configuration values and reload form.

## FirmwareFlasher

Handles firmware download, NVS generation, and flashing operations.

### Constructor

```javascript
new FirmwareFlasher(ui, configManager)
```

**Parameters:**

- `ui` (FlasherUI) - UI instance for status and progress
- `configManager` (ConfigManager) - Config manager for NVS generation

### flash(project, espStub, options)

Flash firmware and configuration to device.

**Parameters:**

- `project` (Object) - Project configuration
- `espStub` (ESPLoader) - Connected esptool-js instance
- `options` (Object, optional) - Flash options:
  - `customFirmware` (File, optional) - Custom .bin file instead of downloading from release

**Returns:** `Promise<Boolean>` - True on success

**Example:**

```javascript
const flasher = new FirmwareFlasher(ui, configManager);
const espStub = connection.getESPStub();
await flasher.flash(project, espStub);
```

**Throws:** Error on download failure, flash error, or NVS generation error

**Notes:**

- Downloads firmware from project.firmwareUrl unless customFirmware provided
- Automatically generates and flashes NVS partition if project.nvsPartition exists
- Reports progress via ui.updateProgress() callback
- Flashes firmware at 0x0 (includes bootloader, partition table, app)

## FlasherUI

Manages UI state, progress indicators, and logging.

### Constructor

```javascript
new FlasherUI()
```

Automatically binds to DOM elements by ID.

### updateStatus(state, text, subtext)

Update status indicator.

**Parameters:**

- `state` (String) - Status: 'waiting', 'connected', 'flashing', 'success', 'error'
- `text` (String) - Main status text
- `subtext` (String) - Detailed status message

**Example:**

```javascript
ui.updateStatus('connected', 'Device connected', 'Ready to flash');
```

### updateProgress(percent, written, total)

Update progress bar with smooth animation.

**Parameters:**

- `percent` (Number) - Completion percentage (0-100)
- `written` (Number) - Bytes written
- `total` (Number) - Total bytes

### showProgress() / hideProgress()

Show or hide progress indicator.

### log(message, type)

Add timestamped log entry to console.

**Parameters:**

- `message` (String) - Log message
- `type` (String, default: 'info') - Type: 'info', 'success', 'warning', 'error'

**Example:**

```javascript
ui.log('Downloading firmware...', 'info');
ui.log('Flash complete!', 'success');
```

### updateChipInfo(chipType, macAddr)

Display detected chip information.

**Parameters:**

- `chipType` (String) - Chip model (e.g., "ESP32-C3")
- `macAddr` (String) - MAC address

### clearLog()

Clear console output.

## FlasherApp

Main application coordinator integrating all components.

### Constructor

```javascript
new FlasherApp(projects)
```

**Parameters:**

- `projects` (Object) - Project definitions keyed by project ID

**Example:**

```javascript
const app = new FlasherApp({
    'my-project': {
        name: 'My ESP32 Project',
        chip: 'ESP32-C3',
        firmwareUrl: 'https://github.com/user/repo/releases/download/v1.0/firmware.bin',
        nvsPartition: { offset: '0x9000', size: '0x6000', namespace: 'config' },
        configSections: [/* ... */]
    }
});
```

**Notes:**

- Automatically initializes all components (UI, ConfigManager, DeviceConnection, FirmwareFlasher)
- Checks browser compatibility (Web Serial API)
- Attempts auto-reconnect to previously connected device
- Handles all UI event listeners and workflows

## Output Verification

Binary compatibility verification against ESP-IDF reference implementation:

```bash
# Generate with ESP-IDF
echo "config,namespace,," > test.csv
echo "port,data,u16,1883" >> test.csv
python -m esp_idf_nvs_partition_gen generate test.csv test_esp.bin 0x6000

# Generate with this library
node -e "
const gen = new (require('./nvs-generator.js'))();
const bin = gen.generate({config: {port: 1883}}, 0x6000);
require('fs').writeFileSync('test_js.bin', Buffer.from(bin));
"

# Compare
diff test_esp.bin test_js.bin
# Should be identical
```
