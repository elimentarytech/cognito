#!/usr/bin/env node

/**
 * Package script for Chrome Web Store submission
 * Creates a zip file with manifest.json at the root
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, 'build');
const distDir = path.join(__dirname, 'dist');
const zipName = 'cognito-ai-extension-chrome-store.zip';
const zipPath = path.join(distDir, zipName);

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory does not exist. Please run build.js first.');
  process.exit(1);
}

// Check if manifest.json exists in build directory
const manifestPath = path.join(buildDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ manifest.json not found in build directory.');
  process.exit(1);
}

console.log('📦 Packaging extension for Chrome Web Store...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Remove old zip if it exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log('🗑️  Removed old zip file');
}

// Create zip from build directory contents (not the directory itself)
// This ensures manifest.json is at the root of the zip
process.chdir(buildDir);
execSync(`zip -r "${zipPath}" . -x "*.DS_Store" "*.git*"`, { stdio: 'inherit' });

console.log('✅ Package created successfully!');
console.log(`📦 Location: ${zipPath}`);
console.log('\n📋 Package contents:');
execSync(`unzip -l "${zipPath}" | head -15`, { stdio: 'inherit' });
console.log('\n✨ Ready for Chrome Web Store submission!');

