/**
 * Integrations Module for Stickr AI
 * Handles Jira, Confluence, and AI integrations
 */

// ==================== JIRA INTEGRATION ====================

class JiraIntegration {
  constructor() {
    this.jiraUrl = null;
    this.jiraEmail = null;
    this.jiraApiToken = null;
    this.isConfigured = false;
  }

  async init() {
    const config = await chrome.storage.sync.get(['jiraUrl', 'jiraEmail', 'jiraApiToken']);
    
    if (config.jiraUrl && config.jiraEmail && config.jiraApiToken) {
      this.jiraUrl = config.jiraUrl;
      this.jiraEmail = config.jiraEmail;
      this.jiraApiToken = config.jiraApiToken;
      this.isConfigured = true;
      console.log('✅ Jira configured');
      return true;
    }
    
    console.log('⚠️ Jira not configured');
    return false;
  }

  async testConnection(addLog = null) {
    const startTime = Date.now();
    const log = addLog || (() => {});
    
    log('Starting Jira connection test...');
    console.log('🔍 [JIRA] Starting connection test...');
    console.log('🔍 [JIRA] URL:', this.jiraUrl);
    console.log('🔍 [JIRA] Email:', this.jiraEmail);
    console.log('🔍 [JIRA] API Token present:', !!this.jiraApiToken);
    
    try {
      if (!this.jiraUrl || !this.jiraEmail || !this.jiraApiToken) {
        log('Missing JIRA credentials', 'error');
        console.error('❌ [JIRA] Missing credentials');
        return { success: false, error: 'Missing JIRA credentials' };
      }
      
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      const testUrl = `${this.jiraUrl}/rest/api/3/myself`;
      
      log(`Sending request to: ${testUrl}`);
      log(`Method: GET`);
      log(`Headers: Authorization (Basic), Accept`);
      log('Using background script to bypass CORS...');
      console.log('🔍 [JIRA] Sending request to:', testUrl);
      console.log('🔍 [JIRA] Request timestamp:', new Date().toISOString());
      
      // Use background script to bypass CORS (required for Chrome extensions)
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            log('Connection timeout after 30 seconds', 'error');
            reject(new Error('Connection timeout after 30 seconds'));
          }, 30000);
          
