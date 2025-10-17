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

  async testConnection() {
    try {
      console.log('🔍 Testing Jira connection...');
      console.log('🔍 Jira URL:', this.jiraUrl);
      console.log('🔍 Jira Email:', this.jiraEmail);
      console.log('🔍 API Token present:', !!this.jiraApiToken);
      
      const auth = btoa(`${this.jiraEmail}:${this.jiraApiToken}`);
      
      // Use background script to bypass CORS
      const result = await chrome.runtime.sendMessage({
        action: 'fetchAPI',
        url: `${this.jiraUrl}/rest/api/3/myself`,
        options: {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      });
      
      if (result.success) {
        console.log('✅ Jira connection successful:', result.data.displayName);
        return { success: true, user: result.data.displayName };
      }
      
      return { success: false, error: result.error || 'Authentication failed' };
    } catch (error) {
      console.error('Jira connection test failed:', error);
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
          url: `${this.jiraUrl}/browse/${result.data.key}`
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

  async testConnection() {
    try {
      console.log('🔍 Testing connection for provider:', this.provider);
      console.log('🔍 API Key present:', !!this.apiKey);
      
      if (this.provider === 'openai') {
        console.log('🔍 Testing OpenAI connection...');
        // Use background script to bypass CORS
        const result = await chrome.runtime.sendMessage({
          action: 'fetchAPI',
          url: 'https://api.openai.com/v1/models',
          options: {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        });
        
        if (result.success) {
          console.log('✅ OpenAI connection successful');
          return true;
        } else {
          console.error('❌ OpenAI connection failed:', result.error);
          return false;
        }
      } else if (this.provider === 'anthropic') {
        // Use background script to bypass CORS
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
              model: this.model || 'claude-3-5-sonnet-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }]
            })
          }
        });
        
        if (result.success) {
          console.log('✅ Anthropic/Claude connection successful');
          return true;
        } else {
          console.error('❌ Anthropic/Claude connection failed:', result.error);
          return false;
        }
      } else if (this.provider === 'gemini') {
        // Test Gemini API
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
                parts: [{ text: 'test' }]
              }]
            })
          }
        });
        
        if (result.success) {
          console.log('✅ Google Gemini connection successful');
          return true;
        } else {
          console.error('❌ Google Gemini connection failed:', result.error);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('AI connection test failed:', error);
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

