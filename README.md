# Stickr AI

> AI-powered comments and notes for Power BI, Grafana and other dashboard visualizations

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/stickr-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://chrome.google.com/webstore)

## 🎯 Overview

Stickr AI is a powerful Chrome extension that transforms how teams collaborate on data dashboards. Add contextual comments, AI-powered insights, and Jira integration directly to your Power BI and Grafana visualizations.

### ✨ Key Features

- **📝 Smart Comments**: Add contextual notes to specific charts and visualizations
- **🤖 AI Analysis**: Get AI-powered insights about your charts using OpenAI or Anthropic
- **🎫 Jira Integration**: Create and link Jira tickets directly from comments
- **👥 Team Collaboration**: Share comments across your team with database storage
- **🔍 Filter-Aware**: Comments adapt to time range changes in Grafana dashboards
- **💬 Threaded Conversations**: Reply to comments and build discussion threads
- **🎨 Professional UI**: Clean, modern interface with smooth animations

## 🚀 Quick Start

### Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/stickr-ai.git
   cd stickr-ai
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `stickr-ai` folder

3. **First Launch**
   - Navigate to a Power BI or Grafana dashboard
   - Click the Stickr AI extension icon
   - Enter your email address to get started

## 🎮 How to Use

### Adding Comments

1. **Bubble Comments** (Chart-specific)
   - Click the 📍 button in the sidebar
   - Click on any chart to add a comment
   - Comments are tied to specific visualizations

2. **Page Notes** (General)
   - Use the text input at the bottom of the sidebar
   - Add general notes about the entire dashboard

3. **Replying to Comments**
   - Click the reply button on any comment
   - Build threaded conversations

### AI Analysis

1. **Setup AI Integration**
   - Click the ⚙️ settings button
   - Configure OpenAI or Anthropic API keys
   - Test the connection

2. **Analyze Charts**
   - Click the 🤖 AI Analyze button on any comment
   - Get insights about chart patterns, trends, and anomalies

### Jira Integration

1. **Setup Jira**
   - Configure your Jira URL and API token
   - Test the connection

2. **Create Tickets**
   - Click the 🎫 Create Jira Ticket button
   - Select a project and add details
   - Link tickets to comments

## 🗄️ Database Configuration

### Local Storage (Default)
- Comments stored in your browser only
- Perfect for personal use
- No setup required

### Team Collaboration (Supabase/MongoDB)

#### Supabase Setup (Recommended)

1. **Create Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for free

2. **Create Project**
   - Click "New Project"
   - Choose a name and database password

3. **Get Credentials**
   - Go to Settings → API
   - Copy Project URL and anon public key

4. **Create Table**
   ```sql
   CREATE TABLE cognito_comments (
     id TEXT PRIMARY KEY,
     text TEXT NOT NULL,
     type TEXT NOT NULL,
     link TEXT,
     commentType TEXT NOT NULL,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     author TEXT NOT NULL,
     pageId TEXT NOT NULL,
     parentId TEXT,
     chartHash TEXT,
     chartLabel TEXT,
     relativeX REAL,
     relativeY REAL,
     jiraTicket JSONB,
     filterState JSONB
   );
   ```

5. **Configure in Extension**
   - Click ⚙️ settings
   - Select "Supabase"
   - Enter your credentials

#### MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create free cluster

2. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string

3. **Configure in Extension**
   - Select "MongoDB"
   - Enter connection string and database name

## 🔧 Configuration

### Supported Platforms
- **Power BI**: `app.powerbi.com`, `*.powerbi.com`
- **Grafana**: `*.grafana.com`, `*.grafana.net`, `play.grafana.org`
- **Local Development**: `localhost:3000`

### API Integrations

