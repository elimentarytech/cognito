// Background service worker for Cognito
console.log('🚀 Cognito background service worker starting...');

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  try {
    if (details.reason === 'install') {
      console.log('Cognito installed');
      
      // Initialize storage
      chrome.storage.sync.set({
        comments: [],
        settings: {
          autoSync: true,
          showBubbles: true
        }
      });
    }
  } catch (error) {
    console.error('Error in onInstalled listener:', error);
  }
});
  
// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getComments') {
      chrome.storage.sync.get('comments', (result) => {
        sendResponse({ comments: result.comments || [] });
      });
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'saveComment') {
      chrome.storage.sync.get('comments', (result) => {
        const comments = result.comments || [];
        comments.push(request.comment);
        
        chrome.storage.sync.set({ comments }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }
    
    if (request.action === 'deleteComment') {
      chrome.storage.sync.get('comments', (result) => {
        const comments = result.comments || [];
        const filtered = comments.filter(c => c.id !== request.commentId);
        
        chrome.storage.sync.set({ comments: filtered }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }
    
    // Handle external API requests (to bypass CORS)
    if (request.action === 'fetchAPI') {
      const { url, options } = request;
      
      console.log('🔗 Background: Making API request to:', url);
      console.log('🔗 Background: Request options:', options);
      
      fetch(url, options)
        .then(response => {
          console.log('🔗 Background: Response status:', response.status);
          console.log('🔗 Background: Response headers:', response.headers);
          
          if (!response.ok) {
            return response.text().then(text => {
              console.error('🔗 Background: API Error:', response.status, text);
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log('🔗 Background: API Success:', data);
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error('🔗 Background: API Error:', error);
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Keep channel open for async response
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    sendResponse({ success: false, error: error.message });
  }
});
  
// Handle tab updates to inject content script on Power BI pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete' && tab.url) {
      if (tab.url.includes('powerbi.com')) {
        console.log('Power BI page detected');
      }
    }
  } catch (error) {
    console.error('Error in tab update listener:', error);
  }
});