# Quickstart

End-to-end example: generate config in browser, flash to device, read in firmware.

## Installation

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/nvs-generator.js"></script>
```

### npm

```bash
npm install esp-webflash-toolkit
```

## End-to-End Example

### 1. Generate and Flash (Browser/JavaScript)

```javascript
import { NVSGenerator } from 'esp-webflash-toolkit/nvs-generator';

// Generate the NVS partition
const generator = new NVSGenerator();
const nvsBinary = generator.generate({
    config: {
        wifi_ssid: "MyNetwork",
        wifi_pass: "SecurePass123",
        api_url: "https://api.example.com",
        device_id: 42
    }
}, 0x6000);  // 24KB partition

// Flash to device via Web Serial
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });

const esploader = new ESPLoader(port, { debugLogging: false });
await esploader.connect();

await esploader.writeFlash({
    fileArray: [{ data: toFlashString(nvsBinary), address: 0x9000 }],
    flashSize: 'keep'
});

// Helper: convert Uint8Array to string for esptool-js
function toFlashString(bytes) {
    return String.fromCharCode(...bytes);
}
```

### 2. Read Config in Firmware

The NVS partition is standard ESP-IDF format. Read it with native APIs:

**ESP-IDF (C)**

```c
#include "nvs_flash.h"
#include "nvs.h"

void read_config() {
    nvs_flash_init();

    nvs_handle_t handle;
    nvs_open("config", NVS_READONLY, &handle);

    char ssid[32], password[64], api_url[128];
    size_t len;

    len = sizeof(ssid);
    nvs_get_str(handle, "wifi_ssid", ssid, &len);

    len = sizeof(password);
    nvs_get_str(handle, "wifi_pass", password, &len);

    len = sizeof(api_url);
    nvs_get_str(handle, "api_url", api_url, &len);

    uint32_t device_id;
    nvs_get_u32(handle, "device_id", &device_id);

    nvs_close(handle);

    printf("WiFi: %s, Device: %lu\n", ssid, device_id);
}
```

**Arduino**

```cpp
#include <Preferences.h>

Preferences prefs;

void setup() {
    prefs.begin("config", true);  // true = read-only

    String ssid = prefs.getString("wifi_ssid", "");
    String pass = prefs.getString("wifi_pass", "");
    String api = prefs.getString("api_url", "");
    uint32_t id = prefs.getUInt("device_id", 0);

    prefs.end();
}
```

**Rust (esp-idf-svc)**

```rust
use esp_idf_svc::nvs::*;

fn read_config() -> Result<(), EspError> {
    let nvs = EspDefaultNvsPartition::take()?;
    let ns = EspNvs::new(nvs, "config", true)?;

    let mut buf = [0u8; 128];

    let ssid = ns.get_str("wifi_ssid", &mut buf)?;
    let pass = ns.get_str("wifi_pass", &mut buf)?;
    let api_url = ns.get_str("api_url", &mut buf)?;
    let device_id: u32 = ns.get_u32("device_id")?.unwrap_or(0);

    Ok(())
}
```

## Key Concepts

- **Namespace**: The first-level key in your config object (`config` above) becomes the NVS namespace
- **Keys**: Limited to 15 characters, alphanumeric + underscore, case-sensitive
- **Partition offset**: Default is `0x9000` (matches most ESP-IDF partition tables)
- **Partition size**: `0x6000` (24KB) is typical, must match your partition table

## Next Steps

- [View more code examples](examples.md)
- [Scaffold a complete web flasher](web-flasher-scaffold.md)
- [Partition Table Generator](partition-table-generator.md) - create custom layouts
- [JavaScript API reference](javascript-api.md)
