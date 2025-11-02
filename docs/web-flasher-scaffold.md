# Web Flasher Scaffold Framework

NPX-based template generating complete flasher interfaces from declarative configuration files.

## Scaffold Generation

```bash
npx create-esp32-flasher my-flasher
cd my-flasher
npm start
```

## Architecture

Field definitions in config.json drive interface generation. The template generates forms, validates inputs, creates NVS binaries, and executes flash operations:

```json
{
  "project": {
    "name": "My ESP32 Device",
    "version": "1.0.0"
  },
  "firmware": {
    "bootloader": { "file": "firmware/bootloader.bin", "address": "0x1000" },
    "app": { "file": "firmware/app.bin", "address": "0x10000" }
  },
  "nvs": {
    "address": "0x9000",
    "size": "0x6000",
    "namespace": "config",
    "fields": [
      { "key": "wifi_ssid", "label": "WiFi Network", "type": "string", "required": true },
      { "key": "wifi_password", "label": "WiFi Password", "type": "password", "required": true },
      { "key": "mqtt_broker", "label": "MQTT Broker", "type": "string", "default": "192.168.1.100" }
    ]
  }
}
```

Field additions automatically propagate to generated forms. Label modifications update interface elements. The template framework handles form generation, validation, and flash orchestration.

## Generated Interface

Three-panel interface architecture: configuration panel, flash operations panel, device actions panel.

<div style="border: 2px solid #e1e4e8; border-radius: 6px; padding: 20px; margin: 20px 0; background-color: #f6f8fa;">
  <h3 style="margin-top: 0;">🎨 Live Interface Preview</h3>
  <div style="border: 1px solid #d1d5da; border-radius: 4px; padding: 15px; background-color: #fff; min-height: 300px; text-align: center;">
    <p style="color: #666; margin-top: 100px;">
      <strong>HTML Demo Preview Placeholder</strong><br>
      Web Flasher Scaffold interactive interface will be embedded here
    </p>
  </div>
  <p style="margin-bottom: 0; margin-top: 10px; font-size: 0.9em; color: #586069;">
    See the generated three-panel interface in action: Configure → Flash → Actions
  </p>
</div>

### Panel 1: Configure
- WiFi Network field
- WiFi Password field
- MQTT Broker field

### Panel 2: Connect & Flash
- Connection Status
- Flashing Progress
- Flash Device button
- Reset button

### Panel 3: Actions
- Read Config - Read current NVS from device
- Erase NVS - Clear all stored config
- Download Binary - Save NVS partition as .bin
