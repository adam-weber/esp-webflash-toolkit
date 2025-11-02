# Code Examples

End-to-end workflows for common use cases.

## WiFi Setup

Generate a WiFi configuration partition and flash to ESP32.

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/nvs-generator.js"></script>
<script>
const generator = new NVSGenerator();

const config = {
    wifi: {
        ssid: "MyNetwork",
        password: "SecurePassword123"
    }
};

const binary = generator.generate(config, 0x6000);  // 24KB partition
// Returns: Uint8Array(24576) ready to flash at 0x9000
</script>
```

## IoT Device Configuration

Configure a deployed sensor with network credentials, device settings, and TLS certificates.

```javascript
const generator = new NVSGenerator();

// Configure a deployed sensor
const config = {
    network: {
        wifi_ssid: "FieldSite_5G",
        wifi_pass: "deployment2024",
        mqtt_broker: "mqtt.example.com",
        mqtt_port: 8883
    },
    device: {
        id: "SENSOR_A042",
        location: "Building_3_Floor_2",
        sample_rate: 60,        // seconds
        calibration_offset: -2.5,
        debug_enabled: false
    },
    tls: {
        // Certificate as byte array
        ca_cert: new Uint8Array([0x30, 0x82, 0x03, 0x75, /* ... */])
    }
};

const nvsBinary = generator.generate(config, 0x6000);

// Flash it (browser with Web Serial API)
const port = await navigator.serial.requestPort();
const esploader = await connectToESP32(port);

// Flash firmware + config
await esploader.writeFlash({
    fileArray: [
        { data: firmwareBinary, address: 0x10000 },  // app partition
        { data: nvsBinaryString, address: 0x9000 }   // NVS partition
    ],
    flashSize: 'keep'
});
```

## Batch Generation

Generate unique configuration binaries for multiple devices in Node.js.

```javascript
const fs = require('fs');
const { NVSGenerator } = require('./nvs-generator.js');

const generator = new NVSGenerator();

// Generate configs for 100 devices
const devices = [
    { id: 'DEV001', location: 'Zone_A', offset: -1.2 },
    { id: 'DEV002', location: 'Zone_A', offset: 0.8 },
    // ... 98 more
];

devices.forEach(device => {
    const config = {
        config: {
            device_id: device.id,
            location: device.location,
            cal_offset: device.offset,
            wifi_ssid: "Factory_Network",
            api_endpoint: "https://api.production.example.com"
        }
    };

    const binary = generator.generate(config, 0x6000);
    fs.writeFileSync(`nvs_${device.id}.bin`, Buffer.from(binary));
    console.log(`Generated nvs_${device.id}.bin`);
});
```

## Complete Web Flashing

Flash firmware and per-device configuration entirely in the browser—no command line tools required.

```javascript
// Complete web-based flashing: firmware + per-device config
// No Python, no command line, just browser + USB

// 1. Load firmware binaries (same for all devices)
const bootloaderResp = await fetch('firmware/bootloader.bin');
const bootloaderBin = await bootloaderResp.arrayBuffer();

const partitionResp = await fetch('firmware/partition-table.bin');
const partitionBin = await partitionResp.arrayBuffer();

const firmwareResp = await fetch('firmware/app.bin');
const firmwareBin = await firmwareResp.arrayBuffer();

// 2. Generate unique config for THIS device
const generator = new NVSGenerator();
const deviceConfig = {
    wifi: {
        ssid: document.getElementById('wifi-ssid').value,
        password: document.getElementById('wifi-password').value
    },
    config: {
        device_id: `DEVICE_${Date.now()}`,
        api_endpoint: "https://api.production.example.com",
        update_interval: 60
    }
};

const nvsBinary = generator.generate(deviceConfig, 0x6000);

// 3. Convert binaries to strings for esptool-js
function arrayBufferToString(buf) {
    const bytes = new Uint8Array(buf);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return str;
}

const bootloaderStr = arrayBufferToString(bootloaderBin);
const partitionStr = arrayBufferToString(partitionBin);
const firmwareStr = arrayBufferToString(firmwareBin);
const nvsStr = arrayBufferToString(nvsBinary);

// 4. Connect to ESP32 via Web Serial
const port = await navigator.serial.requestPort({
    filters: [{ usbVendorId: 0x303a }]  // Espressif
});

const transport = new Transport(port);
const esploader = new ESPLoader(transport, 115200);
await esploader.connect();
console.log('Connected to', esploader.chipName);

