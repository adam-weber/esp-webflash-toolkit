# ESP WebFlash Toolkit

A browser-based toolkit for flashing ESP32 devices with runtime-configurable firmware. Built around a [JavaScript implementation](./src/nvs-generator.js) of ESP-IDF's NVS partition format that lets you generate config binaries on the fly.

## What This Solves

Distributing firmware to end users typically requires them to install platform-specific tools (Python, esptool, drivers) and run command-line flashing sequences. Every configuration change requires recompiling and reflashing the entire firmware binary.

This toolkit takes a different approach: flash precompiled firmware once, then write configuration to NVS (Non-Volatile Storage) partitions generated **in the browser**. Users flash and configure devices through a website instead of editing code. Developers ship firmware binaries and host a static web page instead of maintaining installation documentation.

Unlike solutions like [Improv Wi-Fi](https://www.improv-wifi.com/) that require adding SDKs and protocol handlers to your firmware, this works with existing ESP-IDF projects without code changes. The NVS generator implements the complete [ESP-IDF NVS](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/storage/nvs_flash.html) binary format in JavaScript, producing partitions that are byte-for-byte compatible. Your firmware reads them using standard ESP-IDF NVS APIs.

Built-in firmware routing automatically detects chip type (ESP32-C3, ESP32-S3, etc.) and loads the appropriate binary, so a single flasher works across hardware variants. Combined with [automated CI/CD workflows](#cicd-integration), you can tag a release and have firmware binaries automatically built and deployed to your web flasher.

This works well for production deployments where devices need unique configurations (WiFi credentials, API endpoints, calibration values), manufacturing batch operations, field reconfiguration without reflashing firmware, and projects supporting multiple ESP32 chip variants.

## Installation

```bash
# Scaffold a complete flasher application
npx esp-webflash-toolkit create my-flasher

# Or install as a library
npm install esp-webflash-toolkit
```

## Usage

### As a Standalone Flasher

The scaffolding command generates a complete web application configured for your project:

```bash
npx esp-webflash-toolkit create my-device-flasher
cd my-device-flasher
npm run serve
```

Configure your project by editing `js/projects-config.js`:

```javascript
export const PROJECTS = {
  'my-device': {
    name: 'My ESP32 Device',
    firmwareUrl: 'https://github.com/user/repo/releases/download/v1.0/firmware.bin',
    chip: 'esp32c3',

    configSections: [{
      id: 'wifi',
      title: 'WiFi Configuration',
      fields: [
        {
          id: 'ssid',
          label: 'Network Name',
          type: 'text',
          nvsKey: 'wifi_ssid',
          required: true
        },
        {
          id: 'password',
          label: 'Password',
          type: 'password',
          nvsKey: 'wifi_pass',
          required: true
        }
      ]
    }],

    nvsPartition: {
      offset: '0x9000',
      size: '0x6000'
    }
  }
};
```

The flasher generates web forms from this configuration, validates user input, generates NVS binaries, and handles the complete flashing sequence.

### As a Library

For custom implementations, import the modules you need:

```javascript
import { NVSGenerator } from 'esp-webflash-toolkit/nvs-generator';
import { FirmwareFlasher } from 'esp-webflash-toolkit/firmware-flasher';
import { DeviceConnection } from 'esp-webflash-toolkit/device-connection';

// Generate NVS partition from configuration
const generator = new NVSGenerator();
const config = {
  wifi_ssid: 'MyNetwork',
  wifi_pass: 'password123',
  api_endpoint: 'https://api.example.com'
};

const nvsBlob = generator.generate(config, 0x6000); // 24KB partition

// Flash to device
const connection = new DeviceConnection();
await connection.connect();

const flasher = new FirmwareFlasher(connection);
await flasher.flashMultiple([
  { offset: 0x0, data: firmwareBinary },
  { offset: 0x9000, data: nvsBlob }
]);
```

## Module Overview

The toolkit provides six modules that work independently or together:

- **nvs-generator** - Generates ESP-IDF compatible NVS partition binaries from JavaScript objects
- **config-manager** - Manages project configurations and user input validation
- **device-connection** - Abstracts Web Serial API connection handling
- **firmware-flasher** - Handles binary flashing operations
- **flasher-ui** - Pre-built UI components for common workflows
- **main-app** - Application orchestration layer for the scaffolded version

## Reading Configuration in Firmware

The generated NVS partitions use the standard ESP-IDF format. Read them with the normal NVS APIs:

```c
// C/C++
#include "nvs_flash.h"
#include "nvs.h"

nvs_handle_t handle;
esp_err_t err = nvs_open("config", NVS_READONLY, &handle);

char ssid[32];
size_t len = sizeof(ssid);
nvs_get_str(handle, "wifi_ssid", ssid, &len);

nvs_close(handle);
```

```rust
// Rust (esp-idf-svc)
use esp_idf_svc::nvs::*;

let nvs_partition = EspDefaultNvsPartition::take()?;
let nvs = EspNvs::new(nvs_partition, "config", true)?;

let mut ssid = String::new();
nvs.get_str("wifi_ssid", &mut ssid)?;
```

## NVS Format Implementation

The NVS generator implements the ESP-IDF NVS binary format specification:

- 4KB pages with proper state and sequence headers
- 32-byte entry structures with CRC32 validation
- Namespace hash tables for key lookup
- Multi-span entries for values larger than 32 bytes
- Support for all ESP-IDF data types: U8, I8, U16, I16, U32, I32, U64, I64, strings, and binary blobs
- Little-endian encoding with correct alignment

The implementation follows ESP-IDF's `nvs_partition_gen.py` behavior. If you encounter a case where the generated binary doesn't match ESP-IDF's output, that's a bug worth reporting.

## Browser Compatibility

The toolkit uses the Web Serial API, which is currently implemented in Chromium-based browsers:

- Chrome 89+
- Edge 89+
- Opera 75+

Firefox and Safari do not currently support the Web Serial API. The application detects unsupported browsers and provides appropriate messaging.

## <a name="cicd-integration"></a>CI/CD Integration

The scaffolded template includes GitHub Actions workflow examples for automated firmware releases. When you tag a release, the workflow can build firmware, publish binaries, and update the web flasher configuration automatically.

See `templates/flasher/.github-examples/README.md` for implementation details.

## Development

```bash
git clone https://github.com/adam-weber/esp-webflash-toolkit.git
cd esp-webflash-toolkit

# Install dependencies
npm install

# Build library and templates
npm run build

# Test CLI locally
npm run dev create test-project

# Serve documentation
npm run serve-docs
```

The build process uses esbuild to minify source modules and copy them into the scaffold template. Source maps are generated for debugging.


## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## License

MIT License - see LICENSE file for full text.

## Credits

Built on [esptool-js](https://espressif.github.io/esptool-js/) by Espressif Systems, which handles the ESP32 flash protocol implementation.
