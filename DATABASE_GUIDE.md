# Stickr AI - Multi-Database Support Guide

## 🗄️ Supported Databases

Stickr AI now supports **4 database providers** for team collaboration:

1. **Supabase** (PostgreSQL) - **Recommended** ⭐
2. **MongoDB Atlas** 
3. **PostgreSQL** (Self-hosted)
4. **MySQL** (Self-hosted)

---

## 📊 Provider Comparison

| Feature | Supabase | MongoDB Atlas | PostgreSQL | MySQL |
|---------|----------|---------------|------------|-------|
| **Free Tier** | ✅ Yes | ✅ Yes | ❌ Self-host | ❌ Self-host |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard | ⭐⭐⭐ Hard |
| **REST API** | ✅ Built-in | ✅ Data API | ❌ Need wrapper | ❌ Need wrapper |
| **Real-time** | ✅ Yes | ✅ Yes | ⏱️ Polling | ⏱️ Polling |
| **Best For** | Most users | MongoDB fans | Self-hosters | Self-hosters |

**Recommendation:** Use **Supabase** for easiest setup and best features.

---

## 🚀 Setup Instructions

### Option 1: Supabase (Recommended)

**Time:** ~10 minutes | **Cost:** FREE

#### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free account
3. Click "New Project"
4. Choose organization and project name
5. Set database password (save it!)
6. Wait ~2 minutes for provisioning

#### Step 2: Get Credentials
1. Go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` (long key)

#### Step 3: Create Table
1. Go to **SQL Editor**
2. Click "New Query"
3. Paste and run this SQL:

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
  "relativeY" REAL,
  "filterState" JSONB,  -- NEW: For filter-aware comments (Grafana)
  "jiraTicket" JSONB    -- For Jira integration
);

-- Indexes for better performance
CREATE INDEX idx_page_id ON stickr_comments("pageId");
CREATE INDEX idx_chart_hash ON stickr_comments("chartHash");
CREATE INDEX idx_author ON stickr_comments(author);
```

#### Step 4: Configure in Extension
1. Open Stickr AI on any dashboard
2. In database dialog, select "Supabase"
3. Enter Project URL and API Key
4. Click "Test Connection"
5. Click "Save & Continue"

✅ Done! Share credentials with your team.

---

### Option 2: MongoDB Atlas

**Time:** ~15 minutes | **Cost:** FREE

#### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a new cluster (M0 free tier)
4. Wait ~5 minutes for cluster creation

#### Step 2: Enable Data API
1. Go to **Data API** in left sidebar
2. Enable Data API
3. Create API Key
4. Copy the Data API URL and API Key

#### Step 3: Create Database & Collection
1. Go to **Browse Collections**
2. Click "Add My Own Data"
3. Database name: `stickr`
4. Collection name: `stickr_comments`

**MongoDB Schema (JSON):**
```json
{
  "id": "string (unique)",
  "text": "string",
  "link": "string",
  "commentType": "string",
  "type": "string (bubble|page)",
  "timestamp": "string (ISO 8601)",
  "author": "string",
  "pageId": "string",
  "parentId": "string|null",
  "replies": "array",
  "chartHash": "string",
  "chartLabel": "string",
  "relativeX": "number",
  "relativeY": "number",
  "filterState": {
    "from": "string",
    "to": "string",
    "timezone": "string"
  },
  "jiraTicket": {
    "key": "string",
    "url": "string"
  }
}
```

**Note:** MongoDB is schema-less, so the schema is enforced by the application. The `filterState` and `jiraTicket` fields are optional and only present when applicable.

#### Step 4: Configure in Extension
1. Select "MongoDB Atlas" in database dialog
2. Enter:
   - **Data API URL**: `https://data.mongodb-api.com/app/...`
   - **API Key**: Your API key
   - **Database**: `stickr`
3. Click "Test Connection"
4. Click "Save & Continue"

**Note:** MongoDB Atlas Data API provides REST endpoints that work from browser extensions.

---

### Option 3: PostgreSQL (Self-hosted)

**Time:** ~30 minutes | **Cost:** Your hosting

**⚠️ Important:** PostgreSQL cannot be accessed directly from browser extensions for security reasons. You need to create a REST API wrapper.

#### Requirements:
1. PostgreSQL database server
2. REST API wrapper service (Node.js/Python/Go)
3. HTTPS endpoint accessible from browsers

#### Step 1: Setup PostgreSQL
```sql
CREATE DATABASE stickr;

\c stickr

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
  "relativeY" REAL,
  "filterState" JSONB,  -- NEW: For filter-aware comments (Grafana)
  "jiraTicket" JSONB    -- For Jira integration
);

CREATE INDEX idx_page_id ON stickr_comments("pageId");
CREATE INDEX idx_chart_hash ON stickr_comments("chartHash");
```

#### Step 2: Create REST API Wrapper
Example Node.js API (Express + pg):

```javascript
const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

// CORS for extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Connection endpoint
app.post('/api/query', async (req, res) => {
  const { database, user, password, query, params } = req.body;
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database, user, password
  });
  
  try {
    const result = await pool.query(query, params);
    res.json({ rows: result.rows, rowCount: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
});

app.listen(3000);
```

