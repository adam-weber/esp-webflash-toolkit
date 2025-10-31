// Auto-generated project configuration
// Generated from sensors/*/project.json
// DO NOT EDIT MANUALLY - your changes will be overwritten

const PROJECTS = {
        'active-wing': {
            name: "Active Wing",
            description: "The reference implementation demonstrating real-time sensor fusion using Extended Kalman Filtering. This system fuses GPS and IMU data to provide accurate position and motion tracking, eliminating IMU drift through GPS corrections while maintaining high-frequency updates.",
            hardware: ["ESP32-C3 Development Board", "WT901 9-axis IMU (UART @ 9600 baud)", "NEO-6M GPS Module (UART @ 9600 baud)", "WS2812 RGB LED for status indication"],
            software: ["Chrome or Edge browser (for web flasher)", "Windows, macOS, or Linux", "Python 3.x (for telemetry receiver tools)"],
            firmwareUrl: "https://github.com/adam-weber/esp-webflash-toolkit/releases/download/latest/active-wing.bin",
            chip: "esp32c3",
            target: "riscv32imc-esp-espidf",
            configSections: [{"id": "wifi", "title": "WiFi", "description": "Connect to your wireless network", "fields": [{"id": "ssid", "label": "Network Name (SSID)", "type": "text", "placeholder": "MyWiFiNetwork", "required": true, "nvsKey": "wifi_ssid"}, {"id": "password", "label": "Password", "type": "password", "placeholder": "WiFi password", "required": true, "nvsKey": "wifi_pass"}]}, {"id": "mqtt", "title": "MQTT", "description": "Optional: Send status updates to MQTT broker", "fields": [{"id": "broker", "label": "Broker URL", "type": "text", "placeholder": "mqtt://192.168.1.100:1883", "required": false, "nvsKey": "mqtt_broker"}, {"id": "username", "label": "Username", "type": "text", "placeholder": "mqtt_user", "required": false, "nvsKey": "mqtt_user"}, {"id": "password", "label": "Password", "type": "password", "placeholder": "mqtt_password", "required": false, "nvsKey": "mqtt_pass"}]}, {"id": "tcp", "title": "TCP Telemetry", "description": "Stream real-time data to your computer (20 Hz)", "fields": [{"id": "server", "label": "Server IP", "type": "text", "placeholder": "192.168.1.100", "required": true, "help": "IP address of computer running tcp_telemetry_server.py", "nvsKey": "tcp_server"}, {"id": "port", "label": "Port", "type": "number", "placeholder": "9000", "default": 9000, "required": true, "nvsKey": "tcp_port"}]}, {"id": "led", "title": "Onboard LED", "description": "Configure the onboard LED flash interval", "fields": [{"id": "flash_interval", "label": "Flash Interval (ms)", "type": "number", "placeholder": "1000", "default": 1000, "required": false, "help": "Time in milliseconds between LED toggles (500 = 0.5s, 1000 = 1s, 2000 = 2s)", "nvsKey": "led_flash_ms"}]}],
            nvsPartition: {"name": "nvs", "offset": "0x9000", "size": "0x6000", "namespace": "config"},
            documentation: {"url": "https://github.com/adam-weber/esp-webflash-toolkit/blob/main/sensors/active-wing/README.md", "label": "Wiring Diagram & Setup Guide"}
        }
};

// ES6 export for module usage
export { PROJECTS };

// Expose globally for browser usage
if (typeof window !== 'undefined') {
    window.PROJECTS = PROJECTS;
}

