# ESP WebFlash Toolkit

Flash ESP32 firmware from a browser. No toolchain, no drivers, no app — just a web page and a USB cable.

## What It Does

- **Flash firmware** over USB using the Web Serial API
- **Generate NVS config** in JavaScript, byte-compatible with ESP-IDF's `nvs_flash`
- **Build custom partition tables** for any flash layout
- **Embed a flasher** on any page with the [`<esp-flasher>` web component](web-component.md)

## Quick Start

### Drop-in web component

The fastest way to add flashing to your project. One script tag, one element:

```html
<script src="https://cdn.jsdelivr.net/npm/esp-webflash-toolkit@latest/dist/esp-flasher-component.min.js"></script>

<esp-flasher
  firmware="https://github.com/user/repo/releases/latest/download/firmware.bin"
  chip="esp32s3"
  fields="wifi"
></esp-flasher>
```

See the [Web Component docs](web-component.md) for modes, theming, events, and the full config schema.

### JavaScript API

For custom UIs or programmatic control:

```javascript
import { flashDevice } from 'esp-webflash-toolkit';

await flashDevice({
  firmware: 'https://example.com/firmware.bin',
  config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
  onProgress: (percent) => console.log(`${percent}%`)
});
```

See the [Quickstart](quickstart.md) for more examples and the [API reference](javascript-api.md) for the full surface.

### CLI scaffold

Generate a complete flasher project:

```bash
npx esp-webflash-toolkit create my-flasher
```

## Demos

- **[Web Component Demo](/examples/component/)** — `<esp-flasher>` in compact and full mode
- **[Hosted Flasher](/examples/hosted/)** — config-driven flasher with variant support
- **[Partition Table Generator](/examples/partition-table-example.html)** — interactive partition layout tool

## Browser Support

Requires Web Serial API: **Chrome 89+**, **Edge 89+**, **Opera 75+**.
