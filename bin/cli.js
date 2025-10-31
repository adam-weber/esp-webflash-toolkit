#!/usr/bin/env node

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

async function scaffoldFlasher(targetDir) {
  try {
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_DIR)) {
      console.error('Error: Template directory not found.');
      console.error('This may be a development environment. Run `npm run build` first.');
      process.exit(1);
    }

    // Check if target directory exists
    if (fs.existsSync(targetDir)) {
      const answer = await question(`Directory "${targetDir}" already exists. Overwrite? (y/N): `);
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        process.exit(0);
      }
      await fs.remove(targetDir);
    }

    // Copy template
    console.log(`\nScaffolding ESP WebFlash toolkit in ${targetDir}...\n`);
    await fs.copy(TEMPLATE_DIR, targetDir);

    // Create package.json for the scaffolded project
    const packageJson = {
      name: path.basename(targetDir),
      version: "1.0.0",
      description: "ESP32 Web Flasher",
      type: "module",
      scripts: {
        serve: "npx serve . -l 3000"
      }
    };

    await fs.writeJSON(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

    // Create README for the scaffolded project
    const readme = `# ${path.basename(targetDir)}

ESP32 Web Flasher - scaffolded from esp-webflash-toolkit

## Usage

1. Start local server:
   \`\`\`bash
   npm run serve
   \`\`\`

2. Open http://localhost:3000 in Chrome/Edge (Web Serial API required)

3. Connect your ESP32 device and flash firmware

## Customization

- Edit \`js/projects-config.js\` to add your projects
- Modify \`index.html\` for UI changes
- See \`.github-examples/\` for CI/CD integration

## Documentation

https://github.com/adam-weber/esp-webflash-toolkit
`;

    await fs.writeFile(path.join(targetDir, 'README.md'), readme);

    console.log('Done! Your ESP Web Flasher is ready.\n');
    console.log('Next steps:');
    console.log(`  cd ${targetDir}`);
    console.log('  npm run serve');
    console.log('\nThen open http://localhost:3000 in your browser.\n');

  } catch (error) {
    console.error('Error scaffolding project:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function showHelp() {
  console.log(`
ESP WebFlash Toolkit - Browser-based ESP32 flashing

Usage:
  npx esp-webflash create <project-name>    Create new flasher project
  npx esp-webflash init                     Initialize in current directory
  npx esp-webflash --help                   Show this help

Library Usage:
  npm install esp-webflash-toolkit

  import { ConfigManager } from 'esp-webflash-toolkit/config-manager';
  import { FirmwareFlasher } from 'esp-webflash-toolkit/firmware-flasher';

Examples:
  npx esp-webflash create my-device-flasher
  npx esp-webflash init
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === 'create') {
    const projectName = args[1];
    if (!projectName) {
      console.error('Error: Please specify a project name');
      console.error('Usage: npx esp-webflash create <project-name>');
      process.exit(1);
    }
    const targetDir = path.join(process.cwd(), projectName);
    await scaffoldFlasher(targetDir);
  } else if (command === 'init') {
    const targetDir = process.cwd();
    await scaffoldFlasher(targetDir);
  } else {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
}

main();
