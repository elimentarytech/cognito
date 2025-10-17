  // Content script - runs on Power BI and Grafana pages
class Stickr {
    constructor() {
      this.isAddingComment = false;
      this.comments = [];
    this.platform = this.detectPlatform();
      this.currentPageId = this.generatePageId();
      this.sidebar = null;
    this.bubbleMap = new Map(); // Map: chartHash -> {bubble, chartElement, comments}
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.bubblesHidden = false; // Track if bubbles are hidden by user
    this.currentFilterState = null; // Track current time range filters for Grafana
      this.init();
    }
  
    // Detect which platform we're on
    detectPlatform() {
      const url = window.location.hostname;
      const pathname = window.location.pathname;
      
      // Check URL patterns first
      if (url.includes('grafana')) {
        console.log('🎯 Detected Grafana platform (URL)');
        return 'grafana';
      } else if (url.includes('powerbi') || url.includes('app.powerbi')) {
        console.log('🎯 Detected Power BI platform (URL)');
        return 'powerbi';
      }
      
      // Check for Grafana-specific patterns in path
      if (pathname.includes('/d/') || pathname.includes('/dashboard/')) {
        console.log('🎯 Detected Grafana (path pattern)');
        return 'grafana';
      }
      
      // Wait a bit for DOM to load and check structure
      const checkStructure = () => {
        // Grafana indicators (multiple checks for flexibility)
        const grafanaIndicators = [
          document.querySelector('[data-viz-panel-key]'),
          document.querySelector('.panel-container'),
          document.querySelector('[class*="panel-"]'),
          document.querySelector('.react-grid-item'),
          document.querySelector('[data-testid*="Panel"]'),
          document.querySelector('[aria-labelledby*="rj"]'), // Grafana uses IDs like "_rjf_"
          document.querySelector('.uplot'), // uPlot charts used by Grafana
          document.querySelector('.grafana-app'),
          document.body.classList.contains('grafana-app')
        ];
        
        if (grafanaIndicators.some(el => el)) {
          console.log('🎯 Detected Grafana (by DOM structure)');
          return 'grafana';
        }
        
        // Power BI indicators
        const powerBIIndicators = [
          document.querySelector('.visualContainer'),
          document.querySelector('visual-modern'),
          document.querySelector('.visualContainerGroup')
        ];
        
        if (powerBIIndicators.some(el => el)) {
          console.log('🎯 Detected Power BI (by DOM structure)');
          return 'powerbi';
        }
        
        console.log('⚠️ Platform unknown, defaulting to generic');
        return 'unknown';
      };
      
      return checkStructure();
    }
  
