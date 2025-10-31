#!/usr/bin/env python3
"""
Generate flasher configuration from sensor projects.

This script scans the sensors/ directory for project.json files and generates
a JavaScript configuration file that the web flasher can use.

Usage:
    python3 scripts/generate_flasher_config.py > docs/flasher/js/projects-config.js

Environment Variables:
    VERSION            - Release version (default: 'latest')
    GITHUB_REPOSITORY  - Repository name in owner/repo format (default: autodetect)
    CI                 - Set to 'true' to skip writing to file (CI mode)

Project JSON Schema:
    {
      "name": "Project Display Name",
      "id": "project-id",  // Must match directory name
      "description": "What this firmware does",
      "chip": "esp32c3",   // Target chip
      "hardware": ["ESP32-C3-DevKitC", "WT901 IMU"],
      "software": ["Chrome/Edge 89+"],
      "documentation": "https://example.com/docs",  // Optional
      "configSections": [  // Optional - for NVS configuration
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
              "placeholder": "MyNetwork",
              "help": "Your WiFi network name"
            }
          ]
        }
      ],
      "nvsPartition": {    // Required if configSections present
        "name": "nvs",
        "offset": "0x9000",
        "size": "0x6000",
        "namespace": "config"
      }
    }
"""

import json
import sys
from pathlib import Path


def find_sensor_projects(sensors_dir: Path) -> list[dict]:
    """Find all sensor projects with project.json metadata."""
    projects = []

    if not sensors_dir.exists():
        print(f"Error: sensors directory not found: {sensors_dir}", file=sys.stderr)
        return projects

    for project_dir in sensors_dir.iterdir():
        if not project_dir.is_dir():
            continue

        project_json = project_dir / "project.json"
        if not project_json.exists():
            print(f"Warning: Skipping {project_dir.name} - no project.json found", file=sys.stderr)
            continue

        try:
            with open(project_json, 'r') as f:
                project_data = json.load(f)

            # Validate required fields
            required_fields = ['name', 'id', 'description', 'hardware', 'software']
            missing = [f for f in required_fields if f not in project_data]
            if missing:
                print(f"Warning: {project_dir.name}/project.json missing fields: {missing}", file=sys.stderr)
                continue

            # Validate id matches directory name
            if project_data['id'] != project_dir.name:
                print(f"Warning: {project_dir.name}/project.json id '{project_data['id']}' doesn't match directory name", file=sys.stderr)

            projects.append(project_data)
            print(f"✓ Found project: {project_data['name']}", file=sys.stderr)

        except json.JSONDecodeError as e:
            print(f"Error: Failed to parse {project_json}: {e}", file=sys.stderr)
            continue

    return projects


def generate_flasher_js(projects: list[dict], repo: str, version: str) -> str:
    """Generate JavaScript configuration for the web flasher."""

    # Build projects object
    projects_js = []
    for project in projects:
        project_id = project['id']

        # Generate firmware URL based on GitHub release
        firmware_url = f"https://github.com/{repo}/releases/download/{version}/{project_id}.bin"

        # Build config sections if present
        config_sections_js = ""
        if 'configSections' in project:
            config_sections_js = f",\n            configSections: {json.dumps(project['configSections'], indent=12)}"

        # Build NVS partition config if present
        nvs_partition_js = ""
        if 'nvsPartition' in project:
            nvs_partition_js = f",\n            nvsPartition: {json.dumps(project['nvsPartition'], indent=12)}"

        # Build documentation link if present
        documentation_js = ""
        if 'documentation' in project:
            documentation_js = f",\n            documentation: {json.dumps(project['documentation'])}"

        project_js = f"""        '{project_id}': {{
            name: {json.dumps(project['name'])},
            description: {json.dumps(project['description'])},
            hardware: {json.dumps(project['hardware'])},
            software: {json.dumps(project['software'])},
            firmwareUrl: {json.dumps(firmware_url)},
            chip: {json.dumps(project.get('chip', 'esp32c3'))},
            target: {json.dumps(project.get('target', 'riscv32imc-esp-espidf'))}{config_sections_js}{nvs_partition_js}{documentation_js}
        }}"""

        projects_js.append(project_js)

    projects_obj = ",\n".join(projects_js)

    return f"""// Auto-generated project configuration
// Generated from sensors/*/project.json
// DO NOT EDIT MANUALLY - your changes will be overwritten
//
// Repository: {repo}
// Version: {version}

const PROJECTS = {{
{projects_obj}
}};

// Export for use in index.html
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = PROJECTS;
}}
"""


def main():
    import os

    # Determine repository root
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    sensors_dir = repo_root / "sensors"
    output_file = repo_root / "docs" / "flasher" / "js" / "projects-config.js"

    # Get version and repo from environment or use defaults
    version = os.environ.get('VERSION', 'latest')
    repo = os.environ.get('GITHUB_REPOSITORY')

    # Try to autodetect repository from git remote if not in CI
    if not repo:
        try:
            import subprocess
            result = subprocess.run(
                ['git', 'remote', 'get-url', 'origin'],
                cwd=repo_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                remote_url = result.stdout.strip()
                # Parse owner/repo from git@github.com:owner/repo.git or https://github.com/owner/repo.git
                if 'github.com' in remote_url:
                    repo = remote_url.split('github.com')[-1].strip('/:').replace('.git', '')
        except Exception:
            pass

    if not repo:
        repo = 'your-username/your-repo'
        print(f"Warning: Could not detect repository, using placeholder: {repo}", file=sys.stderr)

    print(f"Generating flasher config for {repo} version {version}", file=sys.stderr)
    print(f"Scanning: {sensors_dir}", file=sys.stderr)

    # Find all sensor projects
    projects = find_sensor_projects(sensors_dir)

    if not projects:
        print("Error: No valid sensor projects found!", file=sys.stderr)
        sys.exit(1)

    print(f"\nFound {len(projects)} project(s)", file=sys.stderr)

    # Generate JavaScript configuration
    config_js = generate_flasher_js(projects, repo, version)

    # Write to stdout (can be redirected to file)
    print(config_js)

    # Also write to docs/flasher/js/projects-config.js if not in CI
    if os.environ.get('CI') != 'true':
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(config_js)
        print(f"\n✓ Also wrote to: {output_file}", file=sys.stderr)

    print(f"\n✓ Configuration generated successfully", file=sys.stderr)


if __name__ == '__main__':
    main()
