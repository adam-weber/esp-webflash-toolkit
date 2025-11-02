# Firmware Router

Single-method abstraction for multi-variant ESP32 firmware deployment. Chip detection, firmware selection, and NVS generation handled automatically.

<div style="border: 2px solid #e1e4e8; border-radius: 6px; padding: 20px; margin: 20px 0; background-color: #f6f8fa;">
  <h3 style="margin-top: 0;">📱 Interactive Demo</h3>
  <div style="border: 1px solid #d1d5da; border-radius: 4px; padding: 15px; background-color: #fff; min-height: 200px; text-align: center;">
    <p style="color: #666; margin-top: 60px;">
      <strong>HTML Demo Preview Placeholder</strong><br>
      Firmware Router interactive demonstration will be embedded here
    </p>
  </div>
  <p style="margin-bottom: 0; margin-top: 10px; font-size: 0.9em; color: #586069;">
    Try the automatic chip detection and firmware routing in action
  </p>
</div>

## Minimal API

The router abstracts all esptool-js operations, chip detection, and binary management into a single method call:

```javascript
const router = new FirmwareRouter('/firmware');  // Base path to firmware directory

await router.flash({
    config: { wifi: { ssid: "Network", password: "pass123" } },
    onProgress: (percent, stage) => {
        console.log(`${stage}: ${percent}%`);
    }
});
// Complete: chip detected, firmware selected, NVS generated, device flashed
```

## Directory Convention

The router expects a standard directory structure. No configuration mapping required:

```bash
/firmware/
  ├── esp32/
  │   ├── bootloader.bin
  │   ├── partitions.bin
  │   └── app.bin
  ├── esp32c3/
  │   ├── bootloader.bin
  │   ├── partitions.bin
  │   └── app.bin
  └── esp32s3/
      ├── bootloader.bin
      ├── partitions.bin
      └── app.bin
```

## Full API Options

```javascript
await router.flash({
    // Required: Configuration to write to NVS
    config: {
        wifi: { ssid: "Network", password: "pass" },
        device: { id: "ESP32_001" }
    },

    // Optional: NVS partition size (default: 0x6000 / 24KB)
    nvsSize: 0x6000,

    // Optional: Progress callback
    onProgress: (percent, stage) => {
        // stage: 'connecting', 'detecting', 'loading', 'flashing', 'complete'
        updateUI(percent, stage);
    },

    // Optional: Override automatic chip detection
    chipType: 'ESP32-C3',

    // Optional: Serial port (if not provided, prompts user)
    port: existingPort
});
```

## Implementation

Complete reference implementation demonstrating convention-based routing:

```javascript
class FirmwareRouter {
    constructor(basePath = '/firmware') {
        this.basePath = basePath;
        this.nvsGenerator = new NVSGenerator();
        this.chipMap = {
            'ESP32': 'esp32',
            'ESP32-C3': 'esp32c3',
            'ESP32-S3': 'esp32s3',
            'ESP32-S2': 'esp32s2',
            'ESP32-C6': 'esp32c6'
        };
    }

    async flash(options) {
        const {
            config,
            nvsSize = 0x6000,
            onProgress = () => {},
            chipType = null,
            port = null
        } = options;

        // Stage 1: Connect to device
        onProgress(0, 'connecting');
        const serialPort = port || await navigator.serial.requestPort({
            filters: [{ usbVendorId: 0x303a }]  // Espressif
        });

        const transport = new Transport(serialPort);
        const esploader = new ESPLoader(transport, 115200);
        await esploader.connect();

        // Stage 2: Detect chip type
        onProgress(20, 'detecting');
        const detectedChip = chipType || esploader.chipName;
        const chipDir = this.chipMap[detectedChip];

        if (!chipDir) {
            throw new Error(`Unsupported chip: ${detectedChip}`);
        }

        // Stage 3: Load firmware binaries
        onProgress(30, 'loading');
        const [bootloader, partitions, app] = await Promise.all([
            fetch(`${this.basePath}/${chipDir}/bootloader.bin`).then(r => r.arrayBuffer()),
            fetch(`${this.basePath}/${chipDir}/partitions.bin`).then(r => r.arrayBuffer()),
            fetch(`${this.basePath}/${chipDir}/app.bin`).then(r => r.arrayBuffer())
        ]);

        // Stage 4: Generate NVS partition
        const nvsBinary = this.nvsGenerator.generate(config, nvsSize);

        // Stage 5: Flash all binaries
        onProgress(50, 'flashing');
        const fileArray = [
            { data: this._toStr(bootloader), address: 0x1000 },
            { data: this._toStr(partitions), address: 0x8000 },
            { data: this._toStr(nvsBinary), address: 0x9000 },
            { data: this._toStr(app), address: 0x10000 }
        ];

        await esploader.writeFlash({
            fileArray,
            flashSize: 'keep',
            compress: true,
            reportProgress: (idx, written, total) => {
                const percent = 50 + Math.round((written / total) * 45);
                onProgress(percent, 'flashing');
            }
        });

        onProgress(100, 'complete');
        await esploader.hardReset();
    }

    _toStr(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let str = '';
        for (let i = 0; i < bytes.length; i++) {
            str += String.fromCharCode(bytes[i]);
        }
        return str;
    }
}
```

