#!/usr/bin/env node

/**
 * ESP WebFlash Toolkit CLI
 * Command-line interface for scaffolding ESP32 web flasher projects
 *
 * @author Adam Weber (github: adam-weber)
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'flasher');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function select(query, options) {
  return new Promise(resolve => {
    console.log(`\n${query}`);
    options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`));
    rl.question('> ', answer => {
      const idx = parseInt(answer) - 1;
      resolve(options[idx] || options[0]);
    });
  });
}

async function interactiveSetup() {
  console.log('\n🔧 ESP WebFlash Toolkit - Project Setup\n');

  const projectName = await question('Project name: ');
  if (!projectName.trim()) {
    console.error('Project name is required');
    process.exit(1);
  }

  const dirName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const targetDir = path.join(process.cwd(), dirName);

  const chip = await select('Chip type:', [
    'ESP32',
    'ESP32-S2',
    'ESP32-S3',
    'ESP32-C3',
    'ESP8266'
  ]);

  const firmwareUrl = await question('Firmware URL (or press Enter to set later): ');

  const addWifi = (await question('Add WiFi configuration fields? (Y/n): ')).toLowerCase() !== 'n';

  const addCustomFields = (await question('Add custom configuration fields? (y/N): ')).toLowerCase() === 'y';

  let customFields = [];
  if (addCustomFields) {
    console.log('\nEnter custom fields (empty name to finish):');
    while (true) {
      const fieldName = await question('  Field name (e.g., device_name): ');
      if (!fieldName.trim()) break;

      const fieldLabel = await question('  Display label: ') || fieldName;
      const fieldType = await select('  Field type:', ['text', 'password', 'number']);

      customFields.push({
        key: fieldName.trim(),
        label: fieldLabel.trim(),
        type: fieldType
      });
    }
  }

  // Scaffold the project
  console.log(`\nCreating project in ${targetDir}...`);
  await scaffoldProject(targetDir, {
    projectName: projectName.trim(),
    chip: chip.toLowerCase().replace('-', ''),
    firmwareUrl: firmwareUrl.trim(),
    addWifi,
    customFields
  });

  console.log('\n✅ Done! Your ESP Web Flasher is ready.\n');
  console.log('Next steps:');
  console.log(`  cd ${dirName}`);
  console.log('  npx serve . -l 3000');
  console.log('\nThen open http://localhost:3000 in your browser.');
  if (!firmwareUrl.trim()) {
    console.log('\n⚠️  Don\'t forget to set your firmware URL in js/projects-config.js');
  }
  console.log('');
}

async function scaffoldProject(targetDir, options) {
  // Check if target exists
  if (fs.existsSync(targetDir)) {
    const answer = await question(`Directory "${path.basename(targetDir)}" exists. Overwrite? (y/N): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
    await fs.remove(targetDir);
  }

  // Check template exists
  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error('Error: Template directory not found.');
    console.error('Run `npm run build` first if in development mode.');
    process.exit(1);
  }

  // Copy template
  await fs.copy(TEMPLATE_DIR, targetDir);

  // Generate projects-config.js
  const configSections = [];

  if (options.addWifi) {
    configSections.push(`            {
                name: 'WiFi',
                fields: [
                    { key: 'wifi_ssid', label: 'WiFi Network', type: 'text', required: true },
                    { key: 'wifi_pass', label: 'WiFi Password', type: 'password', required: true }
                ]
            }`);
  }

  if (options.customFields.length > 0) {
    const customFieldsStr = options.customFields.map(f =>
      `                    { key: '${f.key}', label: '${f.label}', type: '${f.type}' }`
    ).join(',\n');

    configSections.push(`            {
                name: 'Settings',
                fields: [
${customFieldsStr}
                ]
            }`);
  }

  const configContent = `/**
 * Projects Configuration
 * Edit this file to configure your ESP flasher
 */

window.PROJECTS = {
    default: {
        name: '${options.projectName}',
        chip: '${options.chip}',
        description: 'Flash firmware to your ${options.chip.toUpperCase()} device',
        firmware: [
            {
                name: 'firmware.bin',
                offset: 0x10000,
                url: '${options.firmwareUrl || 'https://github.com/YOUR_USER/YOUR_REPO/releases/latest/download/firmware.bin'}'
            }
        ],
        configSections: [
${configSections.join(',\n')}
        ]
    }
};
`;

  await fs.writeFile(path.join(targetDir, 'js', 'projects-config.js'), configContent);

  // Create package.json
  const packageJson = {
    name: path.basename(targetDir),
    version: '1.0.0',
    description: `${options.projectName} - ESP32 Web Flasher`,
    type: 'module',
    scripts: {
      serve: 'npx serve . -l 3000'
    }
  };
  await fs.writeJSON(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

  // Create README
  const readme = `# ${options.projectName}

