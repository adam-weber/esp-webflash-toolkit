# Implementation Details

Namespace management, binary blob handling, partition sizing considerations, format limitations.

## Multiple Namespace Support

Top-level object keys define separate namespaces. Namespace isolation allows key name collisions without conflict:

```javascript
const config = {
    wifi: { ssid: "MyNetwork", password: "SecurePass" },
    mqtt: { broker: "192.168.1.100", port: 1883 },
    calibration: { temp_offset: -2.5, enabled: true }
};

const nvs = generator.generate(config, 0x6000);
```

## Binary Blob Storage

Uint8Array values are encoded as blob entries. Blobs exceeding 8 bytes are chunked across multiple entries:

```javascript
const cert = await fetch('cert.pem').then(r => r.arrayBuffer());

const config = {
    security: {
        device_cert: new Uint8Array(cert),  // ~4KB maximum
        device_id: "ESP32-001"
    }
};

const nvs = generator.generate(config, 0x6000);
```

**Blob Size Limitations:** Maximum blob size in V1 format: approximately 4000 bytes. Constraint origin: 126 entries per page, uint8 span field. For data exceeding 4KB, alternative approaches include SPIFFS storage with NVS filename references.

## Partition Size Requirements

Partition sizes must be multiples of 4096 bytes. Larger partitions provide increased wear-leveling headroom at the cost of reduced usable flash capacity:

### Common Partition Sizes

**0x3000 (12KB)**
- 3 pages, ~30-40 pairs

**0x6000 (24KB)**
- 6 pages, ~60-80 pairs

**0x10000 (64KB)**
- 16 pages, ~160-200 pairs
