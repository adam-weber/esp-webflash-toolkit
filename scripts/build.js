#!/usr/bin/env node

import { build } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const templateJsDir = path.join(rootDir, 'templates', 'flasher', 'js');

async function main() {
  console.log('Building ESP WebFlash Toolkit...\n');

  // Clean dist directory
  console.log('Cleaning dist/...');
  await fs.remove(distDir);
  await fs.ensureDir(distDir);

  // Get all source files
  const sourceFiles = await fs.readdir(srcDir);
  const jsFiles = sourceFiles.filter(f => f.endsWith('.js'));

  console.log(`Building ${jsFiles.length} modules...\n`);

  // Build each module separately for better tree-shaking
  for (const file of jsFiles) {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(distDir, file);

    try {
      await build({
        entryPoints: [inputPath],
        outfile: outputPath,
        bundle: false,  // Don't bundle, keep as separate modules
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        minify: true,
        sourcemap: true,
        logLevel: 'warning'
      });
      console.log(`  ${file}`);
    } catch (error) {
      console.error(`  Error: ${file}: ${error.message}`);
      process.exit(1);
    }
  }

  // Copy built files to templates for scaffolding
  console.log('\nCopying to templates/flasher/js/...');
  await fs.ensureDir(templateJsDir);

  for (const file of jsFiles) {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(templateJsDir, file);
    await fs.copy(srcPath, destPath);
    console.log(`  ${file}`);
  }

  // Copy source maps too
  const mapFiles = await fs.readdir(distDir);
  for (const file of mapFiles.filter(f => f.endsWith('.map'))) {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(templateJsDir, file);
    await fs.copy(srcPath, destPath);
  }

  console.log('\nBuild complete!\n');
  console.log(`Built files: dist/`);
  console.log(`Template files: templates/flasher/js/`);
  console.log('');
}

main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
