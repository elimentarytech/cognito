# Stickr AI - Quick Reference Card

## 🎯 What Does It Do?

**Stickr AI** is a Chrome extension that lets you add contextual comments and notes to dashboard charts (Grafana & Power BI). Comments can be shared with your team via a database backend.

---

## 📝 Comment Types

| Type | Where | Filter-Aware (Grafana) | Always Visible |
|------|-------|------------------------|----------------|
| **📍 Bubble Comments** | Pinned to specific charts | ✅ Yes | ❌ No (filter-dependent) |
| **📝 Page Notes** | Page-level (not chart-specific) | ❌ No | ✅ Yes |

---

## 🚀 Quick Actions

### Add Bubble Comment
1. Click **"📍 Add Bubble Comment"** in sidebar
2. Click on any chart
3. Enter comment & save
4. 🎉 Bubble appears on chart!

### Add Page Note
1. Type in the text field at bottom of sidebar
2. Select type (Comment/Note/RCA/Reference)
3. Press Enter or click ➕
4. 🎉 Note appears in sidebar!

### Reply to Comment
1. Click **💬** on any comment
2. Type your reply
3. Click "Send Reply"
4. 🎉 Reply appears indented below!

### Create Jira Ticket
1. Click **🎫** on any comment
2. Enter project key (e.g., "DATA")
3. Select issue type
4. Click "Create Ticket"
5. 🎉 Jira link appears on comment!

### AI Analyze Chart
**From Sidebar:**
1. Find bubble comment
2. Click **✨** button
3. Wait for analysis
4. Save as note (optional)

**From Bubble:**
1. Click bubble pin (📍)
2. Click **"✨ AI Analyze"**
3. Wait for analysis
4. Save as note (optional)

---

## 📅 Filter-Aware Bubbles (Grafana Only)

### How It Works
- Bubble comments **remember** the time range when created
- Only **show** when viewing the same time range
- Page notes **always visible** (not filter-aware)

### Visual Indicators
| Element | What It Shows |
|---------|---------------|
| **📅 Purple Badge** (Sidebar) | Time range for this comment |
| **📅 Blue Toast** (On screen) | "Time range changed: X to Y" |
| **📍 Bubble Pin** (Chart) | Comment visible (filter matches) |

### Example
```
1. Set range to "Last 7 days"
2. Add comment: "Spike due to backup job"
3. Change to "Last 1 hour"
   → Bubble disappears (filter mismatch)
   → Still visible in sidebar with "📅 now-7d" badge
4. Change back to "Last 7 days"
   → Bubble reappears!
```

---

## ⚙️ Configuration

### Email Registration (First Launch)
- Required to use the extension
- Username extracted from email (part before @)
- Used to track comment authors

### Database Setup (Optional)
**Supported:**
- ✅ Supabase (PostgreSQL)
- ✅ MongoDB Atlas

**Why?**
- Share comments with team
- Persistent storage
- Real-time sync

### Jira Integration (Optional)
**Setup:**
1. Jira URL (e.g., `https://yourcompany.atlassian.net`)
2. Email address
3. API token

**Features:**
- Create tickets from comments
- Track ticket links
- Sync to Jira

### AI Integration (Optional)
**Providers:**
- ✅ OpenAI (GPT-4o Vision)
- ✅ Anthropic (Claude 3.5 Sonnet)

**Features:**
- Analyze chart screenshots
- Get AI insights
- Save analysis as notes

---

## 🎨 Sidebar UI

```
┌─────────────────────────────────────┐
│  📍 Stickr AI              [≡]      │ ← Header
├─────────────────────────────────────┤
│  [📍 Add Bubble]  [🗑️ Clear All]    │ ← Actions
│  [Show Bubbles ●]  [Filter: All ▾]  │ ← Controls
├─────────────────────────────────────┤
│  📍 COMMENT · 2h ago                │ ← Comment Card
│  📊 Chart Name                      │ ← Chart Label
│  📅 now-7d                          │ ← Filter Badge
│  "Your comment text here..."        │ ← Comment Text
│  👤 john                            │ ← Author
│  [💬] [🎫] [✨] [🗑️]                 │ ← Actions
├─────────────────────────────────────┤
│  ... more comments ...              │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Add a note...               │   │ ← Quick Note Input
│  └─────────────────────────────┘   │
│  [Comment ▾]  [➕]                  │
└─────────────────────────────────────┘
```

---

## 🎛️ Sidebar Controls

### Show/Hide Bubbles Toggle
- **ON** (●): Bubbles visible on charts
- **OFF** (○): Bubbles hidden (sidebar still shows comments)

### Comment Filter
- **📋 All**: Show all comments (bubbles + notes)
- **📍 Bubbles**: Show only bubble comments
- **📝 Notes**: Show only page notes

