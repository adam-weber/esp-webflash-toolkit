/**
 * Auto-generated project configuration
 * Generated from sensors project files
 *
 * @author Adam Weber (github: adam-weber)
 */

const PROJECTS = {
        'morse-code-blinker': {
            name: "Morse Code Blinker",
            description: "Flash custom morse code patterns on your ESP32's built-in LED. Connect to WiFi and watch your LED transmit messages in morse code. Perfect for getting started with ESP32 web flashing.",
            hardware: ["ESP32 Development Board (any variant)", "Built-in LED (usually on GPIO 2)"],
            software: ["Chrome, Edge, or Opera browser (Web Serial API support)"],
            firmwareUrl: "https://github.com/adam-weber/esp-webflash-toolkit/releases/download/latest/morse-blinker.bin",
            chip: "esp32",
            target: "xtensa-esp32-espidf",
            navbarLinks: [
                {label: "GitHub", url: "https://github.com/adam-weber/esp-webflash-toolkit"},
                {label: "Docs", url: "https://github.com/adam-weber/esp-webflash-toolkit#readme"}
            ],
            configSections: [
                {
                    "id": "wifi",
                    "title": "WiFi Configuration",
                    "description": "Connect your ESP32 to your wireless network",
                    "fields": [
                        {
                            "id": "ssid",
                            "label": "Network Name (SSID)",
                            "type": "text",
                            "placeholder": "MyWiFiNetwork",
                            "required": true,
                            "nvsKey": "wifi_ssid"
                        },
                        {
                            "id": "password",
                            "label": "Password",
                            "type": "password",
                            "placeholder": "WiFi password",
                            "required": true,
                            "nvsKey": "wifi_pass"
                        }
                    ]
                },
                {
                    "id": "morse",
                    "title": "Morse Code Settings",
                    "description": "Configure the LED pin and morse code pattern",
                    "fields": [
                        {
                            "id": "gpio_pin",
                            "label": "GPIO Pin Number",
                            "type": "number",
                            "placeholder": "2",
                            "default": 2,
                            "required": true,
                            "help": "GPIO pin connected to the LED (usually GPIO 2 for built-in LED)",
                            "nvsKey": "led_gpio"
                        },
                        {
                            "id": "morse_pattern",
                            "label": "Morse Code Pattern",
                            "type": "text",
                            "placeholder": "... --- ...",
                            "default": "... --- ...",
                            "required": true,
                            "pattern": "^[.\\- ]+$",
                            "help": "Use dots (.) for short blinks, dashes (-) for long blinks, and spaces for pauses. Example: '... --- ...' = SOS",
                            "nvsKey": "morse_pattern"
                        },
                        {
                            "id": "dot_duration",
                            "label": "Dot Duration (ms)",
                            "type": "number",
                            "placeholder": "200",
                            "default": 200,
                            "required": true,
                            "help": "Duration of a dot in milliseconds. Dash is 3x this value (200ms dot = 600ms dash)",
                            "nvsKey": "morse_dot_ms"
                        }
                    ]
                }
            ],
            nvsPartition: {"name": "nvs", "offset": "0x9000", "size": "0x6000", "namespace": "config"},
            documentation: {"url": "https://github.com/adam-weber/esp-webflash-toolkit#getting-started", "label": "Getting Started Guide"}
        }
};

// Expose globally for browser usage
if (typeof window !== 'undefined') {
    window.PROJECTS = PROJECTS;
}

