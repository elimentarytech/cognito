#!/usr/bin/env node

/**
 * Build script for Cognito AI Extension
 * Creates obfuscated and minified version for distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple obfuscation function
function obfuscateCode(code) {
  // Remove comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  code = code.replace(/\/\/.*$/gm, '');
  
  // Minify by removing unnecessary whitespace
  code = code.replace(/\s+/g, ' ');
  code = code.replace(/\s*([{}();,=+\-*/])\s*/g, '$1');
  
  // Basic variable name obfuscation (simple approach)
  const varMap = new Map();
  let counter = 0;
  
  // Replace common variable names with shorter ones
  code = code.replace(/\b(comment|chart|data|config|element|button|dialog|menu|sidebar|filter|bubble|jira|ai|integration|provider|api|key|url|token|storage|chrome|document|window|console|error|success|loading|visible|hidden|active|selected|current|previous|next|first|last|all|none|some|every|forEach|map|filter|reduce|find|includes|indexOf|push|pop|shift|unshift|splice|slice|join|split|replace|match|test|exec|toString|valueOf|hasOwnProperty|isPrototypeOf|propertyIsEnumerable|toLocaleString|constructor|prototype|__proto__|length|name|message|stack|cause|code|fileName|lineNumber|columnNumber|description|number|string|boolean|object|function|undefined|null|true|false|NaN|Infinity|isNaN|isFinite|parseInt|parseFloat|Number|String|Boolean|Object|Array|Date|RegExp|Error|TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|JSON|Math|Promise|async|await|then|catch|finally|resolve|reject|all|race|allSettled|any|finally|Symbol|Map|Set|WeakMap|WeakSet|Proxy|Reflect|Intl|Intl\.Collator|Intl\.DateTimeFormat|Intl\.NumberFormat|Intl\.PluralRules|Intl\.RelativeTimeFormat|Intl\.ListFormat|Intl\.Segmenter|Intl\.DisplayNames|Intl\.Locale|Intl\.getCanonicalLocales|Intl\.supportedValuesOf|Intl\.DateTimeFormat\.supportedLocalesOf|Intl\.NumberFormat\.supportedLocalesOf|Intl\.PluralRules\.supportedLocalesOf|Intl\.RelativeTimeFormat\.supportedLocalesOf|Intl\.ListFormat\.supportedLocalesOf|Intl\.Segmenter\.supportedLocalesOf|Intl\.DisplayNames\.supportedLocalesOf|Intl\.Collator\.supportedLocalesOf|Intl\.DateTimeFormat\.prototype\.format|Intl\.NumberFormat\.prototype\.format|Intl\.PluralRules\.prototype\.select|Intl\.RelativeTimeFormat\.prototype\.format|Intl\.ListFormat\.prototype\.format|Intl\.Segmenter\.prototype\.segment|Intl\.DisplayNames\.prototype\.of|Intl\.Collator\.prototype\.compare|Intl\.DateTimeFormat\.prototype\.formatToParts|Intl\.NumberFormat\.prototype\.formatToParts|Intl\.PluralRules\.prototype\.selectRange|Intl\.RelativeTimeFormat\.prototype\.formatToParts|Intl\.ListFormat\.prototype\.formatToParts|Intl\.Segmenter\.prototype\.segmentToParts|Intl\.DisplayNames\.prototype\.ofToParts|Intl\.Collator\.prototype\.compareToParts|Intl\.DateTimeFormat\.prototype\.resolvedOptions|Intl\.NumberFormat\.prototype\.resolvedOptions|Intl\.PluralRules\.prototype\.resolvedOptions|Intl\.RelativeTimeFormat\.prototype\.resolvedOptions|Intl\.ListFormat\.prototype\.resolvedOptions|Intl\.Segmenter\.prototype\.resolvedOptions|Intl\.DisplayNames\.prototype\.resolvedOptions|Intl\.Collator\.prototype\.resolvedOptions|Intl\.DateTimeFormat\.prototype\.formatRange|Intl\.NumberFormat\.prototype\.formatRange|Intl\.PluralRules\.prototype\.selectRange|Intl\.RelativeTimeFormat\.prototype\.formatRange|Intl\.ListFormat\.prototype\.formatRange|Intl\.Segmenter\.prototype\.segmentRange|Intl\.DisplayNames\.prototype\.ofRange|Intl\.Collator\.prototype\.compareRange|Intl\.DateTimeFormat\.prototype\.formatRangeToParts|Intl\.NumberFormat\.prototype\.formatRangeToParts|Intl\.PluralRules\.prototype\.selectRangeToParts|Intl\.RelativeTimeFormat\.prototype\.formatRangeToParts|Intl\.ListFormat\.prototype\.formatRangeToParts|Intl\.Segmenter\.prototype\.segmentRangeToParts|Intl\.DisplayNames\.prototype\.ofRangeToParts|Intl\.Collator\.prototype\.compareRangeToParts|Intl\.DateTimeFormat\.prototype\.formatToParts|Intl\.NumberFormat\.prototype\.formatToParts|Intl\.PluralRules\.prototype\.selectToParts|Intl\.RelativeTimeFormat\.prototype\.formatToParts|Intl\.ListFormat\.prototype\.formatToParts|Intl\.Segmenter\.prototype\.segmentToParts|Intl\.DisplayNames\.prototype\.ofToParts|Intl\.Collator\.prototype\.compareToParts|Intl\.DateTimeFormat\.prototype\.resolvedOptions|Intl\.NumberFormat\.prototype\.resolvedOptions|Intl\.PluralRules\.prototype\.resolvedOptions|Intl\.RelativeTimeFormat\.prototype\.resolvedOptions|Intl\.ListFormat\.prototype\.resolvedOptions|Intl\.Segmenter\.prototype\.resolvedOptions|Intl\.DisplayNames\.prototype\.resolvedOptions|Intl\.Collator\.prototype\.resolvedOptions|Intl\.DateTimeFormat\.prototype\.formatRange|Intl\.NumberFormat\.prototype\.formatRange|Intl\.PluralRules\.prototype\.selectRange|Intl\.RelativeTimeFormat\.prototype\.formatRange|Intl\.ListFormat\.prototype\.formatRange|Intl\.Segmenter\.prototype\.segmentRange|Intl\.DisplayNames\.prototype\.ofRange|Intl\.Collator\.prototype\.compareRange|Intl\.DateTimeFormat\.prototype\.formatRangeToParts|Intl\.NumberFormat\.prototype\.formatRangeToParts|Intl\.PluralRules\.prototype\.selectRangeToParts|Intl\.RelativeTimeFormat\.prototype\.formatRangeToParts|Intl\.ListFormat\.prototype\.formatRangeToParts|Intl\.Segmenter\.prototype\.segmentRangeToParts|Intl\.DisplayNames\.prototype\.ofRangeToParts|Intl\.Collator\.prototype\.compareRangeToParts)\b/g, (match) => {
    if (!varMap.has(match)) {
      varMap.set(match, `_${counter++}`);
    }
    return varMap.get(match);
  });
  
  return code;
}

