// Background service worker for Cognito

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Coginto installed');
      
      // Initialize storage
      chrome.storage.sync.set({
        comments: [],
        settings: {
          autoSync: true,
          showBubbles: true
        }
      });
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      
      fetch(url, options)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          sendResponse({ success: true, data });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Keep channel open for async response
    }
  });
  
  // Handle tab updates to inject content script on Power BI pages
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      if (tab.url.includes('powerbi.com')) {
        console.log('Power BI page detected');
      }
    }
});