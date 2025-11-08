#!/usr/bin/env node

/**
 * Extension AI Configuration Checker
 * Checks the extension's AI configuration and provides debugging info
 */

const fs = require('fs');
const path = require('path');

function checkExtensionFiles() {
  console.log('🔍 Checking Extension AI Configuration');
  console.log('=====================================\n');

  // Check if build directory exists
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Run: node build-clean.js');
    return;
  }

  // Check key files
  const keyFiles = [
    'manifest.json',
    'content.js',
    'integrations.js',
    'background.js'
  ];

  console.log('📁 Extension Files:');
  keyFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
    }
  });

  // Check manifest.json for AI permissions
  console.log('\n🔐 Manifest Permissions:');
  try {
    const manifestPath = path.join(buildDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log(`   Manifest Version: ${manifest.manifest_version}`);
    console.log(`   Permissions: ${manifest.permissions?.join(', ') || 'None'}`);
    console.log(`   Host Permissions: ${manifest.host_permissions?.length || 0} entries`);
    
    // Check for AI-related host permissions
    const aiHosts = manifest.host_permissions?.filter(host => 
      host.includes('openai.com') || 
      host.includes('anthropic.com') || 
      host.includes('googleapis.com')
    ) || [];
    
    if (aiHosts.length > 0) {
      console.log(`   ✅ AI Host Permissions: ${aiHosts.join(', ')}`);
    } else {
      console.log(`   ⚠️  No AI host permissions found`);
    }
  } catch (error) {
    console.log(`   ❌ Error reading manifest: ${error.message}`);
  }

  // Check integrations.js for AI code
  console.log('\n🤖 AI Integration Code:');
  try {
    const integrationsPath = path.join(buildDir, 'integrations.js');
    const integrationsContent = fs.readFileSync(integrationsPath, 'utf8');
    
    const aiChecks = [
      { name: 'AIIntegration class', pattern: /class AIIntegration/ },
      { name: 'OpenAI integration', pattern: /api\.openai\.com/ },
      { name: 'Anthropic integration', pattern: /api\.anthropic\.com/ },
      { name: 'Gemini integration', pattern: /generativelanguage\.googleapis\.com/ },
      { name: 'Test connection method', pattern: /testConnection/ },
      { name: 'Analyze chart method', pattern: /analyzeChart/ }
    ];
    
    aiChecks.forEach(check => {
      if (check.pattern.test(integrationsContent)) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name} - MISSING`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Error reading integrations: ${error.message}`);
  }

  // Check content.js for AI UI
  console.log('\n🎨 AI UI Components:');
  try {
    const contentPath = path.join(buildDir, 'content.js');
    const contentContent = fs.readFileSync(contentPath, 'utf8');
    
    const uiChecks = [
      { name: 'AI config dialog', pattern: /showAIConfigDialog/ },
      { name: 'AI button', pattern: /dc-menu-ai/ },
      { name: 'AI test connection', pattern: /testConnection.*ai/ },
      { name: 'AI provider selection', pattern: /aiProvider/ },
      { name: 'AI model selection', pattern: /aiModel/ },
      { name: 'AI API key input', pattern: /aiApiKey/ }
    ];
    
    uiChecks.forEach(check => {
      if (check.pattern.test(contentContent)) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name} - MISSING`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Error reading content: ${error.message}`);
  }

  // Check for common issues
  console.log('\n🔧 Common Issues Check:');
  
  // Check for window references in background.js
  try {
    const backgroundPath = path.join(buildDir, 'background.js');
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');
    
    if (backgroundContent.includes('window')) {
      console.log('   ❌ Background script contains "window" references (service worker issue)');
    } else {
      console.log('   ✅ Background script is clean (no window references)');
    }
  } catch (error) {
    console.log(`   ❌ Error checking background script: ${error.message}`);
  }

  // Check for CORS issues
  try {
    const integrationsPath = path.join(buildDir, 'integrations.js');
    const integrationsContent = fs.readFileSync(integrationsPath, 'utf8');
    
    if (integrationsContent.includes('chrome.runtime.sendMessage')) {
      console.log('   ✅ Uses background script for API calls (CORS bypass)');
    } else {
      console.log('   ⚠️  Direct API calls detected (may have CORS issues)');
    }
  } catch (error) {
    console.log(`   ❌ Error checking CORS handling: ${error.message}`);
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Load the extension in Chrome: chrome://extensions/');
  console.log('2. Enable Developer mode');
  console.log('3. Click "Load unpacked" and select the "build" folder');
  console.log('4. Go to a Grafana or Power BI page');
  console.log('5. Open the extension sidebar and click "⚙️ AI"');
  console.log('6. Configure your AI provider and test the connection');
  console.log('\n💡 If you still have issues, run: node test-ai-connectivity.js');
}

// Run the check
checkExtensionFiles();