// 5. Flash everything in one operation
await esploader.writeFlash({
    fileArray: [
        { data: bootloaderStr, address: 0x0 },
        { data: partitionStr,  address: 0x8000 },
        { data: nvsStr,        address: 0x9000 },   // Unique config
        { data: firmwareStr,   address: 0x10000 }
    ],
    flashSize: 'keep',
    flashMode: 'dio',
    flashFreq: '40m',
    compress: true,
    reportProgress: (fileIndex, written, total) => {
        const percent = Math.round((written / total) * 100);
        console.log(`Flashing ${fileIndex}: ${percent}%`);
        updateProgressBar(percent);
    }
});

console.log('Flash complete!');
await esploader.hardReset();

// Device boots with unique WiFi credentials
// Ready for production deployment
```

## ESP-IDF Command Line

Generate NVS binary in Node.js and flash using esptool.py.

```javascript
// 1. Generate the NVS binary in Node.js
const fs = require('fs');
const { NVSGenerator } = require('./nvs-generator.js');

const generator = new NVSGenerator();
const config = {
    wifi: {
        ssid: "ProductionNetwork",
        password: "secure_pass_2024"
    },
    config: {
        device_id: "ESP32_PROD_042",
        api_endpoint: "https://api.example.com"
    }
};

const binary = generator.generate(config, 0x6000);
fs.writeFileSync('nvs.bin', Buffer.from(binary));

console.log('Generated nvs.bin (24KB)');
```

```bash
# 2. Flash using esptool.py (command line)
# Flash NVS partition only
esptool.py --chip esp32c3 --port /dev/ttyUSB0 write_flash 0x9000 nvs.bin

# Or flash complete firmware + NVS
esptool.py --chip esp32c3 --port /dev/ttyUSB0 write_flash \
    0x0    bootloader.bin \
    0x8000 partition-table.bin \
    0x9000 nvs.bin \
    0x10000 firmware.bin

# Device boots with config already loaded
```

## Read-Update-Write Workflow

Read existing configuration from a device, modify specific values, and flash back without touching firmware.

```javascript
// Complete workflow: Read current config, modify it, flash back

// 1. Read current NVS partition from device
const port = await navigator.serial.requestPort();
const esploader = await connectToESP32(port);

console.log('Reading current NVS from device...');
const currentNVS = await esploader.readFlash(0x9000, 0x6000);
console.log('Read 24KB from 0x9000');

// 2. Parse binary back to config object
const generator = new NVSGenerator();
const currentConfig = generator.parse(new Uint8Array(currentNVS));

console.log('Current config:', currentConfig);
// {
//   wifi: { ssid: "OldNetwork", password: "..." },
//   config: { api_endpoint: "https://api.staging.example.com", ... }
// }

// 3. Modify specific values
currentConfig.wifi.ssid = "NewNetwork";
currentConfig.wifi.password = "new_secure_password";
currentConfig.config.api_endpoint = "https://api.production.example.com";

console.log('Updated config:', currentConfig);

// 4. Generate new binary with modified config
const updatedBinary = generator.generate(currentConfig, 0x6000);

// 5. Convert to binary string for esptool-js
let binaryString = '';
for (let i = 0; i < updatedBinary.length; i++) {
    binaryString += String.fromCharCode(updatedBinary[i]);
}

// 6. Flash ONLY the NVS partition (firmware unchanged)
console.log('Flashing updated config...');
await esploader.writeFlash({
    fileArray: [
        { data: binaryString, address: 0x9000 }
    ],
    flashSize: 'keep',
    compress: true
});

console.log('Config updated! Device will reboot.');
// Device reboots, connects to NewNetwork, hits production API
// Firmware binary at 0x10000 completely untouched
```

## 10-Line Quickstart

Generate WiFi config and flash to ESP32—just 10 lines:

```javascript
// 1. Generate the partition
const generator = new NVSGenerator();
const nvsBinary = generator.generate({
    wifi: { ssid: "MyNetwork", password: "SecurePass123" }
}, 0x6000);

// 2. Flash it to device
const port = await navigator.serial.requestPort();
const esploader = await connectToESP32(port);

await esploader.writeFlash({
    fileArray: [{ data: toFlashString(nvsBinary), address: 0x9000 }],
    flashSize: 'keep'
});

console.log('Flashed! Device reboots with WiFi credentials.');
```

### Helper Functions

Copy these to your project:

```javascript
// Connect to ESP32 via Web Serial
async function connectToESP32(port) {
    await port.open({ baudRate: 115200 });
    const esploader = new ESPLoader(port, { debugLogging: false });
    await esploader.connect();
    return esploader;
}

// Convert Uint8Array to string format for esptool-js
function toFlashString(bytes) {
    return String.fromCharCode(...bytes);
}
```

**What you just did:** Generated a 24KB NVS partition client-side and flashed it to ESP32 at `0x9000`. The device will now connect to WiFi on boot. No Python, no esptool.py, no command line.
