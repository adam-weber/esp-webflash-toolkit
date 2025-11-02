# ESP WebFlash Toolkit

Application-layer toolkit extending [esptool-js](https://espressif.github.io/esptool-js/) for browser-based ESP32 provisioning. Generate NVS partitions client-side, route firmware by chip detection, and scaffold custom UIs. Components are composable and integrate independently.

## Key Use Cases

* **Factory Programming:** Scan barcodes for device IDs, input calibration values, flash via web interface. ~30 seconds per unit.
* **Configuration Updates:** Read NVS from device, modify parameters, regenerate partition, flash without reflashing firmware.
* **End-User Provisioning:** Users input WiFi credentials through browser, connect device via USB. Credentials stay client-side.

## Features

### Firmware Router

Automatic chip detection routes to correct firmware directory. Single `router.flash()` call handles detection, selection, and flashing.

<div style="border: 2px solid #e1e4e8; border-radius: 6px; padding: 20px; margin: 20px 0; background-color: #f6f8fa;">
  <h4 style="margin-top: 0;">📱 Interactive Demo</h4>
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

[See full documentation →](firmware-router.md)

### Web Flasher Scaffold

JSON-based field definitions generate complete interfaces: forms, progress tracking, connection management. esptool-js integration provided.

<div style="border: 2px solid #e1e4e8; border-radius: 6px; padding: 20px; margin: 20px 0; background-color: #f6f8fa;">
  <h4 style="margin-top: 0;">🎨 Live Interface Preview</h4>
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

[See configuration examples →](web-flasher-scaffold.md)

## Links

* Demo: [/flasher/?project=morse-code-blinker](/flasher/?project=morse-code-blinker)
* Template: `npx create-esp32-flasher`
* ESP-IDF NVS: [docs.espressif.com](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html)
* Source: [github.com/adam-weber/esp-webflash-toolkit](https://github.com/adam-weber/esp-webflash-toolkit)
