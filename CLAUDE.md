# ESP WebFlash Toolkit

Browser-based ESP32 flashing library. Headless core + vanilla adapter + web component.

## Build & Test

```bash
npm run build          # Build all bundles to dist/
npm test               # Run all tests (no test framework — raw Node assertions)
cd worker && npm run build  # Build Cloudflare Worker (requires root build first)
```

Tests are in `tests/` — each is a standalone Node script. No test runner.

## Architecture

```
src/
  core/           # Headless library (ESPFlasher, NVSGenerator, ConfigStore, etc.)
  adapters/vanilla/  # Vanilla JS UI adapter (FlasherApp, FlasherUI, createFlasher)
  components/     # <esp-flasher> web component (Shadow DOM)
  bundle-full.js  # IIFE entry: core + vanilla adapter
  bundle-component.js  # IIFE entry: web component (self-registers)
worker/           # Cloudflare Worker (config resolution, URL shortener, flash pages, MCP)
examples/
  hosted/         # Hosted flasher demo page
  component/      # Web component docs/demo page
```

## Key Patterns

- All components extend **EventTarget** — events are the primary interface
- **No TypeScript source** — plain JS with JSDoc types. Type declarations are hand-written in `types/`
- Config fields use **presets**: `"wifi"` expands to `[{key:'wifi_ssid',...}, {key:'wifi_pass',...}]`
- **flash-config.json** v2 format: `{ version: 2, name, variants: [...], branding, postFlash }`
- NVS partitions use ESP-IDF format (4KB pages, 32-byte entries, CRC32)
- Web component uses Shadow DOM with CSS custom properties for theming
- Worker inlines the component bundle at build time via esbuild `define`

## Conventions

- No test framework — tests use `console.assert` style with manual pass/fail counting
- Build script is `scripts/build.js` (esbuild, not webpack/rollup)
- ESM everywhere (`"type": "module"` in package.json)
- CORS proxy fallback pattern: try direct fetch, fall back to `corsproxy.io`
- Worker routes follow REST: `/api/resolve/:user/:repo`, `/api/shorten`, `/s/:code`
