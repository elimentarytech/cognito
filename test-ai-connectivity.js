#!/usr/bin/env node

/**
 * AI Connectivity Test Script for Cognito Extension
 * Tests OpenAI, Anthropic, and Gemini API connectivity
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIGS = {
  openai: {
    name: 'OpenAI',
    testUrl: 'https://api.openai.com/v1/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer '
  },
  anthropic: {
    name: 'Anthropic Claude',
    testUrl: 'https://api.anthropic.com/v1/messages',
    authHeader: 'x-api-key',
    authPrefix: ''
  },
  gemini: {
    name: 'Google Gemini',
    testUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer '
  }
};

// Test models for each provider
const TEST_MODELS = {
  openai: [
    { name: 'GPT-4o', value: 'gpt-4o' },
    { name: 'GPT-4o-mini', value: 'gpt-4o-mini' },
    { name: 'GPT-4', value: 'gpt-4' }
  ],
  anthropic: [
    { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
    { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229' }
  ],
  gemini: [
    { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
  ]
};

async function testAPI(provider, apiKey, model = null) {
  return new Promise((resolve) => {
    const config = TEST_CONFIGS[provider];
    if (!config) {
      resolve({ success: false, error: `Unknown provider: ${provider}` });
      return;
    }

    console.log(`\n🔍 Testing ${config.name}...`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`   Model: ${model || 'default'}`);
    console.log(`   URL: ${config.testUrl}`);

    const url = new URL(config.testUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        [config.authHeader]: config.authPrefix + apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Cognito-AI-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   ✅ Success! Response keys:`, Object.keys(response));
            resolve({ 
              success: true, 
              status: res.statusCode,
              data: response,
              provider: config.name
            });
          } catch (e) {
            console.log(`   ⚠️  Success but invalid JSON:`, data.substring(0, 200));
            resolve({ 
              success: true, 
              status: res.statusCode,
              rawData: data.substring(0, 200),
              provider: config.name
            });
          }
        } else {
          console.log(`   ❌ Error: ${res.statusCode}`);
          console.log(`   Response:`, data.substring(0, 200));
          resolve({ 
            success: false, 
            error: `HTTP ${res.statusCode}: ${data.substring(0, 100)}`,
            status: res.statusCode,
            provider: config.name
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Network Error:`, error.message);
      resolve({ 
        success: false, 
        error: error.message,
        provider: config.name
      });
    });

    req.setTimeout(10000, () => {
      console.log(`   ❌ Timeout after 10 seconds`);
      req.destroy();
      resolve({ 
        success: false, 
        error: 'Request timeout',
        provider: config.name
      });
    });

    req.end();
  });
}

async function testChatCompletion(provider, apiKey, model) {
  return new Promise((resolve) => {
    const config = TEST_CONFIGS[provider];
    if (!config) {
      resolve({ success: false, error: `Unknown provider: ${provider}` });
      return;
    }

    console.log(`\n💬 Testing ${config.name} chat completion...`);
    
    let testUrl, testBody, testHeaders;
    
    if (provider === 'openai') {
      testUrl = 'https://api.openai.com/v1/chat/completions';
      testBody = JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Hello! This is a test message.' }],
        max_tokens: 10,
        temperature: 0.1
      });
      testHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    } else if (provider === 'anthropic') {
      testUrl = 'https://api.anthropic.com/v1/messages';
      testBody = JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello! This is a test message.' }]
      });
      testHeaders = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      };
    } else if (provider === 'gemini') {
      testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      testBody = JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello! This is a test message.' }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      });
      testHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
    }

    const url = new URL(testUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: testHeaders
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`   ✅ Chat completion successful!`);
            resolve({ 
              success: true, 
              status: res.statusCode,
              response: response,
              provider: config.name
            });
          } catch (e) {
            console.log(`   ⚠️  Success but invalid JSON:`, data.substring(0, 200));
            resolve({ 
              success: true, 
              status: res.statusCode,
              rawData: data.substring(0, 200),
              provider: config.name
            });
          }
        } else {
          console.log(`   ❌ Error: ${res.statusCode}`);
          console.log(`   Response:`, data.substring(0, 200));
          resolve({ 
            success: false, 
            error: `HTTP ${res.statusCode}: ${data.substring(0, 100)}`,
            status: res.statusCode,
            provider: config.name
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Network Error:`, error.message);
      resolve({ 
        success: false, 
        error: error.message,
        provider: config.name
      });
    });

    req.setTimeout(15000, () => {
      console.log(`   ❌ Timeout after 15 seconds`);
      req.destroy();
      resolve({ 
        success: false, 
        error: 'Request timeout',
        provider: config.name
      });
    });

    req.write(testBody);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Cognito AI Connectivity Test');
  console.log('================================');
  
  // Get API keys from user input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n📝 Enter your API keys (press Enter to skip):');
  
  const openaiKey = await question('OpenAI API Key (sk-...): ');
  const anthropicKey = await question('Anthropic API Key: ');
  const geminiKey = await question('Gemini API Key: ');

  const results = [];

  // Test OpenAI
  if (openaiKey && openaiKey.trim()) {
    const model = 'gpt-4o-mini';
    const apiTest = await testAPI('openai', openaiKey.trim());
    results.push(apiTest);
    
    if (apiTest.success) {
      const chatTest = await testChatCompletion('openai', openaiKey.trim(), model);
      results.push(chatTest);
    }
  }

  // Test Anthropic
  if (anthropicKey && anthropicKey.trim()) {
    const model = 'claude-3-haiku-20240307';
    const apiTest = await testAPI('anthropic', anthropicKey.trim());
    results.push(apiTest);
    
    if (apiTest.success) {
      const chatTest = await testChatCompletion('anthropic', anthropicKey.trim(), model);
      results.push(chatTest);
    }
  }

  // Test Gemini
  if (geminiKey && geminiKey.trim()) {
    const model = 'gemini-1.5-flash';
    const apiTest = await testAPI('gemini', geminiKey.trim());
    results.push(apiTest);
    
    if (apiTest.success) {
      const chatTest = await testChatCompletion('gemini', geminiKey.trim(), model);
      results.push(chatTest);
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}`);
  console.log(`❌ Failed tests: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working APIs:');
    successful.forEach(result => {
      console.log(`   - ${result.provider}: ${result.status || 'OK'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed APIs:');
    failed.forEach(result => {
      console.log(`   - ${result.provider}: ${result.error}`);
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (successful.length === 0) {
    console.log('   - Check your API keys are correct');
    console.log('   - Ensure you have credits/billing set up');
    console.log('   - Try a different API provider');
    console.log('   - Check your internet connection');
  } else {
    console.log('   - Use the working API in your extension');
    console.log('   - Configure the extension with the working key');
  }

  rl.close();
}

// Run the tests
runTests().catch(console.error);

