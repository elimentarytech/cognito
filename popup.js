// Popup script for Stickr

document.addEventListener('DOMContentLoaded', async () => {
    // Load and display statistics
    loadStats();
    
    // Toggle sidebar button
    document.getElementById('toggle-sidebar').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on a supported site
      const url = tab.url.toLowerCase();
      const isSupported = url.includes('powerbi.com') || 
                          url.includes('tableau.com') || 
                          url.includes('grafana') || // Matches grafana.com, grafana.org, grafana.net, etc.
                          url.includes('localhost:3000'); // Local Grafana instances
      
      if (isSupported) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
        window.close();
      } else {
        alert('Please navigate to a supported dashboard site (Power BI, Tableau, Grafana)');
      }
    });
    
    // Export data button
    document.getElementById('export-data').addEventListener('click', exportComments);
    
    // Check if extension is active on current page
    checkStatus();
  });
  
  async function loadStats() {
    const result = await chrome.storage.sync.get('comments');
    const comments = result.comments || [];
    
    const totalComments = comments.length;
    const bubbleComments = comments.filter(c => c.type === 'bubble').length;
    const pageNotes = comments.filter(c => c.type === 'page').length;
    
    document.getElementById('total-comments').textContent = totalComments;
    document.getElementById('bubble-comments').textContent = bubbleComments;
    document.getElementById('page-notes').textContent = pageNotes;
  }
  
  async function checkStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    const url = tab.url ? tab.url.toLowerCase() : '';
    const isSupported = url.includes('powerbi.com') || 
                        url.includes('tableau.com') || 
                        url.includes('grafana') || // Matches grafana.com, grafana.org, grafana.net, etc.
                        url.includes('localhost:3000'); // Local Grafana instances
    
    if (isSupported) {
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Extension Active';
    } else {
      statusDot.classList.add('inactive');
      statusText.textContent = 'Not on dashboard page';
    }
  }
  
  async function exportComments() {
    const result = await chrome.storage.sync.get('comments');
    const comments = result.comments || [];
    
    if (comments.length === 0) {
      alert('No comments to export');
      return;
    }
    
    // Convert to CSV
    const csv = convertToCSV(comments);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Download
    const a = document.createElement('a');
    a.href = url;
    a.download = `stickr-comments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  function convertToCSV(comments) {
    const headers = ['ID', 'Type', 'Comment Type', 'Page ID', 'Chart Label', 'Text', 'Link', 'Author', 'Timestamp'];
    const rows = comments.map(c => [
      c.id,
      c.type,
      c.commentType || '',
      c.pageId,
      c.chartLabel || '',
      `"${c.text.replace(/"/g, '""')}"`,
      c.link || '',
      c.author,
      c.timestamp
    ]);
    
    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
}