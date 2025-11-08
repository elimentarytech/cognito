/**
 * Database Adapter for Stickr AI
 * Supports: Supabase, MongoDB, PostgreSQL, MySQL
 */

class DatabaseAdapter {
  constructor() {
    this.provider = null; // 'supabase', 'mongodb', 'postgresql', 'mysql'
    this.config = {};
    this.client = null;
    this.isConfigured = false;
  }

  /**
   * Initialize database connection
   */
  async init() {
    const config = await chrome.storage.sync.get([
      'dbProvider',
      'supabaseUrl', 'supabaseKey',
      'mongoUri', 'mongoDatabase',
      'postgresHost', 'postgresPort', 'postgresDatabase', 'postgresUser', 'postgresPassword',
      'mysqlHost', 'mysqlPort', 'mysqlDatabase', 'mysqlUser', 'mysqlPassword'
    ]);
    
    this.provider = config.dbProvider;
    
    if (!this.provider) {
      console.log('⚠️ Database not configured - using local storage');
      return false;
    }
    
    try {
      switch (this.provider) {
        case 'supabase':
          if (config.supabaseUrl && config.supabaseKey) {
            this.config = { url: config.supabaseUrl, key: config.supabaseKey };
            this.client = this.createSupabaseClient(config.supabaseUrl, config.supabaseKey);
            this.isConfigured = true;
          }
          break;
          
        case 'mongodb':
          if (config.mongoUri && config.mongoDatabase) {
            this.config = { uri: config.mongoUri, database: config.mongoDatabase };
            this.isConfigured = true;
          }
          break;
          
        case 'postgresql':
          if (config.postgresHost && config.postgresDatabase && config.postgresUser && config.postgresPassword) {
            this.config = {
              host: config.postgresHost,
              port: config.postgresPort || 5432,
              database: config.postgresDatabase,
              user: config.postgresUser,
              password: config.postgresPassword
            };
            this.isConfigured = true;
          }
          break;
          
        case 'mysql':
          if (config.mysqlHost && config.mysqlDatabase && config.mysqlUser && config.mysqlPassword) {
            this.config = {
              host: config.mysqlHost,
              port: config.mysqlPort || 3306,
              database: config.mysqlDatabase,
              user: config.mysqlUser,
              password: config.mysqlPassword
            };
            this.isConfigured = true;
          }
          break;
      }
      
      if (this.isConfigured) {
        console.log(`✅ Database configured: ${this.provider}`);
        return true;
      }
    } catch (error) {
      console.error('Database initialization error:', error);
    }
    
    console.log('⚠️ Database not configured - using local storage');
    return false;
  }

  /**
   * Create Supabase client (lightweight REST implementation)
   * Uses background script to bypass CORS
   */
  createSupabaseClient(url, key) {
    const cleanUrl = url.replace(/\/$/, '');
    
    // Helper to make API requests - DIRECT FETCH (bypassing background script for testing)
    const supabaseRequest = async (method, endpoint, body = null, prefer = null) => {
      const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };
      
      if (prefer) {
        headers['Prefer'] = prefer;
      }
      
      const requestUrl = `${cleanUrl}${endpoint}`;
      const fetchOptions = {
        method: method,
        headers: headers
      };
      
      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }
      