    // Extract current Grafana time range filters from URL
    getGrafanaTimeFilters() {
      if (this.platform !== 'grafana') {
        return null;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const from = urlParams.get('from');
      const to = urlParams.get('to');
      const timezone = urlParams.get('timezone') || 'browser';
      
      // Also try to get from Grafana's time picker in DOM
      let fromText = from;
      let toText = to;
      
      try {
        // Grafana time picker button usually shows the current range
        const timePickerButton = document.querySelector('[aria-label*="Time range"]') || 
                                 document.querySelector('[data-testid="data-testid Time range picker"]') ||
                                 document.querySelector('button[aria-controls*="TimePickerContent"]');
        
        if (timePickerButton) {
          const buttonText = timePickerButton.textContent || '';
          // Store the human-readable text as well
          if (buttonText.trim()) {
            fromText = from || buttonText;
            toText = to || buttonText;
          }
        }
      } catch (e) {
        // Silently fail if DOM elements not found
      }
      
      if (from || to) {
        return {
          from: fromText,
          to: toText,
          timezone
        };
      }
      
      return null;
    }
    
    // Check if two filter states match
    filtersMatch(filterA, filterB) {
      // If either is null, they don't match (unless both are null)
      if (!filterA && !filterB) return true;
      if (!filterA || !filterB) return false;
      
      // Compare filter values
      return filterA.from === filterB.from && 
             filterA.to === filterB.to && 
             filterA.timezone === filterB.timezone;
    }
  
    async init() {
      // Initialize integrations
      this.db = new window.DatabaseAdapter();
      this.jira = new window.JiraIntegration();
      this.ai = new window.AIIntegration();
      
      await this.db.init();
      await this.jira.init();
      await this.ai.init();
      
      // Check if user has registered
      await this.checkUserRegistration();
      
      // Check if database is configured
      await this.checkDatabaseConfiguration();
      
      // Initialize current filter state for Grafana
      if (this.platform === 'grafana') {
        this.currentFilterState = this.getGrafanaTimeFilters();
        console.log('📅 Initial filter state:', this.currentFilterState);
      }
      
      this.injectSidebar();
      this.loadComments();
      this.setupEventListeners();
      this.observeDOMChanges();
      
      // Setup real-time sync if database is configured
      if (this.db.isConfigured) {
        this.setupRealtimeSync();
      }
      
      // Watch for filter changes in Grafana
      if (this.platform === 'grafana') {
        this.watchForFilterChanges();
      }
    }
    
    // Check if user is registered, if not prompt for email
    async checkUserRegistration() {
      const result = await chrome.storage.sync.get('userEmail');
      
      if (!result.userEmail) {
        // Show email registration dialog
        await this.showEmailDialog();
      } else {
        this.userEmail = result.userEmail;
        this.username = result.userEmail.split('@')[0];
        console.log('👤 User:', this.username);
      }
    }
    
    // Show email registration dialog
    showEmailDialog() {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'dc-dialog-overlay';
        dialog.style.zIndex = '10000000';
        
        dialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 600px;">
            <div class="dc-dialog-header" style="display: flex; justify-content: center; align-items: center; position: relative; border-bottom: none; padding-bottom: 0.5rem;">
              <h3 style="font-size: 24px; font-weight: 700; color: #1F2937; text-align: center; margin: 0;">Cognito AI - Intelligence made Elementary</h3>
              <button class="dc-dialog-close" id="dc-email-close" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%);">×</button>
            </div>
            <div class="dc-dialog-body">
              <p style="margin-bottom: 1.5rem; font-size: 16px; font-weight: 500; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                ⚡ Supercharge Your Dashboards with AI-Powered Insights
              </p>
              <input 
                type="email" 
                id="dc-email-input" 
                class="dc-comment-input" 
                placeholder="your.email@company.com"
                style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; min-height: auto; height: auto;"
              >
              <p id="dc-email-error" style="color: #EF4444; font-size: 12px; margin-top: 0.5rem; display: none;">Please enter a valid email address</p>
            </div>
            <div class="dc-dialog-footer" style="padding-top: 1rem;">
              <button class="dc-btn dc-btn-primary" id="dc-email-submit" style="width: 100%; padding: 0.65rem 1.5rem; font-size: 15px;">
                Get Started
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const emailInput = document.getElementById('dc-email-input');
        const errorMsg = document.getElementById('dc-email-error');
        const submitBtn = document.getElementById('dc-email-submit');
        const closeBtn = document.getElementById('dc-email-close');
        
        // Close button handler
        closeBtn.addEventListener('click', () => {
          dialog.remove();
          // Don't resolve or reject - just exit the flow completely
        });
        
        emailInput.focus();
        
        const validateAndSubmit = async () => {
          const email = emailInput.value.trim();
          
          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          
          if (!email || !emailRegex.test(email)) {
            errorMsg.style.display = 'block';
            emailInput.style.borderColor = '#EF4444';
            return;
          }
          
          // Save email
          this.userEmail = email;
          this.username = email.split('@')[0];
          await chrome.storage.sync.set({ userEmail: email });
          
          console.log('✅ User registered:', this.username);
          dialog.remove();
          resolve();
        };
        
        submitBtn.addEventListener('click', validateAndSubmit);
        
        emailInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            validateAndSubmit();
          }
        });
        
        emailInput.addEventListener('input', () => {
          errorMsg.style.display = 'none';
          emailInput.style.borderColor = '#ddd';
        });
      });
    }
    
    // Check if database is configured, if not prompt for configuration
    async checkDatabaseConfiguration() {
      const result = await chrome.storage.sync.get(['dbProvider']);
      
      if (!result.dbProvider) {
        // Show database configuration dialog
        await this.showDatabaseDialog();
      }
    }
    
    // Show database configuration dialog
    showDatabaseDialog() {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'dc-dialog-overlay';
        dialog.style.zIndex = '10000000';
        
        dialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 550px; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="dc-dialog-header" style="padding: 1rem 1.25rem 0.75rem;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1F2937;">🗄️ Database Configuration</h3>
              <p style="margin: 0.5rem 0 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
                Choose your database provider for team collaboration
              </p>
            </div>
            <div class="dc-dialog-body" style="max-height: calc(80vh - 130px); overflow-y: auto; padding: 0 1.25rem;">
              
              <!-- Radio Button Provider Selection -->
              <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; margin-top: 1rem; flex-wrap: wrap; justify-content: center;">
                <div id="dc-local-storage-option" class="db-provider-radio" style="cursor: pointer;">
                  <div class="db-provider-card">
                    <div class="db-provider-icon">💾</div>
                    <div class="db-provider-name">Local Storage</div>
                    <div class="db-provider-tag">Solo Mode</div>
                  </div>
                </div>
                
                <label class="db-provider-radio">
                  <input type="radio" name="db-provider" value="supabase" style="display: none;">
                  <div class="db-provider-card">
                    <div class="db-provider-icon">🚀</div>
                    <div class="db-provider-name">Supabase</div>
                    <div class="db-provider-tag">Recommended</div>
                  </div>
                </label>
                
                <label class="db-provider-radio">
                  <input type="radio" name="db-provider" value="mongodb" style="display: none;">
                  <div class="db-provider-card">
                    <div class="db-provider-icon">🍃</div>
                    <div class="db-provider-name">MongoDB Atlas</div>
                    <div class="db-provider-tag">NoSQL</div>
                  </div>
                </label>
              </div>
              
              <!-- Supabase Form -->
              <div id="form-supabase" class="db-form" style="display: none;">
                <div class="db-setup-guide">
                  <div class="db-setup-guide-title">📚 Supabase Setup Steps:</div>
                  <ol style="margin: 0; padding-left: 1.25rem; color: #78350F; line-height: 1.6; font-size: 12px;">
                    <li>Go to <a href="https://supabase.com" target="_blank" style="color: #0066cc; font-weight: 500;">supabase.com</a> and create a free account</li>
                    <li>Click <strong>"New Project"</strong> and fill in project details</li>
                    <li>Once created, go to <strong>Settings → API</strong></li>
                    <li>Copy the <strong>"Project URL"</strong> (looks like https://xxxxx.supabase.co)</li>
                    <li>Copy the <strong>"anon public"</strong> API key</li>
                    <li>Go to <strong>SQL Editor</strong> and run this SQL:
                      <pre style="background: #FEF3C7; padding: 0.75rem; margin-top: 0.75rem; border-radius: 6px; font-size: 12px; overflow-x: auto; line-height: 1.5; border: 2px solid #F59E0B; font-family: 'Monaco', 'Courier New', monospace; color: #92400E; display: block;">CREATE TABLE cognito_comments (
  id TEXT PRIMARY KEY,
  text TEXT,
  link TEXT,
  "commentType" TEXT,
  type TEXT,
  timestamp TEXT,
  author TEXT,
  "pageId" TEXT,
  "parentId" TEXT,
  replies JSONB,
  "chartHash" TEXT,
  "chartLabel" TEXT,
  "relativeX" REAL,
  "relativeY" REAL
);</pre>
                    </li>
                    <li>Enter your Project URL and API Key below</li>
                  </ol>
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Supabase Project URL</label>
                  <input 
                    type="url" 
                    id="dc-supabase-url" 
                    class="db-form-input" 
                    placeholder="https://xxxxx.supabase.co"
                  >
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Supabase API Key (anon public)</label>
                  <input 
                    type="password" 
                    id="dc-supabase-key" 
                    class="db-form-input" 
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  >
                </div>
                
                <p id="dc-db-error" style="color: #EF4444; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
                <p id="dc-db-success" style="color: #10B981; font-size: 11px; margin-top: 0.5rem; display: none;">✅ Connection successful!</p>
              </div>
              
              <!-- MongoDB Form -->
              <div id="form-mongodb" class="db-form" style="display: none;">
                <div class="db-setup-guide">
                  <div class="db-setup-guide-title">📚 MongoDB Atlas Setup Steps:</div>
                  <ol style="margin: 0; padding-left: 1.25rem; color: #78350F; line-height: 1.6; font-size: 12px;">
                    <li>Go to <a href="https://www.mongodb.com/cloud/atlas/register" target="_blank" style="color: #0066cc; font-weight: 500;">mongodb.com/cloud/atlas</a> and create a free account</li>
                    <li>Create a <strong>free M0 cluster</strong> (Shared tier)</li>
                    <li>Set up database access: <strong>Security → Database Access → Add New User</strong></li>
                    <li>Set up network access: <strong>Security → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)</strong></li>
                    <li>Enable Data API:
                      <ul style="margin-top: 0.25rem; padding-left: 1.25rem; font-size: 12px;">
                        <li>Go to <strong>Data API</strong> in left sidebar</li>
                        <li>Click <strong>"Enable the Data API"</strong></li>
                        <li>Copy the <strong>"URL Endpoint"</strong></li>
                        <li>Create an <strong>API Key</strong> and copy it</li>
                      </ul>
                    </li>
                    <li>Create database and collection:
                      <ul style="margin-top: 0.25rem; padding-left: 1.25rem; font-size: 12px;">
                        <li>Go to <strong>Database → Browse Collections</strong></li>
                        <li>Click <strong>"Add My Own Data"</strong></li>
                        <li>Database Name: <code style="background: #FEFCE8; padding: 0.125rem 0.25rem; border-radius: 3px;">cognito</code></li>
                        <li>Collection Name: <code style="background: #FEFCE8; padding: 0.125rem 0.25rem; border-radius: 3px;">comments</code></li>
                      </ul>
                    </li>
                    <li>Enter your Data API URL, API Key, and Database Name below</li>
                  </ol>
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">MongoDB Data API URL</label>
                  <input 
                    type="url" 
                    id="dc-mongodb-url" 
                    class="db-form-input" 
                    placeholder="https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1"
                  >
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">MongoDB API Key</label>
                  <input 
                    type="password" 
                    id="dc-mongodb-key" 
                    class="db-form-input" 
                    placeholder="Your MongoDB Data API Key"
                  >
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Database Name</label>
                  <input 
                    type="text" 
                    id="dc-mongodb-database" 
                    class="db-form-input" 
                    placeholder="cognito"
                    value="cognito"
                  >
                </div>
                
                <p id="dc-db-error" style="color: #EF4444; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
                <p id="dc-db-success" style="color: #10B981; font-size: 11px; margin-top: 0.5rem; display: none;">✅ Connection successful!</p>
              </div>
              
            </div>
            <div class="dc-dialog-footer" style="display: flex; gap: 0.5rem; padding: 0.75rem 1.25rem; border-top: 1px solid #F3F4F6;">
              <button class="dc-btn dc-btn-secondary" id="dc-db-cancel" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                Cancel
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-db-test" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                🔍 Test
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-db-save" style="flex: 1; padding: 0.5rem; font-size: 13px;" disabled>
                Save
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Local Storage option click handler
        const localStorageOption = document.getElementById('dc-local-storage-option');
        localStorageOption.addEventListener('click', async () => {
          console.log('💾 User selected Local Storage (Solo Mode)');
          // Save the choice to prevent showing dialog again
          await chrome.storage.sync.set({ dbProvider: 'local' });
          dialog.remove();
          resolve();
        });
        
        // Provider selection handling
        const providerRadios = dialog.querySelectorAll('input[name="db-provider"]');
        const cancelBtn = document.getElementById('dc-db-cancel');
        const testBtn = document.getElementById('dc-db-test');
        const saveBtn = document.getElementById('dc-db-save');
        
        let selectedProvider = 'supabase'; // Default to Supabase
        let connectionValid = false;
        
        // Cancel button
        cancelBtn.addEventListener('click', async () => {
          console.log('User cancelled database configuration');
          // Save local storage as default to prevent showing dialog again
          await chrome.storage.sync.set({ dbProvider: 'local' });
          dialog.remove();
          resolve();
        });
        
        // Select Supabase by default and show its form
        const supabaseRadio = dialog.querySelector('input[value="supabase"]');
        supabaseRadio.checked = true;
        document.getElementById('form-supabase').style.display = 'block';
        
        // Focus on first input after a short delay to ensure dialog is rendered
        setTimeout(() => {
          document.getElementById('dc-supabase-url').focus();
        }, 100);
        
        // Handle provider selection
        providerRadios.forEach(radio => {
          radio.addEventListener('change', () => {
            selectedProvider = radio.value;
            
            // Hide all forms
            document.getElementById('form-supabase').style.display = 'none';
            document.getElementById('form-mongodb').style.display = 'none';
            
            // Show selected form
            document.getElementById(`form-${selectedProvider}`).style.display = 'block';
            
            // Reset validation state
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = 'Test Connection';
            testBtn.style.background = '';
            testBtn.disabled = false;
            
            // Hide messages
            const errorMsgs = dialog.querySelectorAll('[id="dc-db-error"]');
            const successMsgs = dialog.querySelectorAll('[id="dc-db-success"]');
            errorMsgs.forEach(msg => msg.style.display = 'none');
            successMsgs.forEach(msg => msg.style.display = 'none');
            
            // Focus on first input
            if (selectedProvider === 'supabase') {
              document.getElementById('dc-supabase-url').focus();
            } else if (selectedProvider === 'mongodb') {
              document.getElementById('dc-mongodb-url').focus();
            }
          });
        });
        
        // Test connection
        testBtn.addEventListener('click', async () => {
          if (!selectedProvider) {
            alert('Please select a database provider first');
            return;
          }
          
          const errorMsg = dialog.querySelector(`#form-${selectedProvider} #dc-db-error`);
          const successMsg = dialog.querySelector(`#form-${selectedProvider} #dc-db-success`);
          
          let config = {};
          
          if (selectedProvider === 'supabase') {
            const url = document.getElementById('dc-supabase-url').value.trim();
            const key = document.getElementById('dc-supabase-key').value.trim();
            
            if (!url || !key) {
              errorMsg.textContent = 'Please enter both URL and API key';
              errorMsg.style.display = 'block';
              successMsg.style.display = 'none';
              return;
            }
            
            config = { supabaseUrl: url, supabaseKey: key };
          } else if (selectedProvider === 'mongodb') {
            const url = document.getElementById('dc-mongodb-url').value.trim();
            const key = document.getElementById('dc-mongodb-key').value.trim();
            const database = document.getElementById('dc-mongodb-database').value.trim();
            
            if (!url || !key || !database) {
              errorMsg.textContent = 'Please fill in all fields';
              errorMsg.style.display = 'block';
              successMsg.style.display = 'none';
              return;
            }
            
            config = { mongoUrl: url, mongoApiKey: key, mongoDatabase: database };
          }
          
          testBtn.textContent = '⏳ Testing...';
          testBtn.disabled = true;
          
          try {
            const isValid = await this.db.testConnection(selectedProvider, config);
            console.log('🔍 Database test result:', isValid);
            
            if (isValid) {
              successMsg.textContent = '✅ Database connection successful!';
              successMsg.style.display = 'block';
              errorMsg.style.display = 'none';
              connectionValid = true;
              saveBtn.disabled = false;
              testBtn.textContent = '✅ Connected';
              testBtn.style.background = '#10B981';
            } else {
              errorMsg.textContent = '❌ Connection failed. Please check your credentials.';
              errorMsg.style.display = 'block';
              successMsg.style.display = 'none';
              connectionValid = false;
              saveBtn.disabled = true;
              testBtn.textContent = '🔍 Test Connection';
              testBtn.disabled = false;
            }
          } catch (error) {
            console.error('🔍 Database test error:', error);
            errorMsg.textContent = `❌ Connection failed: ${error.message}`;
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = '🔍 Test Connection';
            testBtn.disabled = false;
          }
        });
        
        // Save configuration
        saveBtn.addEventListener('click', async () => {
          if (!connectionValid) {
            alert('Please test connection first');
            return;
          }
          
          let config = { dbProvider: selectedProvider };
          
          if (selectedProvider === 'supabase') {
            config.supabaseUrl = document.getElementById('dc-supabase-url').value.trim();
            config.supabaseKey = document.getElementById('dc-supabase-key').value.trim();
          } else if (selectedProvider === 'mongodb') {
            config.mongoUrl = document.getElementById('dc-mongodb-url').value.trim();
            config.mongoApiKey = document.getElementById('dc-mongodb-key').value.trim();
            config.mongoDatabase = document.getElementById('dc-mongodb-database').value.trim();
          }
          
          await chrome.storage.sync.set(config);
          
          // Reinitialize database
          await this.db.init();
          
          console.log('✅ Database configuration saved');
          this.showToast(`Database configured with ${selectedProvider === 'supabase' ? 'Supabase' : 'MongoDB'}!`);
          dialog.remove();
          resolve();
        });
      });
    }
    
    // Show Jira configuration dialog
    showJiraConfigDialog() {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'dc-dialog-overlay';
        dialog.style.zIndex = '10000000';
        
        dialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 550px; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="dc-dialog-header" style="padding: 1rem 1.25rem 0.75rem;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1F2937; display: flex; align-items: center; gap: 0.5rem;">
                <img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Atlassian" style="width: 20px; height: 20px;">
                Atlassian Integration
              </h3>
              <p style="margin: 0.5rem 0 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
                Connect your Jira account to create and attach tickets
              </p>
            </div>
            <div class="dc-dialog-body" style="padding: 0 1.25rem; max-height: calc(80vh - 140px); overflow-y: auto;">
              <div class="dc-form-group">
                <label class="dc-form-label">Jira URL</label>
                <input 
                  type="url" 
                  id="dc-jira-url" 
                  class="dc-form-input" 
                  placeholder="https://yourcompany.atlassian.net"
                  value="${this.jira.jiraUrl || ''}"
                >
              </div>
              
              <div class="dc-form-group">
                <label class="dc-form-label">Email</label>
                <input 
                  type="email" 
                  id="dc-jira-email" 
                  class="dc-form-input" 
                  placeholder="your.email@company.com"
                  value="${this.jira.jiraEmail || ''}"
                >
              </div>
              
              <div class="dc-form-group">
                <label class="dc-form-label">
                  API Token 
                  <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" style="font-size: 11px; color: #3B82F6; text-decoration: none;">Get Token</a>
                </label>
                <input 
                  type="password" 
                  id="dc-jira-token" 
                  class="dc-form-input" 
                  placeholder="Your Jira API Token"
                  value="${this.jira.jiraApiToken || ''}"
                >
              </div>
              
              <div class="dc-info-box" style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; font-size: 11px; line-height: 1.4;">
                <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                  <span style="font-size: 12px; margin-right: 0.25rem;">💡</span>
                  <strong style="font-size: 12px; color: #0369A1;">Setup Steps:</strong>
                </div>
                <div style="color: #0369A1; margin-left: 1rem;">
                  1. Go to your Jira instance<br>
                  2. Click your profile → Account settings<br>
                  3. Security → API tokens → Create token<br>
                  4. Copy token and paste above
                </div>
              </div>
              
              <p id="dc-jira-error" style="color: #EF4444; font-size: 11px; margin-top: 0.75rem; display: none;"></p>
              <p id="dc-jira-success" style="color: #10B981; font-size: 11px; margin-top: 0.75rem; display: none;"></p>
            </div>
            <div class="dc-dialog-footer" style="padding: 0.75rem 1.25rem 1rem; display: flex; gap: 0.5rem; border-top: 1px solid #F3F4F6;">
              <button class="dc-btn dc-btn-secondary" id="dc-jira-close" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                Cancel
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-jira-test" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                🔍 Test
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-jira-save" style="flex: 1; padding: 0.5rem; font-size: 13px;" disabled>
                Save
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const urlInput = document.getElementById('dc-jira-url');
        const emailInput = document.getElementById('dc-jira-email');
        const tokenInput = document.getElementById('dc-jira-token');
        const errorMsg = document.getElementById('dc-jira-error');
        const successMsg = document.getElementById('dc-jira-success');
        const closeBtn = document.getElementById('dc-jira-close');
        const testBtn = document.getElementById('dc-jira-test');
        const saveBtn = document.getElementById('dc-jira-save');
        
        let connectionValid = false;
        
        if (this.jira.isConfigured) {
          connectionValid = true;
          saveBtn.disabled = false;
        }
        
        closeBtn.addEventListener('click', () => {
          dialog.remove();
          resolve();
        });
        
        testBtn.addEventListener('click', async () => {
          const url = urlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
          const email = emailInput.value.trim();
          const token = tokenInput.value.trim();
          
          if (!url || !email || !token) {
            errorMsg.textContent = 'Please fill all fields';
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            return;
          }
          
          testBtn.textContent = '⏳ Testing...';
          testBtn.disabled = true;
          
          // Temporarily set credentials for testing
          this.jira.jiraUrl = url;
          this.jira.jiraEmail = email;
          this.jira.jiraApiToken = token;
          
          try {
            const result = await this.jira.testConnection();
            console.log('🔍 Jira test result:', result);
            
            if (result.success) {
              successMsg.textContent = `✅ Connected as ${result.user}`;
              successMsg.style.display = 'block';
              errorMsg.style.display = 'none';
              connectionValid = true;
              saveBtn.disabled = false;
              testBtn.textContent = '✅ Connected';
              testBtn.style.background = '#10B981';
            } else {
              errorMsg.textContent = `❌ ${result.error}`;
              errorMsg.style.display = 'block';
              successMsg.style.display = 'none';
              connectionValid = false;
              saveBtn.disabled = true;
              testBtn.textContent = '🔍 Test Connection';
              testBtn.disabled = false;
            }
          } catch (error) {
            console.error('🔍 Jira test error:', error);
            errorMsg.textContent = `❌ Connection failed: ${error.message}`;
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = '🔍 Test Connection';
            testBtn.disabled = false;
          }
        });
        
        saveBtn.addEventListener('click', async () => {
          if (!connectionValid) {
            errorMsg.textContent = 'Please test connection first';
            errorMsg.style.display = 'block';
            return;
          }
          
          const url = urlInput.value.trim().replace(/\/$/, '');
          const email = emailInput.value.trim();
          const token = tokenInput.value.trim();
          
          await chrome.storage.sync.set({ 
            jiraUrl: url, 
            jiraEmail: email,
            jiraApiToken: token
          });
          
          this.jira.jiraUrl = url;
          this.jira.jiraEmail = email;
          this.jira.jiraApiToken = token;
          this.jira.isConfigured = true;
          
          this.showToast('✅ Jira configuration saved!');
          dialog.remove();
          resolve();
        });
        
        [urlInput, emailInput, tokenInput].forEach(input => {
          input.addEventListener('input', () => {
            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = '🔍 Test Connection';
            testBtn.disabled = false;
            testBtn.style.background = '';
          });
        });
      });
    }
    
    // Show AI configuration dialog
    showAIConfigDialog() {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'dc-dialog-overlay';
        dialog.style.zIndex = '10000000';
        
        dialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 550px; max-height: 80vh; display: flex; flex-direction: column;">
            <div class="dc-dialog-header" style="padding: 1rem 1.25rem 0.75rem;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1F2937;">🤖 AI Configuration</h3>
              <p style="margin: 0.5rem 0 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
                Enable AI-powered chart analysis and insights
              </p>
            </div>
            <div class="dc-dialog-body" style="padding: 0 1.25rem; max-height: calc(80vh - 140px); overflow-y: auto;">
              <div class="dc-form-group">
                <label class="dc-form-label">AI Provider</label>
        <select id="dc-ai-provider" class="dc-form-input">
          <option value="">Select Provider</option>
          <option value="openai" ${this.ai.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
          <option value="anthropic" ${this.ai.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
          <option value="gemini" ${this.ai.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
        </select>
              </div>
              
              <div class="dc-form-group" id="dc-model-selection" style="display: none;">
                <label class="dc-form-label">Model Version</label>
                <select id="dc-ai-model" class="dc-form-input">
                  <option value="">Select Model</option>
                </select>
              </div>
              
              <div class="dc-form-group">
                <label class="dc-form-label">API Key</label>
                <input 
                  type="password" 
                  id="dc-ai-key" 
                  class="dc-form-input" 
                  placeholder="Enter your API key"
                  value="${this.ai.apiKey || ''}"
                >
              </div>
              
              <div class="dc-info-box" style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; font-size: 11px; line-height: 1.4;">
                <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                  <span style="font-size: 12px; margin-right: 0.25rem;">💡</span>
                  <strong style="font-size: 12px; color: #0369A1;">Get API Keys:</strong>
                </div>
                <div style="color: #0369A1; margin-left: 1rem;">
                  • <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #0369A1; text-decoration: none;">OpenAI</a> - GPT-5, GPT-4, GPT-4-turbo<br>
                  • <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color: #0369A1; text-decoration: none;">Anthropic</a> - Claude 4.5, 4.0, 3.5 Sonnet<br>
                  • <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #0369A1; text-decoration: none;">Google AI Studio</a> - Gemini 2.0 Flash, 1.5 Flash
                </div>
              </div>
              
              <div class="dc-info-box" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 0.75rem; margin-top: 0.5rem; font-size: 11px; line-height: 1.4;">
                <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                  <span style="font-size: 12px; margin-right: 0.25rem;">✨</span>
                  <strong style="font-size: 12px; color: #166534;">AI Features:</strong>
                </div>
                <div style="color: #166534; margin-left: 1rem;">
                  • Analyze chart data and trends<br>
                  • Generate actionable insights<br>
                  • Identify anomalies and patterns<br>
                  • Provide recommendations
                </div>
              </div>
              
              <p id="dc-ai-error" style="color: #EF4444; font-size: 11px; margin-top: 0.75rem; display: none;"></p>
              <p id="dc-ai-success" style="color: #10B981; font-size: 11px; margin-top: 0.75rem; display: none;"></p>
            </div>
            <div class="dc-dialog-footer" style="padding: 0.75rem 1.25rem 1rem; display: flex; gap: 0.5rem; border-top: 1px solid #F3F4F6;">
              <button class="dc-btn dc-btn-secondary" id="dc-ai-close" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                Cancel
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-ai-test" style="flex: 1; padding: 0.5rem; font-size: 13px;">
                🔍 Test
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-ai-save" style="flex: 1; padding: 0.5rem; font-size: 13px;" disabled>
                Save
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const providerSelect = document.getElementById('dc-ai-provider');
        const modelSelect = document.getElementById('dc-ai-model');
        const modelSelection = document.getElementById('dc-model-selection');
        const keyInput = document.getElementById('dc-ai-key');
        const errorMsg = document.getElementById('dc-ai-error');
        const successMsg = document.getElementById('dc-ai-success');
        const closeBtn = document.getElementById('dc-ai-close');
        const testBtn = document.getElementById('dc-ai-test');
        const saveBtn = document.getElementById('dc-ai-save');
        
        let connectionValid = false;
        
        // Model options for each provider
        const modelOptions = {
          'openai': [
            { value: 'gpt-5', text: 'GPT-5 (Latest)' },
            { value: 'gpt-4', text: 'GPT-4' },
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' }
          ],
          'anthropic': [
            { value: 'claude-4-5-sonnet-20241022', text: 'Claude 4.5 Sonnet (Latest)' },
            { value: 'claude-3-5-sonnet-20241022', text: 'Claude 3.5 Sonnet' },
            { value: 'claude-3-5-haiku-20241022', text: 'Claude 3.5 Haiku' }
          ],
          'gemini': [
            { value: 'gemini-2.0-flash', text: 'Gemini 2.0 Flash (Latest)' },
            { value: 'gemini-1.5-flash', text: 'Gemini 1.5 Flash' }
          ]
        };

        // Handle provider selection
        providerSelect.addEventListener('change', () => {
          const selectedProvider = providerSelect.value;
          modelSelect.innerHTML = '<option value="">Select Model</option>';
          
          if (selectedProvider && modelOptions[selectedProvider]) {
            modelSelection.style.display = 'block';
            modelOptions[selectedProvider].forEach(model => {
              const option = document.createElement('option');
              option.value = model.value;
              option.textContent = model.text;
              modelSelect.appendChild(option);
            });
          } else {
            modelSelection.style.display = 'none';
          }
        });

        // Initialize with current provider if configured
        if (this.ai.isConfigured) {
          connectionValid = true;
          saveBtn.disabled = false;
          if (this.ai.provider && modelOptions[this.ai.provider]) {
            modelSelection.style.display = 'block';
            modelOptions[this.ai.provider].forEach(model => {
              const option = document.createElement('option');
              option.value = model.value;
              option.textContent = model.text;
              if (this.ai.model === model.value) {
                option.selected = true;
              }
              modelSelect.appendChild(option);
            });
          }
        }
        
        closeBtn.addEventListener('click', () => {
          dialog.remove();
          resolve();
        });
        
        testBtn.addEventListener('click', async () => {
          const provider = providerSelect.value;
          const model = modelSelect.value;
          const key = keyInput.value.trim();
          
          if (!provider || !model || !key) {
            errorMsg.textContent = 'Please select provider, model, and enter API key';
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            return;
          }
          
          testBtn.textContent = '⏳ Testing...';
          testBtn.disabled = true;
          
          // Temporarily set for testing
          this.ai.provider = provider;
          this.ai.model = model;
          this.ai.apiKey = key;
          
          const isValid = await this.ai.testConnection();
          
          if (isValid) {
            const modelText = modelOptions[provider].find(m => m.value === model)?.text || model;
            successMsg.textContent = `✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} (${modelText}) connected successfully!`;
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';
            connectionValid = true;
            saveBtn.disabled = false;
            testBtn.textContent = '✅ Connected';
            testBtn.style.background = '#10B981';
          } else {
            errorMsg.textContent = '❌ Connection failed. Check your API key.';
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = '🔍 Test';
            testBtn.disabled = false;
          }
        });
        
        saveBtn.addEventListener('click', async () => {
          if (!connectionValid) {
            errorMsg.textContent = 'Please test connection first';
            errorMsg.style.display = 'block';
            return;
          }
          
          const provider = providerSelect.value;
          const model = modelSelect.value;
          const key = keyInput.value.trim();
          
          await chrome.storage.sync.set({ 
            aiProvider: provider,
            aiModel: model,
            aiApiKey: key
          });
          
          this.ai.provider = provider;
          this.ai.model = model;
          this.ai.apiKey = key;
          this.ai.isConfigured = true;
          
          this.showToast('✅ AI configuration saved!');
          dialog.remove();
          resolve();
        });
        
        [providerSelect, modelSelect, keyInput].forEach(input => {
          input.addEventListener('input', () => {
            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';
            connectionValid = false;
            saveBtn.disabled = true;
            testBtn.textContent = '🔍 Test';
            testBtn.disabled = false;
            testBtn.style.background = '';
          });
        });
      });
    }
  
    // Generate unique page identifier
    generatePageId() {
      const url = new URL(window.location.href);
      const pathParts = url.pathname.split('/').filter(p => p);
      let pageId;
      
      if (this.platform === 'grafana') {
        // For Grafana: extract dashboard UID from URL
        // Example: /d/000000003/graphite3a-sample-website-dashboard
        // Pattern: /d/{dashboard-uid}/{dashboard-slug}
        const dashboardIndex = pathParts.indexOf('d');
        if (dashboardIndex !== -1 && pathParts[dashboardIndex + 1]) {
          const dashboardUid = pathParts[dashboardIndex + 1];
          // Include orgId if present for multi-org Grafana instances
          const orgId = url.searchParams.get('orgId') || 'default';
          pageId = `grafana_${dashboardUid}_org${orgId}`;
        } else {
          // Fallback: use full pathname
          pageId = `grafana_${url.pathname.replace(/\//g, '_')}`;
        }
      } else if (this.platform === 'powerbi') {
      // For Power BI: extract report ID from URL
      const reportMatch = url.searchParams.get('r');
      const pageName = url.searchParams.get('pageName') || 'default';
        pageId = `powerbi_${reportMatch || 'unknown'}_${pageName}`;
      } else {
        // Fallback for unknown platforms
        pageId = `${this.platform}_${url.pathname.replace(/\//g, '_')}`;
      }
      
      console.log('📋 Generated Page ID:', pageId, 'from URL:', url.href);
      return pageId;
    }
  
    // Generate unique chart identifier based on platform
    generateChartHash(element) {
      const identifiers = [];
      
      if (this.platform === 'grafana') {
        // Grafana-specific identification
        
        // Strategy 1: data-viz-panel-key (most reliable for Grafana)
        const panelKey = element.getAttribute('data-viz-panel-key') || 
                        element.closest('[data-viz-panel-key]')?.getAttribute('data-viz-panel-key');
        if (panelKey) {
          identifiers.push(`panelkey:${panelKey}`);
          console.log('✓ Found Grafana panel key:', panelKey);
        }
        
        // Strategy 2: data-panelid
        const panelId = element.getAttribute('data-panelid') || 
                       element.closest('[data-panelid]')?.getAttribute('data-panelid');
        if (panelId) {
          identifiers.push(`panelid:${panelId}`);
        }
        
        // Strategy 3: aria-labelledby (Grafana uses unique IDs)
        const ariaLabelledBy = element.getAttribute('aria-labelledby') || 
                              element.closest('[aria-labelledby]')?.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
          identifiers.push(`arialabel:${ariaLabelledBy}`);
        }
        
        // Strategy 4: Panel title (use this for additional verification)
        const panelTitle = this.getChartLabel(element);
        if (panelTitle && panelTitle !== 'Visual Chart') {
          identifiers.push(`title:${panelTitle}`);
        }
        
        // Strategy 5: Position within grid items (fallback)
        if (identifiers.length === 0) {
          const gridItems = document.querySelectorAll('.react-grid-item, [class*="react-grid-item"], .panel-container');
          const index = Array.from(gridItems).indexOf(element);
          if (index >= 0) {
            identifiers.push(`gridpos:${index}`);
          }
        }
        
      } else {
        // Power BI-specific identification
      
      // Strategy 1: Look for visualContainerGroup with name attribute (MOST RELIABLE!)
      const containerGroup = element.closest('.visualContainerGroup') || 
                            element.querySelector('.visualContainerGroup');
      if (containerGroup) {
        const groupName = containerGroup.getAttribute('name');
        if (groupName) {
          identifiers.push(`groupname:${groupName}`);
          console.log('✓ Found visualContainerGroup name:', groupName);
        }
        
        // Also get tab-order from this element
        const tabOrder = containerGroup.getAttribute('tab-order');
        if (tabOrder) identifiers.push(`tab:${tabOrder}`);
      }
      
      // Strategy 2: Look for visualContainer with name or tab-order
      const visualContainer = element.closest('.visualContainer') || 
                             element.querySelector('.visualContainer');
      if (visualContainer && identifiers.length === 0) {
        const containerName = visualContainer.getAttribute('name');
        if (containerName) identifiers.push(`name:${containerName}`);
        
        const tabOrder = visualContainer.getAttribute('tab-order');
        if (tabOrder) identifiers.push(`tab:${tabOrder}`);
      }
      
      // Strategy 3: SVG name attribute as additional identifier
      const svg = element.querySelector('svg[name]') || element.closest('svg[name]');
      if (svg) {
        const chartName = svg.getAttribute('name');
        if (chartName) identifiers.push(`svgname:${chartName}`);
      }
      
      // Strategy 4: Visual type from class names
      const visualModern = element.querySelector('visual-modern') || element.closest('visual-modern');
      if (visualModern) {
        const visualDiv = visualModern.querySelector('[class*="visual-"]');
        if (visualDiv) {
          const visualClass = Array.from(visualDiv.classList)
            .find(c => c.startsWith('visual-'));
          if (visualClass) identifiers.push(`vtype:${visualClass}`);
        }
      }
      
      // Strategy 5: Aria label from container
      if (containerGroup || visualContainer) {
        const container = containerGroup || visualContainer;
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel && !ariaLabel.toLowerCase().includes('legend')) {
          identifiers.push(`aria:${ariaLabel}`);
        }
      }
      
      // Strategy 6: Legend items (additional fingerprint)
      const legendItems = element.querySelectorAll('.legend-item-text');
      if (legendItems.length > 0 && identifiers.length < 3) {
        const legendText = Array.from(legendItems)
          .slice(0, 3)
          .map(item => item.textContent.trim())
          .join('|');
        identifiers.push(`legend:${legendText}`);
      }
      
        // Fallback for Power BI
      if (identifiers.length === 0) {
        console.warn('⚠️ No reliable identifiers found for chart');
        // Last resort: use position
        const allContainers = document.querySelectorAll('.visualContainerGroup, .visualContainer');
        const index = Array.from(allContainers).indexOf(containerGroup || visualContainer);
        if (index >= 0) identifiers.push(`pos:${index}`);
        }
      }
      
      // Create hash from all identifiers
      const hashString = identifiers.join('||');
      const hash = this.simpleHash(hashString);
      console.log('📊 Chart Hash:', hash, 'from identifiers:', identifiers);
      return hash;
    }
  
    // Get DOM path to element
    getElementPath(element) {
      const path = [];
      let current = element;
      let depth = 0;
      
      while (current && current !== document.body && depth < 10) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) {
          selector += `#${current.id}`;
          path.unshift(selector);
          break;
        } else if (current.className && typeof current.className === 'string') {
          const classes = current.className.split(' ')
            .filter(c => c && !c.startsWith('ng-'))
            .slice(0, 2)
            .join('.');
          if (classes) selector += `.${classes}`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
        depth++;
      }
      
      return path.join('>');
    }
  
    // Simple hash function
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    }
  
    // Find chart element at coordinates
    findChartAtPosition(x, y) {
      const elements = document.elementsFromPoint(x, y);
      
      if (this.platform === 'grafana') {
        // Grafana specific selectors - very flexible
        for (const element of elements) {
          // Try multiple Grafana panel selectors
          const panel = element.closest('[data-viz-panel-key]') || 
                       element.closest('.panel-container') ||
                       element.closest('section[aria-labelledby]') ||
                       element.closest('.react-grid-item') ||
                       element.closest('[class*="react-grid-item"]') ||
                       element.closest('[data-panelid]') ||
                       element.closest('[class*="panel"]');
          
          if (panel) {
            // Verify it's actually a panel (has some visualization content)
            const hasViz = panel.querySelector('canvas') || 
                          panel.querySelector('.uplot') ||
                          panel.querySelector('svg') ||
                          panel.querySelector('[class*="viz"]') ||
                          panel.querySelector('[data-testid*="panel"]');
            
            if (hasViz || panel.querySelector('[data-testid]')) {
              console.log('✓ Found Grafana panel at click position');
              return panel;
            }
          }
        }
      } else {
      // Power BI specific selectors (based on actual structure)
      const chartSelectors = [
        '.visualContainerGroup',      // Parent group with name attribute (BEST!)
        '.visualContainer',           // Main visual container
        'visual-modern',              // Visual component
        '.cartesianChart',            // SVG charts
        'svg[name]',                  // Named SVG elements
        '.visual'                     // Visual wrapper
      ];
      
      for (const element of elements) {
        // First priority: visualContainerGroup (has the stable name attribute)
        const containerGroup = element.closest('.visualContainerGroup');
        if (containerGroup) {
          console.log('✓ Found visualContainerGroup at click position');
          return containerGroup;
        }
        
        // Second priority: visualContainer
        const container = element.closest('.visualContainer');
        if (container) {
          console.log('✓ Found visualContainer at click position');
          return container;
        }
        
        // Try other selectors
        for (const selector of chartSelectors) {
          const chart = element.closest(selector);
          if (chart) {
            // Try to return the parent container
            const parent = chart.closest('.visualContainerGroup') || 
                          chart.closest('.visualContainer');
            if (parent) return parent;
            return chart;
            }
          }
        }
      }
      
      console.warn('⚠️ No chart found at click position');
      return null;
    }
  
    // Get human-readable chart name
    getChartLabel(element) {
      if (this.platform === 'grafana') {
        // Grafana: Look for panel title - very flexible
        // Priority 1: Any h1-h6 with title attribute
        const titleElements = element.querySelectorAll('h1[title], h2[title], h3[title], h4[title], h5[title], h6[title]');
        if (titleElements.length > 0) {
          const titleText = titleElements[0].getAttribute('title') || titleElements[0].textContent.trim();
          if (titleText) return titleText;
        }
        
        // Priority 2: Panel title classes (various Grafana versions)
        const titleSelectors = [
          '.panel-title',
          '[class*="panel-title"]',
          '[class*="PanelHeader"]',
          '[data-testid*="panel-header"]'
        ];
        
        for (const selector of titleSelectors) {
          const titleEl = element.querySelector(selector);
          if (titleEl) {
            const text = titleEl.textContent.trim();
            if (text && text.length < 100) return text; // Reasonable length check
          }
        }
        
        // Priority 3: data-testid with panel name
        const testId = element.getAttribute('data-testid');
        if (testId && testId.includes('Panel')) {
          const match = testId.match(/Panel\s+(?:header\s+)?(.+)/i);
          if (match) return match[1];
        }
        
        // Priority 4: Search for testid in descendants
        const testIdEl = element.querySelector('[data-testid*="Panel"]');
        if (testIdEl) {
          const tid = testIdEl.getAttribute('data-testid');
          if (tid) {
            const match = tid.match(/Panel\s+(?:header\s+)?(.+)/i);
            if (match) return match[1];
          }
        }
        
        // Priority 5: aria-labelledby
        const ariaLabelId = element.getAttribute('aria-labelledby');
        if (ariaLabelId) {
          const labelEl = document.getElementById(ariaLabelId);
          if (labelEl && labelEl.textContent.trim()) {
            return labelEl.textContent.trim();
          }
        }
        
        // Priority 6: Any heading element
        const anyHeading = element.querySelector('h1, h2, h3, h4');
        if (anyHeading) {
          const text = anyHeading.textContent.trim();
          if (text && text.length < 100) return text;
        }
        
        return 'Grafana Panel';
      } else {
        // Power BI: Original logic
        // Priority 1: Look for chart title in content div with ui-role-button-text class
        const titleDiv = element.querySelector('.content.text.ui-role-button-text') || 
                         element.closest('.visualContainer')?.querySelector('.content.text.ui-role-button-text');
        if (titleDiv && titleDiv.textContent.trim()) {
          return titleDiv.textContent.trim();
        }
        
        // Priority 2: Get from visualContainerGroup aria-label
      const containerGroup = element.closest('.visualContainerGroup') || 
                            element.querySelector('.visualContainerGroup');
      if (containerGroup) {
        const ariaLabel = containerGroup.getAttribute('aria-label');
        // aria-label might say "3 items" or similar, check if it's useful
        if (ariaLabel && !ariaLabel.match(/^\d+\s+item/i)) {
          return ariaLabel;
        }
      }
      
        // Priority 3: SVG name (chart type)
      const svg = element.querySelector('svg[name]') || element.closest('svg[name]');
      if (svg) {
        const name = svg.getAttribute('name');
        if (name) return name;
      }
      
        // Priority 4: Visual type from class
      const visualDiv = element.querySelector('[class*="visual-"]');
      if (visualDiv) {
        const visualClass = Array.from(visualDiv.classList)
          .find(c => c.startsWith('visual-'));
        if (visualClass) {
          return visualClass
            .replace('visual-', '')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^./, str => str.toUpperCase());
        }
      }
      
        // Priority 5: First legend item
      const firstLegend = element.querySelector('.legend-item-text');
      if (firstLegend) {
        return `Chart: ${firstLegend.textContent.trim()}`;
      }
      
      return 'Visual Chart';
      }
    }
  
    // Inject sidebar
    injectSidebar() {
      const sidebar = document.createElement('div');
      sidebar.id = 'stickr-sidebar';
      sidebar.className = 'dc-sidebar open';
      
      sidebar.innerHTML = `
        <div class="dc-sidebar-header">
          <div class="dc-header-top">
            <div class="dc-header-left">
              <button class="dc-toggle-btn" title="Collapse Sidebar">
                <img src="${chrome.runtime.getURL('/icons/cognito-16.png')}" alt="Collapse" class="dc-toggle-icon">
              </button>
              <h3>Cognito AI</h3>
            </div>
            <div class="dc-header-right">
              <button class="dc-config-btn" id="dc-config-menu" title="Settings & Integrations">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="dc-sidebar-content">
          <div class="dc-toolbar-unified">
            <div class="dc-toolbar-left">
              <div class="dc-toggle-control">
                <span class="dc-toggle-label">Show Bubbles</span>
                <label class="dc-switch">
                  <input type="checkbox" id="dc-toggle-bubbles" checked>
                  <span class="dc-slider"></span>
                </label>
              </div>
              <select id="dc-comment-filter" class="dc-filter-select">
                <option value="all">📋 All</option>
                <option value="bubble">📍 Bubbles</option>
                <option value="page">📝 Notes</option>
              </select>
            </div>
            <div class="dc-toolbar-right">
              <button class="dc-btn dc-btn-primary" id="dc-add-bubble" title="Add context to the current chart">
                📍
            </button>
              <button class="dc-btn dc-btn-secondary" id="dc-clear-all" title="Clear all the context for this page">
                🗑️
            </button>
          </div>
          </div>
          
          <div class="dc-comments-list" id="dc-comments-list">
            <p class="dc-empty-state">No comments yet. Add one below!</p>
          </div>
        </div>
        <div class="dc-sidebar-input-area">
          <textarea id="dc-quick-note" placeholder="Add a quick note..."></textarea>
          <div class="dc-sidebar-input-controls">
            <select id="dc-note-type">
              <option value="comment">💬 Comment</option>
              <option value="note">📝 Note</option>
              <option value="rca">🔍 RCA</option>
              <option value="reference">📚 Reference</option>
            </select>
            <button id="dc-add-quick-note">Add</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(sidebar);
      this.sidebar = sidebar;
      
      // Create expand button element
      this.expandButton = document.createElement('div');
      this.expandButton.id = 'dc-expand-button';
      this.expandButton.className = 'dc-expand-button';
      this.expandButton.innerHTML = `<img src="${chrome.runtime.getURL('/icons/cognito-16.png')}" alt="Expand" class="dc-toggle-icon dc-toggle-icon-flipped">`;
      this.expandButton.title = 'Expand Sidebar';
      document.body.appendChild(this.expandButton);
      
      // Toggle button
      sidebar.querySelector('.dc-toggle-btn').addEventListener('click', () => {
        this.toggleSidebar();
      });
      
      // Expand button click handler
      this.expandButton.addEventListener('click', () => {
        this.toggleSidebar();
      });
      
      // Add bubble comment button
      document.getElementById('dc-add-bubble').addEventListener('click', () => {
        this.startAddingBubbleComment();
      });
      
      // Add quick note button
      document.getElementById('dc-add-quick-note').addEventListener('click', () => {
        this.addQuickNote();
      });
      
      // Toggle bubbles visibility switch
      document.getElementById('dc-toggle-bubbles').addEventListener('change', (e) => {
        this.bubblesHidden = !e.target.checked;
        this.toggleBubblesVisibility();
      });
      
      // Clear all notes button
      document.getElementById('dc-clear-all').addEventListener('click', () => {
        this.clearAllNotes();
      });
      
      // Config menu button
      document.getElementById('dc-config-menu').addEventListener('click', () => {
        this.showConfigMenu();
      });
      
      // Filter dropdown
      document.getElementById('dc-comment-filter').addEventListener('change', (e) => {
        this.currentFilter = e.target.value;
        this.renderComments();
      });
      
      // Initialize filter
      this.currentFilter = 'all';
      
      // Handle Enter key in textarea
      document.getElementById('dc-quick-note').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          this.addQuickNote();
        }
      });
      
      // Restore sidebar state
      const isCollapsed = localStorage.getItem('stickr-sidebar-collapsed') === 'true';
      if (isCollapsed) {
        this.sidebar.classList.add('dc-collapsed');
        this.sidebar.classList.remove('open');
        // Show expand button
        if (this.expandButton) this.expandButton.style.display = 'flex';
      } else {
        // Hide expand button
        if (this.expandButton) this.expandButton.style.display = 'none';
      }
    }
  
    // Toggle sidebar
    toggleSidebar() {
      const isCollapsed = this.sidebar.classList.contains('dc-collapsed');
      
      if (isCollapsed) {
        this.sidebar.classList.remove('dc-collapsed');
        this.sidebar.classList.add('open');
        // Hide expand button
        if (this.expandButton) this.expandButton.style.display = 'none';
        // Store state
        localStorage.setItem('stickr-sidebar-collapsed', 'false');
      } else {
        this.sidebar.classList.add('dc-collapsed');
        this.sidebar.classList.remove('open');
        // Show expand button
        if (this.expandButton) this.expandButton.style.display = 'flex';
        // Store state
        localStorage.setItem('stickr-sidebar-collapsed', 'true');
      }
    }
    
    // Add quick note
    addQuickNote() {
      const textarea = document.getElementById('dc-quick-note');
      const typeSelect = document.getElementById('dc-note-type');
      const text = textarea.value.trim();
      
      if (!text) {
        alert('Please enter a note');
        return;
      }
      
      const comment = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'page',
        text,
        commentType: typeSelect.value,
        timestamp: new Date().toISOString(),
        author: this.username || 'Anonymous',
        pageId: this.currentPageId,
        parentId: null,
        replies: []
      };
      
      this.saveComment(comment);
      textarea.value = '';
      
      // Show success message
      this.showToast('✅ Note added successfully!');
    }
  
    // Setup event listeners
    setupEventListeners() {
      // Handle clicks when adding bubble comment
      document.addEventListener('click', (e) => {
        if (this.isAddingComment) {
          e.preventDefault();
          e.stopPropagation();
          this.handleBubbleClick(e);
        }
      }, true);
      
      // Global click listener to close bubbles when clicking outside
      document.addEventListener('click', (e) => {
        // Check if click is outside all bubbles
        const clickedBubble = e.target.closest('.dc-bubble-pin');
        if (!clickedBubble) {
          // Close all active bubbles
          document.querySelectorAll('.dc-bubble-pin.active').forEach(bubble => {
            bubble.classList.remove('active');
          });
        }
      });
  
      // Listen for storage changes (multi-user sync)
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.comments) {
          this.comments = changes.comments.newValue || [];
          this.renderComments();
          this.renderBubbles();
        }
      });
  
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleSidebar') {
          this.toggleSidebar();
        }
      });
      
      // Listen for URL changes (for SPAs like Grafana)
      let lastUrl = location.href;
      let lastPanelCount = 0;
      
      const urlObserver = new MutationObserver(() => {
        const currentUrl = location.href;
        const urlChanged = currentUrl !== lastUrl;
        
        if (urlChanged) {
          console.log('🔄 URL changed from', lastUrl, 'to', currentUrl);
          lastUrl = currentUrl;
        }
        
        // For Grafana: also detect when panels change (tab/variable changes)
        if (this.platform === 'grafana') {
          const currentPanelCount = document.querySelectorAll('[data-viz-panel-key], .panel-container').length;
          const panelsChanged = currentPanelCount !== lastPanelCount;
          
          if (panelsChanged && lastPanelCount > 0) {
            console.log('📊 Panels changed (tab/variable change detected):', lastPanelCount, '→', currentPanelCount);
            lastPanelCount = currentPanelCount;
            
            // Clear all bubbles immediately
            document.querySelectorAll('.dc-bubble-pin').forEach(bubble => bubble.remove());
            
            // Re-render for the new panels
            this.renderComments();
            setTimeout(() => {
              this.renderBubbles();
            }, 500);
            return;
          }
          
          lastPanelCount = currentPanelCount;
        }
        
        // Handle actual page/URL changes
        if (urlChanged) {
          const newPageId = this.generatePageId();
          if (newPageId !== this.currentPageId) {
            console.log('📄 Page changed from', this.currentPageId, 'to', newPageId);
            this.currentPageId = newPageId;
            
            // Clear all bubbles immediately for clean transition
            document.querySelectorAll('.dc-bubble-pin').forEach(bubble => bubble.remove());
            
            // Re-render everything for the new page
            this.renderComments();
            
            // Delay bubble render to let new page load
            setTimeout(() => {
              this.renderBubbles();
            }, 500);
          }
        }
      });
      
      urlObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also listen for popstate (back/forward navigation)
      window.addEventListener('popstate', () => {
        const newPageId = this.generatePageId();
        if (newPageId !== this.currentPageId) {
          console.log('📄 Page changed (popstate) to', newPageId);
          this.currentPageId = newPageId;
          
          // Clear all bubbles immediately
          document.querySelectorAll('.dc-bubble-pin').forEach(bubble => bubble.remove());
          
          this.renderComments();
          setTimeout(() => {
            this.renderBubbles();
          }, 500);
        }
      });
    }
  
    // Setup observers for automatic bubble repositioning
    setupBubbleObservers() {
      // ResizeObserver: Reposition bubbles when chart elements resize or move
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const chartElement = entry.target;
          const chartHash = this.generateChartHash(chartElement);
          const data = this.bubbleMap.get(chartHash);
          
          if (data && data.chartElement === chartElement) {
            // Reposition the bubble for this chart
            this.positionBubble(data.bubble, chartElement);
          }
        }
      });
      
      // For Grafana: Use periodic check instead of MutationObserver
      // Grafana's DOM manipulation is too aggressive and breaks observers
      if (this.platform === 'grafana') {
        console.log('🔄 Using periodic check for Grafana (every 2 seconds)');
        this.grafanaCheckInterval = setInterval(() => {
          if (this.comments.length > 0 && document.querySelectorAll('[data-viz-panel-key], .panel-container').length > 0) {
            console.log('🔍 Periodic check: ensuring bubbles are visible');
            this.ensureBubblesVisible();
          }
        }, 2000);
      } else {
        // For Power BI: Use MutationObserver as normal
        this.mutationObserver = new MutationObserver((mutations) => {
          // Check if any chart-specific elements were added/removed
          const chartSelectors = '.visualContainerGroup, .visualContainer';
          
          const hasChartChange = mutations.some(mutation => {
            if (mutation.type !== 'childList') return false;
            
            const addedHasChart = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType !== 1) return false;
              return node.matches?.(chartSelectors) || node.querySelector?.(chartSelectors);
            });
            
            const removedHasChart = Array.from(mutation.removedNodes).some(node => {
              if (node.nodeType !== 1) return false;
              return node.matches?.(chartSelectors) || node.querySelector?.(chartSelectors);
            });
            
            return addedHasChart || removedHasChart;
          });
          
          if (!hasChartChange) return;
          
          console.log('📊 Chart elements changed, re-rendering bubbles');
          
        clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => {
          if (this.comments.length > 0) {
            this.renderBubbles();
          }
          }, 300);
      });
  
        this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      }
      
      // Window resize: Reposition all bubbles
      window.addEventListener('resize', () => {
        for (const [chartHash, data] of this.bubbleMap.entries()) {
          if (document.contains(data.chartElement)) {
            this.positionBubble(data.bubble, data.chartElement);
          }
        }
      });
      
      // Scroll: Reposition all bubbles and handle visibility
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          console.log('📜 Scroll event - checking bubbles, count:', this.bubbleMap.size);
          
          for (const [chartHash, data] of this.bubbleMap.entries()) {
            if (document.contains(data.chartElement)) {
              // Check if chart is visible in viewport
              const rect = data.chartElement.getBoundingClientRect();
              const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
              
              if (isVisible) {
                // Chart is visible, show and position bubble
                if (!this.bubblesHidden) {
                  data.bubble.style.display = '';
                }
                this.positionBubble(data.bubble, data.chartElement);
              } else {
                // Chart is off-screen, hide bubble (but don't remove it)
                data.bubble.style.display = 'none';
              }
            } else {
              console.warn('⚠️ Chart element not in DOM for hash:', chartHash);
            }
          }
        }, 50); // Debounce scroll events
      }, { passive: true });
    }
    
    // Observe DOM changes to re-render bubbles (legacy - kept for compatibility)
    observeDOMChanges() {
      // This is now handled by setupBubbleObservers
      this.setupBubbleObservers();
    }
    
    // Watch for Grafana filter changes (URL and DOM)
    watchForFilterChanges() {
      if (this.platform !== 'grafana') return;
      
      console.log('📅 Setting up filter change detection for Grafana');
      
      // Watch for URL changes (query parameter changes)
      let lastFilterState = this.currentFilterState;
      
      const checkFilterChanges = () => {
        const newFilterState = this.getGrafanaTimeFilters();
        
        if (!this.filtersMatch(lastFilterState, newFilterState)) {
          console.log('📅 Filter change detected!');
          console.log('   Old:', lastFilterState);
          console.log('   New:', newFilterState);
          
          this.currentFilterState = newFilterState;
          lastFilterState = newFilterState;
          
          // Re-render bubbles with new filter context
          this.renderBubbles();
          
          // Show toast notification about filter change
          const filterDesc = newFilterState 
            ? `${newFilterState.from || 'now'} to ${newFilterState.to || 'now'}` 
            : 'No filters';
          this.showToast(`📅 Time range changed: ${filterDesc}`, 'info');
        }
      };
      
      // Check on URL changes
      const urlObserver = new MutationObserver(() => {
        checkFilterChanges();
      });
      
      urlObserver.observe(document.head, {
        childList: true,
        subtree: true
      });
      
      // Also check periodically (in case filters change without URL update)
      setInterval(checkFilterChanges, 3000);
      
      // Also watch for clicks on time picker button
      document.addEventListener('click', (e) => {
        const timePickerButton = e.target.closest('[aria-label*="Time range"]') ||
                                 e.target.closest('[data-testid="data-testid Time range picker"]') ||
                                 e.target.closest('button[aria-controls*="TimePickerContent"]');
        
        if (timePickerButton) {
          // User clicked time picker, check for changes after a delay
          setTimeout(checkFilterChanges, 1000);
        }
      }, true);
    }
  
    // Start adding bubble comment mode
    startAddingBubbleComment() {
      this.isAddingComment = true;
      document.body.style.cursor = 'crosshair';
      
      // Show overlay
      const overlay = document.createElement('div');
      overlay.className = 'dc-click-overlay';
      overlay.innerHTML = '<div class="dc-overlay-text">🎯 Click on any chart to add a comment<br><small style="opacity: 0.7;">Press ESC to cancel</small></div>';
      document.body.appendChild(overlay);
      
      // Cancel on Escape
      const cancelHandler = (e) => {
        if (e.key === 'Escape') {
          this.cancelAddingComment();
          document.removeEventListener('keydown', cancelHandler);
        }
      };
      document.addEventListener('keydown', cancelHandler);
    }
  
    cancelAddingComment() {
      this.isAddingComment = false;
      document.body.style.cursor = 'default';
      const overlay = document.querySelector('.dc-click-overlay');
      if (overlay) overlay.remove();
    }
  
    // Handle bubble click
    handleBubbleClick(e) {
      const chart = this.findChartAtPosition(e.clientX, e.clientY);
      
      if (!chart) {
        alert('⚠️ Please click directly on a chart visualization\n\nTip: Click on the chart area, not on empty space.');
        return;
      }
  
      this.cancelAddingComment();
      
      const chartHash = this.generateChartHash(chart);
      const chartRect = chart.getBoundingClientRect();
      
      // Calculate relative position within chart
      const relativeX = ((e.clientX - chartRect.left) / chartRect.width) * 100;
      const relativeY = ((e.clientY - chartRect.top) / chartRect.height) * 100;
      
      // Get chart context
      const chartLabel = this.getChartLabel(chart);
      
      console.log('Creating comment for chart:', chartLabel, 'Hash:', chartHash);
      
      this.showCommentDialog({
        type: 'bubble',
        chartHash,
        chartLabel,
        relativeX,
        relativeY,
        pageId: this.currentPageId
      });
    }
  
    // Show comment dialog
    showCommentDialog(commentData) {
      const dialog = document.createElement('div');
      dialog.className = 'dc-dialog-overlay';
      
      dialog.innerHTML = `
        <div class="dc-dialog">
          <div class="dc-dialog-header">
            <h3>${commentData.type === 'bubble' ? '📍 Add Bubble Comment' : '📝 Add Page Note'}</h3>
            <button class="dc-dialog-close">×</button>
          </div>
          <div class="dc-dialog-body">
            ${commentData.chartLabel ? `<p class="dc-chart-label">📊 Chart: ${commentData.chartLabel}</p>` : ''}
            <textarea class="dc-comment-input" placeholder="Enter your comment, notes, or RCA...
  
  Examples:
  • Why did the metric spike?
  • Action items from meeting
  • Link to related document"></textarea>
            <input type="text" class="dc-link-input" placeholder="🔗 Add reference link (optional)">
            <select class="dc-type-select">
              <option value="comment">💬 Comment</option>
              <option value="note">📝 Note</option>
              <option value="rca">🔍 RCA (Root Cause Analysis)</option>
              <option value="reference">📚 Reference</option>
            </select>
          </div>
          <div class="dc-dialog-footer" style="display: flex; gap: 0.5rem;">
            <button class="dc-btn dc-btn-secondary dc-cancel" style="flex: 1;">
              Cancel
            </button>
            <button class="dc-btn dc-btn-primary dc-save" style="flex: 1;">
              💾 Save Comment
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const textarea = dialog.querySelector('.dc-comment-input');
      const linkInput = dialog.querySelector('.dc-link-input');
      const typeSelect = dialog.querySelector('.dc-type-select');
      
      textarea.focus();
      
      // Close button
      dialog.querySelector('.dc-dialog-close').addEventListener('click', () => {
        dialog.remove();
      });
      
      // Cancel button
      dialog.querySelector('.dc-cancel').addEventListener('click', () => {
        dialog.remove();
      });
      
      // Click outside to close
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove();
        }
      });
      
      // Save button
      dialog.querySelector('.dc-save').addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) {
          alert('Please enter a comment');
          return;
        }
        
        const comment = {
          ...commentData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text,
          link: linkInput.value.trim(),
          commentType: typeSelect.value,
          timestamp: new Date().toISOString(),
          author: this.username || 'Anonymous',
          parentId: null,
          replies: []
        };
        
        // For bubble comments on Grafana, store the current filter state
        if (commentData.type === 'bubble' && this.platform === 'grafana') {
          comment.filterState = this.currentFilterState;
          console.log('💾 Saving bubble comment with filter state:', comment.filterState);
        }
        
        this.saveComment(comment);
        dialog.remove();
        
        // Show success message
        this.showToast('✅ Comment saved successfully!');
      });
    }
  
    // Show toast notification
    showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = 'dc-toast';
      if (type === 'error') {
        toast.style.background = '#EF4444 !important';
      } else if (type === 'info') {
        toast.style.background = '#3B82F6 !important';
      }
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('dc-toast-show'), 100);
      setTimeout(() => {
        toast.classList.remove('dc-toast-show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  
    // Show reply dialog
    showReplyDialog(parentId) {
      const parentComment = this.comments.find(c => c.id === parentId);
      if (!parentComment) return;
      
      const dialog = document.createElement('div');
      dialog.className = 'dc-dialog-overlay';
      dialog.innerHTML = `
        <div class="dc-dialog dc-reply-dialog">
          <h3>💬 Reply to Note</h3>
          <div class="dc-reply-context">
            <div class="dc-reply-context-label">Replying to:</div>
            <div class="dc-reply-context-text">${this.escapeHtml(parentComment.text)}</div>
          </div>
          <textarea class="dc-textarea" placeholder="Write your reply..." rows="4"></textarea>
          <div class="dc-form-row">
            <label>Type:</label>
            <select class="dc-select" id="dc-reply-type">
              <option value="comment">💬 Comment</option>
              <option value="note">📝 Note</option>
              <option value="rca">🔍 RCA</option>
              <option value="reference">📚 Reference</option>
            </select>
          </div>
          <div class="dc-form-row">
            <label>Link (optional):</label>
            <input type="url" class="dc-input" id="dc-reply-link" placeholder="https://..." />
          </div>
          <div class="dc-dialog-footer" style="display: flex; gap: 0.5rem;">
            <button class="dc-btn dc-btn-secondary dc-cancel" style="flex: 1;">
              Cancel
            </button>
            <button class="dc-btn dc-btn-primary dc-save-reply" style="flex: 1;">
              Reply
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      const textarea = dialog.querySelector('.dc-textarea');
      const typeSelect = dialog.querySelector('#dc-reply-type');
      const linkInput = dialog.querySelector('#dc-reply-link');
      
      textarea.focus();
      
      // Cancel button
      dialog.querySelector('.dc-cancel').addEventListener('click', () => {
        dialog.remove();
      });
      
      // Click outside to close
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          dialog.remove();
        }
      });
      
      // Save reply button
      dialog.querySelector('.dc-save-reply').addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) {
          alert('Please enter a reply');
          return;
        }
        
        const reply = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: parentComment.type, // Inherit type from parent
          text,
          link: linkInput.value.trim(),
          commentType: typeSelect.value,
          timestamp: new Date().toISOString(),
          author: this.username || 'Anonymous',
          pageId: this.currentPageId,
          parentId: parentId,
          replies: [],
          chartHash: parentComment.chartHash, // Inherit chart hash for bubble comments
          chartLabel: parentComment.chartLabel,
          x: parentComment.x,
          y: parentComment.y
        };
        
        this.saveComment(reply);
        dialog.remove();
        
        this.showToast('✅ Reply added successfully!');
      });
    }
  
    // Save comment
    async saveComment(comment) {
      if (this.db.isConfigured) {
        // Save to database
        const saved = await this.db.saveComment(comment);
        if (saved) {
      this.comments.push(comment);
          console.log('Comment saved to database');
        } else {
          console.error('Failed to save comment to database');
          this.showToast('Failed to save comment', 'error');
          return;
        }
      } else {
        // Fallback to local storage
        this.comments.push(comment);
      await chrome.storage.sync.set({ comments: this.comments });
        console.log('Comment saved to local storage');
      }
      
      this.renderComments();
      if (comment.type === 'bubble') {
        // Re-render bubbles (will update or create as needed)
        this.renderBubbles();
      }
    }
  
    // Load comments
    async loadComments() {
      if (this.db.isConfigured) {
        // Load from database (all comments, we filter by pageId in rendering)
        this.comments = await this.db.loadComments();
        console.log('Loaded comments from database:', this.comments.length);
        // Debug: Check for Jira tickets
        const commentsWithJira = this.comments.filter(c => c.jiraTicket);
        console.log('Comments with Jira tickets:', commentsWithJira.length, commentsWithJira);
      } else {
        // Fallback to local storage
      const result = await chrome.storage.sync.get('comments');
      this.comments = result.comments || [];
        console.log('Loaded comments from local storage:', this.comments.length);
        // Debug: Check for Jira tickets
        const commentsWithJira = this.comments.filter(c => c.jiraTicket);
        console.log('Comments with Jira tickets:', commentsWithJira.length, commentsWithJira);
      }
      
      this.renderComments();
      this.renderBubbles();
    }
  
    // Render comments in sidebar
    renderComments() {
      const container = document.getElementById('dc-comments-list');
      let pageComments = this.comments.filter(c => c.pageId === this.currentPageId);
      
      // Apply filter
      if (this.currentFilter === 'bubble') {
        pageComments = pageComments.filter(c => c.type === 'bubble');
      } else if (this.currentFilter === 'page') {
        pageComments = pageComments.filter(c => c.type === 'page');
      }
      
      if (pageComments.length === 0) {
        const filterText = this.currentFilter === 'bubble' ? 'bubble comments' : 
                          this.currentFilter === 'page' ? 'page notes' : 'comments';
        container.innerHTML = `<p class="dc-empty-state">No ${filterText} yet. Click above to add one!</p>`;
        return;
      }
      
      const typeEmojis = {
        comment: '💬',
        note: '📝',
        rca: '🔍',
        reference: '📚'
      };
      
      // Separate top-level comments and replies
      const topLevelComments = pageComments.filter(c => !c.parentId);
      const repliesMap = {};
      
      pageComments.filter(c => c.parentId).forEach(reply => {
        if (!repliesMap[reply.parentId]) {
          repliesMap[reply.parentId] = [];
        }
        repliesMap[reply.parentId].push(reply);
      });
      
      // Render comments with replies
      const renderComment = (comment, level = 0) => {
        const indent = level * 20; // 20px per level
        const replies = repliesMap[comment.id] || [];
        
        const isBubble = comment.type === 'bubble';
        const cardClass = isBubble ? 'dc-comment-card dc-comment-bubble' : 'dc-comment-card dc-comment-page';
        
        // Generate filter state badge for Grafana bubble comments
        let filterBadge = '';
        if (isBubble && comment.filterState && this.platform === 'grafana') {
          const filterText = comment.filterState.from && comment.filterState.to 
            ? `${comment.filterState.from} to ${comment.filterState.to}` 
            : 'Unknown filter';
          filterBadge = `<div class="dc-filter-badge" title="Time range: ${filterText}">📅 ${comment.filterState.from || 'N/A'}</div>`;
        }
        
        return `
          <div class="${cardClass}" data-comment-id="${comment.id}" style="margin-left: ${indent}px; position: relative;">
            <div class="dc-comment-content">
          <div class="dc-comment-header">
                <span class="dc-comment-type">${typeEmojis[comment.commentType] || '💬'} ${comment.commentType || 'comment'}</span>
            <span class="dc-comment-date">${this.formatDate(comment.timestamp)}</span>
          </div>
          ${comment.chartLabel ? `<div class="dc-comment-chart">📊 ${this.escapeHtml(comment.chartLabel)}</div>` : ''}
              ${filterBadge}
          <div class="dc-comment-text">${this.escapeHtml(comment.text)}</div>
          ${comment.link ? `<a href="${this.escapeHtml(comment.link)}" class="dc-comment-link" target="_blank">🔗 View Reference</a>` : ''}
              ${comment.jiraTicket ? `<a href="${this.escapeHtml(comment.jiraTicket.url || '#')}" class="dc-jira-link" target="_blank"><img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Jira" style="width: 14px; height: 14px; vertical-align: middle;"> ${this.escapeHtml(comment.jiraTicket.key || 'Unknown')}</a>` : ''}
              ${comment.jiraTicket ? console.log('🔍 Rendering Jira ticket for comment:', comment.id, 'jiraTicket:', comment.jiraTicket, 'url:', comment.jiraTicket.url, 'key:', comment.jiraTicket.key) : ''}
          <div class="dc-comment-footer">
            <span class="dc-comment-author">👤 ${this.escapeHtml(comment.author)}</span>
              </div>
            </div>
            <div class="dc-comment-actions">
              <button class="dc-btn-icon dc-reply" data-id="${comment.id}" title="Reply">💬</button>
              ${this.jira.isConfigured && !comment.jiraTicket ? `<button class="dc-btn-icon dc-create-jira" data-id="${comment.id}" title="Create Jira Ticket"><img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Jira" style="width: 16px; height: 16px;"></button>` : ''}
              ${this.ai.isConfigured && isBubble ? `<button class="dc-btn-icon dc-ai-analyze" data-id="${comment.id}" title="AI Analyze Chart">${this.getAIProviderIcon()}</button>` : ''}
            <button class="dc-btn-icon dc-delete" data-id="${comment.id}" title="Delete">🗑️</button>
          </div>
        </div>
          ${replies.map(reply => renderComment(reply, level + 1)).join('')}
        `;
      };
      
      container.innerHTML = topLevelComments.map(comment => renderComment(comment)).join('');
      
      // Reply buttons
      container.querySelectorAll('.dc-reply').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          this.showReplyDialog(id);
        });
      });
      
      // Delete buttons
      container.querySelectorAll('.dc-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          this.deleteComment(id);
        });
      });
      
      // Create Jira Ticket buttons
      container.querySelectorAll('.dc-create-jira').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          this.showJiraTicketDialog(id);
        });
      });
      
      // AI Analyze buttons (in sidebar comments)
      container.querySelectorAll('.dc-ai-analyze').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          this.analyzeCommentWithAI(id);
        });
      });
    }
  
    // Format date
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    }

    // Get AI provider icon
    getAIProviderIcon() {
      const providerIcons = {
        'openai': `<img src="${chrome.runtime.getURL('icons/openai-16.png')}" alt="OpenAI" style="width: 16px; height: 16px;">`,
        'anthropic': `<img src="${chrome.runtime.getURL('icons/anthropic-16.png')}" alt="Anthropic" style="width: 16px; height: 16px;">`, 
        'gemini': `<img src="${chrome.runtime.getURL('icons/gemini-16.png')}" alt="Gemini" style="width: 16px; height: 16px;">`
      };
      const currentProvider = this.ai.provider || 'openai';
      return providerIcons[currentProvider] || `<img src="${chrome.runtime.getURL('icons/openai-16.png')}" alt="OpenAI" style="width: 16px; height: 16px;">`;
    }
  
    // Ensure all bubbles that should be visible are actually visible (Grafana specific)
    ensureBubblesVisible() {
      let bubbleComments = this.comments.filter(
        c => c.type === 'bubble' && c.pageId === this.currentPageId
      );
      
      // For Grafana: filter by current filter state
      if (this.platform === 'grafana' && this.currentFilterState) {
        bubbleComments = bubbleComments.filter(comment => {
          return this.filtersMatch(comment.filterState, this.currentFilterState);
        });
      }
      
      // Group comments by chartHash
      const commentsByChart = {};
      bubbleComments.forEach(comment => {
        if (!commentsByChart[comment.chartHash]) {
          commentsByChart[comment.chartHash] = [];
        }
        commentsByChart[comment.chartHash].push(comment);
      });
      
      // Find all chart elements currently on page
      const chartSelectors = '[data-viz-panel-key], .panel-container, section[aria-labelledby], .react-grid-item, [class*="react-grid-item"], [data-panelid], [class*="panel-"]';
      const charts = document.querySelectorAll(chartSelectors);
      
      // For each chart with comments, ensure bubble exists
      charts.forEach(chart => {
        const chartHash = this.generateChartHash(chart);
        const comments = commentsByChart[chartHash];
        
        if (comments && comments.length > 0) {
          const existing = this.bubbleMap.get(chartHash);
          
          if (!existing) {
            // Bubble missing! Create it
            console.log('✨ Creating missing bubble for hash:', chartHash);
            this.createChartBubble(chart, comments, chartHash);
          } else if (!document.contains(existing.bubble)) {
            // Bubble was removed from DOM! Re-create it
            console.log('♻️ Re-creating removed bubble for hash:', chartHash);
            this.createChartBubble(chart, comments, chartHash);
          } else {
            // Bubble exists, ensure it's visible and positioned correctly
            if (!this.bubblesHidden) {
              const rect = chart.getBoundingClientRect();
              const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
              
              if (isVisible) {
                existing.bubble.style.display = '';
                this.positionBubble(existing.bubble, chart);
                
                // Update element reference if changed
                if (existing.chartElement !== chart) {
                  existing.chartElement = chart;
                }
              }
            }
          }
        }
      });
    }
  
    // Render bubble comments on charts
    renderBubbles() {
      let bubbleComments = this.comments.filter(
        c => c.type === 'bubble' && c.pageId === this.currentPageId
      );
      
      // For Grafana: filter by current filter state
      if (this.platform === 'grafana' && this.currentFilterState) {
        bubbleComments = bubbleComments.filter(comment => {
          // Show comment if it matches current filter state
          const matches = this.filtersMatch(comment.filterState, this.currentFilterState);
          if (!matches) {
            console.log('🚫 Hiding comment (filter mismatch):', {
              comment: comment.text.substring(0, 30) + '...',
              commentFilter: comment.filterState,
              currentFilter: this.currentFilterState
            });
          }
          return matches;
        });
      }
      
      console.log('🎯 Rendering', bubbleComments.length, 'bubble comments for page:', this.currentPageId);
      
      // Group comments by chartHash
      const commentsByChart = {};
      bubbleComments.forEach(comment => {
        if (!commentsByChart[comment.chartHash]) {
          commentsByChart[comment.chartHash] = [];
        }
        commentsByChart[comment.chartHash].push(comment);
      });
      
      console.log('📊 Grouped into', Object.keys(commentsByChart).length, 'charts');
      
      // Find all chart elements on the page
      const chartSelectors = this.platform === 'grafana' 
        ? '[data-viz-panel-key], .panel-container, section[aria-labelledby], .react-grid-item, [class*="react-grid-item"], [data-panelid], [class*="panel-"]'
        : '.visualContainerGroup, .visualContainer';
      const charts = document.querySelectorAll(chartSelectors);
      
      // Track which hashes have current elements
      const currentHashes = new Set();
      
      // Process each chart element
      charts.forEach(chart => {
        const chartHash = this.generateChartHash(chart);
        const comments = commentsByChart[chartHash];
        
        if (comments && comments.length > 0) {
          currentHashes.add(chartHash);
          
          // Check if bubble already exists for this hash
          const existing = this.bubbleMap.get(chartHash);
          
          if (existing) {
            // Check if element reference changed (Grafana re-renders on scroll)
            if (existing.chartElement !== chart) {
              console.log('📍 Chart element changed for hash:', chartHash);
              console.log('  Old element in DOM:', document.contains(existing.chartElement));
              console.log('  New element in DOM:', document.contains(chart));
              
              // Stop observing old element
              if (this.resizeObserver && document.contains(existing.chartElement)) {
                this.resizeObserver.unobserve(existing.chartElement);
              }
              
              // Update element reference
              existing.chartElement = chart;
              
              // Start observing new element
              if (this.resizeObserver) {
                this.resizeObserver.observe(chart);
              }
            }
            
            // Update bubble content and position
            this.updateChartBubble(chart, comments, chartHash);
          } else {
            // Create new bubble
            console.log('🆕 Creating new bubble for hash:', chartHash);
            this.createChartBubble(chart, comments, chartHash);
          }
        }
      });
      
      // Clean up bubbles ONLY if comments were actually deleted (not just chart missing)
      for (const [chartHash, data] of this.bubbleMap.entries()) {
        // Check if this chartHash still has comments in storage
        const hasComments = commentsByChart[chartHash] && commentsByChart[chartHash].length > 0;
        
        if (!hasComments) {
          // Comments were deleted, remove bubble
          console.log('🗑️ Removing bubble - comments deleted for hash:', chartHash);
          data.bubble.remove();
          
          // Stop observing this element
          if (this.resizeObserver && document.contains(data.chartElement)) {
            this.resizeObserver.unobserve(data.chartElement);
          }
          
          this.bubbleMap.delete(chartHash);
        } else if (!currentHashes.has(chartHash)) {
          // Has comments but chart element not found - just hide the bubble temporarily
          console.log('⏸️ Hiding bubble - chart element not found (may be re-rendering):', chartHash);
          data.bubble.style.display = 'none';
        } else {
          // Make sure bubble is visible if chart is found
          data.bubble.style.display = '';
        }
      }
    }
  
    // Position bubble relative to chart element
    positionBubble(bubble, chartElement) {
      // Check if element is in DOM and visible
      if (!document.contains(chartElement)) {
        console.warn('⚠️ Cannot position bubble - chart element not in DOM');
        return;
      }
      
      const rect = chartElement.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Top-right position with some padding
      const x = rect.right + scrollX - 20;
      const y = rect.top + scrollY + 20;
      
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
    }
    
    // Update existing bubble's content
    updateChartBubble(chart, comments, chartHash) {
      const data = this.bubbleMap.get(chartHash);
      if (!data) return;
      
      const { bubble } = data;
      
      // Update stored comments
      data.comments = comments;
      
      const typeEmojis = {
        comment: '💬',
        note: '📝',
        rca: '🔍',
        reference: '📚'
      };
      
      const commentCount = comments.length;
      
      // Regenerate comments list HTML using nested structure like sidebar
      const renderBubbleComment = (comment, level = 0) => {
        const indent = level * 20; // 20px per level like sidebar
        const replies = this.comments.filter(c => c.parentId === comment.id);
        
        const commentHTML = `
          <div class="dc-bubble-comment-item" data-comment-id="${comment.id}" style="margin-left: ${indent}px;">
            <div class="dc-bubble-comment-content">
              <div class="dc-bubble-comment-header">
                <span class="dc-bubble-comment-type">${typeEmojis[comment.commentType] || '💬'} ${comment.commentType}</span>
                <span class="dc-bubble-comment-date">${this.formatDate(comment.timestamp)}</span>
              </div>
              <div class="dc-bubble-comment-text">${this.escapeHtml(comment.text)}</div>
              ${comment.link ? `<a href="${this.escapeHtml(comment.link)}" class="dc-bubble-comment-link" target="_blank">🔗 Link</a>` : ''}
              ${comment.jiraTicket ? `<a href="${this.escapeHtml(comment.jiraTicket.url || '#')}" class="dc-bubble-comment-link" target="_blank"><img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Jira" style="width: 12px; height: 12px; vertical-align: middle;"> ${this.escapeHtml(comment.jiraTicket.key || 'Unknown')}</a>` : ''}
              <div class="dc-bubble-comment-author">👤 ${this.escapeHtml(comment.author)}</div>
            </div>
          </div>
        `;
        
        const repliesHTML = replies.map(reply => renderBubbleComment(reply, level + 1)).join('');
        return commentHTML + repliesHTML;
      };
      
      const commentsListHTML = comments.map(comment => renderBubbleComment(comment)).join('');
      
      // Update bubble content
      bubble.innerHTML = `
        <div class="dc-bubble-pin-marker">
          📝
          ${commentCount > 1 ? `<span class="dc-bubble-count">${commentCount}</span>` : ''}
        </div>
        <div class="dc-bubble-preview">Click to view ${commentCount} note${commentCount > 1 ? 's' : ''}</div>
        <div class="dc-bubble-content dc-bubble-content-list dc-bubble-content-wide">
          <button class="dc-bubble-close" title="Close">×</button>
          <div class="dc-bubble-list-header">
            <h4>📍 ${this.escapeHtml(comments[0].chartLabel || 'Chart Notes')}</h4>
            <span class="dc-bubble-count-badge">${commentCount} note${commentCount > 1 ? 's' : ''}</span>
          </div>
          <div class="dc-bubble-comments-list dc-bubble-scrollable">
            ${commentsListHTML}
          </div>
        </div>
      `;
      
      // Re-attach event listeners (innerHTML wipes them, returns new element)
      const newBubble = this.attachBubbleEventListeners(bubble);
      data.bubble = newBubble; // Update reference in map
      
      // Reposition bubble
      this.positionBubble(newBubble, chart);
      
      console.log('🔄 Updated bubble content');
    }
    
    // Attach event listeners to bubble
    attachBubbleEventListeners(pin) {
      // Remove any existing listeners by cloning (prevents duplicate listeners)
      const newPin = pin.cloneNode(true);
      pin.parentNode.replaceChild(newPin, pin);
      
      // Main bubble click to toggle
      newPin.addEventListener('click', (e) => {
        // Check if clicking on interactive elements
        if (e.target.closest('.dc-bubble-close')) {
          e.stopPropagation();
          newPin.classList.remove('active');
          return;
        }
        
        
        // Don't toggle if clicking inside the content area (except on buttons)
        if (e.target.closest('.dc-bubble-content') && !e.target.closest('.dc-bubble-pin-marker')) {
          return;
        }
        
        // Toggle bubble
        e.stopPropagation();
        console.log('🔄 Bubble clicked, toggling...');
        document.querySelectorAll('.dc-bubble-pin.active').forEach(bubble => {
          if (bubble !== newPin) bubble.classList.remove('active');
        });
        newPin.classList.toggle('active');
        console.log('🔄 Bubble active state:', newPin.classList.contains('active'));
      });
      
      return newPin; // Return new element so caller can update reference
    }
  
    // Create single bubble for chart with all comments
    createChartBubble(chart, comments, chartHash) {
      const pin = document.createElement('div');
      pin.className = 'dc-bubble-pin dc-chart-bubble';
      
      const typeEmojis = {
        comment: '💬',
        note: '📝',
        rca: '🔍',
        reference: '📚'
      };
      
      // Count total comments (including replies)
      const allComments = [...comments];
      comments.forEach(comment => {
        const replies = this.comments.filter(c => c.parentId === comment.id);
        allComments.push(...replies);
      });
      
      const commentCount = comments.length;
      const totalCount = allComments.length;
      
      // Use accent color for bubble
      pin.style.backgroundColor = '#F59E0B';
      
      // Generate comments list HTML using nested structure like sidebar
      const renderBubbleComment = (comment, level = 0) => {
        const indent = level * 20; // 20px per level like sidebar
        const replies = this.comments.filter(c => c.parentId === comment.id);
        
        const commentHTML = `
          <div class="dc-bubble-comment-item" data-comment-id="${comment.id}" style="margin-left: ${indent}px;">
            <div class="dc-bubble-comment-content">
              <div class="dc-bubble-comment-header">
                <span class="dc-bubble-comment-type">${typeEmojis[comment.commentType] || '💬'} ${comment.commentType}</span>
                <span class="dc-bubble-comment-date">${this.formatDate(comment.timestamp)}</span>
              </div>
              <div class="dc-bubble-comment-text">${this.escapeHtml(comment.text)}</div>
              ${comment.link ? `<a href="${this.escapeHtml(comment.link)}" class="dc-bubble-comment-link" target="_blank">🔗 Link</a>` : ''}
              ${comment.jiraTicket ? `<a href="${this.escapeHtml(comment.jiraTicket.url || '#')}" class="dc-bubble-comment-link" target="_blank"><img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Jira" style="width: 12px; height: 12px; vertical-align: middle;"> ${this.escapeHtml(comment.jiraTicket.key || 'Unknown')}</a>` : ''}
              <div class="dc-bubble-comment-author">👤 ${this.escapeHtml(comment.author)}</div>
            </div>
          </div>
        `;
        
        const repliesHTML = replies.map(reply => renderBubbleComment(reply, level + 1)).join('');
        return commentHTML + repliesHTML;
      };
      
      const commentsListHTML = comments.map(comment => renderBubbleComment(comment)).join('');
      
      pin.innerHTML = `
        <div class="dc-bubble-pin-marker">
          📝
          ${commentCount > 1 ? `<span class="dc-bubble-count">${commentCount}</span>` : ''}
        </div>
        <div class="dc-bubble-preview">Click to view ${commentCount} note${commentCount > 1 ? 's' : ''}</div>
        <div class="dc-bubble-content dc-bubble-content-list dc-bubble-content-wide">
          <button class="dc-bubble-close" title="Close">×</button>
          <div class="dc-bubble-list-header">
            <h4>📍 ${this.escapeHtml(comments[0].chartLabel || 'Chart Notes')}</h4>
            <span class="dc-bubble-count-badge">${commentCount} note${commentCount > 1 ? 's' : ''}</span>
          </div>
          <div class="dc-bubble-comments-list dc-bubble-scrollable">
            ${commentsListHTML}
          </div>
        </div>
      `;
      
      // Use CSS positioning relative to the chart element
      pin.style.position = 'absolute';
      
      // Initially position it (will be updated by positionBubble)
      this.positionBubble(pin, chart);
      
      document.body.appendChild(pin);
      
      // Store bubble reference in Map (keyed by chartHash, not element)
      this.bubbleMap.set(chartHash, {
        bubble: pin,
        chartElement: chart,
        comments: comments
      });
      
      // Observe this chart element for resize/position changes
      if (this.resizeObserver) {
        this.resizeObserver.observe(chart);
      }
      
      console.log('✅ Created bubble for chart hash:', chartHash, 'stored in bubbleMap and observing');
      
      // Attach event listeners (returns new element with listeners)
      const finalPin = this.attachBubbleEventListeners(pin);
      this.bubbleMap.get(chartHash).bubble = finalPin; // Update reference
    }
    
    // Create bubble pin on chart (old method - kept for reference)
    createBubblePin(chart, comment) {
      const pin = document.createElement('div');
      pin.className = 'dc-bubble-pin';
      
      const typeEmojis = {
        comment: '💬',
        note: '📝',
        rca: '🔍',
        reference: '📚'
      };
      
      // Set background color based on comment type - Classy colors
      const typeColors = {
        comment: '#3B82F6',    // Professional Blue
        note: '#F59E0B',       // Elegant Amber
        rca: '#EF4444',        // Refined Red
        reference: '#10B981'   // Sophisticated Green
      };
      
      pin.style.backgroundColor = typeColors[comment.commentType] || '#3B82F6';
      
      // Get replies for this comment
      const replies = this.comments.filter(c => c.parentId === comment.id);
      const repliesHTML = replies.map(reply => `
        <div class="dc-bubble-reply">
          <div class="dc-bubble-reply-header">
            <strong>${typeEmojis[reply.commentType] || '💬'} ${reply.commentType || 'Comment'}</strong>
            <span>${this.formatDate(reply.timestamp)}</span>
          </div>
          <div class="dc-bubble-text">${this.escapeHtml(reply.text)}</div>
          ${reply.link ? `<a href="${this.escapeHtml(reply.link)}" target="_blank">🔗 View Reference</a>` : ''}
          <div class="dc-bubble-author">👤 ${this.escapeHtml(reply.author)}</div>
        </div>
      `).join('');
      
      // Truncate text for preview
      const previewText = comment.text.length > 30 ? comment.text.substring(0, 30) + '...' : comment.text;
      
      pin.innerHTML = `
        <div class="dc-bubble-pin-marker">${typeEmojis[comment.commentType] || '💬'}</div>
        <div class="dc-bubble-preview">Click to view note</div>
        <div class="dc-bubble-content">
          <button class="dc-bubble-close" title="Close">×</button>
          <div class="dc-bubble-header">
            <strong>${comment.commentType || 'Comment'}</strong>
            <span>${this.formatDate(comment.timestamp)}</span>
          </div>
          <div class="dc-bubble-text">${this.escapeHtml(comment.text)}</div>
          ${comment.link ? `<a href="${this.escapeHtml(comment.link)}" target="_blank">🔗 View Reference</a>` : ''}
          <div class="dc-bubble-author">👤 ${this.escapeHtml(comment.author)}</div>
          ${repliesHTML}
        </div>
      `;
      
      // Position the pin
      const rect = chart.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      const x = rect.left + scrollX + (rect.width * comment.relativeX / 100);
      const y = rect.top + scrollY + (rect.height * comment.relativeY / 100);
      
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      
      document.body.appendChild(pin);
      
      // Click to toggle bubble content
      pin.addEventListener('click', (e) => {
        // Close all other active bubbles
        document.querySelectorAll('.dc-bubble-pin.active').forEach(bubble => {
          if (bubble !== pin) bubble.classList.remove('active');
        });
        
        // Toggle this bubble
        pin.classList.toggle('active');
        e.stopPropagation();
      });
      
      // Close button
      const closeBtn = pin.querySelector('.dc-bubble-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pin.classList.remove('active');
        });
      }
      
      
      // Close bubble when clicking outside
      document.addEventListener('click', (e) => {
        if (!pin.contains(e.target)) {
          pin.classList.remove('active');
        }
      });
    }
  
    // Delete comment
    async deleteComment(id) {
      if (!confirm('Delete this comment?')) return;
      
      if (this.db.isConfigured) {
        // Delete from database
        const success = await this.db.deleteComment(id);
        if (success) {
          this.comments = this.comments.filter(c => c.id !== id);
          console.log('Comment deleted from database');
        } else {
          console.error('Failed to delete comment from database');
          this.showToast('Failed to delete comment', 'error');
          return;
        }
      } else {
        // Fallback to local storage
      this.comments = this.comments.filter(c => c.id !== id);
      await chrome.storage.sync.set({ comments: this.comments });
        console.log('Comment deleted from local storage');
      }
      
      this.renderComments();
      this.renderBubbles();
      
      this.showToast('🗑️ Comment deleted');
    }
    
    // Toggle bubbles visibility
    toggleBubblesVisibility() {
      if (this.bubblesHidden) {
        // Hide all bubbles
        for (const [chartHash, data] of this.bubbleMap.entries()) {
          data.bubble.style.display = 'none';
        }
        this.showToast('👁️ Bubbles hidden');
      } else {
        // Show all bubbles (that are in viewport)
        for (const [chartHash, data] of this.bubbleMap.entries()) {
          if (document.contains(data.chartElement)) {
            const rect = data.chartElement.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
              data.bubble.style.display = '';
            }
          }
        }
        this.showToast('👁️ Bubbles visible');
      }
    }
    
    // Show configuration menu
    async showConfigMenu() {
      const result = await chrome.storage.sync.get(['dbProvider', 'aiProvider']);
      const dbProvider = result.dbProvider || 'none';
      const aiProvider = result.aiProvider || 'none';
      let dbStatusText = 'Configure team collaboration database';
      let aiStatusText = 'Configure AI provider for chart analysis';
      
      if (dbProvider === 'local') {
        dbStatusText = 'Currently using local storage (solo mode)';
      } else if (dbProvider === 'supabase') {
        dbStatusText = 'Currently using Supabase';
      } else if (dbProvider === 'mongodb') {
        dbStatusText = 'Currently using MongoDB';
      }
      
      if (aiProvider === 'openai') {
        const modelName = this.ai.model || 'GPT-5';
        aiStatusText = `Currently using OpenAI (${modelName})`;
      } else if (aiProvider === 'anthropic') {
        const modelName = this.ai.model || 'Claude 4.5 Sonnet';
        aiStatusText = `Currently using Anthropic (${modelName})`;
      } else if (aiProvider === 'gemini') {
        const modelName = this.ai.model || 'Gemini Pro';
        aiStatusText = `Currently using Google Gemini (${modelName})`;
      }
      
      const menu = document.createElement('div');
      menu.className = 'dc-config-menu-overlay';
      menu.innerHTML = `
        <div class="dc-config-menu">
          <div class="dc-config-menu-header">
            <h3>⚙️ Settings & Integrations</h3>
            <button class="dc-config-close" id="dc-config-close">×</button>
          </div>
          <div class="dc-config-menu-body">
            <button class="dc-config-menu-item" id="dc-menu-database">
              <div class="dc-config-menu-icon">🗄️</div>
              <div class="dc-config-menu-text">
                <div class="dc-config-menu-title">Database Configuration</div>
                <div class="dc-config-menu-desc">${dbStatusText}</div>
              </div>
              <div class="dc-config-menu-status">${this.db.isConfigured ? '✅' : (dbProvider === 'local' ? '💾' : '⚙️')}</div>
            </button>
            
            <button class="dc-config-menu-item" id="dc-menu-jira">
              <div class="dc-config-menu-icon">
                <img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Atlassian" style="width: 24px; height: 24px;">
              </div>
              <div class="dc-config-menu-text">
                <div class="dc-config-menu-title">Atlassian Integration</div>
                <div class="dc-config-menu-desc">Connect to Jira for ticket management</div>
              </div>
              <div class="dc-config-menu-status">${this.jira.isConfigured ? '✅' : '⚙️'}</div>
            </button>
            
            <button class="dc-config-menu-item" id="dc-menu-ai">
              <div class="dc-config-menu-icon">🤖</div>
              <div class="dc-config-menu-text">
                <div class="dc-config-menu-title">AI Configuration</div>
                <div class="dc-config-menu-desc">${aiStatusText}</div>
              </div>
              <div class="dc-config-menu-status">${this.ai.isConfigured ? '✅' : '⚙️'}</div>
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(menu);
      
      // Close button
      document.getElementById('dc-config-close').addEventListener('click', () => {
        menu.remove();
      });
      
      // Click outside to close
      menu.addEventListener('click', (e) => {
        if (e.target === menu) {
          menu.remove();
        }
      });
      
      // Database config
      document.getElementById('dc-menu-database').addEventListener('click', () => {
        menu.remove();
        this.showDatabaseDialog();
      });
      
      // Jira config
      document.getElementById('dc-menu-jira').addEventListener('click', () => {
        menu.remove();
        this.showJiraConfigDialog();
      });
      
      // AI config
      document.getElementById('dc-menu-ai').addEventListener('click', () => {
        menu.remove();
        this.showAIConfigDialog();
      });
    }
    
    // Clear all notes (for debugging/cleanup)
    async clearAllNotes() {
      if (!confirm('⚠️ Delete all notes for this dashboard? This cannot be undone!')) return;
      
      if (this.db.isConfigured) {
        // Clear from database
        const success = await this.db.clearPageComments(this.currentPageId);
        if (success) {
          this.comments = this.comments.filter(comment => comment.pageId !== this.currentPageId);
          console.log('All comments cleared from database');
        } else {
          console.error('Failed to clear comments from database');
          this.showToast('Failed to clear comments', 'error');
          return;
        }
      } else {
        // Fallback to local storage
        const result = await chrome.storage.sync.get('comments');
        const allComments = result.comments || [];
        const remainingComments = allComments.filter(comment => comment.pageId !== this.currentPageId);
        this.comments = this.comments.filter(comment => comment.pageId !== this.currentPageId);
        await chrome.storage.sync.set({ comments: remainingComments });
        console.log('All comments cleared from local storage');
      }
      
      this.renderComments();
      this.renderBubbles();
      
      this.showToast('🗑️ All notes for this dashboard deleted');
      console.log('✅ Notes cleared for page:', this.currentPageId);
    }
    
    // Setup real-time sync for team collaboration
    setupRealtimeSync() {
      console.log('🔄 Setting up real-time sync');
      
      // Subscribe to database changes
      this.unsubscribe = this.db.subscribeToChanges(async (updatedComments) => {
        const oldCount = this.comments.length;
        const oldPageCommentCount = this.comments.filter(c => c.pageId === this.currentPageId).length;
        
        this.comments = updatedComments;
        
        const newCount = this.comments.length;
        const newPageCommentCount = this.comments.filter(c => c.pageId === this.currentPageId).length;
        
        // Only update if comments for current page changed
        if (oldPageCommentCount !== newPageCommentCount) {
          console.log(`🔄 Real-time update for current page: ${oldPageCommentCount} → ${newPageCommentCount} comments`);
          this.renderComments();
          this.renderBubbles();
          
          // Show notification if new comments were added by others
          if (newPageCommentCount > oldPageCommentCount) {
            this.showToast(`📥 ${newPageCommentCount - oldPageCommentCount} new comment(s) from team`);
          }
        }
      });
      
      console.log('✅ Real-time sync enabled - checking every 5 seconds');
    }
  
    // Escape HTML
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Load external script dynamically
    loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Show Jira ticket creation dialog
    async showJiraTicketDialog(commentId) {
      const comment = this.comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const dialog = document.createElement('div');
      dialog.className = 'dc-dialog-overlay';
      dialog.style.zIndex = '10000002';
      
      dialog.innerHTML = `
        <div class="dc-dialog" style="max-width: 600px;">
          <div class="dc-dialog-header">
            <h3 style="display: flex; align-items: center; gap: 0.5rem;">
              <img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Atlassian" style="width: 20px; height: 20px;">
              Atlassian Integration
            </h3>
          </div>
          <div class="dc-dialog-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="dc-tab-container">
              <div class="dc-tab-buttons">
                <button class="dc-tab-btn active" data-tab="create">Create New Ticket</button>
                <button class="dc-tab-btn" data-tab="attach">Attach Existing Ticket</button>
              </div>
              
              <div class="dc-tab-content active" id="create-tab">
                <p style="margin-bottom: 1rem; color: #666; font-size: 13px;">
                  Create a new Jira ticket from this comment
                </p>
                
                <div class="db-form-field">
                  <label class="db-form-label">Summary</label>
                  <input 
                    type="text" 
                    id="dc-jira-summary" 
                    class="db-form-input" 
                    placeholder="Brief description"
                    value="${this.escapeHtml(comment.text.substring(0, 100))}"
                  >
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Description</label>
                  <textarea 
                    id="dc-jira-description" 
                    class="db-form-input" 
                    style="height: 80px; resize: vertical;"
                    placeholder="Full description"
                  >${this.escapeHtml(comment.text)}
${comment.chartLabel ? `\n\nChart: ${this.escapeHtml(comment.chartLabel)}` : ''}
${comment.link ? `\nReference: ${this.escapeHtml(comment.link)}` : ''}</textarea>
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Project</label>
                  <select id="dc-jira-project" class="db-form-input">
                    <option value="">Loading projects...</option>
                  </select>
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Issue Type</label>
                  <select id="dc-jira-type" class="db-form-input">
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                    <option value="Story">Story</option>
                    <option value="Epic">Epic</option>
                  </select>
                </div>
                
                <p id="dc-jira-create-error" style="color: #EF4444; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
                <p id="dc-jira-create-success" style="color: #10B981; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
              </div>
              
              <div class="dc-tab-content" id="attach-tab">
                <p style="margin-bottom: 1rem; color: #666; font-size: 13px;">
                  Search and attach an existing Jira ticket
                </p>
                
                <div class="db-form-field">
                  <label class="db-form-label">Search Tickets</label>
                  <div style="display: flex; gap: 0.5rem;">
                    <input 
                      type="text" 
                      id="dc-jira-search" 
                      class="db-form-input" 
                      placeholder="Search by ticket key or summary..."
                      style="flex: 1;"
                    >
                    <button id="dc-jira-search-btn" class="dc-btn dc-btn-secondary" style="padding: 0.5rem 1rem;">
                      🔍 Search
                    </button>
                  </div>
                </div>
                
                <div class="db-form-field">
                  <label class="db-form-label">Filter by Project</label>
                  <select id="dc-jira-filter-project" class="db-form-input">
                    <option value="">All Projects</option>
                  </select>
                </div>
                
                <div id="dc-jira-tickets-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #E5E7EB; border-radius: 0.375rem; padding: 0.5rem;">
                  <p style="text-align: center; color: #666; font-size: 13px; margin: 1rem 0;">
                    Search for tickets to see results
                  </p>
                </div>
                
                <p id="dc-jira-attach-error" style="color: #EF4444; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
                <p id="dc-jira-attach-success" style="color: #10B981; font-size: 11px; margin-top: 0.5rem; display: none;"></p>
              </div>
            </div>
          </div>
          <div class="dc-dialog-footer" style="display: flex; gap: 0.5rem;">
            <button class="dc-btn dc-btn-secondary" id="dc-jira-cancel" style="flex: 1;">
              Cancel
            </button>
            <button class="dc-btn dc-btn-primary" id="dc-jira-create" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <img src="${chrome.runtime.getURL('icons/atlassian.png')}" alt="Jira" style="width: 16px; height: 16px;">
              Create Ticket
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Load projects for both dropdowns
      this.loadJiraProjects(dialog);
      
      // Tab switching
      const tabButtons = dialog.querySelectorAll('.dc-tab-btn');
      const tabContents = dialog.querySelectorAll('.dc-tab-content');
      
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          
          // Update active tab button
          tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Update active tab content
          tabContents.forEach(c => c.classList.remove('active'));
          dialog.querySelector(`#${tab}-tab`).classList.add('active');
          
          // Update button text
          const createBtn = document.getElementById('dc-jira-create');
          if (tab === 'create') {
            createBtn.innerHTML = `Create Ticket`;
          } else {
            createBtn.innerHTML = `Attach Ticket`;
          }
        });
      });
      
      // Form elements
      const summaryInput = document.getElementById('dc-jira-summary');
      const descriptionInput = document.getElementById('dc-jira-description');
      const projectSelect = document.getElementById('dc-jira-project');
      const typeSelect = document.getElementById('dc-jira-type');
      const searchInput = document.getElementById('dc-jira-search');
      const searchBtn = document.getElementById('dc-jira-search-btn');
      const filterProjectSelect = document.getElementById('dc-jira-filter-project');
      const ticketsList = document.getElementById('dc-jira-tickets-list');
      const errorMsg = document.getElementById('dc-jira-create-error');
      const successMsg = document.getElementById('dc-jira-create-success');
      const attachErrorMsg = document.getElementById('dc-jira-attach-error');
      const attachSuccessMsg = document.getElementById('dc-jira-attach-success');
      const createBtn = document.getElementById('dc-jira-create');
      const cancelBtn = document.getElementById('dc-jira-cancel');
      
      summaryInput.focus();
      
      // Search functionality
      searchBtn.addEventListener('click', () => {
        this.searchJiraTickets(searchInput.value.trim(), filterProjectSelect.value, ticketsList);
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchJiraTickets(searchInput.value.trim(), filterProjectSelect.value, ticketsList);
        }
      });
      
      // Filter project change
      filterProjectSelect.addEventListener('change', () => {
        if (searchInput.value.trim()) {
          this.searchJiraTickets(searchInput.value.trim(), filterProjectSelect.value, ticketsList);
        }
      });
      
      cancelBtn.addEventListener('click', () => {
        dialog.remove();
      });
      
      createBtn.addEventListener('click', async () => {
        const activeTab = dialog.querySelector('.dc-tab-btn.active').getAttribute('data-tab');
        
        if (activeTab === 'create') {
          await this.createJiraTicket(comment, summaryInput, descriptionInput, projectSelect, typeSelect, errorMsg, successMsg, createBtn);
        } else {
          await this.attachJiraTicket(comment, ticketsList, attachErrorMsg, attachSuccessMsg, createBtn);
        }
      });
    }
    
    // Load Jira projects into dropdowns
    async loadJiraProjects(dialog) {
      try {
        const projects = await this.jira.getProjects();
        const projectSelect = dialog.querySelector('#dc-jira-project');
        const filterProjectSelect = dialog.querySelector('#dc-jira-filter-project');
        
        // Clear loading text
        projectSelect.innerHTML = '<option value="">Select a project...</option>';
        filterProjectSelect.innerHTML = '<option value="">All Projects</option>';
        
        projects.forEach(project => {
          const option1 = document.createElement('option');
          option1.value = project.key;
          option1.textContent = `${project.key} - ${project.name}`;
          projectSelect.appendChild(option1);
          
          const option2 = document.createElement('option');
          option2.value = project.key;
          option2.textContent = `${project.key} - ${project.name}`;
          filterProjectSelect.appendChild(option2);
        });
      } catch (error) {
        console.error('Failed to load Jira projects:', error);
        const projectSelect = dialog.querySelector('#dc-jira-project');
        projectSelect.innerHTML = '<option value="">Failed to load projects</option>';
      }
    }
    
    // Search Jira tickets
    async searchJiraTickets(query, projectKey, ticketsList) {
      if (!query.trim()) {
        ticketsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 13px; margin: 1rem 0;">Enter a search term to find tickets</p>';
        return;
      }
      
      ticketsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 13px; margin: 1rem 0;">🔍 Searching tickets...</p>';
      
      try {
        console.log('🔍 Starting Jira search with query:', query, 'project:', projectKey);
        const tickets = await this.jira.searchTickets(query, projectKey || null, 20);
        
        if (tickets.length === 0) {
          ticketsList.innerHTML = `
            <div style="text-align: center; color: #666; font-size: 13px; margin: 1rem 0; padding: 1rem; background: #F9FAFB; border-radius: 6px;">
              <p>No tickets found for "${query}"</p>
              <p style="font-size: 11px; margin-top: 0.5rem;">Try searching by ticket key (e.g., "PROJ-123") or summary keywords</p>
            </div>
          `;
          return;
        }
        
        console.log(`✅ Found ${tickets.length} tickets`);
        ticketsList.innerHTML = '';
        
        tickets.forEach(ticket => {
          const ticketDiv = document.createElement('div');
          ticketDiv.className = 'dc-ticket-item';
          ticketDiv.style.cssText = `
            padding: 0.75rem;
            border: 1px solid #E5E7EB;
            border-radius: 0.375rem;
            margin-bottom: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            background: #ffffff;
          `;
          
          // Get assignee name safely
          const assigneeName = ticket.fields.assignee ? 
            (ticket.fields.assignee.displayName || ticket.fields.assignee.name || 'Unassigned') : 
            'Unassigned';
          
          ticketDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.25rem;">
              <strong style="color: #1F2937; font-size: 13px;">${ticket.key}</strong>
              <span style="font-size: 11px; color: #6B7280; background: #F3F4F6; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">
                ${ticket.fields.status.name}
              </span>
            </div>
            <div style="color: #374151; font-size: 12px; line-height: 1.4; margin-bottom: 0.5rem;">
              ${ticket.fields.summary}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #6B7280;">
              <span>👤 ${assigneeName}</span>
              <span>📅 ${new Date(ticket.fields.updated).toLocaleDateString()}</span>
            </div>
          `;
          
          ticketDiv.addEventListener('click', () => {
            // Remove previous selection
            ticketsList.querySelectorAll('.dc-ticket-item').forEach(item => {
              item.style.borderColor = '#E5E7EB';
              item.style.backgroundColor = '#ffffff';
            });
            
            // Select this ticket
            ticketDiv.style.borderColor = '#3B82F6';
            ticketDiv.style.backgroundColor = '#EFF6FF';
            ticketDiv.setAttribute('data-selected', 'true');
            ticketDiv.setAttribute('data-ticket-key', ticket.key);
            ticketDiv.setAttribute('data-ticket-url', `${this.jira.jiraUrl}/browse/${ticket.key}`);
            
            console.log('✅ Selected ticket:', ticket.key);
          });
          
          ticketsList.appendChild(ticketDiv);
        });
      } catch (error) {
        console.error('❌ Failed to search tickets:', error);
        ticketsList.innerHTML = `
          <div style="text-align: center; color: #EF4444; font-size: 13px; margin: 1rem 0; padding: 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px;">
            <p><strong>Search Failed</strong></p>
            <p style="font-size: 11px; margin-top: 0.5rem;">${error.message}</p>
            <p style="font-size: 11px; margin-top: 0.25rem;">Check your Jira connection and try again</p>
          </div>
        `;
      }
    }
    
    // Create Jira ticket
    async createJiraTicket(comment, summaryInput, descriptionInput, projectSelect, typeSelect, errorMsg, successMsg, createBtn) {
      const summary = summaryInput.value.trim();
      const description = descriptionInput.value.trim();
      const projectKey = projectSelect.value;
      const issueType = typeSelect.value;
      
      if (!summary || !description || !projectKey) {
        errorMsg.textContent = 'Please fill in all fields';
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
        return;
      }
      
      createBtn.textContent = '⏳ Creating...';
      createBtn.disabled = true;
      
      try {
        const result = await this.jira.createIssue(summary, description, projectKey, issueType);
        
        if (result && result.key) {
          // Update comment with Jira ticket info
          const jiraUrl = `${this.jira.jiraUrl}/browse/${result.key}`;
          comment.jiraTicket = {
            key: result.key,
            url: jiraUrl
          };
          console.log('🔍 Creating Jira ticket for comment:', comment.id, 'result.key:', result.key, 'jira.jiraUrl:', this.jira.jiraUrl, 'constructed url:', jiraUrl, 'jiraTicket:', comment.jiraTicket);
          
          // Update existing comment (not insert)
          if (this.db.isConfigured) {
            await this.db.updateComment(comment);
          } else {
            // For local storage, update the comment in the array
            const index = this.comments.findIndex(c => c.id === comment.id);
            if (index !== -1) {
              this.comments[index] = comment;
              await chrome.storage.sync.set({ comments: this.comments });
            }
          }
          
          successMsg.textContent = `✅ Ticket ${result.key} created successfully!`;
          successMsg.style.display = 'block';
          errorMsg.style.display = 'none';
          
          setTimeout(() => {
            document.querySelector('.dc-dialog-overlay').remove();
            this.renderComments();
          }, 1500);
        } else {
          throw new Error('Failed to create ticket');
        }
      } catch (error) {
        console.error('Failed to create Jira ticket:', error);
        errorMsg.textContent = `❌ ${error.message}`;
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
        createBtn.innerHTML = `Create Ticket`;
        createBtn.disabled = false;
      }
    }
    
    // Attach existing Jira ticket
    async attachJiraTicket(comment, ticketsList, errorMsg, successMsg, createBtn) {
      const selectedTicket = ticketsList.querySelector('[data-selected="true"]');
      
      if (!selectedTicket) {
        errorMsg.textContent = 'Please select a ticket to attach';
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
        return;
      }
      
      const ticketKey = selectedTicket.getAttribute('data-ticket-key');
      const ticketUrl = selectedTicket.getAttribute('data-ticket-url');
      
      createBtn.textContent = '⏳ Attaching...';
      createBtn.disabled = true;
      
      try {
        // Update comment with Jira ticket info
        comment.jiraTicket = {
          key: ticketKey,
          url: ticketUrl
        };
        console.log('🔍 Attaching Jira ticket to comment:', comment.id, 'ticketKey:', ticketKey, 'ticketUrl:', ticketUrl, 'jiraTicket:', comment.jiraTicket);
        
        // Update existing comment (not insert)
        if (this.db.isConfigured) {
          await this.db.updateComment(comment);
        } else {
          // For local storage, update the comment in the array
          const index = this.comments.findIndex(c => c.id === comment.id);
          if (index !== -1) {
            this.comments[index] = comment;
            await chrome.storage.sync.set({ comments: this.comments });
          }
        }
        
        successMsg.textContent = `✅ Ticket ${ticketKey} attached successfully!`;
        successMsg.style.display = 'block';
        errorMsg.style.display = 'none';
        
        setTimeout(() => {
          document.querySelector('.dc-dialog-overlay').remove();
          this.renderComments();
        }, 1500);
      } catch (error) {
        console.error('Failed to attach Jira ticket:', error);
        errorMsg.textContent = `❌ ${error.message}`;
        errorMsg.style.display = 'block';
        successMsg.style.display = 'none';
        createBtn.textContent = '🔗 Attach Ticket';
        createBtn.disabled = false;
      }
    }
    
    // Analyze comment with AI (from sidebar)
    async analyzeCommentWithAI(commentId) {
      const comment = this.comments.find(c => c.id === commentId);
      if (!comment || comment.type !== 'bubble') return;
      
      // Find the chart for this comment
      const data = Array.from(this.bubbleMap.values()).find(d => 
        d.comments.some(c => c.id === commentId)
      );
      
      if (!data) {
        this.showToast('Chart not found for this comment', 'error');
        return;
      }
      
      await this.analyzeChartWithAI(comment.chartHash, commentId);
    }
    
    // Analyze chart with AI
    async analyzeChartWithAI(chartHash, commentId) {
      const data = this.bubbleMap.get(chartHash);
      if (!data) {
        this.showToast('Chart not found', 'error');
        return;
      }
      
      const chartElement = data.chartElement;
      
      // Get current AI provider for icon
      const providerIcons = {
        'openai': `<img src="${chrome.runtime.getURL('icons/openai-48.png')}" alt="OpenAI" style="width: 48px; height: 48px;">`,
        'anthropic': `<img src="${chrome.runtime.getURL('icons/anthropic-48.png')}" alt="Anthropic" style="width: 48px; height: 48px;">`, 
        'gemini': `<img src="${chrome.runtime.getURL('icons/gemini-48.png')}" alt="Gemini" style="width: 48px; height: 48px;">`
      };
      const providerNames = {
        'openai': 'OpenAI (GPT-5)',
        'anthropic': 'Claude (4.5 Sonnet)',
        'gemini': 'Google Gemini (2.5 Flash)'
      };
      const currentProvider = this.ai.provider || 'openai';
      const providerIcon = providerIcons[currentProvider] || `<img src="${chrome.runtime.getURL('icons/openai-48.png')}" alt="OpenAI" style="width: 48px; height: 48px;">`;
      const providerName = providerNames[currentProvider] || 'AI';

      // Show loading dialog
      const loadingDialog = document.createElement('div');
      loadingDialog.className = 'dc-dialog-overlay';
      loadingDialog.style.zIndex = '10000003';
      loadingDialog.innerHTML = `
        <div class="dc-dialog" style="max-width: 500px;">
          <div class="dc-dialog-header">
            <h3>✨ AI Analysis</h3>
          </div>
          <div class="dc-dialog-body" style="text-align: center; padding: 2rem;">
            <div style="margin-bottom: 1rem;">${providerIcon}</div>
            <p style="color: #666; margin-bottom: 0.5rem;">Analyzing with ${providerName}...</p>
            <p style="color: #999; font-size: 14px;">Capturing and analyzing chart...</p>
            <div class="dc-loading-spinner"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingDialog);
      
      try {
        // Check if html2canvas is available (bundled with extension)
        if (typeof html2canvas === 'undefined') {
          throw new Error('html2canvas library not loaded. Please ensure html2canvas.min.js is in the extension directory.');
        }
        
        // Capture chart screenshot using html2canvas
        const canvas = await html2canvas(chartElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });
        
        const imageData = canvas.toDataURL('image/png');
        
        // Analyze with AI
        const analysis = await this.ai.analyzeChart(imageData, `Analyze this dashboard chart and provide insights on:
1. Key metrics and their current values
2. Trends or patterns visible in the data
3. Any anomalies or interesting observations
4. Actionable recommendations based on the data

Provide a clear, concise analysis.`);
        
        // Show results dialog
        loadingDialog.remove();
        
        const resultsDialog = document.createElement('div');
        resultsDialog.className = 'dc-dialog-overlay';
        resultsDialog.style.zIndex = '10000003';
        resultsDialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 700px; max-height: 80vh;">
            <div class="dc-dialog-header">
              <h3>✨ AI Chart Analysis</h3>
            </div>
            <div class="dc-dialog-body" style="max-height: 60vh; overflow-y: auto;">
              <div class="dc-ai-analysis">
                ${analysis.split('\n').map(line => {
                  if (line.startsWith('#')) return `<h4>${line.replace(/^#+\s*/, '')}</h4>`;
                  if (line.match(/^\d+\./)) return `<p><strong>${line}</strong></p>`;
                  if (line.trim() === '') return '<br>';
                  return `<p>${line}</p>`;
                }).join('')}
              </div>
            </div>
            <div class="dc-dialog-footer" style="display: flex; gap: 0.5rem;">
              <button class="dc-btn dc-btn-secondary" id="dc-ai-close" style="flex: 1;">
                Close
              </button>
              <button class="dc-btn dc-btn-primary" id="dc-ai-save-note" style="flex: 1;">
                💾 Save as Note
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(resultsDialog);
        
        document.getElementById('dc-ai-close').addEventListener('click', () => {
          resultsDialog.remove();
        });
        
        document.getElementById('dc-ai-save-note').addEventListener('click', () => {
          // Create a new note with AI analysis
          const note = {
            id: Date.now().toString(),
            text: `AI Analysis:\n\n${analysis}`,
            link: '',
            commentType: 'note',
            type: 'page',
            timestamp: new Date().toISOString(),
            author: this.username,
            pageId: this.currentPageId,
            parentId: null,
            replies: []
          };
          
          this.saveComment(note);
          resultsDialog.remove();
          this.showToast('✅ AI analysis saved as note!');
        });
        
      } catch (error) {
        console.error('AI analysis failed:', error);
        loadingDialog.remove();
        
        const errorDialog = document.createElement('div');
        errorDialog.className = 'dc-dialog-overlay';
        errorDialog.style.zIndex = '10000003';
        errorDialog.innerHTML = `
          <div class="dc-dialog" style="max-width: 400px;">
            <div class="dc-dialog-header">
              <h3>❌ Analysis Failed</h3>
            </div>
            <div class="dc-dialog-body">
              <p style="color: #EF4444;">${error.message}</p>
            </div>
            <div class="dc-dialog-footer" style="display: flex; justify-content: center;">
              <button class="dc-btn dc-btn-primary" onclick="this.closest('.dc-dialog-overlay').remove()" style="flex: 1; max-width: 200px;">
                Close
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(errorDialog);
      }
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.stickrApp = new Stickr();
    });
  } else {
    window.stickrApp = new Stickr();
  }
  
  // Expose helper functions to console for debugging
  console.log('📍 Cognito Extension Loaded!');
  console.log('💡 Access app: window.stickrApp');
  console.log('🗑️ Clear all notes: window.stickrApp.clearAllNotes()');
  console.log('📊 View notes: await chrome.storage.sync.get("comments")');