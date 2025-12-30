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

    // Create package.json for the scaffolded project (minimal, no build tools needed)
    const packageJson = {
      name: path.basename(targetDir),
      version: "1.0.0",
      description: "ESP32 Web Flasher",
      type: "module",
      scripts: {
        "serve": "npx serve . -l 3000"
      }
    };

    await fs.writeJSON(path.join(targetDir, 'package.json'), packageJson, { spaces: 2 });

    // Create README for the scaffolded project
    const readme = `# ${path.basename(targetDir)}

ESP32 Web Flasher - scaffolded from esp-webflash-toolkit

## Local Development

1. Start local server:
   \`\`\`bash
   npx serve . -l 3000
   \`\`\`

2. Open http://localhost:3000 in Chrome/Edge/Opera (Web Serial API required)

3. Connect your ESP32 device and flash firmware

## Deploy to GitHub Pages

### One-Time Setup

1. Push this project to GitHub
2. Go to repository Settings → Pages
3. Set Source to "GitHub Actions"

### Automatic Deployment

The included workflow (\`.github/workflows/deploy.yml\`) automatically deploys to GitHub Pages on every push to main.

Your flasher will be live at: \`https://[username].github.io/[repo-name]/\`

## Customization

- **Configuration**: Edit \`js/projects-config.js\` to add your projects and firmware URLs
- **Styling**: Modify \`styles.css\` for custom styles
- **Layout**: Edit \`index.html\` for UI changes

## Project Structure

\`\`\`
.
├── index.html              # Main application
├── styles.css              # Stylesheet
├── js/                     # Application modules
│   ├── main-app.js
│   ├── config-manager.js
│   ├── device-connection.js
│   ├── firmware-flasher.js
│   ├── flasher-ui.js
│   ├── nvs-generator.js
│   └── projects-config.js
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deployment

\`\`\`

## Browser Support

Requires browsers with Web Serial API:
- Chrome 89+
- Edge 89+
- Opera 75+

## Documentation

https://github.com/adam-weber/esp-webflash-toolkit
`;

    await fs.writeFile(path.join(targetDir, 'README.md'), readme);

    console.log('Done! Your ESP Web Flasher is ready.\n');
    console.log('Next steps:');
    console.log(`  cd ${targetDir}`);
    console.log('  npx serve . -l 3000');
    console.log('\nThen open http://localhost:3000 in your browser.');
    console.log('\nFor GitHub Pages deployment, see README.md\n');

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
  npx esp-webflash-toolkit create <project-name>    Create new flasher project
  npx esp-webflash-toolkit init                     Initialize in current directory
  npx esp-webflash-toolkit --help                   Show this help

Library Usage:
  npm install esp-webflash-toolkit

  import { ConfigManager } from 'esp-webflash-toolkit/config-manager';
  import { FirmwareFlasher } from 'esp-webflash-toolkit/firmware-flasher';

Examples:
  npx esp-webflash-toolkit create my-device-flasher
  npx esp-webflash-toolkit init
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
      console.error('Usage: npx esp-webflash-toolkit create <project-name>');
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
