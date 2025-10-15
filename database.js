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
   */
  createSupabaseClient(url, key) {
    return {
      from: (table) => ({
        select: async (columns = '*') => {
          const response = await fetch(`${url}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          return { data, error: response.ok ? null : data };
        },
        
        insert: async (records) => {
          const response = await fetch(`${url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(records)
          });
          const data = await response.json();
          return { data, error: response.ok ? null : data };
        },
        
        update: (updates) => ({
          eq: async (column, value) => {
            const response = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}`, {
              method: 'PATCH',
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(updates)
            });
            const data = await response.json();
            return { data, error: response.ok ? null : data };
          }
        }),
        
        delete: async () => ({
          eq: async (column, value) => {
            const response = await fetch(`${url}/rest/v1/${table}?${column}=eq.${value}`, {
              method: 'DELETE',
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
              }
            });
            return { error: response.ok ? null : { message: 'Delete failed' } };
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
        collection: 'stickr_comments',
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
  async testConnection(provider, config) {
    try {
      switch (provider) {
        case 'supabase':
          const response = await fetch(`${config.url}/rest/v1/`, {
            headers: {
              'apikey': config.key,
              'Authorization': `Bearer ${config.key}`
            }
          });
          return response.ok;
          
        case 'mongodb':
          // Test MongoDB Atlas Data API connection
          const mongoResponse = await fetch(`${config.uri}/action/findOne`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': config.apiKey || ''
            },
            body: JSON.stringify({
              dataSource: 'Cluster0',
              database: config.database,
              collection: 'stickr_comments',
              filter: {}
            })
          });
          return mongoResponse.ok;
          
        case 'postgresql':
        case 'mysql':
          // Test connection via REST endpoint
          const testResponse = await fetch(`${config.host}:${config.port}/api/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              database: config.database,
              user: config.user,
              password: config.password
            })
          });
          return testResponse.ok;
          
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
          const { data, error } = await this.client.from('stickr_comments').select('*');
          if (error) {
            console.error('Error loading comments:', error);
            return [];
          }
          return data || [];
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('find', {
            filter: {}
          });
          return mongoResult.documents || [];
          
        case 'postgresql':
          const pgResult = await this.postgresRequest(
            'SELECT * FROM stickr_comments ORDER BY timestamp DESC'
          );
          return pgResult.rows || [];
          
        case 'mysql':
          const mysqlResult = await this.mysqlRequest(
            'SELECT * FROM stickr_comments ORDER BY timestamp DESC'
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
            .from('stickr_comments')
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
          const { data, error } = await this.client.from('stickr_comments').insert([comment]);
          if (error) {
            console.error('Error saving comment:', error);
            return null;
          }
          return data[0];
          
        case 'mongodb':
          const mongoResult = await this.mongoDBRequest('insertOne', {
            document: comment
          });
          return mongoResult.insertedId ? comment : null;
          
        case 'postgresql':
          const pgQuery = `
            INSERT INTO stickr_comments (
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
            INSERT INTO stickr_comments (
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
          const { error } = await this.client.from('stickr_comments').delete().eq('id', commentId);
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
            'DELETE FROM stickr_comments WHERE id = $1',
            [commentId]
          );
          return pgResult.rowCount > 0;
          
        case 'mysql':
          const mysqlResult = await this.mysqlRequest(
            'DELETE FROM stickr_comments WHERE id = ?',
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
          const { error } = await this.client.from('stickr_comments').delete().eq('pageId', pageId);
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
            'DELETE FROM stickr_comments WHERE "pageId" = $1',
            [pageId]
          );
          return true;
          
        case 'mysql':
          await this.mysqlRequest(
            'DELETE FROM stickr_comments WHERE pageId = ?',
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
window.DatabaseAdapter = DatabaseAdapter;
