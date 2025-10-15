# 🎯 JIRA & AI INTEGRATION - USER GUIDE

## ✅ What's Been Implemented

All Jira and AI integration UI workflows and functionality have been implemented!

---

## 🎫 JIRA INTEGRATION

### Features

1. **Create Jira Tickets from Comments**
   - Convert any comment into a Jira ticket
   - Automatically includes comment text, chart info, and references
   - Store ticket link with the comment for easy access

2. **Jira Ticket Display**
   - View Jira ticket links directly in comments
   - Click to open ticket in Jira
   - Visual indicator (🎫) shows which comments have tickets

### How to Use

#### Step 1: Configure Jira (Already Done ✅)
- You've already configured Jira in Settings → Jira Integration
- Your credentials are saved and ready

#### Step 2: Create a Ticket from a Comment

1. Find any comment in the sidebar
2. Look for the **🎫** button in the comment actions
3. Click the button to open the "Create Jira Ticket" dialog
4. The dialog pre-fills with:
   - **Summary**: First 100 chars of comment
   - **Description**: Full comment text + chart label + reference
   - **Project Key**: Enter your Jira project (e.g., "PROJ", "DATA")
   - **Issue Type**: Select Task/Bug/Story/Epic

5. Click **"🎫 Create Ticket"**
6. Wait for confirmation
7. The ticket link is now attached to your comment!

#### Step 3: View Jira Tickets

- Comments with Jira tickets show a blue link: **🎫 PROJ-123**
- Click the link to open the ticket in Jira
- Ticket persists across page reloads

### When You'll See the Jira Button

The 🎫 button appears on comments when:
- ✅ Jira is configured (you did this!)
- ✅ Comment doesn't already have a ticket
- ✅ You're viewing the comment in the sidebar

---

## 🤖 AI INTEGRATION

### Features

1. **AI Chart Analysis**
   - Capture chart screenshots automatically
   - Send to OpenAI GPT-4 Vision for analysis
   - Get insights on metrics, trends, anomalies, recommendations

2. **Save AI Analysis as Notes**
   - Save AI insights directly as page notes
   - Reference them later
   - Share with team via database

3. **AI Button Placement**
   - **Sidebar Comments**: ✨ button on bubble comments
   - **Bubble Popups**: ✨ AI Analyze button

### How to Use

#### Step 1: Configure AI (Already Done ✅)
- You've already configured OpenAI in Settings → AI Configuration
- Your API key is saved and ready

#### Step 2: Analyze a Chart (Method A: From Sidebar)

1. Find a **bubble comment** in the sidebar (orange background)
2. Look for the **✨** button in the comment actions
3. Click the button
4. Extension will:
   - Find the chart this comment belongs to
   - Capture a screenshot
   - Send to OpenAI GPT-4 Vision
   - Show AI analysis in a dialog

#### Step 3: Analyze a Chart (Method B: From Bubble)

1. Click on any chart **bubble** (📍 pin on chart)
2. The bubble popup opens with comment thread
3. Click **"✨ AI Analyze"** button at the bottom
4. Extension will:
   - Capture the chart screenshot
   - Send to OpenAI GPT-4 Vision
   - Show AI analysis in a dialog

#### Step 4: View & Save AI Analysis

When analysis is complete, you'll see:
- **AI Chart Analysis** dialog
- Structured insights including:
  - Key metrics and values
  - Trends and patterns
  - Anomalies
  - Recommendations

Two options:
- **Close**: Just view and close
- **💾 Save as Note**: Saves analysis as a page note

### When You'll See the AI Button

The ✨ button appears when:
- ✅ AI is configured (you did this!)
- ✅ You're viewing a bubble comment (chart-specific comment)
- ✅ In sidebar: any bubble comment
- ✅ In bubble popup: always visible

---

## 📋 COMPLETE WORKFLOW EXAMPLES

### Example 1: Dashboard Review with AI & Jira

1. **Add Bubble Comment** to a chart with unusual spike
2. Click **✨ AI Analyze** on the bubble
3. AI provides insights: "Spike due to weekend campaign, +45% traffic"
4. Click **💾 Save as Note** to keep AI analysis
5. Back in sidebar, click **🎫 Create Jira Ticket** on your comment
6. Select project "DATA", type "Task"
7. Ticket created: **DATA-456**
8. Now your comment has:
   - Original observation
   - AI analysis (saved as note)
   - Jira ticket for follow-up

### Example 2: Quick Chart Analysis

