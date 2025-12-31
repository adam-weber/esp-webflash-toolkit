/**
 * Project Configuration
 * Edit this file to configure your ESP flasher
 *
 * Field formats:
 * - Preset string: 'wifi', 'mqtt', 'device_name'
 * - Custom field: { key: 'my_key', label: 'My Label', type: 'text', required: true }
 */

const PROJECTS = {
    'morse-code-blinker': {
        name: "Morse Code Blinker",
        description: "Flash custom morse code patterns on your ESP32's built-in LED. Connect to WiFi and watch your LED transmit messages in morse code.",
        chip: "esp32",
        firmwareUrl: "https://github.com/adam-weber/esp-webflash-toolkit/releases/download/latest/morse-blinker.bin",

        // Config fields - use presets or custom field objects
        fields: [
            'wifi',
            {
                key: 'led_gpio',
                label: 'GPIO Pin Number',
                type: 'number',
                default: 2,
                required: true,
                help: 'GPIO pin connected to the LED (usually GPIO 2 for built-in LED)',
                section: 'Morse Code Settings'
            },
            {
                key: 'morse_pattern',
                label: 'Morse Code Pattern',
                type: 'text',
                default: '... --- ...',
                required: true,
                pattern: '^[.\\- ]+$',
                help: 'Use dots (.) for short blinks, dashes (-) for long, spaces for pauses',
                section: 'Morse Code Settings'
            },
            {
                key: 'morse_dot_ms',
                label: 'Dot Duration (ms)',
                type: 'number',
                default: 200,
                required: true,
                help: 'Duration of a dot in milliseconds. Dash is 3x this value',
                section: 'Morse Code Settings'
            }
        ],

        // NVS configuration
        nvsOffset: 0x9000,
        nvsSize: 0x6000,

        // Project metadata
        hardware: ["ESP32 Development Board", "Built-in LED (GPIO 2)"],
        software: ["Chrome, Edge, or Opera browser"],
        navbarLinks: [
            { label: "GitHub", url: "https://github.com/adam-weber/esp-webflash-toolkit" },
            { label: "Docs", url: "https://github.com/adam-weber/esp-webflash-toolkit#readme" }
        ],
        documentation: {
            url: "https://github.com/adam-weber/esp-webflash-toolkit#getting-started",
            label: "Getting Started Guide"
        }
    }
};

// Expose globally for browser usage
if (typeof window !== 'undefined') {
    window.PROJECTS = PROJECTS;
}