#### Step 3: Deploy API
1. Deploy to a server (AWS, DigitalOcean, Heroku, etc.)
2. Enable HTTPS (required for Chrome extensions)
3. Get your API URL: `https://your-api.com`

#### Step 4: Configure in Extension
1. Select "PostgreSQL" in database dialog
2. Enter:
   - **API Host**: `https://your-api.com`
   - **Port**: `3000` (or your port)
   - **Database**: `stickr`
   - **Username**: Your PostgreSQL user
   - **Password**: Your PostgreSQL password
3. Click "Test Connection"
4. Click "Save & Continue"

---

### Option 4: MySQL (Self-hosted)

**Time:** ~30 minutes | **Cost:** Your hosting

**⚠️ Important:** Like PostgreSQL, MySQL needs a REST API wrapper.

#### Step 1: Setup MySQL
```sql
CREATE DATABASE stickr;

USE stickr;

CREATE TABLE stickr_comments (
  id VARCHAR(255) PRIMARY KEY,
  text TEXT,
  link TEXT,
  commentType VARCHAR(50),
  type VARCHAR(50),
  timestamp VARCHAR(50),
  author VARCHAR(255),
  pageId VARCHAR(255),
  parentId VARCHAR(255),
  replies JSON,
  chartHash VARCHAR(255),
  chartLabel TEXT,
  relativeX FLOAT,
  relativeY FLOAT
);

CREATE INDEX idx_page_id ON stickr_comments(pageId);
CREATE INDEX idx_chart_hash ON stickr_comments(chartHash);
```

#### Step 2: Create REST API Wrapper
Example Node.js API (Express + mysql2):

```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

app.use(express.json());

// CORS for extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/api/query', async (req, res) => {
  const { database, user, password, query, params } = req.body;
  
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      database, user, password
    });
    
    const [rows] = await connection.execute(query, params);
    res.json({ rows, affectedRows: rows.affectedRows });
    
    await connection.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

#### Step 3: Deploy & Configure
Same as PostgreSQL - deploy with HTTPS and configure in extension.

---

## 🔧 Extension Configuration

### In the Extension Dialog:

1. **Database Provider Dropdown**
   - Select your database type
   - Form fields change based on selection

2. **Provider-Specific Fields**
   - **Supabase**: URL + API Key
   - **MongoDB**: URI + Database + API Key
   - **PostgreSQL**: Host + Port + DB + User + Password
   - **MySQL**: Host + Port + DB + User + Password

3. **Test Connection**
   - Always test before saving
   - Verifies credentials and connectivity
   - Shows success/error messages

4. **Save**
   - Only enabled after successful test
   - Stores encrypted in Chrome sync storage

---

## 💾 Database Schema

All providers use the same schema:

```
stickr_comments
├── id (TEXT/VARCHAR) - Unique comment ID
├── text (TEXT) - Comment content
├── link (TEXT) - Optional reference URL
├── commentType (TEXT) - comment/note/rca/reference
├── type (TEXT) - bubble/page
├── timestamp (TEXT) - ISO timestamp
├── author (TEXT) - Username from email
├── pageId (TEXT) - Dashboard identifier
├── parentId (TEXT) - For threaded replies
├── replies (JSON/JSONB) - Reply metadata
├── chartHash (TEXT) - Unique chart ID
├── chartLabel (TEXT) - Human-readable chart name
├── relativeX (REAL/FLOAT) - Bubble X position
└── relativeY (REAL/FLOAT) - Bubble Y position
```

**Indexes:**
- `idx_page_id` on pageId
- `idx_chart_hash` on chartHash
- `idx_author` on author (optional)

---

## 🔄 How It Works

### Local Storage (No Database)
- Comments stored in `chrome.storage.sync`
- Max ~100KB storage
- Solo use only
- No team collaboration

### With Database
- Comments stored in your chosen database
- Team sees same data
- Real-time sync every 5 seconds
- Unlimited storage
- Cross-browser sync

### Polling vs Real-time
- **Supabase**: Could use real-time subscriptions (not implemented yet)
- **MongoDB**: Could use change streams (not implemented yet)
- **PostgreSQL/MySQL**: Polling only (5-second interval)

Current implementation uses **polling for all providers** for simplicity and consistency.

---

## 🔐 Security Notes

### Credentials Storage
- All credentials stored in `chrome.storage.sync`
- Encrypted by Chrome
- Synced across your Chrome profile
- Never sent to Stickr AI servers (we have none!)

### Database Access
- **Supabase**: Uses anon key (read/write only)
- **MongoDB**: Uses Data API key (scoped access)
- **PostgreSQL/MySQL**: Your credentials (secure your API!)

### Best Practices
1. Use read-only credentials where possible
2. Enable Row Level Security (RLS) in Supabase
3. Implement rate limiting in self-hosted APIs
4. Use HTTPS for all connections
5. Don't share production credentials in team chat

---

## ⚡ Performance

| Provider | Read Speed | Write Speed | Latency |
|----------|-----------|-------------|---------|
| Supabase | ~100-300ms | ~100-300ms | Low |
| MongoDB Atlas | ~150-400ms | ~150-400ms | Medium |
| PostgreSQL | Depends on host | Depends on host | Varies |
| MySQL | Depends on host | Depends on host | Varies |

**Factors affecting performance:**
- Database location (region)
- Network latency
- Database load
- API wrapper performance (for self-hosted)

---

## 🐛 Troubleshooting

### Supabase Connection Fails
- ✅ Check URL format: `https://xxxxx.supabase.co` (no trailing slash)
- ✅ Use anon public key, not service_role key
- ✅ Verify table exists
- ✅ Check project is not paused

