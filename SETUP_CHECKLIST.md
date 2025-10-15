# Stickr AI - Complete Setup Checklist

## 🎯 What You Need to Do

This extension has **4 optional integrations**. You can use any combination based on your needs!

---

## 📋 SETUP CHECKLIST

### ✅ Step 1: Load the Extension (REQUIRED)
**Status:** ⏳ You need to do this

1. Open Chrome/Edge browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `/Users/preyal/stickr` folder
6. Extension should now appear with the Stickr AI icon

**Verification:** You should see "Stickr AI" in your extensions list

---

### ✅ Step 2: First Launch - Email Registration (REQUIRED)
**Status:** ⏳ Automatic on first use

1. Go to any Power BI or Grafana dashboard
2. A dialog will pop up asking for your email
3. Enter your work email (e.g., `john.doe@company.com`)
4. Your username will be extracted: `john.doe`

**No setup needed** - just enter your email when prompted!

---

### ⚙️ Step 3: Database Setup (OPTIONAL - For Team Collaboration)
**Status:** ⏳ Optional - Follow this if you want team features

#### Option A: Skip It (Solo Mode)
- Click "Skip for Now" when prompted
- Comments stored in your browser only
- **No external setup needed**

#### Option B: Configure Supabase (Team Mode)
**Time:** ~10 minutes

**What you need:**
1. Free Supabase account
2. Project URL
3. API Key (anon public)

**Steps:**

1. **Create Supabase Account**
   - Go to https://supabase.com
   - Sign up (free tier is perfect)
   - Click "New Project"
   - Choose organization and project name
   - Set a database password (save it!)
   - Wait ~2 minutes for project to provision

2. **Get Your Credentials**
   - Go to **Settings** → **API**
   - Copy these two values:
     ```
     Project URL: https://xxxxx.supabase.co
     anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

3. **Create the Database Table**
   - Go to **SQL Editor** in Supabase
   - Click "New Query"
   - Copy and paste this SQL:

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

-- Optional but recommended: Add indexes for better performance
CREATE INDEX idx_page_id ON stickr_comments("pageId");
CREATE INDEX idx_chart_hash ON stickr_comments("chartHash");
CREATE INDEX idx_author ON stickr_comments(author);
```

   - Click "Run" (or press F5)
   - You should see "Success. No rows returned"

4. **Configure in Extension**
   - The database dialog will appear after email registration
   - Enter your Project URL and API Key
   - Click "Test Connection"
   - If green ✅ appears, click "Save & Continue"

5. **Share with Team (Optional)**
   - Give your team the same URL and API Key
   - They enter the same credentials in their extension
   - Now you all share comments! 🎉

---

### 🎫 Step 4: Jira Integration (OPTIONAL - For Ticket Management)
**Status:** ⏳ Optional - Follow if you want Jira features

**What you need:**
1. Jira Cloud account (company Jira)
2. Jira URL
3. Jira API Token

**Steps:**

1. **Get Your Jira URL**
   - Your company Jira URL (e.g., `https://yourcompany.atlassian.net`)
   - Remove any trailing slashes

