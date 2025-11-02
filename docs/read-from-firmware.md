# Firmware-Side Configuration Access

ESP32 firmware accesses NVS data through ESP-IDF's nvs_flash API. Implementation examples for C, Arduino, and Rust.

## ESP-IDF (C)

```c
#include "nvs_flash.h"
#include "nvs.h"

nvs_flash_init();

nvs_handle_t h;
nvs_open("config", NVS_READONLY, &h);

char ssid[32];
size_t len = sizeof(ssid);
nvs_get_str(h, "wifi_ssid", ssid, &len);

uint16_t port;
nvs_get_u16(h, "port", &port);

nvs_close(h);
```

## Arduino

```c
#include <Preferences.h>

Preferences p;
p.begin("config", true);

String ssid = p.getString("wifi_ssid", "");
uint16_t port = p.getUShort("port", 1883);

p.end();
```

## Rust

```rust
use esp_idf_svc::nvs::*;

let nvs = EspDefaultNvsPartition::take()?;
let ns = EspNvs::new(nvs, "config", true)?;

let mut buf = [0u8; 32];
let ssid = ns.get_str("wifi_ssid", &mut buf)?;
let port: u16 = ns.get_u16("port")?;
```

**Naming Constraints:** Namespace and key names are limited to 15 characters maximum, alphanumeric plus underscore. Names are case-sensitive. Exact name matching is required between JavaScript generation and firmware access routines.

## Configuration Updates Without Firmware Reflashing

Configuration modification workflow: read existing NVS from device, modify values in JavaScript, regenerate partition, write updated partition back:

```javascript
// Read from device
const bytes = await espLoader.readFlash(0x9000, 0x6000);
const config = parseNVSConfig(bytes, 'config');

// Modify
config.wifi_password = "NewPassword";

// Regenerate and flash
const updated = generator.generate({ config }, 0x6000);
let str = '';
for (let i = 0; i < updated.length; i++) str += String.fromCharCode(updated[i]);
await espLoader.writeFlash({
    fileArray: [{ data: str, address: 0x9000 }],
    flashSize: 'keep'
});
```
