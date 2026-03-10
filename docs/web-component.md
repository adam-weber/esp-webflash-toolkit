# Web Component

The `<esp-flasher>` web component is a self-contained, embeddable flasher. Add a script tag and an HTML element to any page — it handles connection, configuration, flashing, error recovery, and progress out of the box.

It uses Shadow DOM for style isolation, so it works on any site without CSS conflicts.

> **[Live Demo](/examples/component/)** — see it in action

## Installation

### CDN (recommended)

```html
<script src="https://cdn.jsdelivr.net/npm/esp-webflash-toolkit@latest/dist/esp-flasher-component.min.js"></script>
```

The script self-registers the `<esp-flasher>` custom element. No build step needed.

### npm

```bash
npm install esp-webflash-toolkit
```

```javascript
import 'esp-webflash-toolkit/component';
```

## Quick Start

The simplest possible flasher — one element, three attributes:

```html
<esp-flasher
  firmware="https://github.com/user/repo/releases/latest/download/firmware.bin"
  chip="esp32s3"
  fields="wifi"
></esp-flasher>
```

This renders a **Flash Firmware** button. When clicked, it opens a modal with the full flash UI: device connection, WiFi configuration fields, progress bar, and error recovery.

## Modes

### Compact mode (default)

Renders a single button. Clicking it opens the flash UI in a modal overlay with a blurred backdrop. This is ideal for embedding in existing pages where you don't want the flasher to dominate the layout.

```html
<esp-flasher firmware="https://..." chip="esp32s3" fields="wifi"></esp-flasher>
```

The modal includes a close button and dismisses on backdrop click.

### Full mode

Renders the complete flash UI inline as a card. Use this when the flasher is the primary content on the page, or when you want it visible without requiring a click.

```html
<esp-flasher firmware="https://..." chip="esp32" fields="wifi,device_name" mode="full"></esp-flasher>
```

The card renders at a max-width of 400px and centers itself horizontally.

## Configuration Sources

The component accepts configuration in two ways.

### Inline attributes

For simple setups, pass everything as HTML attributes:

```html
<esp-flasher
  firmware="https://github.com/user/repo/releases/latest/download/firmware.bin"
  chip="esp32"
  fields="wifi,device_name"
  mode="full"
></esp-flasher>
```

### Config URL

