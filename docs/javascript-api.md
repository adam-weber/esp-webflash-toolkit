# JavaScript API Reference

## Installation

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/esp-webflash-toolkit-full.min.js"></script>
<script>
    const { flashDevice, ESPFlasher, NVSGenerator } = ESPWebFlash;
</script>
```

### npm

```bash
npm install esp-webflash-toolkit
```

```javascript
import { flashDevice, ESPFlasher, NVSGenerator } from 'esp-webflash-toolkit';
```

---

## flashDevice(options)

Flash a device in one call. The simplest API.

```javascript
await flashDevice({
    firmware: 'https://example.com/firmware.bin',
    config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
    onProgress: (percent) => console.log(`${percent}%`)
});
```

**Parameters:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `firmware` | string | Yes | Firmware URL |
| `config` | object | No | Key-value config to write to NVS |
| `chip` | string | No | Expected chip type (`esp32`, `esp32s3`, etc.) |
| `onProgress` | function | No | Progress callback `(percent: number) => void` |
| `onLog` | function | No | Log callback `(message: string, level: string) => void` |
| `firmwareOffset` | number | No | Firmware flash offset (default: `0x10000`) |
| `nvsOffset` | number | No | NVS partition offset (default: `0x9000`) |

**Returns:** `Promise<{ chipType: string, macAddr: string }>`

---

## ESPFlasher

Event-driven flasher for custom UIs.

### Constructor

```javascript
const flasher = new ESPFlasher({
    chip: 'esp32',
    firmwareUrl: 'https://example.com/firmware.bin',
    fields: ['wifi', 'mqtt'],
    firmwareOffset: 0x10000,
    nvsOffset: 0x9000,
    nvsSize: 0x6000,
    nvsNamespace: 'config'
});
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chip` | string | null | Expected chip type |
| `firmwareUrl` | string | null | Firmware URL |
| `fields` | array | [] | Config field definitions or preset names |
| `firmwareOffset` | number | 0x10000 | Firmware flash offset |
| `nvsOffset` | number | 0x9000 | NVS partition offset |
| `nvsSize` | number | 0x6000 | NVS partition size |
| `nvsNamespace` | string | 'config' | NVS namespace |

### Events

```javascript
flasher.addEventListener('progress', e => console.log(e.detail.percent));
flasher.addEventListener('log', e => console.log(e.detail.message, e.detail.level));
flasher.addEventListener('status', e => console.log(e.detail.state, e.detail.message));
flasher.addEventListener('connected', e => console.log(e.detail.chipType, e.detail.macAddr));
flasher.addEventListener('disconnected', e => {});
flasher.addEventListener('error', e => console.error(e.detail.message));
flasher.addEventListener('complete', e => {});
flasher.addEventListener('chip-mismatch', e => {
    // e.detail: { expected, detected, proceed(), cancel() }
});
```

### Methods

```javascript
// Connection
await flasher.connect();
await flasher.disconnect();
flasher.isConnected();

// Configuration
flasher.setConfig({ wifi_ssid: 'MyNetwork', wifi_pass: 'secret' });
flasher.getConfig();
flasher.getSchema();

// Flashing
await flasher.flash();                    // Flash firmware + config
await flasher.flash({ customFirmware });  // Flash custom File object
await flasher.flashConfig();              // Flash only NVS config

// Device
await flasher.reset();
flasher.dispose();
```

---

## NVSGenerator

Generate NVS partition binaries directly.

```javascript
import { NVSGenerator } from 'esp-webflash-toolkit';

const nvs = new NVSGenerator();
const binary = nvs.generate({
    config: {
        wifi_ssid: 'MyNetwork',
        wifi_pass: 'MyPassword',
        device_id: 42
    }
}, 0x6000);  // 24KB partition size

// binary is a Uint8Array ready to flash at 0x9000
```

### generate(data, size)

**Parameters:**

- `data` (object) - Namespaced key-value pairs. Top-level keys are NVS namespaces.
- `size` (number) - Partition size in bytes (default: 0x6000 / 24KB)

**Returns:** `Uint8Array`

**Supported types:**

- Strings (up to 1984 bytes)
- Numbers (u8, u16, u32 auto-detected)

### parse(binary)

Parse an NVS partition binary back to an object.

```javascript
const data = nvs.parse(binary);
// { config: { wifi_ssid: 'MyNetwork', ... } }
```

---

## Field Presets

Built-in field presets expand to common config patterns:

```javascript
const flasher = new ESPFlasher({
    fields: ['wifi', 'mqtt', 'device_name']
});
```

| Preset | Expands to |
|--------|------------|
| `'wifi'` | `wifi_ssid` (text, required), `wifi_pass` (password, required) |
| `'mqtt'` | `mqtt_host` (text), `mqtt_user` (text), `mqtt_pass` (password) |
| `'device_name'` | `device_name` (text) |

### Custom Fields

```javascript
fields: [
    'wifi',  // preset
    { key: 'api_url', label: 'API URL', type: 'text', required: true },
    { key: 'refresh_rate', label: 'Refresh Rate', type: 'number', default: 60 }
]
```

**Field properties:**

| Property | Type | Description |
|----------|------|-------------|
| `key` | string | NVS key name (max 15 chars) |
| `label` | string | Display label |
| `type` | string | `text`, `password`, `number` |
| `required` | boolean | Whether field is required |
| `default` | any | Default value |
| `placeholder` | string | Input placeholder |
| `help` | string | Help text |

---

## Low-Level Components

For advanced usage, these components are also exported:

```javascript
import {
    DeviceConnection,   // Serial connection management
    FirmwareFlasher,    // Flash operations
    ConfigStore,        // Config state management
    FieldPresets,       // Field preset definitions
    expandFieldPresets  // Expand preset names to field objects
} from 'esp-webflash-toolkit';
```

---

## Reading Config in Firmware

The generated NVS partitions use standard ESP-IDF format:

**C/C++ (ESP-IDF)**

```c
nvs_handle_t handle;
nvs_open("config", NVS_READONLY, &handle);

char ssid[32];
size_t len = sizeof(ssid);
nvs_get_str(handle, "wifi_ssid", ssid, &len);

nvs_close(handle);
```

**Arduino**

```cpp
#include <Preferences.h>

Preferences prefs;
prefs.begin("config", true);
String ssid = prefs.getString("wifi_ssid", "");
prefs.end();
```

**Rust (esp-idf-svc)**

```rust
let nvs = EspNvs::new(partition, "config", true)?;
let ssid = nvs.get_str("wifi_ssid")?;
```
