/**
 * Full Bundle Entry Point
 * Exports core library + vanilla adapter for browser use
 *
 * Usage:
 *   <script src="esp-webflash-toolkit-full.min.js"></script>
 *   const { ESPFlasher, FlasherApp, createFlasher } = ESPWebFlash;
 */

// Core exports
export {
    ESPFlasher,
    DeviceConnection,
    FirmwareFlasher,
    ConfigStore,
    FieldPresets,
    expandFieldPresets,
    NVSGenerator,
    PartitionTableGenerator
} from './core/index.js';

// Vanilla adapter exports
export {
    createFlasher,
    FlasherUI,
    FlasherApp
} from './adapters/vanilla/index.js';