## Complete Example

```javascript
// HTML button handler
document.getElementById('flashBtn').addEventListener('click', async () => {
    const router = new FirmwareRouter('/firmware');

    const config = {
        wifi: {
            ssid: document.getElementById('ssid').value,
            password: document.getElementById('password').value
        },
        device: {
            id: `DEV_${Date.now()}`
        }
    };

    try {
        await router.flash({
            config,
            onProgress: (percent, stage) => {
                document.getElementById('progress').value = percent;
                document.getElementById('status').textContent = stage;
            }
        });

        alert('Device flashed successfully!');
    } catch (err) {
        alert(`Flash failed: ${err.message}`);
    }
});
```

## Operational Flow

1. **Call** - `router.flash()`
2. **Detect** - Chip identified
3. **Route** - Binaries loaded
4. **Generate** - NVS created
5. **Flash** - Complete

**Convention over configuration:** The router requires no mapping configuration. Directory structure conventions determine firmware paths. Chip variant support is automatic—add a new directory (e.g., esp32c6/) with standard binary names, and the router handles it. The entire flashing workflow reduces to a single method call with a configuration object. Serial port selection, chip detection, binary fetching, NVS generation, and flash operations execute transparently.

## Build Automation

Firmware directory population can be automated from ESP-IDF build artifacts:

```javascript
// deploy-firmware.js - runs after ESP-IDF builds
const fs = require('fs');
const path = require('path');

const targets = ['esp32', 'esp32c3', 'esp32s3'];

targets.forEach(target => {
    const buildDir = `build_${target}`;
    const outputDir = `web/firmware/${target}`;

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Copy binaries to conventional locations
    fs.copyFileSync(
        `${buildDir}/bootloader/bootloader.bin`,
        `${outputDir}/bootloader.bin`
    );
    fs.copyFileSync(
        `${buildDir}/partition_table/partition-table.bin`,
        `${outputDir}/partitions.bin`
    );
    fs.copyFileSync(
        `${buildDir}/firmware.bin`,
        `${outputDir}/app.bin`
    );

    console.log(`Deployed ${target}`);
});
```

## CI/CD Integration

```yaml
# .github/workflows/build-firmware.yml
name: Build Multi-Platform Firmware
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target: [esp32, esp32c3, esp32s3]

    steps:
      - uses: actions/checkout@v3
      - uses: espressif/esp-idf-ci-action@v1
        with:
          esp_idf_version: v5.1
          target: ${{ matrix.target }}

      - name: Build firmware
        run: |
          idf.py set-target ${{ matrix.target }}
          idf.py build

      - name: Deploy to web directory
        run: |
          mkdir -p web/firmware/${{ matrix.target }}
          cp build/bootloader/bootloader.bin web/firmware/${{ matrix.target }}/
          cp build/partition_table/partition-table.bin web/firmware/${{ matrix.target }}/partitions.bin
          cp build/firmware.bin web/firmware/${{ matrix.target }}/app.bin

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: firmware-${{ matrix.target }}
          path: web/firmware/${{ matrix.target }}/
```

**Zero-configuration deployment:** CI/CD pipelines build firmware for all target chips, deploy binaries to conventional paths, and publish to web servers. The router automatically supports new chip variants when directories appear—no code changes, no configuration files, no manual synchronization. Adding ESP32-C6 support requires only adding the target to the build matrix. The router detects and routes to it immediately.
