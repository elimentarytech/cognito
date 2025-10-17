#!/usr/bin/env node

/**
 * Clean build script for Cognito AI Extension
 * No obfuscation - just copies files for distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create build directory
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('🔨 Building Cognito AI Extension (Clean Build)...');

// Copy all files to build directory
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'styles.css',
  'html2canvas.min.js',
  'icons/',
  'generated-image-Photoroom.png',
  'content.js',
  'background.js',
  'popup.js',
  'integrations.js',
  'database.js'
];

filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      execSync(`cp -r "${srcPath}" "${destPath}"`);
    } else {
      execSync(`cp "${srcPath}" "${destPath}"`);
    }
    console.log(`✅ Copied ${file}`);
  }
});

// Create distribution package
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

execSync(`cd "${buildDir}" && zip -r "../dist/cognito-ai-extension-clean.zip" . -x "*.DS_Store"`);

console.log('✅ Clean build complete!');
console.log('📦 Distribution package: dist/cognito-ai-extension-clean.zip');
console.log('🔍 No obfuscation - perfect for testing and distribution');
console.log('');
console.log('📋 Distribution Instructions:');
console.log('1. Share the .zip file with users');
console.log('2. Users can install via Chrome Extensions page');
console.log('3. Enable "Developer mode" and click "Load unpacked"');
console.log('4. Select the extracted folder');