ESP32 Web Flasher for ${options.projectName}

## Quick Start

\`\`\`bash
npx serve . -l 3000
\`\`\`

Then open http://localhost:3000 in Chrome, Edge, or Opera.

## Configuration

Edit \`js/projects-config.js\` to:
- Set your firmware URL
- Add/remove configuration fields
- Change project settings

## Deploy to GitHub Pages

1. Push to GitHub
2. Settings → Pages → Source: "GitHub Actions"
3. Your flasher will be at \`https://YOUR_USER.github.io/YOUR_REPO/\`

## Documentation

https://github.com/adam-weber/esp-webflash-toolkit
`;

  await fs.writeFile(path.join(targetDir, 'README.md'), readme);
}

async function quickScaffold(projectName) {
  const targetDir = path.join(process.cwd(), projectName);

  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error('Error: Template directory not found.');
    process.exit(1);
  }

  if (fs.existsSync(targetDir)) {
    const answer = await question(`Directory "${projectName}" exists. Overwrite? (y/N): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
    await fs.remove(targetDir);
  }

  console.log(`\nScaffolding in ${targetDir}...`);
  await fs.copy(TEMPLATE_DIR, targetDir);

  // Create minimal package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'ESP32 Web Flasher',
    type: 'module',
    scripts: { serve: 'npx serve . -l 3000' }
  };
  await fs.writeJSON(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

  console.log('\n✅ Done!\n');
  console.log(`  cd ${projectName}`);
  console.log('  npx serve . -l 3000\n');
}

function generateFlashUrl(options) {
  const base = 'https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/';
  const params = new URLSearchParams();

  if (options.name) params.set('name', options.name);
  if (options.bin) params.set('bin', options.bin);
  if (options.chip) params.set('chip', options.chip);
  if (options.fields) params.set('fields', options.fields);

  return `${base}?${params.toString()}`;
}

async function urlCommand() {
  console.log('\n🔗 Generate Flash URL\n');

  const name = await question('Project name: ');
  const bin = await question('Firmware URL (.bin): ');
  const chip = await select('Chip type:', ['esp32', 'esp32s2', 'esp32s3', 'esp32c3']);

  const addWifi = (await question('Include WiFi config? (Y/n): ')).toLowerCase() !== 'n';

  const url = generateFlashUrl({
    name,
    bin,
    chip,
    fields: addWifi ? 'wifi' : undefined
  });

  console.log('\n📎 Your flash URL:\n');
  console.log(url);
  console.log('\nShare this link - users can flash directly from their browser!\n');
}

function showHelp() {
  console.log(`
ESP WebFlash Toolkit - Let users flash your ESP32 from a browser

Usage:
  npx esp-webflash-toolkit                    Interactive project setup
  npx esp-webflash-toolkit create <name>      Quick scaffold (minimal prompts)
  npx esp-webflash-toolkit url                Generate a hosted flash URL
  npx esp-webflash-toolkit --help             Show this help

Examples:
  npx esp-webflash-toolkit                    # Interactive setup wizard
  npx esp-webflash-toolkit create my-flasher  # Quick create
  npx esp-webflash-toolkit url                # Get hosted URL (no setup needed!)

Hosted Flasher (zero setup):
  Add flash-config.json to your repo, then share:
  https://adam-weber.github.io/esp-webflash-toolkit/examples/hosted/?repo=YOUR/REPO

Library Usage:
  npm install esp-webflash-toolkit

  import { NVSGenerator } from 'esp-webflash-toolkit/nvs-generator';
  import { PartitionTableGenerator } from 'esp-webflash-toolkit/partition-table-generator';
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === '--help' || command === '-h') {
      showHelp();
    } else if (command === 'create') {
      const projectName = args[1];
      if (!projectName) {
        console.error('Usage: npx esp-webflash-toolkit create <project-name>');
        process.exit(1);
      }
      await quickScaffold(projectName);
    } else if (command === 'url') {
      await urlCommand();
    } else if (command === 'init') {
      // Init in current directory
      await scaffoldProject(process.cwd(), {
        projectName: path.basename(process.cwd()),
        chip: 'esp32',
        firmwareUrl: '',
        addWifi: true,
        customFields: []
      });
    } else if (!command) {
      // No command = interactive mode
      await interactiveSetup();
    } else {
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

main();