### MongoDB Connection Fails
- ✅ Data API must be enabled
- ✅ Use Data API URL, not connection string
- ✅ API Key must have read/write permissions
- ✅ Database and collection must exist

### PostgreSQL/MySQL Connection Fails
- ✅ API wrapper must be running
- ✅ Must use HTTPS (not HTTP)
- ✅ CORS must be configured
- ✅ Credentials must be correct
- ✅ Firewall must allow connections

### Comments Not Syncing
- ✅ All team members must use SAME credentials
- ✅ Wait 5 seconds (polling interval)
- ✅ Check database has data (use SQL query)
- ✅ Refresh page to force sync

---

## 💰 Cost Comparison

### Supabase
- **Free tier**: 500MB database, 1GB bandwidth/month
- **Pro**: $25/month - 8GB database, 50GB bandwidth
- **Best for**: Teams up to 50 people

### MongoDB Atlas
- **Free tier**: 512MB storage, shared RAM
- **Serverless**: Pay per operation (~$0.10/million)
- **Dedicated**: Starting $57/month
- **Best for**: Teams with MongoDB expertise

### PostgreSQL (Self-hosted)
- **DigitalOcean**: $4-6/month (smallest droplet)
- **AWS RDS**: $12+/month
- **Heroku**: $5-9/month (hobby tier)
- **Best for**: Technical teams with DevOps

### MySQL (Self-hosted)
- **DigitalOcean**: $4-6/month
- **AWS RDS**: $12+/month
- **Best for**: Technical teams with existing MySQL

**Recommendation for most teams:** Start with **Supabase free tier** ($0/month).

---

## 🔄 Migration Guide for Existing Users

**If you already have a database set up**, you need to add the new fields to support the latest features.

### For Supabase Users

Run this SQL in the SQL Editor:

```sql
-- Add new columns for filter-aware comments and Jira integration
ALTER TABLE stickr_comments 
ADD COLUMN IF NOT EXISTS "filterState" JSONB,
ADD COLUMN IF NOT EXISTS "jiraTicket" JSONB;
```

### For MongoDB Atlas Users

**No action needed!** MongoDB is schema-less. The new fields will be automatically added when comments with these properties are saved.

### For PostgreSQL Users

Run this SQL:

```sql
ALTER TABLE stickr_comments 
ADD COLUMN IF NOT EXISTS "filterState" JSONB,
ADD COLUMN IF NOT EXISTS "jiraTicket" JSONB;
```

### For MySQL Users

Run this SQL:

```sql
ALTER TABLE stickr_comments 
ADD COLUMN filterState JSON DEFAULT NULL,
ADD COLUMN jiraTicket JSON DEFAULT NULL;
```

### What These Fields Do

**`filterState`** (JSONB/JSON):
- Stores Grafana time range filters for bubble comments
- Example: `{"from": "now-7d", "to": "now", "timezone": "browser"}`
- Enables filter-aware bubble comments
- Optional: Only present on Grafana bubble comments

**`jiraTicket`** (JSONB/JSON):
- Stores Jira ticket information when created from a comment
- Example: `{"key": "PROJ-123", "url": "https://..."}`
- Links comments to Jira issues
- Optional: Only present when Jira ticket is created

### Verification

After running the migration, verify the columns exist:

**Supabase/PostgreSQL:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stickr_comments';
```

**MongoDB:**
No verification needed - fields appear when data is saved.

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## ✅ Quick Decision Guide

**Choose Supabase if:**
- ✅ You want the easiest setup
- ✅ You want a free tier
- ✅ You're not a database expert
- ✅ You want official REST API
- ✅ You want potential real-time features

**Choose MongoDB Atlas if:**
- ✅ Your team already uses MongoDB
- ✅ You prefer document storage
- ✅ You want a free tier
- ✅ You're comfortable with MongoDB

**Choose PostgreSQL if:**
- ✅ You need full control
- ✅ You have DevOps expertise
- ✅ You want to self-host
- ✅ You have existing PostgreSQL infrastructure

**Choose MySQL if:**
- ✅ You need full control
- ✅ Your team knows MySQL well
- ✅ You have existing MySQL infrastructure
- ✅ You want to self-host

**Still unsure?** → Go with **Supabase**! It's the easiest and most feature-complete option.

---

Good luck with your database setup! 🚀

