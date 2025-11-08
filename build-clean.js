#!/usr/bin/env node

/**
 * Clean build script for Cognito AI Extension
 * Creates a clean, non-obfuscated version for development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to copy (no obfuscation)
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'styles.css',
  'html2canvas.min.js',
  'icons/',
  'generated-image-Photoroom.png',
  'background.js',
  'content.js',
  'popup.js',
  'integrations.js',
  'database.js'
];

// Create build directory
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

console.log('🔨 Building Cognito AI Extension (Clean)...');

// Copy all files to build directory
filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.statSync(srcPath).isDirectory()) {
    execSync(`cp -r "${srcPath}" "${destPath}"`);
  } else {
    execSync(`cp "${srcPath}" "${destPath}"`);
  }
  console.log(`✅ Copied ${file}`);
});

// Create distribution package
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

execSync(`cd "${buildDir}" && zip -r "../dist/cognito-ai-extension-clean.zip" . -x "*.DS_Store"`);

console.log('✅ Clean build complete!');
console.log('📦 Distribution package: dist/cognito-ai-extension-clean.zip');
console.log('🔧 Clean code without obfuscation for development');