# Quickstart

Flash ESP32 firmware from a browser with optional NVS configuration.

## Installation

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/esp-webflash-toolkit-full.min.js"></script>
```

### npm

```bash
npm install esp-webflash-toolkit
```

## Vanilla JavaScript (Browser)

### One-Liner Flash

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/esp-webflash-toolkit-full.min.js"></script>
<script>
document.getElementById('flash-btn').onclick = async () => {
    await ESPWebFlash.flashDevice({
        firmware: 'https://example.com/firmware.bin',
        config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
        onProgress: (pct) => console.log(pct + '%')
    });
};
</script>
```

### With More Control

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/esp-webflash-toolkit-full.min.js"></script>
<script>
const { ESPFlasher } = ESPWebFlash;

const flasher = new ESPFlasher({
    chip: 'esp32',
    firmwareUrl: 'https://example.com/firmware.bin',
    fields: ['wifi']  // expands to wifi_ssid + wifi_pass fields
});

flasher.addEventListener('progress', e => {
    document.getElementById('progress').textContent = e.detail.percent + '%';
});

flasher.addEventListener('log', e => {
    console.log(e.detail.message);
});

document.getElementById('connect').onclick = () => flasher.connect();
document.getElementById('flash').onclick = () => flasher.flash();
</script>
```

## ES Modules (npm)

```javascript
import { flashDevice } from 'esp-webflash-toolkit';

await flashDevice({
    firmware: 'https://example.com/firmware.bin',
    config: { wifi_ssid: 'MyNetwork', wifi_pass: 'secret' },
    onProgress: (pct) => console.log(`${pct}%`)
});
```

### Advanced API

```javascript
import { ESPFlasher } from 'esp-webflash-toolkit';

const flasher = new ESPFlasher({
    chip: 'esp32s3',
    firmwareUrl: 'https://example.com/firmware.bin',
    fields: ['wifi', 'mqtt', { key: 'device_name', label: 'Device Name', type: 'text' }]
});

flasher.addEventListener('progress', e => updateProgressBar(e.detail.percent));
flasher.addEventListener('log', e => appendToConsole(e.detail.message));

await flasher.connect();
flasher.setConfig({ wifi_ssid: 'MyNetwork', wifi_pass: 'secret' });
await flasher.flash();
flasher.dispose();
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
