# Device Flashing Operations

Generated binaries are written to ESP32 flash memory via Web Serial API integration.

## NVS Partition Location

The partition table (partitions.csv) defines NVS partition placement in flash memory. ESP32 flash is divided into fixed-address regions, each serving a specific purpose in the boot and runtime process.

### ESP32 Flash Memory Layout

| Address | Partition | Description | Size |
|---------|-----------|-------------|------|
| 0x1000 | **bootloader.bin** | Second-stage bootloader | ~28 KB |
| 0x8000 | **partition-table.bin** | Partition layout definition | ~4 KB |
| 0x9000 | **nvs.bin** | Non-Volatile Storage partition | ~24 KB |
| 0x10000 | **app.bin** | Main application firmware | Variable |

**Note:** The 0x9000 address for NVS is conventional but not mandatory. Partition tables may locate NVS at any address. Flash operations must target the address specified in the partition table, not hardcoded values.

## Automatic Partition Detection

When firmware is already flashed, the toolkit can automatically detect the NVS partition offset and size by reading the partition table from flash memory. This eliminates the need to manually look up addresses in partitions.csv.

```javascript
// Auto-detect NVS partition from flashed firmware
const partitionInfo = await detectNVSPartition(espLoader);
// Returns: { offset: 0x9000, size: 0x6000, label: "nvs" }

// Generate NVS binary with detected size
const nvsBinary = generator.generate(config, partitionInfo.size);

// Convert to string format for esptool-js
let nvsString = '';
for (let i = 0; i < nvsBinary.length; i++) {
    nvsString += String.fromCharCode(nvsBinary[i]);
}

// Flash to detected offset
await espLoader.writeFlash({
    fileArray: [{ data: nvsString, address: partitionInfo.offset }],
    flashSize: 'keep',
    compress: true
});
```

**Automatic Detection Benefits:**

- **Simplified Workflow:** Connect device → Detect partition → Flash config — no partition table lookup required
- **Error Prevention:** Eliminates incorrect offset errors that can brick devices
- **Multi-Device Support:** Works across different partition layouts without code changes

**Fallback:** If detection fails (blank chip, custom partition table), specify offset manually from your partitions.csv file.

## Web Serial Integration

Chrome's Web Serial API provides USB serial port access. esptool-js implements the ESP32 ROM bootloader protocol in JavaScript. Combined, these enable browser-based flash operations.

```javascript
// Manual offset specification (when auto-detection unavailable)
const nvsBinary = generator.generate(config, 0x6000);

// esptool-js requires binary string format, not Uint8Array
let nvsString = '';
for (let i = 0; i < nvsBinary.length; i++) {
    nvsString += String.fromCharCode(nvsBinary[i]);
}

await espLoader.writeFlash({
    fileArray: [
        { data: firmwareBinary, address: 0x10000 },
        { data: nvsString, address: 0x9000 }
    ],
    flashSize: 'keep',
    compress: true
});
```

## Browser Compatibility Requirements

Web Serial API availability is limited to Chromium-based browsers: Chrome 89+, Edge 89+, Opera 75+. Firefox, Safari, and mobile browsers lack Web Serial support. Desktop Chrome or equivalent Chromium browser is required.

USB port access requires explicit user permission per session. Permission requests must originate from user gestures (button clicks):

```javascript
button.onclick = async () => {
    const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x303a }]  // Espressif vendor ID
    });
};
```
