# ESP WebFlash Toolkit

**Let users flash your ESP32 firmware from a browser. No installs, no drivers, just a URL.**

[![npm version](https://img.shields.io/npm/v/esp-webflash-toolkit.svg)](https://www.npmjs.com/package/esp-webflash-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Try the Demo](https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/) | [Documentation](https://adam-weber.github.io/esp-webflash-toolkit/)

---

## Quick Start

### Option 1: Hosted Flasher (Zero Setup)

Generate a flash URL right now — no code, no hosting:

```
https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/?name=MyProject&bin=YOUR_FIRMWARE_URL&chip=esp32
```

Or use the [interactive URL generator](https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/).

**With flash-config.json:** Add this file to your repo root:

```json
{
  "name": "My Project",
  "firmware": "firmware.bin",
  "chip": "esp32"
}
```

Then share one link: `https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/?repo=YOUR_USER/YOUR_REPO`

The hosted flasher reads your config and lets users flash directly.

---

### Option 2: Your Own Flasher Page

```bash
npx esp-webflash-toolkit
```

Interactive setup walks you through configuration:

```
? Project name: My Sensor
? Chip type: ESP32-S3
? Firmware URL: https://github.com/me/sensor/releases/latest/download/firmware.bin
? Add WiFi configuration? Yes

Creating my-sensor/...
Done!
```

Then:

```bash
cd my-sensor
npx serve . -l 3000
```

Push to GitHub, enable Pages, and your users can flash from `https://you.github.io/my-sensor/`.

---

### Option 3: Library Integration

```bash
npm install esp-webflash-toolkit
```

**Simple API** — flash a device in one call:

```javascript
import { flashDevice } from 'esp-webflash-toolkit';

await flashDevice({
  firmware: 'https://example.com/firmware.bin',
  config: {
    wifi_ssid: 'MyNetwork',
    wifi_pass: 'MyPassword'
  },
  onProgress: (percent) => console.log(`${percent}%`)
});
```

**Advanced API** — full control for custom UIs:

```javascript
import { ESPFlasher } from 'esp-webflash-toolkit';

const flasher = new ESPFlasher({
  chip: 'esp32',
  firmwareUrl: 'https://example.com/firmware.bin',
  fields: ['wifi']
});

flasher.addEventListener('progress', e => updateProgressBar(e.detail.percent));
flasher.addEventListener('log', e => appendToConsole(e.detail.message));

await flasher.connect();
flasher.setConfig({ wifi_ssid: 'MyNetwork', wifi_pass: 'secret' });
await flasher.flash();
```

**NVS Generation** — generate partition binaries directly:

```javascript
import { NVSGenerator } from 'esp-webflash-toolkit/nvs-generator';

const nvs = new NVSGenerator();
const binary = nvs.generate({
  config: {
    wifi_ssid: 'MyNetwork',
    wifi_pass: 'MyPassword',
    device_name: 'sensor-001'
  }
});

// Flash `binary` to NVS partition at 0x9000
```

---

## What This Solves

You've built an ESP32 project. Now you need users to flash it.

**Traditional approach:** "Install Python, install esptool, run this command, if it fails try holding BOOT..."

**With this toolkit:** "Click this link, plug in your device, click Flash."

---

## Features

- **Browser-based flashing** via Web Serial API
- **NVS partition generation** — WiFi credentials, device config, custom settings
- **Simple and advanced APIs** — one-liner or full event-driven control
- **Field presets** — `'wifi'`, `'mqtt'`, `'device_name'` expand to common config patterns
- **Works with:** ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP8266

---

## CLI Commands

```bash
npx esp-webflash-toolkit              # Interactive setup wizard
npx esp-webflash-toolkit create NAME  # Quick scaffold with defaults
npx esp-webflash-toolkit url          # Generate a hosted flash URL
npx esp-webflash-toolkit --help       # Show all options
```

---

## flash-config.json Reference

Add to your repo root for the hosted flasher:

```json
{
  "name": "My ESP Project",
  "firmware": "firmware.bin",
  "chip": "esp32s3",
  "offset": "0x10000",
  "fields": [
    "wifi",
    { "key": "device_name", "label": "Device Name", "type": "text" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `name` | Project display name |
| `firmware` | Filename in releases (auto-resolves to latest), or full URL |
| `chip` | `esp32`, `esp32s2`, `esp32s3`, `esp32c3`, `esp8266` |
| `offset` | Flash offset for firmware (default: `0x10000`) |
| `fields` | Config fields: `"wifi"`, `"mqtt"`, or custom `{key, label, type}` |

---

## Reading Config in Firmware

The generated NVS partitions use standard ESP-IDF format:

```c
// C/C++
nvs_handle_t handle;
nvs_open("config", NVS_READONLY, &handle);

char ssid[32];
size_t len = sizeof(ssid);
nvs_get_str(handle, "wifi_ssid", ssid, &len);
```

```rust
// Rust (esp-idf-svc)
let nvs = EspNvs::new(partition, "config", true)?;
let ssid = nvs.get_str("wifi_ssid")?;
```

---

## Browser Support

Requires [Web Serial API](https://caniuse.com/web-serial):

- Chrome 89+
- Edge 89+
- Opera 75+

Safari and Firefox don't support Web Serial.

---

## API Reference

### flashDevice(options)

Flash a device in one call.

```javascript
await flashDevice({
  firmware: 'https://...',      // Required: firmware URL
  config: { key: 'value' },     // Optional: NVS config
  chip: 'esp32',                // Optional: expected chip type
  onProgress: (percent) => {},  // Optional: progress callback
  onLog: (msg, level) => {},    // Optional: log callback
  firmwareOffset: 0x10000,      // Optional: firmware offset
  nvsOffset: 0x9000             // Optional: NVS offset
});
```

### ESPFlasher

Event-driven flasher for custom UIs.

```javascript
const flasher = new ESPFlasher(options);

// Events: 'progress', 'log', 'status', 'connected', 'disconnected', 'error', 'complete'
flasher.addEventListener('progress', e => console.log(e.detail.percent));

await flasher.connect();
flasher.setConfig({ wifi_ssid: 'test' });
await flasher.flash();
flasher.dispose();
```

### NVSGenerator

Generate NVS partition binaries.

```javascript
const nvs = new NVSGenerator();
const binary = nvs.generate({ namespace: { key: 'value' } }, 0x6000);
```

---

## License

MIT

---

## Credits

Built on [esptool-js](https://github.com/nicmcd/esptool-js) for ESP32 flash protocol.
