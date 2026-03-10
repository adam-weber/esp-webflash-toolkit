#!/usr/bin/env node

/**
 * Generate a self-contained flash page from a flash-config.json file.
 * Used by the GitHub Action and the CLI `generate` command.
 *
 * Usage:
 *   node scripts/generate-page.js [config-path] [--output dir]
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeConfig, validateConfig } from '../src/core/config-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Generate a self-contained HTML flash page.
 * @param {string} configPath - Path to flash-config.json
 * @param {string} outputDir - Output directory
 * @param {Object} [options]
 * @param {string} [options.componentVersion] - CDN version for esptool-js fallback
 * @returns {Promise<{htmlPath: string, badgeMarkdown: string}>}
 */
export async function generatePage(configPath, outputDir, options = {}) {
    // Read and normalize config
    const configRaw = await fs.readJSON(configPath);
    const config = normalizeConfig(configRaw);

    // Validate
    const validation = validateConfig(config);
    if (!validation.valid) {
        throw new Error(`Invalid config:\n  ${validation.errors.join('\n  ')}`);
    }

    // Read the component bundle
    let componentJS;
    const localBundle = path.join(rootDir, 'dist', 'esp-flasher-component.min.js');

    if (await fs.pathExists(localBundle)) {
        componentJS = await fs.readFile(localBundle, 'utf8');
    } else {
        throw new Error(
            'Component bundle not found. Run `npm run build` first, or ensure dist/esp-flasher-component.min.js exists.'
        );
    }

    // Generate HTML
    const configJSON = JSON.stringify(config, null, 2);
    const title = config.name || 'ESP Firmware';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Flash Firmware</title>
    <style>body { margin: 0; display: flex; justify-content: center; padding: 40px 20px; background: #f5f5f7; min-height: 100vh; }</style>
    <script>${componentJS}</script>
</head>
<body>
    <esp-flasher mode="full"></esp-flasher>
    <script type="application/json" id="flash-config">${configJSON}</script>
    <script>
        const config = JSON.parse(document.getElementById('flash-config').textContent);
        document.querySelector('esp-flasher').setAttribute('config-data', JSON.stringify(config));
    </script>
</body>
</html>`;

    // Write output
    await fs.ensureDir(outputDir);
    const htmlPath = path.join(outputDir, 'index.html');
    await fs.writeFile(htmlPath, html);

    // Generate badge markdown
    const badgeLabel = encodeURIComponent(title);
    const badgeMarkdown = `[![Flash Firmware](https://img.shields.io/badge/Flash-${badgeLabel}-blue)](${config.repo ? `https://${config.repo.split('/')[0]}.github.io/${config.repo.split('/')[1]}/` : ''})`;

    return { htmlPath, badgeMarkdown };
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// CLI mode
if (process.argv[1] === __filename || process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    let configPath = 'flash-config.json';
    let outputDir = '_flasher';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
            outputDir = args[++i];
        } else if (!args[i].startsWith('-')) {
            configPath = args[i];
        }
    }

    configPath = path.resolve(configPath);
    outputDir = path.resolve(outputDir);

    generatePage(configPath, outputDir)
        .then(({ htmlPath, badgeMarkdown }) => {
            console.log(`Generated flash page: ${htmlPath}`);
            console.log(`\nBadge markdown:\n${badgeMarkdown}`);
        })
        .catch((err) => {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        });
}
