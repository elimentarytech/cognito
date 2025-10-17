#!/usr/bin/env node

/**
 * Production build script for Cognito AI Extension
 * Uses moderate obfuscation that preserves functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Moderate obfuscation that preserves functionality
function moderateObfuscate(code) {
  // Remove comments but keep important ones
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/\/\/.*$/gm, '');
  
  // Basic minification
  code = code.replace(/\s+/g, ' ');
  code = code.replace(/\s*([{}();,=+\-*/])\s*/g, '$1');
  
  // Remove console.log statements for production
  code = code.replace(/console\.log\([^)]*\);?/g, '');
  code = code.replace(/console\.error\([^)]*\);?/g, '');
  code = code.replace(/console\.warn\([^)]*\);?/g, '');
  
  return code;
}

// Files to obfuscate
const filesToObfuscate = [
  'content.js',
  'background.js', 
  'popup.js',
  'integrations.js',
  'database.js'
];

// Create build directory
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('🔨 Building Cognito AI Extension for Production...');

// Copy all files to build directory
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'styles.css',
  'html2canvas.min.js',
  'icons/',
  'generated-image-Photoroom.png'
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

// Obfuscate JavaScript files with moderate obfuscation
filesToObfuscate.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    // Read from root directory (latest files)
    const code = fs.readFileSync(srcPath, 'utf8');
    const obfuscatedCode = moderateObfuscate(code);
    
    // Write to build directory
    fs.writeFileSync(destPath, obfuscatedCode);
    console.log(`🔒 Production obfuscation applied to ${file}`);
  }
});

// Create distribution package
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

execSync(`cd "${buildDir}" && zip -r "../dist/cognito-ai-extension-production.zip" . -x "*.DS_Store"`);

console.log('✅ Production build complete!');
console.log('📦 Distribution package: dist/cognito-ai-extension-production.zip');
console.log('🔒 Code has been obfuscated for production use');
console.log('');
console.log('📋 Distribution Instructions:');
console.log('1. Share the .zip file with users');
console.log('2. Users can install via Chrome Extensions page');
console.log('3. Enable "Developer mode" and click "Load unpacked"');
console.log('4. Select the extracted folder');