For projects with multiple firmware variants, branding, or post-flash instructions, point to a [flash-config.json v2](#config-v2-schema) file:

```html
<esp-flasher
  config="https://raw.githubusercontent.com/user/repo/main/flash-config.json"
  mode="full"
></esp-flasher>
```

The component fetches the config, normalizes it, and renders a variant dropdown if multiple variants are defined. It handles CORS automatically with a proxy fallback.

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `firmware` | string | — | URL to the firmware binary |
| `chip` | string | `esp32` | Expected chip type (`esp32`, `esp32s3`, `esp32c3`, etc.) |
| `fields` | string | — | Comma-separated field presets or custom field keys |
| `mode` | string | `compact` | `compact` (button → modal) or `full` (inline card) |
| `config` | string | — | URL to a flash-config.json file |
| `config-data` | string | — | Inline JSON config (for programmatic use) |
| `theme` | string | `light` | `light` or `dark` |

## Field Presets

The `fields` attribute accepts preset names that expand to common configuration patterns:

| Preset | Expands to | Input types |
|--------|------------|-------------|
| `wifi` | `wifi_ssid`, `wifi_pass` | text, password |
| `mqtt` | `mqtt_host`, `mqtt_user`, `mqtt_pass` | text, text, password |
| `device_name` | `device_name` | text |

Combine presets with commas: `fields="wifi,mqtt,device_name"`

You can also define custom fields through the config URL or `config-data` attribute. See the [JavaScript API](javascript-api.md#custom-fields) for the full field definition format.

## Events

The component dispatches Custom Events with `composed: true` so they cross the Shadow DOM boundary. Listen on the element directly:

```javascript
const el = document.querySelector('esp-flasher')

el.addEventListener('esp-flasher:connected', (e) => {
  console.log('Chip:', e.detail.chipType)
  console.log('MAC:', e.detail.macAddr)
})

el.addEventListener('esp-flasher:complete', () => {
  console.log('Flash complete!')
})

el.addEventListener('esp-flasher:error', (e) => {
  console.log('Error:', e.detail.message)
})
```

| Event | Detail | Description |
|-------|--------|-------------|
| `esp-flasher:connected` | `{ chipType, macAddr }` | Device connected and identified |
| `esp-flasher:complete` | `{}` | Flash completed successfully |
| `esp-flasher:error` | `{ message }` | An error occurred |

## Programmatic Access

The component exposes its internal `ESPFlasher` instance via the `.flasher` property. This gives you full control over the flash process:

```javascript
const el = document.querySelector('esp-flasher')

// Set config values
el.flasher.setConfig({ wifi_ssid: 'MyNetwork', wifi_pass: 'secret' })

// Read current config
const config = el.flasher.getConfig()

// Get field schema
const schema = el.flasher.getSchema()
```

See the [ESPFlasher API](javascript-api.md#espflasher) for all available methods.

## Theming

The component uses CSS custom properties for theming. Override them on the element or a parent:

```css
esp-flasher {
  --c-accent: #6366f1;
  --c-accent-hover: #4f46e5;
  --c-bg: #fafafa;
  --c-surface: #ffffff;
  --c-text: #09090b;
  --c-text-2: #71717a;
  --c-border: #e4e4e7;
}
```

| Property | Default | Description |
|----------|---------|-------------|
| `--c-accent` | `#6366f1` | Primary accent color (buttons, links, focus rings) |
| `--c-accent-hover` | `#4f46e5` | Accent hover state |
| `--c-bg` | `#fafafa` | Background color |
| `--c-surface` | `#ffffff` | Card/modal surface color |
| `--c-text` | `#09090b` | Primary text color |
| `--c-text-2` | `#71717a` | Secondary text color |
| `--c-text-3` | `#a1a1aa` | Tertiary text / placeholders |
| `--c-border` | `#e4e4e7` | Border color |
| `--c-success` | `#22c55e` | Success state color |
| `--c-error` | `#ef4444` | Error state color |
| `--c-warning` | `#f59e0b` | Warning state color |

When using a config URL, the `branding.primaryColor` and `branding.theme` fields automatically set `--c-accent` and the dark theme variables.

## Config v2 Schema

The `config` attribute points to a JSON file that supports multiple firmware variants, custom branding, and post-flash instructions:

```json
{
  "version": 2,
  "name": "My ESP32 Project",
  "repo": "user/repo",
  "release": "latest",
  "branding": {
    "logo": "https://example.com/logo.png",
    "primaryColor": "#6366f1",
    "theme": "light"
  },
  "variants": [
    {
      "id": "standard",
      "name": "Standard",
      "description": "Full-featured firmware with WiFi and MQTT",
      "firmware": "firmware.bin",
      "chip": "esp32s3",
      "fields": ["wifi", "mqtt"]
    },
    {
      "id": "lite",
      "name": "Lite",
      "description": "Minimal build, WiFi only",
      "firmware": "firmware-lite.bin",
      "chip": "esp32s3",
      "fields": ["wifi"]
    }
  ],
  "postFlash": {
    "title": "Setup Complete",
    "steps": [
      "Disconnect the USB cable",
      "Power cycle the device",
      "Connect to the WiFi network 'MyDevice-XXXX'"
    ],
    "link": {
      "label": "Open Setup Guide",
      "url": "https://example.com/setup"
    }
  }
}
```

**Backward compatibility:** Config files without a `version` field are treated as v1 and automatically normalized. V1 configs with a single `firmware` (or `bin`) key work as before.

## Reading Config in Firmware

When you flash with `fields="wifi,device_name"`, the component writes those values to an [NVS (Non-Volatile Storage)](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/storage/nvs_flash.html) partition on the device. Your firmware reads them back using standard ESP-IDF APIs — no special library needed.

All values are stored in a namespace called `"config"` at partition offset `0x9000`. The NVS keys match the field names exactly:

| Field preset | NVS keys written | Type |
|-------------|-----------------|------|
| `wifi` | `wifi_ssid`, `wifi_pass` | string |
| `mqtt` | `mqtt_host`, `mqtt_user`, `mqtt_pass` | string |
| `device_name` | `device_name` | string |

### Arduino

```cpp
#include <Preferences.h>
#include <WiFi.h>

Preferences prefs;

void setup() {
  Serial.begin(115200);

  // Open the "config" namespace (read-only)
  prefs.begin("config", true);

  // Read the values that were flashed
  String ssid = prefs.getString("wifi_ssid", "");
  String pass = prefs.getString("wifi_pass", "");
  String name = prefs.getString("device_name", "esp-device");

  prefs.end();

  // Use them
  Serial.printf("Connecting %s to %s\n", name.c_str(), ssid.c_str());
  WiFi.begin(ssid.c_str(), pass.c_str());
}
```

### ESP-IDF (C)

```c
#include "nvs_flash.h"
#include "nvs.h"

void read_config() {
    nvs_flash_init();

    nvs_handle_t handle;
    nvs_open("config", NVS_READONLY, &handle);

    char ssid[33], pass[65], name[64];
    size_t len;

    len = sizeof(ssid);
    nvs_get_str(handle, "wifi_ssid", ssid, &len);

    len = sizeof(pass);
    nvs_get_str(handle, "wifi_pass", pass, &len);

    len = sizeof(name);
    nvs_get_str(handle, "device_name", name, &len);

    nvs_close(handle);

    printf("WiFi: %s, Device: %s\n", ssid, name);
}
```

### Rust (esp-idf-svc)

```rust
use esp_idf_svc::nvs::*;

fn read_config() -> Result<(), EspError> {
    let nvs = EspDefaultNvsPartition::take()?;
    let ns = EspNvs::new(nvs, "config", true)?;

    let mut buf = [0u8; 128];

    let ssid = ns.get_str("wifi_ssid", &mut buf)?;
    let pass = ns.get_str("wifi_pass", &mut buf)?;
    let name = ns.get_str("device_name", &mut buf)?;

    Ok(())
}
```

### Key details

| Concept | Value | Notes |
|---------|-------|-------|
| Namespace | `"config"` | All fields are stored under this NVS namespace |
| Partition offset | `0x9000` | Must match your partition table's NVS offset |
| Partition size | `0x6000` (24KB) | Default size, configurable via config |
| Key length | 15 chars max | Case-sensitive, alphanumeric + underscore |
| Format | ESP-IDF NVS | Standard binary format — no custom parser needed |

The NVS partition is written alongside the firmware in a single flash operation. Your firmware just needs to call `nvs_flash_init()` (or `Preferences.begin()` in Arduino) and read the keys — nothing else to configure.

## Error Recovery

The component includes built-in error detection and guided recovery. When something goes wrong, users see specific steps instead of cryptic error messages:

- **Connection timeout** — step-by-step BOOT button instructions (chip-specific)
- **Port in use** — how to close other serial monitors
- **Download failed** — check firmware URL and network
- **Disconnected during flash** — safe recovery steps
- **Chip mismatch** — confirmation dialog with detected vs expected chip

## Browser Support

Requires a desktop browser with Web Serial API support:

- Chrome 89+
- Edge 89+
- Opera 75+

On mobile devices, the component shows a "Desktop Required" screen with buttons to copy or share the page link.

## GitHub Action

For automated deployment, the toolkit includes a GitHub Action that generates a self-contained flash page from your config file and deploys it to GitHub Pages:

```yaml
- uses: adam-weber/esp-webflash-toolkit@v1
  with:
    config: flash-config.json
```

See the [action.yml](https://github.com/adam-weber/esp-webflash-toolkit/blob/main/action.yml) for all inputs and the [workflow example](https://github.com/adam-weber/esp-webflash-toolkit/blob/main/examples/action/workflow-example.yml) for a complete setup.
