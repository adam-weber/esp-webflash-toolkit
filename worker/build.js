#!/usr/bin/env node

/**
 * Worker build script.
 * Bundles the worker + inlines the component JS for flash pages.
 */

import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function main() {
    console.log('Building ESP WebFlash Worker...\n');

    // Read the component bundle to inline in flash pages
    let componentJs = '/* component bundle not found — run npm run build in root first */';
    const bundlePath = path.join(rootDir, 'dist', 'esp-flasher-component.min.js');

    if (fs.existsSync(bundlePath)) {
        componentJs = fs.readFileSync(bundlePath, 'utf8');
        console.log(`  Inlining component bundle (${(componentJs.length / 1024).toFixed(1)}KB)`);
    } else {
        console.warn('  Warning: Component bundle not found at dist/esp-flasher-component.min.js');
        console.warn('  Flash pages will not have the component. Run `npm run build` in root first.');
    }

    // Ensure dist directory
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

    // Bundle the worker with esbuild
    await build({
        entryPoints: [path.join(__dirname, 'src', 'index.js')],
        outfile: path.join(distDir, 'worker.js'),
        bundle: true,
        format: 'esm',
        platform: 'neutral',
        target: 'es2022',
        minify: true,
        sourcemap: false,
        logLevel: 'warning',
        define: {
            // Inject the component JS as a string constant
            '__COMPONENT_JS__': JSON.stringify(componentJs),
        },
    });

    const stat = fs.statSync(path.join(distDir, 'worker.js'));
    console.log(`\n  worker.js (${(stat.size / 1024).toFixed(1)}KB)`);
    console.log('\nBuild complete!');
}

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