      try {
        console.log(`🔗 [SUPABASE] Direct fetch: ${method} ${requestUrl}`);
        const response = await fetch(requestUrl, fetchOptions);
        
        const contentType = response.headers.get('content-type');
        let data = null;
        
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = { message: text };
          }
        } else {
          const text = await response.text();
          data = { message: text };
        }
        
        if (!response.ok) {
          return { data: null, error: { message: `HTTP ${response.status}: ${JSON.stringify(data).substring(0, 200)}` } };
        }
        
        return { data: data, error: null };
      } catch (error) {
        console.error(`🔗 [SUPABASE] Direct fetch error:`, error);
        return { data: null, error: { message: error.message } };
      }
    };
    
    return {
      from: (table) => ({
        select: async (columns = '*') => {
          try {
            const endpoint = `/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
            return await supabaseRequest('GET', endpoint);
          } catch (error) {
            console.error('Supabase select error:', error);
            return { data: null, error: { message: error.message } };
          }
        },
        
        insert: async (records) => {
          try {
            const endpoint = `/rest/v1/${table}`;
            // Use return=representation to get the inserted record back
            const result = await supabaseRequest('POST', endpoint, records, 'return=representation');
            return result;
          } catch (error) {
            console.error('Supabase insert error:', error);
            return { data: null, error: { message: error.message } };
          }
        },
        
        update: (updates) => ({
          eq: async (column, value) => {
            try {
              const endpoint = `/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`;
              // Use return=representation to get the updated record back
              return await supabaseRequest('PATCH', endpoint, updates, 'return=representation');
            } catch (error) {
              console.error('Supabase update error:', error);
              return { data: null, error: { message: error.message } };
            }
          }
        }),
        
        delete: () => ({
          eq: async (column, value) => {
            try {
              const endpoint = `/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`;
              const result = await supabaseRequest('DELETE', endpoint);
              return { error: result.error };
            } catch (error) {
              console.error('Supabase delete error:', error);
              return { error: { message: error.message } };
            }
          }
        })
      })
    };
  }

  /**
   * Execute MongoDB operation via HTTP API
   */
  async mongoDBRequest(operation, data) {
    // MongoDB Atlas Data API endpoint
    const endpoint = `${this.config.uri}/action/${operation}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey || ''
      },
      body: JSON.stringify({
        dataSource: 'Cluster0', // Default cluster name
        database: this.config.database,
        collection: 'cognito_comments',
        ...data
      })
    });
    
    return await response.json();
  }

  /**
   * Execute PostgreSQL operation via REST API endpoint
   * Note: Requires a REST API wrapper service
   */
  async postgresRequest(query, params = []) {
    const response = await fetch(`${this.config.host}:${this.config.port}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        query: query,
        params: params
      })
    });
    
    return await response.json();
  }

  /**
   * Execute MySQL operation via REST API endpoint
   * Note: Requires a REST API wrapper service
   */
  async mysqlRequest(query, params = []) {
    const response = await fetch(`${this.config.host}:${this.config.port}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        query: query,
        params: params
      })
    });
    
    return await response.json();
  }

  /**
   * Test database connection
   */
  async testConnection(provider, config, addLog = null) {
    try {
      const log = addLog || (() => {});
      log(`Initializing ${provider} connection test...`);
      
      console.log('🔍 Testing database connection for provider:', provider);
      console.log('🔍 Config:', config);
      
      switch (provider) {
        case 'supabase': {
          // Handle both property name formats (url/key or supabaseUrl/supabaseKey)
          const supabaseUrl = config.supabaseUrl || config.url;
          const supabaseKey = config.supabaseKey || config.key;
          
          if (!supabaseUrl || !supabaseKey) {
            log('Error: Missing URL or API key', 'error');
            console.error('🔍 Supabase config missing URL or key');
            return false;
          }
          
          // Clean up URL (remove trailing slash)
          const cleanUrl = supabaseUrl.replace(/\/$/, '');
          // Use /auth/v1/health endpoint - it's more reliable and faster for connectivity testing
          const testUrl = `${cleanUrl}/auth/v1/health`;
          log(`Sending request to: ${testUrl}`);
          log(`Method: GET`);
          log(`Headers: apikey, Authorization, Content-Type, User-Agent`);
          console.log('🔍 Supabase test - Full URL:', testUrl);
          console.log('🔍 Supabase test - API Key (first 10 chars):', supabaseKey.substring(0, 10));
          
          // Test connection using the health check endpoint
          // This endpoint is specifically designed for connectivity testing and doesn't require tables
          log('Waiting for response...');
          
          // DIRECT FETCH (bypassing background script for testing)
          const requestTimestamp = new Date().toISOString();
          log(`Request timestamp: ${requestTimestamp}`);
          log(`Sending direct fetch request to: ${testUrl}`);
          console.log('🔍 Supabase test - Request timestamp:', requestTimestamp);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            log('Connection timeout after 30 seconds', 'error');
          }, 30000);
          
          try {
            const response = await fetch(testUrl, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Cognito-AI-Extension/1.0'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json().catch(() => ({}));
              log('Received successful response from Supabase API', 'success');
              log(`Response: ${JSON.stringify(data).substring(0, 100)}...`, 'success');
              console.log('🔍 Supabase test result: success');
              return true;
            } else {
              const errorText = await response.text();
              log(`Received response: HTTP ${response.status} - ${errorText.substring(0, 100)}...`);
              // For health endpoint, any response (even 401/403) means we reached the server
              const errorStr = errorText.toLowerCase();
              if (errorStr.includes('permission') || errorStr.includes('unauthorized') || 
                  errorStr.includes('forbidden') || errorStr.includes('schema') || 
                  errorStr.includes('relation')) {
                log('Connection successful (reached Supabase server)', 'success');
                console.log('🔍 Supabase connection successful (reached server)');
                return true;
              }
              log(`API error: HTTP ${response.status} - ${errorText.substring(0, 100)}`, 'error');
              return false;
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              log('Connection timeout after 30 seconds', 'error');
              return false;
            }
            log(`Connection error: ${error.message}`, 'error');
            console.error('🔍 Supabase test error:', error);
            return false;
          }
          break;
        }
          
        case 'mongodb': {
          // Handle both property name formats
          const mongoUrl = config.mongoUrl || config.uri;
          const mongoApiKey = config.mongoApiKey || config.apiKey;
          const mongoDatabase = config.mongoDatabase || config.database;
          
          if (!mongoUrl || !mongoApiKey || !mongoDatabase) {
            log('Error: Missing URL, API key, or database name', 'error');
            return false;
          }
          
          log(`Sending request to: ${mongoUrl}/action/findOne`);
          log(`Database: ${mongoDatabase}, Collection: cognito_comments`);
          
          // DIRECT FETCH (bypassing background script for testing)
          const testUrl = `${mongoUrl}/action/findOne`;
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
                'Content-Type': 'application/json',
                'api-key': mongoApiKey
              },
              body: JSON.stringify({
                dataSource: 'Cluster0',
                database: mongoDatabase,
                collection: 'cognito_comments',
                filter: {}
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              log('Received successful response from MongoDB API', 'success');
              console.log('🔍 MongoDB test result: success');
              return true;
            } else {
              const errorText = await response.text();
              log(`API error: HTTP ${response.status} - ${errorText.substring(0, 100)}`, 'error');
              console.error('🔍 MongoDB test result: failed', response.status, errorText);
              return false;
            }
          } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              log('Connection timeout after 30 seconds', 'error');
              return false;
            }
            log(`Connection error: ${error.message}`, 'error');
            console.error('🔍 MongoDB test error:', error);
            return false;
          }
          break;
        }
          
        case 'postgresql':
        case 'mysql':
          // Test connection via REST endpoint
          const testResult = await chrome.runtime.sendMessage({
            action: 'fetchAPI',
            url: `${config.host}:${config.port}/api/test`,
            options: {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                database: config.database,
                user: config.user,
                password: config.password
              })
            }
          });
          console.log('🔍 PostgreSQL/MySQL test result:', testResult);
          return testResult.success;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Load all comments
   */
  async loadComments() {
    if (!this.isConfigured) {
      // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      return result.comments || [];
    }

    try {
      switch (this.provider) {
        case 'supabase':
          try {
          const { data, error } = await this.client.from('cognito_comments').select('*');
          if (error) {
              console.error('❌ Supabase error loading comments:', error);
              return [];
            }
            console.log('✅ Supabase loaded comments:', data ? data.length : 0, 'comments');
            if (data && data.length > 0) {
              console.log('📝 Sample comment:', data[0]);
            }
            return data || [];
          } catch (err) {
            console.error('❌ Exception loading comments from Supabase:', err);
            return [];
          }
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('find', {
            filter: {}
          });
          return mongoResult.documents || [];
          
        case 'postgresql':
          const pgResult = await this.postgresRequest(
            'SELECT * FROM cognito_comments ORDER BY timestamp DESC'
          );
          return pgResult.rows || [];
          
        case 'mysql':
          const mysqlResult = await this.mysqlRequest(
            'SELECT * FROM cognito_comments ORDER BY timestamp DESC'
          );
          return mysqlResult.rows || [];
          
        default:
          return [];
      }
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  }

  /**
   * Update an existing comment
   */
  async updateComment(comment) {
    console.log('🔍 Updating comment in database:', comment.id, 'Jira ticket:', comment.jiraTicket);
    if (!this.isConfigured) {
      // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      const comments = result.comments || [];
      const index = comments.findIndex(c => c.id === comment.id);
      if (index !== -1) {
        comments[index] = comment;
        await chrome.storage.sync.set({ comments });
        console.log('✅ Updated comment in local storage');
      }
      return comment;
    }

    try {
      switch (this.provider) {
        case 'supabase':
          console.log('🔍 Supabase update - comment ID:', comment.id);
          const { data, error } = await this.client
            .from('cognito_comments')
            .update(comment)
            .eq('id', comment.id);
          if (error) {
            console.error('Error updating comment:', error);
            return null;
          }
          console.log('✅ Updated comment in Supabase, data:', data);
          return comment;
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('updateOne', {
            filter: { id: comment.id },
            update: { $set: comment }
          });
          console.log('✅ Updated comment in MongoDB, modified count:', mongoResult.modifiedCount);
          return mongoResult.modifiedCount > 0 ? comment : null;
          
        default:
          console.error('Update not implemented for provider:', this.provider);
          return null;
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      return null;
    }
  }

  /**
   * Save a new comment
   */
  async saveComment(comment) {
    if (!this.isConfigured) {
      // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      const comments = result.comments || [];
      comments.push(comment);
      await chrome.storage.sync.set({ comments });
      return comment;
    }

    try {
      switch (this.provider) {
        case 'supabase':
          const { data, error } = await this.client.from('cognito_comments').insert([comment]);
          if (error) {
            console.error('Error saving comment:', error);
            return null;
          }
          // Supabase returns an array when using return=representation
          // Handle both array and single object responses
          if (Array.isArray(data)) {
            return data[0] || comment; // Return first item or fallback to original
          }
          return data || comment; // Return data or fallback to original
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('insertOne', {
            document: comment
          });
          return mongoResult.insertedId ? comment : null;
          
        case 'postgresql':
          const pgQuery = `
            INSERT INTO cognito_comments (
              id, text, link, "commentType", type, timestamp, author, 
              "pageId", "parentId", replies, "chartHash", "chartLabel", 
              "relativeX", "relativeY"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
          `;
          const pgResult = await this.postgresRequest(pgQuery, [
            comment.id, comment.text, comment.link, comment.commentType, comment.type,
            comment.timestamp, comment.author, comment.pageId, comment.parentId,
            JSON.stringify(comment.replies), comment.chartHash, comment.chartLabel,
            comment.relativeX, comment.relativeY
          ]);
          return pgResult.rows ? pgResult.rows[0] : null;
          
        case 'mysql':
          const mysqlQuery = `
            INSERT INTO cognito_comments (
              id, text, link, commentType, type, timestamp, author, 
              pageId, parentId, replies, chartHash, chartLabel, 
              relativeX, relativeY
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const mysqlResult = await this.mysqlRequest(mysqlQuery, [
            comment.id, comment.text, comment.link, comment.commentType, comment.type,
            comment.timestamp, comment.author, comment.pageId, comment.parentId,
            JSON.stringify(comment.replies), comment.chartHash, comment.chartLabel,
            comment.relativeX, comment.relativeY
          ]);
          return mysqlResult.affectedRows > 0 ? comment : null;
          
        default:
          return null;
      }
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId) {
    if (!this.isConfigured) {
      // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      const comments = result.comments || [];
      const filtered = comments.filter(c => c.id !== commentId);
      await chrome.storage.sync.set({ comments: filtered });
      return true;
    }

    try {
      switch (this.provider) {
        case 'supabase':
          const { error } = await this.client.from('cognito_comments').delete().eq('id', commentId);
          if (error) {
            console.error('Error deleting comment:', error);
            return false;
          }
          return true;
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('deleteOne', {
            filter: { id: commentId }
          });
          return mongoResult.deletedCount > 0;
          
        case 'postgresql':
          const pgResult = await this.postgresRequest(
            'DELETE FROM cognito_comments WHERE id = $1',
            [commentId]
          );
          return pgResult.rowCount > 0;
          
        case 'mysql':
          const mysqlResult = await this.mysqlRequest(
            'DELETE FROM cognito_comments WHERE id = ?',
            [commentId]
          );
          return mysqlResult.affectedRows > 0;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  /**
   * Clear all comments for a page
   */
  async clearPageComments(pageId) {
    if (!this.isConfigured) {
      // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      const comments = result.comments || [];
      const filtered = comments.filter(c => c.pageId !== pageId);
      await chrome.storage.sync.set({ comments: filtered });
      return true;
    }

    try {
      switch (this.provider) {
        case 'supabase':
          const { error } = await this.client.from('cognito_comments').delete().eq('pageId', pageId);
          if (error) {
            console.error('Error clearing comments:', error);
            return false;
          }
          return true;
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('deleteMany', {
            filter: { pageId: pageId }
          });
          return true; // MongoDB deleteMany doesn't fail if 0 documents match
          
        case 'postgresql':
          await this.postgresRequest(
            'DELETE FROM cognito_comments WHERE "pageId" = $1',
            [pageId]
          );
          return true;
          
        case 'mysql':
          await this.mysqlRequest(
            'DELETE FROM cognito_comments WHERE pageId = ?',
            [pageId]
          );
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time updates (for team collaboration)
   */
  subscribeToChanges(callback) {
    if (!this.isConfigured) return null;

    // Polling-based real-time updates (simple approach for all providers)
    const interval = setInterval(async () => {
      const comments = await this.loadComments();
      callback(comments);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.DatabaseAdapter = DatabaseAdapter;
}