1. See an interesting chart
2. Click the **📍 bubble** on it
3. Click **✨ AI Analyze** in popup
4. Get instant AI insights
5. Close or save as needed

### Example 3: Convert Old Comments to Tickets

1. Review sidebar comments
2. Find comments that need follow-up
3. Click **🎫** button on each
4. Create Jira tickets in bulk
5. Track all issues in Jira

---

## 🎨 UI ELEMENTS

### Buttons Added

| Button | Location | Icon | Purpose |
|--------|----------|------|---------|
| Create Jira Ticket | Sidebar comment actions | 🎫 | Create Jira ticket from comment |
| AI Analyze (sidebar) | Sidebar bubble comment actions | ✨ | Analyze chart for that bubble comment |
| AI Analyze (bubble) | Bubble popup | ✨ AI Analyze | Analyze chart in popup |

### Visual Indicators

| Element | Look | Meaning |
|---------|------|---------|
| Jira Link | 🎫 PROJ-123 (blue badge) | Comment has Jira ticket |
| AI Button | ✨ (sparkle icon) | AI analysis available |
| Loading | 🤖 + spinner | AI analyzing chart |

---

## 🔧 TECHNICAL DETAILS

### Chart Screenshot Capture
- Uses **html2canvas** library (loaded dynamically)
- High-quality 2x scale
- Captures entire chart element
- Converts to PNG base64

### AI Models Used
- **OpenAI**: GPT-4o (vision-capable model)
- **Anthropic**: Claude 3.5 Sonnet (vision-capable)
- Both support image analysis
- Max tokens: 1000 (OpenAI) / 1024 (Anthropic)

### Jira API
- Uses Jira REST API v3
- Creates issues via background script (CORS bypass)
- Supports all standard issue types
- Returns ticket key and URL

### Data Storage
- Jira ticket info stored in comment object:
  ```javascript
  {
    jiraTicket: {
      key: "PROJ-123",
      url: "https://yourcompany.atlassian.net/browse/PROJ-123"
    }
  }
  ```
- AI analysis can be saved as regular notes

---

## 💡 TIPS & BEST PRACTICES

### Jira Integration

1. **Project Keys**: Find in your Jira project URL
   - Example: `https://company.atlassian.net/browse/DATA` → Key is "DATA"

2. **Issue Types**: Use appropriate types
   - **Task**: General follow-up items
   - **Bug**: Data quality issues, chart errors
   - **Story**: Feature requests, enhancements
   - **Epic**: Large initiatives

3. **Descriptions**: Auto-populated with:
   - Comment text
   - Chart name (if bubble comment)
   - Reference links
   - Edit as needed before creating

### AI Integration

1. **Best Charts for AI Analysis**:
   - ✅ Time series with trends
   - ✅ Charts with multiple metrics
   - ✅ Complex dashboards
   - ✅ Charts showing anomalies

2. **AI Analysis Prompts**:
   - Current default asks for metrics, trends, anomalies, recommendations
   - AI provides structured, actionable insights

3. **Save Important Analyses**:
   - Use **💾 Save as Note** for insights you want to keep
   - Saved notes are searchable and shareable

4. **Cost Awareness**:
   - Each AI analysis costs API tokens
   - GPT-4o Vision: ~$0.01-0.05 per analysis
   - Use strategically on important charts

---

## 🚀 QUICK START CHECKLIST

- [✅] Jira configured
- [✅] OpenAI configured
- [ ] Try creating Jira ticket from a comment
- [ ] Try AI analysis on a bubble comment
- [ ] Save an AI analysis as a note
- [ ] Open a Jira ticket link

---

## ❓ TROUBLESHOOTING

### "Jira ticket creation failed"
- Check project key is correct (case-sensitive)
- Verify you have permissions in that project
- Test Jira connection in Settings

### "AI analysis failed"
- Check OpenAI API key is valid
- Ensure you have API credits
- Check browser console for specific errors

### "🎫 button not showing"
- Jira must be configured
- Button only shows if comment doesn't have ticket yet
- Reconfigure in Settings if needed

### "✨ button not showing"
- AI must be configured
- Button only shows on bubble comments (orange background)
- Reconfigure in Settings if needed

---

## 🎉 SUCCESS!

You now have full Jira and AI integration!

**Next Steps:**
1. Review your existing comments
2. Try AI analysis on interesting charts
3. Create Jira tickets for follow-ups
4. Share insights with your team

Happy annotating! 📊✨🎫

