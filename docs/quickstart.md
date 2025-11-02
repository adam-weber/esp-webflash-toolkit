# Quickstart

Generate and flash an ESP32 config partition in under 30 seconds.

## Installation

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/gh/adam-weber/esp-webflash-toolkit@main/dist/nvs-generator.js"></script>
```

### Node.js (npm)

```bash
npm install @esp-web-tools/nvs-generator
# or
git clone https://github.com/adam-weber/esp-webflash-toolkit.git
```

## End-to-End Example

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

console.log('✅ Flashed! Device reboots with WiFi credentials.');
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

## What You Just Did

Generated a 24KB NVS partition client-side and flashed it to ESP32 at `0x9000`. The device will now connect to WiFi on boot. No Python, no esptool.py, no command line.

## Next Steps

- [View more code examples](examples.md)
- [Learn about the firmware router](firmware-router.md)
- [Explore the JavaScript API](javascript-api.md)
- [Use the web flasher scaffold](web-flasher-scaffold.md)