#### OpenAI
- **Model**: GPT-4o-mini (with vision support)
- **Features**: Chart analysis, trend detection, anomaly identification
- **Setup**: Get API key from [platform.openai.com](https://platform.openai.com)

#### Anthropic Claude
- **Model**: Claude 3.5 Sonnet
- **Features**: Advanced chart analysis and insights
- **Setup**: Get API key from [console.anthropic.com](https://console.anthropic.com)

#### Jira
- **Features**: Create tickets, link to comments, search existing tickets
- **Setup**: Generate API token from your Jira account settings

## 🎨 Features in Detail

### Smart Comment Types
- **💬 Comment**: General observations
- **📝 Note**: Important information
- **🔍 RCA**: Root cause analysis
- **📚 Reference**: Links and documentation

### Filter-Aware Comments (Grafana)
- Comments automatically adapt to time range changes
- Only show relevant comments for current filters
- Perfect for time-series analysis

### Professional UI
- **Collapsible Sidebar**: Clean, unobtrusive interface
- **Bubble System**: Visual indicators on charts
- **Smooth Animations**: Professional user experience
- **Responsive Design**: Works on all screen sizes

## 🛠️ Development

### Project Structure
```
stickr-ai/
├── manifest.json          # Extension configuration
├── content.js             # Main extension logic
├── styles.css             # UI styling
├── database.js            # Database adapters
├── integrations.js        # AI and Jira integrations
├── background.js          # Service worker
├── popup.html/js          # Extension popup
├── icons/                 # Extension icons
└── docs/                  # Documentation
```

### Key Components

- **DatabaseAdapter**: Modular database support (Supabase, MongoDB, Local)
- **AIIntegration**: OpenAI and Anthropic API integration
- **JiraIntegration**: Jira API integration
- **BubbleSystem**: Chart-specific comment bubbles
- **FilterDetection**: Grafana filter state tracking

### Building from Source

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/stickr-ai.git
   cd stickr-ai
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"

3. **Development Mode**
   - Make changes to source files
   - Click refresh button in extensions page
   - Test on supported dashboards

## 📋 Requirements

### Browser Support
- Chrome 88+ (Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

### API Requirements
- **OpenAI**: API key with GPT-4o-mini access
- **Anthropic**: API key with Claude access
- **Jira**: API token with project access
- **Database**: Supabase account or MongoDB Atlas cluster

## 🔒 Privacy & Security

- **Local Storage**: All data stays in your browser
- **Database Storage**: Encrypted connections, team-controlled data
- **API Keys**: Stored securely in Chrome's storage API
- **No Tracking**: No analytics or user tracking
- **Open Source**: Full source code available for review

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Setup Guide](SETUP.md)
- [Database Guide](DATABASE_GUIDE.md)
- [Jira & AI Integration](JIRA_AI_INTEGRATION_GUIDE.md)
- [Filter-Aware Comments](FILTER_AWARE_COMMENTS.md)
- [Quick Reference](QUICK_REFERENCE.md)

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/yourusername/stickr-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/stickr-ai/discussions)
- **Email**: support@stickr-ai.com

## 🗺️ Roadmap

### Upcoming Features
- [ ] **Confluence Integration**: Link to Confluence pages
- [ ] **Slack Notifications**: Get notified of new comments
- [ ] **Export Comments**: Export to PDF, Excel, or CSV
- [ ] **Comment Templates**: Pre-defined comment templates
- [ ] **Advanced AI**: Custom AI models for specific domains
- [ ] **Mobile Support**: Mobile app for viewing comments

### Platform Support
- [ ] **Tableau**: Tableau dashboard support
- [ ] **Looker**: Looker dashboard integration
- [ ] **Metabase**: Metabase dashboard support
- [ ] **Custom Dashboards**: Generic dashboard support

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini API
- **Anthropic** for Claude API
- **Supabase** for database hosting
- **MongoDB** for Atlas cloud database
- **Atlassian** for Jira API
- **Chrome Extensions** team for the platform

---

**Made with ❤️ for data teams everywhere**

*Transform your dashboard collaboration with Stickr AI*