### Settings Menu (⚙️)
- **💾 Database Configuration**
- **🎫 Jira Integration**
- **✨ AI Configuration**

---

## 💡 Pro Tips

1. **Filter Organization**
   - Use "Last 7 days" for weekly reviews
   - Use "Last 1 hour" for live incidents
   - Comments auto-filter based on time range!

2. **Team Collaboration**
   - Configure shared database
   - Everyone sees each other's comments
   - Real-time updates every 5 seconds

3. **Jira Workflow**
   - Add comment during incident
   - Click 🎫 to create ticket
   - Jira link auto-attaches to comment

4. **AI Insights**
   - Use on complex charts
   - Save analysis for team reference
   - Works best with clear visualizations

5. **Threading**
   - Reply to comments for discussions
   - Replies are indented
   - Maintain context in conversations

---

## 🐛 Troubleshooting

### Bubbles Not Showing?
- ✅ Check "bbles" toggle is ON
- ✅ Verify time range matches (Grafana)
- ✅ Check comment filter setting
- ✅ Wait 2-3 seconds for rendering

### Filter Badge Missing?
- Only shows for Grafana bubble comments
- Old comments may not have filter data
- Page notes don't show filter badge

### Database Not Syncing?
- ✅ Test connection in settings
- ✅ Check API keys/URLs
- ✅ Verify network connectivity
- ✅ Check console for errors

### Jira/AI Not Working?
- ✅ Reconfigure in Settings menu
- ✅ Test connection
- ✅ Check API tokens are valid
- ✅ Verify CORS is not blocking (should be handled by extension)

---

## 📚 Documentation Files

| File | What's Inside |
|------|---------------|
| `SETUP.md` | Initial setup guide |
| `SETUP_CHECKLIST.md` | Quick setup checklist |
| `DATABASE_GUIDE.md` | Database configuration (Supabase/MongoDB) |
| `JIRA_AI_INTEGRATION_GUIDE.md` | Jira & AI features |
| `FILTER_AWARE_COMMENTS.md` | Filter-aware bubbles (Grafana) |
| `QUICK_REFERENCE.md` | This file! |

---

## 🎯 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Cancel bubble placement | `ESC` |

---

## 🌐 Supported Platforms

| Platform | Bubble Comments | Page Notes | Filter-Aware |
|----------|----------------|------------|--------------|
| **Grafana** | ✅ | ✅ | ✅ (time range) |
| **Power BI** | ✅ | ✅ | 🚧 (planned) |

---

## 📊 Data Structure

### Comment Object
```javascript
{
  id: "unique-id",
  type: "bubble" | "page",
  text: "Your comment",
  link: "https://...",  // optional
  commentType: "comment" | "note" | "rca" | "reference",
  timestamp: "2025-10-13T12:00:00.000Z",
  author: "username",
  pageId: "page-identifier",
  parentId: null,  // for replies
  replies: [],
  chartHash: "chart-id",  // bubble only
  chartLabel: "Chart Name",  // bubble only
  filterState: {  // Grafana bubble only
    from: "now-7d",
    to: "now",
    timezone: "browser"
  },
  jiraTicket: {  // optional
    key: "PROJ-123",
    url: "https://..."
  }
}
```

---

## 🎨 Color Coding

| Element | Color | Meaning |
|---------|-------|---------|
| **Orange/Amber** | `#F59E0B` | Bubble comments |
| **Blue** | `#3B82F6` | Page notes |
| **Purple** | `#7C3AED` | Filter badges |
| **Green** | `#10B981` | Success toasts |
| **Red** | `#EF4444` | Error toasts |

---

## ⚡ Performance

- **Bubble rendering**: Debounced to prevent flicker
- **Filter detection**: Every 3 seconds (Grafana)
- **Real-time sync**: Every 5 seconds (if DB configured)
- **Scroll handling**: Debounced 50ms

---

## 🔒 Data Storage

### Local (No DB)
- Stored in: Chrome Sync Storage
- Limit: ~100KB
- Shared: Across your Chrome browsers only

### Database (Supabase/MongoDB)
- Stored in: Your configured database
- Limit: Based on your plan
- Shared: With your team

---

## 📞 Need Help?

1. Check console logs (F12 → Console)
2. Look for emoji indicators:
   - 📅 = Filter-related
   - 💾 = Save operations
   - 🚫 = Hidden/filtered
   - ✨ = AI features
   - 🎫 = Jira features

3. Read detailed guides:
   - Setup issues → `SETUP.md`
   - Database config → `DATABASE_GUIDE.md`
   - Filters → `FILTER_AWARE_COMMENTS.md`
   - Jira/AI → `JIRA_AI_INTEGRATION_GUIDE.md`

---

*Last updated: October 2025*  
*Version: 1.0 (Filter-Aware Release)*

