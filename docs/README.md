# ESP WebFlash Toolkit

A browser-based toolkit for flashing ESP32/ESP8266 firmware and generating NVS configuration partitions - no toolchain required.

## What It Does

- **Flash firmware** directly from a web browser using Web Serial API
- **Generate NVS partitions** in JavaScript, byte-compatible with ESP-IDF
- **Generate partition tables** for custom flash layouts
- **Scaffold complete flasher apps** with a single CLI command

## Getting Started

```bash
# Create a new flasher project
npx esp-webflash-toolkit create my-flasher

# Or use as a library
npm install esp-webflash-toolkit
```

See the [Quickstart](quickstart.md) guide for detailed setup instructions.

## Documentation

- [Quickstart](quickstart.md) - Get up and running
- [Code Examples](examples.md) - Common usage patterns
- [JavaScript API](javascript-api.md) - Module reference
- [Partition Table Generator](partition-table-generator.md) - Create custom partition layouts

## Browser Support

Requires Web Serial API (Chrome 89+, Edge 89+, Opera 75+).
