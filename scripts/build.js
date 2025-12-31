#!/usr/bin/env node

/**
 * Build Script for ESP WebFlash Toolkit
 * Builds the headless core library and adapters
 *
 * @author Adam Weber (github: adam-weber)
 */

import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

async function main() {
    console.log('Building ESP WebFlash Toolkit...\n');

    // Clean dist directory
    console.log('Cleaning dist/...');
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Build core modules
    console.log('\nBuilding core modules...');
    await buildDirectory(
        path.join(srcDir, 'core'),
        path.join(distDir, 'core')
    );

    // Build vanilla adapter
    console.log('\nBuilding vanilla adapter...');
    await buildDirectory(
        path.join(srcDir, 'adapters', 'vanilla'),
        path.join(distDir, 'adapters', 'vanilla')
    );

    // Build bundled version for CDN/browser use
    console.log('\nBuilding browser bundle...');
    await buildBundle();

    // Copy legacy modules for backwards compatibility
    console.log('\nCopying legacy modules for backwards compatibility...');
    await copyLegacyModules();

    // Update templates with new core
    console.log('\nUpdating templates...');
    await updateTemplates();

    console.log('\nBuild complete!\n');
    console.log('Exports:');
    console.log('  import { ESPFlasher } from "esp-webflash-toolkit"');
    console.log('  import { createFlasher } from "esp-webflash-toolkit/adapters/vanilla"');
    console.log('  import { NVSGenerator } from "esp-webflash-toolkit/nvs-generator"');
    console.log('');
    console.log('Browser/CDN:');
    console.log('  <script src="dist/esp-webflash-toolkit.min.js"></script>');
    console.log('  const { ESPFlasher, NVSGenerator } = ESPWebFlash;');
    console.log('');
}

async function buildDirectory(srcPath, destPath) {
    await fs.ensureDir(destPath);

    const files = await fs.readdir(srcPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));

    for (const file of jsFiles) {
        const inputPath = path.join(srcPath, file);
        const outputPath = path.join(destPath, file);

        // Pure utility files (no imports to transform) - just copy
        if (file === 'nvs-generator.js' || file === 'partition-table-generator.js') {
            await fs.copy(inputPath, outputPath);
            console.log(`  ${file} (copied)`);
            continue;
        }

        try {
            await build({
                entryPoints: [inputPath],
                outfile: outputPath,
                bundle: false,
                format: 'esm',
                platform: 'browser',
                target: 'es2020',
                minify: false,  // Keep readable for debugging
                sourcemap: true,
                logLevel: 'warning'
            });
            console.log(`  ${file}`);
        } catch (error) {
            console.error(`  Error: ${file}: ${error.message}`);
            process.exit(1);
        }
    }
}

async function copyLegacyModules() {
    // For backwards compatibility, copy core modules to dist root
    const legacyMappings = {
        'nvs-generator.js': 'core/nvs-generator.js',
        'partition-table-generator.js': 'core/partition-table-generator.js'
    };

    for (const [legacy, core] of Object.entries(legacyMappings)) {
        const src = path.join(distDir, core);
        const dest = path.join(distDir, legacy);
        if (await fs.pathExists(src)) {
            await fs.copy(src, dest);
            console.log(`  ${legacy} -> ${core}`);
        }
    }
}

async function buildBundle() {
    // Create a single bundled file for browser/CDN use
    // This bundles everything into one file with a global export

    const bundleEntry = path.join(srcDir, 'core', 'index.js');
    const bundleOutput = path.join(distDir, 'esp-webflash-toolkit.min.js');

    try {
        await build({
            entryPoints: [bundleEntry],
            outfile: bundleOutput,
            bundle: true,
            format: 'iife',
            globalName: 'ESPWebFlash',
            platform: 'browser',
            target: 'es2020',
            minify: true,
            sourcemap: true,
            logLevel: 'warning',
            // Don't bundle esptool-js - it's loaded dynamically
            external: []
        });
        console.log('  esp-webflash-toolkit.min.js');

        // Also create non-minified version for debugging
        const bundleOutputDev = path.join(distDir, 'esp-webflash-toolkit.js');
        await build({
            entryPoints: [bundleEntry],
            outfile: bundleOutputDev,
            bundle: true,
            format: 'iife',
            globalName: 'ESPWebFlash',
            platform: 'browser',
            target: 'es2020',
            minify: false,
            sourcemap: true,
            logLevel: 'warning'
        });
        console.log('  esp-webflash-toolkit.js (dev)');

    } catch (error) {
        console.error(`  Bundle error: ${error.message}`);
        process.exit(1);
    }
}

async function updateTemplates() {
    const templateJsDir = path.join(rootDir, 'templates', 'flasher', 'js');

    // For now, keep templates using the old structure
    // They work standalone and don't need the headless core
    // Future: refactor templates to use core + vanilla adapter

    // Copy NVS generator to templates (it's still needed standalone)
    const nvsSource = path.join(srcDir, 'core', 'nvs-generator.js');
    const nvsDest = path.join(templateJsDir, 'nvs-generator.js');
    if (await fs.pathExists(nvsSource)) {
        await fs.copy(nvsSource, nvsDest);
        console.log('  nvs-generator.js -> templates/');
    }

    // Copy partition table generator
    const ptSource = path.join(srcDir, 'core', 'partition-table-generator.js');
    const ptDest = path.join(templateJsDir, 'partition-table-generator.js');
    if (await fs.pathExists(ptSource)) {
        await fs.copy(ptSource, ptDest);
        console.log('  partition-table-generator.js -> templates/');
    }
}

main().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
