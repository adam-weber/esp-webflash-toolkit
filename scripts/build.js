#!/usr/bin/env node

/**
 * Build Script for ESP WebFlash Toolkit
 * Builds the headless core library, adapters, and browser bundles
 *
 * Output structure:
 *   dist/
 *     core/                    - ESM modules for npm import
 *     adapters/vanilla/        - Vanilla JS adapter
 *     esp-webflash-toolkit.js  - IIFE bundle (core only)
 *     esp-webflash-toolkit.min.js
 *     esp-webflash-toolkit-full.js  - IIFE bundle (core + vanilla adapter)
 *     esp-webflash-toolkit-full.min.js
 *
 * Templates use the full bundle via CDN or local reference.
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

    // Build core modules (ESM for npm)
    console.log('\nBuilding core modules...');
    await buildDirectory(
        path.join(srcDir, 'core'),
        path.join(distDir, 'core')
    );

    // Build vanilla adapter (ESM for npm)
    console.log('\nBuilding vanilla adapter...');
    await buildDirectory(
        path.join(srcDir, 'adapters', 'vanilla'),
        path.join(distDir, 'adapters', 'vanilla')
    );

    // Build component modules (ESM for npm)
    console.log('\nBuilding component modules...');
    await buildDirectory(
        path.join(srcDir, 'components'),
        path.join(distDir, 'components')
    );

    // Build browser bundles
    console.log('\nBuilding browser bundles...');
    await buildBundles();

    console.log('\nBuild complete!\n');
    printUsage();
}

async function buildDirectory(srcPath, destPath) {
    await fs.ensureDir(destPath);

    const files = await fs.readdir(srcPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));

    for (const file of jsFiles) {
        const inputPath = path.join(srcPath, file);
        const outputPath = path.join(destPath, file);

        // For ESM builds, we need to strip the window assignments from utility files
        // These are only needed for IIFE/browser bundles
        const isUtilityFile = file === 'nvs-generator.js';

        try {
            if (isUtilityFile) {
                // Read and transform: remove window assignments for ESM
                let content = await fs.readFile(inputPath, 'utf8');
                // Remove the window assignment block (handles multiline)
                content = content.replace(
                    /\n\/\/ Expose to browser global scope[^\n]*\nif \(typeof window !== 'undefined'\) \{[\s\S]*?\n\}\n?/g,
                    '\n// Browser globals are handled by IIFE bundle\n'
                );
                await fs.writeFile(outputPath, content);
                console.log(`  ${file} (ESM clean)`);
            } else {
                await build({
                    entryPoints: [inputPath],
                    outfile: outputPath,
                    bundle: false,
                    format: 'esm',
                    platform: 'browser',
                    target: 'es2020',
                    minify: false,
                    sourcemap: true,
                    logLevel: 'warning'
                });
                console.log(`  ${file}`);
            }
        } catch (error) {
            console.error(`  Error: ${file}: ${error.message}`);
            process.exit(1);
        }
    }
}

async function buildBundles() {
    // Core-only bundle (ESPFlasher, NVSGenerator, etc.)
    await buildBundle({
        name: 'esp-webflash-toolkit',
        entry: path.join(srcDir, 'core', 'index.js'),
        globalName: 'ESPWebFlash'
    });

    // Full bundle with vanilla adapter (includes FlasherApp)
    await buildBundle({
        name: 'esp-webflash-toolkit-full',
        entry: path.join(srcDir, 'bundle-full.js'),
        globalName: 'ESPWebFlash'
    });

    // Component bundle (self-registering <esp-flasher> element)
    await buildBundle({
        name: 'esp-flasher-component',
        entry: path.join(srcDir, 'bundle-component.js'),
        globalName: 'ESPFlasherComponent'
    });
}

async function buildBundle({ name, entry, globalName }) {
    const outputMin = path.join(distDir, `${name}.min.js`);
    const outputDev = path.join(distDir, `${name}.js`);

    try {
        // Minified production build
        await build({
            entryPoints: [entry],
            outfile: outputMin,
            bundle: true,
            format: 'iife',
            globalName,
            platform: 'browser',
            target: 'es2020',
            minify: true,
            sourcemap: true,
            logLevel: 'warning'
        });
        console.log(`  ${name}.min.js`);

        // Development build (readable)
        await build({
            entryPoints: [entry],
            outfile: outputDev,
            bundle: true,
            format: 'iife',
            globalName,
            platform: 'browser',
            target: 'es2020',
            minify: false,
            sourcemap: true,
            logLevel: 'warning'
        });
        console.log(`  ${name}.js`);

    } catch (error) {
        console.error(`  Bundle error (${name}): ${error.message}`);
        process.exit(1);
    }
}

function printUsage() {
    console.log('Usage:');
    console.log('');
    console.log('NPM / ES Modules:');
    console.log('  import { ESPFlasher } from "esp-webflash-toolkit"');
    console.log('  import { createFlasher, FlasherApp } from "esp-webflash-toolkit/adapters/vanilla"');
    console.log('');
    console.log('Browser / CDN (core only):');
    console.log('  <script src="esp-webflash-toolkit.min.js"></script>');
    console.log('  const { ESPFlasher, NVSGenerator } = ESPWebFlash;');
    console.log('');
    console.log('Browser / CDN (full with UI adapter):');
    console.log('  <script src="esp-webflash-toolkit-full.min.js"></script>');
    console.log('  const { ESPFlasher, FlasherApp, createFlasher } = ESPWebFlash;');
    console.log('');
}

main().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
