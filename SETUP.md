# Stickr AI - Setup Guide

## 🚀 Quick Start

### Step 1: Install Extension
1. Load the extension in Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `stickr` folder

### Step 2: First Launch
When you first open Stickr AI on a dashboard:

1. **Email Registration**
   - Enter your email address
   - Your username will be the part before `@`
   - Example: `john.doe@company.com` → username: `john.doe`

2. **Database Configuration** (Optional)
   - You can **skip this** to use local storage only
   - For team collaboration, configure Supabase (see below)

---

## 🗄️ Database Setup (For Team Collaboration)

### Why Use a Database?
- **Local Storage Only**: Comments are stored in your browser only
- **With Database**: Your team shares comments in real-time across all users

### Recommended: Supabase (Free & Easy)

#### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Click "New Project"

#### 2. Get Your Credentials
1. Go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3. Create the Database Table
1. Go to **SQL Editor** in Supabase
2. Click "New Query"
3. Paste this SQL and click "Run":

```sql
CREATE TABLE stickr_comments (
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
);

-- Optional: Add indexes for better performance
CREATE INDEX idx_page_id ON stickr_comments("pageId");
CREATE INDEX idx_chart_hash ON stickr_comments("chartHash");
CREATE INDEX idx_author ON stickr_comments(author);
```

#### 4. Configure in Extension
1. Open Stickr AI on any dashboard
2. On first launch, you'll see the database configuration dialog
3. Enter your **Project URL** and **anon public key**
4. Click **"Test Connection"** to verify
5. Click **"Save & Continue"**

#### 5. Share with Your Team
**All team members should use the SAME credentials!**
- Share the Project URL and API key with your team
- Everyone enters the same credentials in the extension
- Now you all see each other's comments! 🎉

---

## 🎯 Features

### Comments & Notes
- **Bubble Comments**: Click on charts to add pinned comments
- **Page Notes**: Add general notes for the entire dashboard
- **Replies**: Thread conversations on any comment
- **Filters**: View all comments, bubble comments only, or page notes only

### Team Collaboration (Database Mode)
- Real-time sync every 5 seconds
- See your teammates' comments
- Author names displayed on each comment
- Notifications when new comments are added

### Visual Indicators
- **Bubble Comments**: Orange tint with 📍 badge
- **Page Notes**: Blue tint
- **Replies**: Indented for easy threading

---

## 🔧 Configuration Management

### Reconfigure Database
1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Run: `chrome.storage.sync.clear()`
4. Reload the page
5. You'll see the configuration dialogs again

### Switch to Local Storage
1. Skip the database configuration dialog
2. Comments will be stored in your browser only
3. To re-enable later, follow the reconfigure steps above

### Export Data (Backup)
```javascript
// In browser console
chrome.storage.sync.get('comments', (result) => {
  console.log(JSON.stringify(result.comments, null, 2));
  // Copy and save this JSON
});
```

### Import Data (Restore)
```javascript
// In browser console
const backupData = [...]; // Paste your JSON array here
chrome.storage.sync.set({ comments: backupData }, () => {
  console.log('Data restored!');
});
```

---

## 🔒 Security Notes

### Database Credentials
- The **anon public key** is safe to share within your team
- Supabase has Row Level Security (RLS) - you can enable it for extra protection
- Consider using environment-specific databases (dev/staging/prod)

### Data Privacy
- Comments are stored with your username (email prefix)
- No sensitive data should be included in the credentials
- For production use, consider implementing RLS policies in Supabase

---

## 🐛 Troubleshooting

### "Connection failed" Error
- **Check URL format**: Must be `https://xxxxx.supabase.co` (no trailing slash)
- **Check API key**: Copy the full key (starts with `eyJ...`)
- **Table not created**: Make sure you ran the SQL query
- **Firewall**: Ensure your network allows connections to Supabase

### Comments Not Syncing
- Check browser console for errors
- Verify all team members have the same database credentials
- Real-time sync interval is 5 seconds - wait a moment
- Refresh the page to force a sync

### Bubbles Not Showing
- Ensure you're on a supported dashboard (Power BI or Grafana)
- Check if "Hide Bubbles" is toggled on
- Try scrolling - bubbles only show for visible charts
- Refresh the page

### Lost Comments
- Check the filter dropdown - you might be filtering them out
- Verify the correct dashboard - comments are page-specific
- If using database, check Supabase table in SQL Editor:
  ```sql
  SELECT * FROM stickr_comments;
  ```

---

## 📞 Support

### Debug Information
Access debug commands in browser console:
```javascript
// View all stored data
chrome.storage.sync.get(console.log);

// Clear all data
chrome.storage.sync.clear();

// Access app instance
window.stickrApp;

// Clear current page notes
window.stickrApp.clearAllNotes();
```

### Logs
All operations are logged to the browser console:
- 📍 Bubble operations
- 💾 Database operations
- 🔄 Real-time sync
- ✅ Success messages
- ❌ Error messages

---

## 🎓 Best Practices

### For Teams
1. Designate one person to set up Supabase
2. Share credentials securely (password manager, internal docs)
3. Use descriptive comment types (note, RCA, reference)
4. Reply to comments instead of creating duplicates
5. Regular cleanup of old/resolved comments

### For Solo Use
1. Skip database setup - local storage is simpler
2. Use page notes for general observations
3. Use bubble comments for specific chart issues
4. Export data periodically as backup

---

## 🔄 Updating the Extension

1. Pull latest code
2. Go to `chrome://extensions/`
3. Click reload icon for Stickr AI
4. Refresh your dashboard pages

**Note**: Your data (comments and configuration) is preserved during updates!

---

## 🌟 Supported Platforms

- ✅ Power BI (app.powerbi.com)
- ✅ Grafana (all instances)
- ✅ Custom dashboards (with manual configuration)

---

Enjoy collaborating with Stickr AI! 🚀

