# GitHub Actions Integration Examples

This directory contains example GitHub Actions workflows and scripts for integrating the ESP32 Web Flasher into your CI/CD pipeline.

## Quick Start

**1. Copy files to your repository:**

```bash
# Copy GitHub Actions workflows
cp .github-examples/flasher-release.yml .github/workflows/
cp .github-examples/flasher-ci.yml .github/workflows/

# Copy config generation script
cp .github-examples/generate_flasher_config.py scripts/
chmod +x scripts/generate_flasher_config.py
```

**2. Create project configuration:**

Create `sensors/your-project/project.json`:

```json
{
  "name": "My ESP32 Project",
  "id": "your-project",
  "description": "Brief description of what this firmware does",
  "chip": "esp32c3",
  "hardware": [
    "ESP32-C3-DevKitC",
    "Required sensors/components"
  ],
  "software": [
    "Chrome/Edge 89+"
  ],
  "configSections": [
    {
      "id": "wifi",
      "title": "WiFi Settings",
      "description": "Network configuration",
      "fields": [
        {
          "id": "ssid",
          "label": "Network Name",
          "type": "text",
          "nvsKey": "wifi_ssid",
          "required": true,
          "placeholder": "MyNetwork"
        },
        {
          "id": "password",
          "label": "Password",
          "type": "password",
          "nvsKey": "wifi_pass",
          "required": true
        }
      ]
    }
  ],
  "nvsPartition": {
    "name": "nvs",
    "offset": "0x9000",
    "size": "0x6000",
    "namespace": "config"
  }
}
```

**3. Enable GitHub Pages:**

- Go to repository Settings → Pages
- Source: GitHub Actions
- Save

**4. Create a release:**

```bash
git tag v1.0.0
git push --tags
```

The workflow will:
- Build firmware for all projects
- Create GitHub release with binaries
- Generate flasher configuration
- Deploy to GitHub Pages

**5. Access your flasher:**

```
https://YOUR_USERNAME.github.io/YOUR_REPO/flasher/?project=your-project
```

## Files Explained

### flasher-release.yml

Full CI/CD pipeline that runs on git tags:

1. **discover-projects** - Scans `sensors/` for `project.json` files
2. **build-firmware** - Builds firmware for each project (parallel matrix builds)
3. **create-release** - Creates GitHub release with firmware binaries
4. **deploy-flasher** - Generates config and deploys to GitHub Pages

**Triggers:**
- Push to tags matching `v*.*.*` (e.g., v1.0.0)
- Manual workflow dispatch

**Outputs:**
- GitHub release with firmware binaries
- Web flasher deployed to GitHub Pages

### flasher-ci.yml

Validation workflow that runs on commits:

1. **validate-config** - Checks `project.json` files are valid JSON
2. **validate-required-fields** - Ensures required fields present
3. **generate-flasher-configuration** - Tests config generation (dry run)

**Triggers:**
- Commits to `main` or `develop` branches
- Pull requests
- Changes to `project.json`, config script, or flasher files

**Use case:** Catch configuration errors before merging

### generate_flasher_config.py

Python script that generates `projects-config.js` from `project.json` files.

**Features:**
- Scans `sensors/*/project.json`
- Validates required fields
- Generates firmware URLs from GitHub releases
- Outputs JavaScript module for web flasher

**Environment variables:**
- `VERSION` - Release tag (default: 'latest')
- `GITHUB_REPOSITORY` - owner/repo format (default: autodetect from git)
- `CI` - Set to 'true' to skip file write

**Usage:**
```bash
# Local development
python3 scripts/generate_flasher_config.py

# In CI (writes to stdout)
VERSION=v1.0.0 GITHUB_REPOSITORY=owner/repo CI=true \
  python3 scripts/generate_flasher_config.py > docs/flasher/js/projects-config.js
```

## Project JSON Schema

### Required Fields

```json
{
  "name": "Display Name",           // Shown in dropdown
  "id": "project-id",                // Must match directory name
  "description": "Short description",
  "chip": "esp32c3",                 // Target chip
  "hardware": ["List of hardware"],
  "software": ["Browser requirements"]
}
```

### Optional Fields

```json
{
  "documentation": "https://docs.example.com",  // Link to docs
  "target": "riscv32imc-esp-espidf",            // Rust target triple
  "configSections": [ /* ... */ ],              // NVS config fields
  "nvsPartition": { /* ... */ }                 // NVS partition layout
}
```

### Configuration Fields

Define web form fields that generate NVS partitions:

```json
{
  "configSections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "description": "Optional description",
      "fields": [
        {
          "id": "field-id",
          "label": "Field Label",
          "type": "text",           // text, password, number, email, url
          "nvsKey": "nvs_key_name", // NVS storage key
          "required": true,
          "placeholder": "Example value",
          "help": "Optional help text"
        }
      ]
    }
  ],
  "nvsPartition": {
    "name": "nvs",                  // Partition name
    "offset": "0x9000",             // Flash offset (hex)
    "size": "0x6000",               // Partition size (hex)
    "namespace": "config"           // NVS namespace
  }
}
```

