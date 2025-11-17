#!/usr/bin/env node

/**
 * Chrome Web Store packaging script
 * Creates a zip file optimized for Chrome Web Store submission
 * 
 * Usage: node package-for-chrome-store.js
 * 
 * This script:
 * 1. Runs a clean build (no obfuscation)
 * 2. Creates a zip with manifest.json at the root
 * 3. Excludes unnecessary files
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('📦 Packaging for Chrome Web Store...\n');

// Run clean build first
console.log('Step 1: Running clean build...');
try {
  execSync('node build.js --chrome-store', { stdio: 'inherit', cwd: __dirname });
  console.log('\n✅ Build complete!');
  console.log('\n📦 Chrome Store package ready: dist/cognito-ai-extension-chrome-store.zip');
  console.log('\n✨ Next steps:');
  console.log('   1. Go to https://chrome.google.com/webstore/devconsole');
  console.log('   2. Click "New Item" or select your existing item');
  console.log('   3. Upload the zip file from dist/ folder');
  console.log('   4. Fill in store listing details');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