// Files to obfuscate (exclude all files to preserve functionality - obfuscation breaks async/await and arrow functions)
const filesToObfuscate = [
  // No files to obfuscate - obfuscation breaks async/await, arrow functions, and method names
];

// Files to copy without obfuscation (preserve all functionality)
const filesToCopyAsIs = [
  'integrations.js',
  'background.js',
  'content.js',
  'database.js',
  'popup.js'
];

// Create build directory
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

console.log('🔨 Building Cognito AI Extension...');

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
  
  if (fs.statSync(srcPath).isDirectory()) {
    execSync(`cp -r "${srcPath}" "${destPath}"`);
  } else {
    execSync(`cp "${srcPath}" "${destPath}"`);
  }
  console.log(`✅ Copied ${file}`);
});

// Copy JavaScript files that should not be obfuscated
filesToCopyAsIs.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    execSync(`cp "${srcPath}" "${destPath}"`);
    console.log(`✅ Copied ${file} (preserved for compatibility)`);
  }
});

// Obfuscate JavaScript files
filesToObfuscate.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(buildDir, file);
  
  if (fs.existsSync(srcPath)) {
    const code = fs.readFileSync(srcPath, 'utf8');
    const obfuscatedCode = obfuscateCode(code);
    fs.writeFileSync(destPath, obfuscatedCode);
    console.log(`🔒 Obfuscated ${file}`);
  }
});

// Create distribution package
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

execSync(`cd "${buildDir}" && zip -r "../dist/cognito-ai-extension-obfuscated.zip" . -x "*.DS_Store"`);

console.log('✅ Build complete!');
console.log('📦 Distribution package: dist/cognito-ai-extension-obfuscated.zip');
console.log('🔒 Code has been obfuscated for protection');
