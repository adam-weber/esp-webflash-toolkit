# ESP WebFlash Toolkit

[![npm version](https://img.shields.io/npm/v/esp-webflash-toolkit.svg)](https://www.npmjs.com/package/esp-webflash-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A pure JavaScript implementation of ESP-IDF's NVS (Non-Volatile Storage) partition format that runs in a browser. This lets you generate ESP32 config binaries on the fly in a browser, then flash them to devices via Web Serial API - no build chain required.

---

Traditional firmware distribution requires end users to install platform-specific tooling and run command-line procedures. Every configuration change means recompiling and reflashing the entire binary. This takes a different approach: **flash precompiled firmware, then manage configurations through NVS partitions generated in the browser**.

This project implements the complete [ESP-IDF NVS binary format](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/storage/nvs_flash.html) in JavaScript, producing partitions that are byte-for-byte compatible with ESP-IDF. Your firmware reads them using standard NVS APIs without modifications. Unlike solutions like Improv Wi-Fi, this works with existing ESP-IDF projects out of the box.

Built-in firmware routing detects chip variants automatically and loads the appropriate binary. Combined with [automated CI/CD](#cicd-integration), you can tag a release and have firmware built and deployed automatically. Particularly useful for production deployments, manufacturing operations, field reconfiguration, and multi-variant projects.

Available as both a complete web flasher and modular components for integration into existing tooling.

### **[Launch the example web flasher ↗](https://adam-weber.github.io/esp-webflash-toolkit/flasher.html)**

## Installation

```bash
# Scaffold a complete flasher application
npx esp-webflash-toolkit create my-device-flasher

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
    description: 'A brief description shown in the UI',
    firmwareUrl: 'https://github.com/user/repo/releases/download/v1.0/firmware.bin',
    chip: 'esp32c3',
    target: 'riscv32imc-esp-espidf', // Rust target (optional)

    // Navbar links shown in top navigation (optional)
    navbarLinks: [
      {label: 'GitHub', url: 'https://github.com/user/repo'},
      {label: 'Docs', url: 'https://github.com/user/repo#readme'}
    ],

    // Hardware requirements shown in UI
    hardware: [
      'ESP32-C3 Development Board',
      'USB-C cable for data transfer'
    ],

    // Software requirements shown in UI
    software: [
      'Chrome, Edge, or Opera browser (Web Serial API support)'
    ],

    configSections: [{
      id: 'wifi',
      title: 'WiFi Configuration',
      description: 'Connect your device to your wireless network',
      fields: [
        {
          id: 'ssid',
          label: 'Network Name',
          type: 'text',
          placeholder: 'MyWiFiNetwork',
          nvsKey: 'wifi_ssid',
          required: true,
          help: 'The SSID of your WiFi network'
        },
        {
          id: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'WiFi password',
          nvsKey: 'wifi_pass',
          required: true
        },
        {
          id: 'morse_pattern',
          label: 'Morse Code Pattern',
          type: 'text',
          placeholder: '... --- ...',
          default: '... --- ...',
          pattern: '^[.\\- ]+$',  // Regex validation
          help: 'Use dots (.) for short blinks, dashes (-) for long blinks',
          nvsKey: 'morse_pattern',
          required: true
        },
        {
          id: 'gpio_pin',
          label: 'GPIO Pin Number',
          type: 'number',
          default: 2,
          nvsKey: 'led_gpio',
          required: true
        }
      ]
    }],

    nvsPartition: {
      name: 'nvs',
      offset: '0x9000',
      size: '0x6000',
      namespace: 'config'
    },

    documentation: {
      url: 'https://github.com/user/repo#readme',
      label: 'Getting Started Guide'
    }
  }
};
```

### Field Configuration Options

Each field in `configSections` supports the following options:

- **id** (required) - Unique identifier for the field
- **label** (required) - Display label shown in the UI
- **type** (required) - HTML input type: `text`, `password`, `number`, `email`, etc.
- **nvsKey** (required) - The key name used in the NVS partition
- **required** (boolean) - Whether the field is mandatory
- **default** - Default value pre-filled in the form
- **placeholder** - Placeholder text shown in empty fields
- **pattern** - Regex pattern for HTML5 validation (e.g., `^[0-9]+$` for numbers only)
- **help** - Help text displayed below the field, also used as validation error message

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