          log('Sending request via background script...');
          chrome.runtime.sendMessage({
            action: 'fetchAPI',
            url: testUrl,
            options: {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
              }
            }
          }, (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              log(`Background script error: ${chrome.runtime.lastError.message}`, 'error');
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (!response) {
              log('No response from background script', 'error');
              reject(new Error('No response from background script'));
              return;
            }
            
            if (response.error) {
              log(`Background script returned error: ${response.error}`, 'error');
              reject(new Error(response.error));
              return;
            }
            
            resolve(response);
          });
        });
        
        const elapsed = Date.now() - startTime;
        
        if (response && response.success && response.data) {
          const data = response.data;
          log(`Response received (${elapsed}ms): success`, 'success');
          log(`Connection successful! User: ${data?.displayName || 'Unknown'}`, 'success');
          console.log(`🔍 [JIRA] Response received (${elapsed}ms): success`);
          console.log('✅ [JIRA] Connection successful:', data?.displayName || 'Unknown user');
          return { success: true, user: data?.displayName };
        } else {
          const errorText = response?.error || response?.message || 'Unknown error';
          log(`Response received (${elapsed}ms): error`, 'error');
          log(`Error: ${errorText.substring(0, 100)}`, 'error');
          console.error('❌ [JIRA] Connection failed:', errorText);
          return { success: false, error: errorText.substring(0, 200) };
        }
      } catch (error) {
        const elapsed = Date.now() - startTime;
        log(`Connection error: ${error.message}`, 'error');
        console.error('❌ [JIRA] Connection error:', error);
        return { success: false, error: error.message };
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      log(`Connection test failed after ${elapsed}ms: ${error.message}`, 'error');
      console.error(`❌ [JIRA] Connection test failed after ${elapsed}ms:`, error);
      return { success: false, error: error.message };
    }
  }

  async createIssue(summary, description, projectKey, issueType = 'Task') {
    if (!this.isConfigured) {
      throw new Error('Jira not configured');
    }

    try {
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      const issueData = {
        fields: {
          project: { key: projectKey },
          summary: summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description
                  }
                ]
              }
            ]
          },
          issuetype: { name: issueType }
        }
      };

      // Use background script to bypass CORS
      const result = await chrome.runtime.sendMessage({
        action: 'fetchAPI',
        url: `${this.jiraUrl}/rest/api/3/issue`,
        options: {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(issueData)
        }
      });

      if (result.success) {
        console.log('✅ Jira issue created:', result.data.key);
        return {
          key: result.data.key,
          url: `${this.jiraUrl}/browse/${result.data.key}`,
          summary: result.data.fields?.summary || summary // Use API response summary or fallback to input summary
        };
      } else {
        throw new Error(result.error || 'Failed to create issue');
      }
    } catch (error) {
      console.error('Error creating Jira issue:', error);
      return { success: false, error: error.message };
    }
  }

  async addComment(issueKey, comment) {
    if (!this.isConfigured) {
      throw new Error('Jira not configured');
    }

    try {
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      const commentData = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      };

      const response = await fetch(`${this.jiraUrl}/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      });

      if (response.ok) {
        console.log('✅ Comment added to Jira:', issueKey);
        return { success: true };
      }

      return { success: false, error: 'Failed to add comment' };
    } catch (error) {
      console.error('Error adding Jira comment:', error);
      return { success: false, error: error.message };
    }
  }

  async getProjects() {
    if (!this.isConfigured) {
      throw new Error('Jira not configured');
    }

    try {
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      // Use background script to bypass CORS
      const result = await chrome.runtime.sendMessage({
        action: 'fetchAPI',
        url: `${this.jiraUrl}/rest/api/3/project/search`,
        options: {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      });

      if (result.success) {
        return result.data.values || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async getTickets(projectKey = null, maxResults = 50) {
    if (!this.isConfigured) {
      throw new Error('Jira not configured');
    }

    try {
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      let jql = 'ORDER BY updated DESC';
      if (projectKey) {
        jql = `project = ${projectKey} AND ${jql}`;
      }

      const result = await chrome.runtime.sendMessage({
        action: 'fetchAPI',
        url: `${this.jiraUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=key,summary,status,assignee,created,updated`,
        options: {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      });

      if (result.success) {
        return result.data.issues || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  }

  async searchTickets(query, projectKey = null, maxResults = 20) {
    if (!this.isConfigured) {
      throw new Error('Jira not configured');
    }

    try {
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      // More flexible JQL query - search in summary, description, and key
      let jql;
      if (projectKey) {
        jql = `project = ${projectKey} AND (summary ~ "${query}" OR description ~ "${query}" OR key ~ "${query}") ORDER BY updated DESC`;
      } else {
        jql = `(summary ~ "${query}" OR description ~ "${query}" OR key ~ "${query}") ORDER BY updated DESC`;
      }

      console.log('🔍 Searching Jira with JQL:', jql);

      const result = await chrome.runtime.sendMessage({
        action: 'fetchAPI',
        url: `${this.jiraUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=key,summary,status,assignee,created,updated,description`,
        options: {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      });

      console.log('🔍 Jira search result:', result);

      if (result.success) {
        const issues = result.data.issues || [];
        console.log(`✅ Found ${issues.length} tickets`);
        return issues;
      } else {
        console.error('❌ Jira search failed:', result.error);
        throw new Error(result.error || 'Search failed');
      }

    } catch (error) {
      console.error('Error searching tickets:', error);
      
      // Try a simpler search as fallback
      try {
        console.log('🔄 Trying fallback search...');
        let fallbackJql;
        if (projectKey) {
          fallbackJql = `project = ${projectKey} AND text ~ "${query}" ORDER BY updated DESC`;
        } else {
          fallbackJql = `text ~ "${query}" ORDER BY updated DESC`;
        }
        
        console.log('🔍 Fallback JQL:', fallbackJql);
        
        const fallbackResult = await chrome.runtime.sendMessage({
          action: 'fetchAPI',
          url: `${this.jiraUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(fallbackJql)}&maxResults=${maxResults}&fields=key,summary,status,assignee,created,updated`,
          options: {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            }
          }
        });
        
        if (fallbackResult.success) {
          const issues = fallbackResult.data.issues || [];
          console.log(`✅ Fallback search found ${issues.length} tickets`);
          return issues;
        }
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        
        // Try one more fallback - search by key only
        try {
          console.log('🔄 Trying key-only search...');
          let keyJql;
          if (projectKey) {
            keyJql = `project = ${projectKey} AND key ~ "${query}" ORDER BY updated DESC`;
          } else {
            keyJql = `key ~ "${query}" ORDER BY updated DESC`;
          }
          
          console.log('🔍 Key-only JQL:', keyJql);
          
          const keyResult = await chrome.runtime.sendMessage({
            action: 'fetchAPI',
            url: `${this.jiraUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(keyJql)}&maxResults=${maxResults}&fields=key,summary,status,assignee,created,updated`,
            options: {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
              }
            }
          });
          
          if (keyResult.success) {
            const issues = keyResult.data.issues || [];
            console.log(`✅ Key-only search found ${issues.length} tickets`);
            return issues;
          }
        } catch (keyError) {
          console.error('Key-only search also failed:', keyError);
        }
      }
      
      throw error; // Re-throw to let the UI handle the error
    }
  }
}

// ==================== AI INTEGRATION ====================

class AIIntegration {
  constructor() {
    this.provider = null; // 'openai', 'anthropic', or 'gemini'
    this.model = null; // specific model version
    this.apiKey = null;
    this.isConfigured = false;
  }

  async init() {
    const config = await chrome.storage.sync.get(['aiProvider', 'aiModel', 'aiApiKey']);
    
    if (config.aiProvider && config.aiModel && config.aiApiKey) {
      this.provider = config.aiProvider;
      this.model = config.aiModel;
      this.apiKey = config.aiApiKey;
      this.isConfigured = true;
      console.log(`✅ AI configured: ${this.provider} (${this.model})`);
      return true;
    }
    
    console.log('⚠️ AI not configured');
    return false;
  }

  async testConnection(addLog = null) {
    const startTime = Date.now();
    const log = addLog || (() => {});
    
    log(`Starting ${this.provider?.toUpperCase()} connection test...`);
    console.log(`🔍 [AI-${this.provider?.toUpperCase()}] Starting connection test...`);
    console.log(`🔍 [AI-${this.provider?.toUpperCase()}] API Key present:`, !!this.apiKey);
    
    if (!this.provider || !this.apiKey) {
      log(`Missing provider or API key`, 'error');
      console.error(`❌ [AI-${this.provider?.toUpperCase()}] Missing provider or API key`);
      return false;
    }
    
    try {
      if (this.provider === 'openai') {
        log('Testing OpenAI connection...');
        const testUrl = 'https://api.openai.com/v1/models';
        log(`Sending request to: ${testUrl}`);
        log(`Method: GET`);
        log(`Headers: Authorization`);
        console.log('🔍 [AI-OPENAI] Testing OpenAI connection...');
        console.log('🔍 [AI-OPENAI] Sending request to:', testUrl);
        console.log('🔍 [AI-OPENAI] Request timestamp:', new Date().toISOString());
        
        // DIRECT FETCH (bypassing background script for testing)
        log(`Sending direct fetch request to: ${testUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          log('Connection timeout after 30 seconds', 'error');
        }, 30000);
        
        try {
          const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          if (response.ok) {
            log(`Response received (${elapsed}ms): success`, 'success');
            log('Connection successful!', 'success');
            console.log(`🔍 [AI-OPENAI] Response received (${elapsed}ms): success`);
            console.log('✅ [AI-OPENAI] Connection successful');
            return true;
          } else {
            const errorText = await response.text();
            log(`Response received (${elapsed}ms): error`, 'error');
            log(`Error: HTTP ${response.status} - ${errorText.substring(0, 100)}`, 'error');
            console.error('❌ [AI-OPENAI] Connection failed:', response.status, errorText);
            return false;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          if (error.name === 'AbortError') {
            log(`Connection timeout after ${elapsed}ms`, 'error');
            return false;
          }
          log(`Connection error: ${error.message}`, 'error');
          console.error('❌ [AI-OPENAI] Connection error:', error);
          return false;
        }
      } else if (this.provider === 'anthropic') {
        log('Testing Anthropic connection...');
        const testUrl = 'https://api.anthropic.com/v1/messages';
        log(`Sending request to: ${testUrl}`);
        log(`Method: POST`);
        log(`Headers: x-api-key, anthropic-version, content-type`);
        console.log('🔍 [AI-ANTHROPIC] Testing Anthropic connection...');
        console.log('🔍 [AI-ANTHROPIC] Sending request to:', testUrl);
        console.log('🔍 [AI-ANTHROPIC] Request timestamp:', new Date().toISOString());
        
        // DIRECT FETCH (bypassing background script for testing)
        log(`Sending direct fetch request to: ${testUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          log('Connection timeout after 30 seconds', 'error');
        }, 30000);
        
        try {
          const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: this.model || 'claude-3-5-sonnet-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }]
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          if (response.ok) {
            log(`Response received (${elapsed}ms): success`, 'success');
            log('Connection successful!', 'success');
            console.log(`🔍 [AI-ANTHROPIC] Response received (${elapsed}ms): success`);
            console.log('✅ [AI-ANTHROPIC] Connection successful');
            return true;
          } else {
            const errorText = await response.text();
            log(`Response received (${elapsed}ms): error`, 'error');
            log(`Error: HTTP ${response.status} - ${errorText.substring(0, 100)}`, 'error');
            console.error('❌ [AI-ANTHROPIC] Connection failed:', response.status, errorText);
            return false;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          if (error.name === 'AbortError') {
            log(`Connection timeout after ${elapsed}ms`, 'error');
            return false;
          }
          log(`Connection error: ${error.message}`, 'error');
          console.error('❌ [AI-ANTHROPIC] Connection error:', error);
          return false;
        }
      } else if (this.provider === 'gemini') {
        log('Testing Gemini connection...');
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model || 'gemini-pro'}:generateContent?key=${this.apiKey}`;
        log(`Sending request to: ${testUrl.replace(this.apiKey, '***')}`);
        log(`Method: POST`);
        log(`Headers: Content-Type`);
        console.log('🔍 [AI-GEMINI] Testing Gemini connection...');
        console.log('🔍 [AI-GEMINI] Sending request to:', testUrl.replace(this.apiKey, '***'));
        console.log('🔍 [AI-GEMINI] Request timestamp:', new Date().toISOString());
        
        // DIRECT FETCH (bypassing background script for testing)
        log(`Sending direct fetch request to: ${testUrl.replace(this.apiKey, '***')}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          log('Connection timeout after 30 seconds', 'error');
        }, 30000);
        
        try {
          const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'test' }]
              }]
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          if (response.ok) {
            log(`Response received (${elapsed}ms): success`, 'success');
            log('Connection successful!', 'success');
            console.log(`🔍 [AI-GEMINI] Response received (${elapsed}ms): success`);
            console.log('✅ [AI-GEMINI] Connection successful');
            return true;
          } else {
            const errorText = await response.text();
            log(`Response received (${elapsed}ms): error`, 'error');
            log(`Error: HTTP ${response.status} - ${errorText.substring(0, 100)}`, 'error');
            console.error('❌ [AI-GEMINI] Connection failed:', response.status, errorText);
            return false;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          if (error.name === 'AbortError') {
            log(`Connection timeout after ${elapsed}ms`, 'error');
            return false;
          }
          log(`Connection error: ${error.message}`, 'error');
          console.error('❌ [AI-GEMINI] Connection error:', error);
          return false;
        }
      }
      
      log(`Unknown provider: ${this.provider}`, 'error');
      console.error(`❌ [AI-${this.provider?.toUpperCase()}] Unknown provider`);
      return false;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      log(`Connection test failed after ${elapsed}ms: ${error.message}`, 'error');
      console.error(`❌ [AI-${this.provider?.toUpperCase()}] Connection test failed after ${elapsed}ms:`, error);
      return false;
    }
  }

  async analyzeChart(imageDataUrl, customPrompt) {
    if (!this.isConfigured) {
      throw new Error('AI not configured');
    }

    const prompt = customPrompt || `Analyze this dashboard chart and provide insights on:
1. Key metrics and their current values
2. Trends or patterns visible in the data
3. Any anomalies or interesting observations
4. Actionable recommendations based on the data

Provide a clear, concise analysis.`;

    try {
      if (this.provider === 'openai') {
        // OpenAI GPT-4 Vision
        const result = await chrome.runtime.sendMessage({
          action: 'fetchAPI',
          url: 'https://api.openai.com/v1/chat/completions',
          options: {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.model || 'gpt-5',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    { 
                      type: 'image_url', 
                      image_url: { url: imageDataUrl }
                    }
                  ]
                }
              ],
              max_tokens: 1000
            })
          }
        });
        
        if (result.success && result.data.choices && result.data.choices[0]) {
          return result.data.choices[0].message.content;
        } else {
          throw new Error(result.error || 'Failed to analyze image');
        }
        
      } else if (this.provider === 'anthropic') {
        // Anthropic Claude Vision
        const base64Image = imageDataUrl.split(',')[1];
        
        const result = await chrome.runtime.sendMessage({
          action: 'fetchAPI',
          url: 'https://api.anthropic.com/v1/messages',
          options: {
            method: 'POST',
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: this.model || 'claude-4-5-sonnet-20241022',
              max_tokens: 1024,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: base64Image
                      }
                    },
                    {
                      type: 'text',
                      text: prompt
                    }
                  ]
                }
              ]
            })
          }
        });
        
        if (result.success && result.data.content && result.data.content[0]) {
          return result.data.content[0].text;
        } else {
          throw new Error(result.error || 'Failed to analyze image');
        }
        
      } else if (this.provider === 'gemini') {
        // Google Gemini Vision
        const base64Image = imageDataUrl.split(',')[1];
        
        const result = await chrome.runtime.sendMessage({
          action: 'fetchAPI',
          url: `https://generativelanguage.googleapis.com/v1beta/models/${this.model || 'gemini-pro'}:generateContent?key=${this.apiKey}`,
          options: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: base64Image
                    }
                  }
                ]
              }]
            })
          }
        });
        
        if (result.success && result.data.candidates && result.data.candidates[0]) {
          return result.data.candidates[0].content.parts[0].text;
        } else {
          throw new Error(result.error || 'Failed to analyze image with Gemini');
        }
      }
      
      throw new Error('No AI provider configured');
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }

  async analyzeWithOpenAI(prompt, screenshot) {
    const messages = [
      {
        role: 'user',
        content: screenshot ? [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { url: screenshot, detail: 'high' }
          }
        ] : prompt
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: screenshot ? 'gpt-4o' : 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        analysis: data.choices[0].message.content
      };
    }

    const error = await response.json();
    return { success: false, error: error.error?.message || 'Analysis failed' };
  }

  async analyzeWithAnthropic(prompt, screenshot) {
    const content = screenshot ? [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshot.split(',')[1] // Remove data:image/png;base64, prefix
        }
      },
      { type: 'text', text: prompt }
    ] : [{ type: 'text', text: prompt }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        analysis: data.content[0].text
      };
    }

    const error = await response.json();
    return { success: false, error: error.error?.message || 'Analysis failed' };
  }

  async generateInsight(commentText) {
    if (!this.isConfigured) {
      throw new Error('AI not configured');
    }

    const prompt = `Based on this dashboard comment, generate a brief insight or recommendation:

Comment: "${commentText}"

Provide a 1-2 sentence actionable insight.`;

    try {
      if (this.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            insight: data.choices[0].message.content
          };
        }
      } else if (this.provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            insight: data.content[0].text
          };
        }
      }

      return { success: false, error: 'Failed to generate insight' };
    } catch (error) {
      console.error('AI insight generation failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.JiraIntegration = JiraIntegration;
  window.AIIntegration = AIIntegration;
}

