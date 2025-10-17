#!/usr/bin/env node

/**
 * Advanced build script for Cognito AI Extension
 * Uses JavaScript obfuscator for maximum code protection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if obfuscator is available
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.log('⚠️  JavaScript obfuscator not found. Installing...');
  try {
    execSync('npm install javascript-obfuscator --save-dev', { stdio: 'inherit' });
    JavaScriptObfuscator = require('javascript-obfuscator');
  } catch (installError) {
    console.log('❌ Failed to install obfuscator. Using simple obfuscation...');
    JavaScriptObfuscator = null;
  }
}

// Advanced obfuscation configuration
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Simple obfuscation fallback
function simpleObfuscate(code) {
  // Remove comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/\/\/.*$/gm, '');
  
  // Minify
  code = code.replace(/\s+/g, ' ');
  code = code.replace(/\s*([{}();,=+\-*/])\s*/g, '$1');
  
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

console.log('🔨 Building Cognito AI Extension with Advanced Obfuscation...');

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

// Obfuscate JavaScript files
filesToObfuscate.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    const code = fs.readFileSync(srcPath, 'utf8');
    let obfuscatedCode;
    
    if (JavaScriptObfuscator) {
      try {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
        obfuscatedCode = obfuscationResult.getObfuscatedCode();
        console.log(`🔒 Advanced obfuscation applied to ${file}`);
      } catch (error) {
        console.log(`⚠️  Advanced obfuscation failed for ${file}, using simple obfuscation`);
        obfuscatedCode = simpleObfuscate(code);
      }
    } else {
      obfuscatedCode = simpleObfuscate(code);
      console.log(`🔒 Simple obfuscation applied to ${file}`);
    }
    
    fs.writeFileSync(destPath, obfuscatedCode);
  }
});

// Create distribution package
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

execSync(`cd "${buildDir}" && zip -r "../dist/cognito-ai-extension-protected.zip" . -x "*.DS_Store"`);

console.log('✅ Build complete!');
console.log('📦 Distribution package: dist/cognito-ai-extension-protected.zip');
console.log('🔒 Code has been heavily obfuscated for maximum protection');
console.log('');
console.log('📋 Distribution Instructions:');
console.log('1. Share the .zip file with users');
console.log('2. Users can install via Chrome Extensions page');
console.log('3. Enable "Developer mode" and click "Load unpacked"');
console.log('4. Select the extracted folder');