2. **Create API Token**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Give it a name: "Stickr AI"
   - Copy the token (it's shown only once!)

3. **Configure in Extension**
   - Open Stickr AI sidebar on any dashboard
   - Click "⚙️ Jira" button
   - Enter:
     - Jira URL: `https://yourcompany.atlassian.net`
     - Jira Email: Your Jira login email
     - API Token: Paste the token you created
   - Click "Test Connection"
   - If it shows your name, click "Save"
   - Button changes to "✅ Jira"

**What you can do with Jira:**
- Create Jira tickets from dashboard comments
- Sync comments to existing Jira issues
- Link dashboard insights to your project workflow

---

### 🤖 Step 5: AI Integration (OPTIONAL - For Chart Analysis)
**Status:** ⏳ Optional - Follow if you want AI features

**What you need:**
1. API key from OpenAI OR Anthropic

**Steps:**

#### Option A: Use OpenAI (GPT-4)

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Sign up or log in
   - Click "Create new secret key"
   - Copy the key (starts with `sk-...`)
   - **Cost:** ~$0.01-0.10 per analysis (pay as you go)

2. **Configure in Extension**
   - Open Stickr AI sidebar
   - Click "⚙️ AI" button
   - Select "OpenAI (GPT-4)" from dropdown
   - Paste your API key
   - Click "Test"
   - If green ✅ appears, click "Save"
   - Button changes to "✅ AI"

#### Option B: Use Anthropic (Claude)

1. **Get Anthropic API Key**
   - Go to https://console.anthropic.com/settings/keys
   - Sign up or log in
   - Click "Create Key"
   - Copy the key
   - **Cost:** ~$0.01-0.15 per analysis (pay as you go)

2. **Configure in Extension**
   - Open Stickr AI sidebar
   - Click "⚙️ AI" button
   - Select "Anthropic (Claude)" from dropdown
   - Paste your API key
   - Click "Test"
   - If green ✅ appears, click "Save"
   - Button changes to "✅ AI"

**What you can do with AI:**
- Ask AI to analyze charts and provide insights
- Get automated anomaly detection
- Generate action recommendations
- Understand complex visualizations

---

## 🎯 MINIMUM TO GET STARTED

**You only need to do:**
1. ✅ Load extension in Chrome (`chrome://extensions/`)
2. ✅ Enter your email when prompted
3. ✅ Click "Skip for Now" on database dialog

**That's it!** You can now:
- Add bubble comments to charts
- Create page notes
- Reply to comments
- Filter comments

All other features (Database, Jira, AI) are **completely optional**!

---

## 📊 FEATURE MATRIX

| Feature | Without Setup | With Database | With Jira | With AI |
|---------|--------------|---------------|-----------|---------|
| Add Comments | ✅ | ✅ | ✅ | ✅ |
| Bubble Comments | ✅ | ✅ | ✅ | ✅ |
| Reply Threads | ✅ | ✅ | ✅ | ✅ |
| Filter Comments | ✅ | ✅ | ✅ | ✅ |
| Team Collaboration | ❌ | ✅ | ✅ | ✅ |
| Real-time Sync | ❌ | ✅ | ✅ | ✅ |
| Cross-Browser Sync | ❌ | ✅ | ✅ | ✅ |
| Create Jira Tickets | ❌ | ❌ | ✅ | ✅ |
| Sync to Jira | ❌ | ❌ | ✅ | ✅ |
| AI Chart Analysis | ❌ | ❌ | ❌ | ✅ |
| AI Insights | ❌ | ❌ | ❌ | ✅ |

---

## 🔐 SECURITY & COSTS

### Database (Supabase)
- **Cost:** FREE (up to 500MB database, 1GB bandwidth/month)
- **Security:** Credentials stored in Chrome sync storage (encrypted)
- **Privacy:** You control the database

### Jira
- **Cost:** FREE (uses your existing Jira)
- **Security:** API token is safer than password
- **Permissions:** Same as your Jira account

### AI (OpenAI/Anthropic)
- **Cost:** Pay-per-use (~$0.01-0.15 per analysis)
- **Security:** API key stored in Chrome sync storage
- **Privacy:** Chart data sent to AI provider for analysis

**All credentials are stored securely** in Chrome's sync storage and never leave your browser except to authenticate with the respective services.

---

## 🧪 TESTING YOUR SETUP

### Test Basic Features (No external setup)
1. Load extension
2. Go to Power BI: https://app.powerbi.com
3. Or Grafana: https://play.grafana.org
4. Enter email when prompted
5. Click "Skip for Now" for database
6. Try adding a bubble comment to a chart
7. Try adding a page note at the bottom

### Test Database (If configured)
1. Add a comment
2. Open Supabase → SQL Editor
3. Run: `SELECT * FROM stickr_comments;`
4. You should see your comment!

### Test Team Sync (If database configured)
1. Have a teammate install extension
2. They enter SAME Supabase credentials
3. You add a comment
4. Wait 5-10 seconds
5. They should see your comment + toast notification

### Test Jira (If configured)
1. Add a bubble comment about an issue
2. Click on the comment in sidebar
3. Look for Jira buttons (will be added in next update)

### Test AI (If configured)
1. Hover over a chart bubble
2. Look for "Ask AI" button (will be added in next update)

---

## 🐛 TROUBLESHOOTING

### Extension won't load
- Make sure Developer Mode is ON
- Try removing and re-adding the extension
- Check browser console for errors (F12)

### Email dialog won't appear
- Refresh the dashboard page
- Make sure you're on Power BI or Grafana
- Check that extension is enabled

### Database connection fails
- Verify URL format: `https://xxxxx.supabase.co` (no trailing slash)
- Copy the FULL API key (very long string)
- Make sure you ran the SQL to create the table
- Check Supabase project is not paused

### Jira connection fails
- Verify URL format: `https://yourcompany.atlassian.net`
- Use your Jira login email
- Create a new API token if it expired
- Make sure you have Jira access

### AI connection fails
- Verify API key is correct (no extra spaces)
- Check you have credits/billing set up
- OpenAI keys start with `sk-...`
- Try the test button again after a minute

### Comments not syncing
- Check all team members have SAME database credentials
- Wait 5 seconds (polling interval)
- Refresh the page to force sync
- Check Supabase table has data

---

## 📞 QUICK REFERENCE

### Browser Console Commands
```javascript
// View all stored configuration
chrome.storage.sync.get(console.log);

// Check current user
chrome.storage.sync.get('userEmail', console.log);

// Check database config
chrome.storage.sync.get(['supabaseUrl', 'supabaseKey'], console.log);

// Check Jira config
chrome.storage.sync.get(['jiraUrl', 'jiraEmail'], console.log);

// Check AI config
chrome.storage.sync.get(['aiProvider', 'aiApiKey'], console.log);

// Clear ALL configuration (reset extension)
chrome.storage.sync.clear();

// Access the app
window.stickrApp;
```

---

## ✅ NEXT STEPS AFTER SETUP

1. **Try it out** - Add some comments to your dashboards
2. **Invite your team** - Share Supabase credentials
3. **Configure Jira** - Link to your workflow (optional)
4. **Enable AI** - Get intelligent insights (optional)
5. **Provide feedback** - Let us know what works!

---

## 📚 ADDITIONAL RESOURCES

- Full Setup Guide: `SETUP.md`
- Database Schema: Check `database.js`
- API Integration: Check `integrations.js`
- Code Documentation: Inline comments in `content.js`

---

## 🎉 YOU'RE READY!

**Minimum setup time:** 2 minutes (just email + skip database)
**Full setup time:** 30 minutes (all integrations)

**Start with the minimum, add integrations as you need them!**

Good luck! 🚀