## Reading Configuration in Firmware

### Rust (esp-idf-svc)

```rust
use esp_idf_svc::nvs::*;

fn read_config() -> Result<String, EspError> {
    let nvs_partition = EspDefaultNvsPartition::take()?;
    let nvs = EspNvs::new(nvs_partition, "config", true)?;

    let mut value = String::new();
    nvs.get_str("wifi_ssid", &mut value)?;
    Ok(value)
}
```

### Arduino (ESP32)

```cpp
#include <Preferences.h>

Preferences prefs;
prefs.begin("config", true);  // Read-only
String ssid = prefs.getString("wifi_ssid", "");
prefs.end();
```

### C (ESP-IDF)

```c
#include "nvs_flash.h"
#include "nvs.h"

nvs_handle_t nvs;
esp_err_t err = nvs_open("config", NVS_READONLY, &nvs);

char value[32];
size_t len = sizeof(value);
nvs_get_str(nvs, "wifi_ssid", value, &len);
nvs_close(nvs);
```

## Customization

### Different Firmware Location

Edit `generate_flasher_config.py` line 61:

```python
# Default: GitHub releases
firmware_url = f"https://github.com/{repo}/releases/download/{version}/{project_id}.bin"

# Custom CDN
firmware_url = f"https://cdn.example.com/firmware/{version}/{project_id}.bin"

# Direct file
firmware_url = f"https://example.com/firmware/{project_id}.bin"
```

### Multiple Chips

Create separate projects for each chip:

```
sensors/
├── my-project-esp32c3/
│   └── project.json  (chip: "esp32c3")
├── my-project-esp32s3/
│   └── project.json  (chip: "esp32s3")
```

### Custom Build Steps

Modify `flasher-release.yml` build step:

```yaml
- name: Build firmware
  run: |
    . $HOME/export-esp.sh
    cd sensors/${{ matrix.project }}

    # Your custom build commands here
    cargo build --release --features "custom-feature"

    # Custom post-processing
    ./scripts/custom-processing.sh
```

## Troubleshooting

### Workflow fails: "No projects found"

**Cause:** No `project.json` files in `sensors/` directory

**Fix:**
```bash
# Verify project.json exists
ls -la sensors/*/project.json

# Check JSON syntax
python3 -m json.tool sensors/your-project/project.json
```

### Flasher shows "Failed to download firmware"

**Cause:** Firmware binary not uploaded to GitHub release

**Fix:**
1. Check GitHub release has `.bin` files attached
2. Verify firmware URL in browser console
3. Ensure release is published (not draft)

### Configuration not updating on GitHub Pages

**Cause:** Pages deployment cached or failed

**Fix:**
1. Check Actions tab for deployment errors
2. Wait 5-10 minutes for CDN cache to clear
3. Hard refresh browser (Ctrl+Shift+R)
4. Check `docs/flasher/js/projects-config.js` was updated in repo

### "Missing required fields" error

**Cause:** `project.json` missing required fields

**Fix:**
```bash
# Validate with Python
python3 << EOF
import json
required = ['name', 'id', 'description', 'hardware', 'software']
project = json.load(open('sensors/your-project/project.json'))
missing = [f for f in required if f not in project]
print('Missing fields:', missing if missing else 'None')
EOF
```

## Advanced Usage

### Multi-Stage Releases

Create separate workflows for dev/staging/production:

```yaml
# .github/workflows/flasher-staging.yml
on:
  push:
    branches: [ develop ]

env:
  VERSION: staging-${{ github.sha }}
  PAGES_BRANCH: gh-pages-staging
```

### Custom Field Types

Extend field types in `project.json`:

```json
{
  "fields": [
    {
      "type": "number",
      "min": 0,
      "max": 100,
      "default": 50
    },
    {
      "type": "select",
      "options": ["option1", "option2"],
      "default": "option1"
    }
  ]
}
```

Then update `docs/flasher/js/config-manager.js` to handle new types.

### Monorepo Support

Build from subdirectory:

```yaml
- name: Build firmware
  working-directory: firmware/sensors/${{ matrix.project }}
  run: cargo build --release
```

## Security Notes

- Firmware binaries are public (GitHub releases)
- Configuration values stored in browser localStorage (plaintext)
- NVS partition flashed to device via Web Serial (local only)
- No network transmission of credentials
- Use "Clear All" button to remove saved config from browser

**For production:**
- Consider encrypting localStorage values
- Add firmware signing/verification
- Implement HTTPS on custom domains
- Use branch protection for release tags

## Support

- Documentation: [docs/flasher/README.md](../README.md)
- Features: [docs/flasher/FEATURES.md](../FEATURES.md)
- Issues: Create GitHub issue in your repository

## License

These example files are provided as-is for integration into your ESP32 projects.
