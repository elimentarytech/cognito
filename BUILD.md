# Build Guide

## Quick Start

### For Chrome Web Store Submission
```bash
npm run build:chrome-store
# or
node build.js --chrome-store
```

This creates: `dist/cognito-ai-extension-chrome-store.zip`

### For Production (Minified)
```bash
npm run build:production
# or
node build.js --production
```

This creates: `dist/cognito-ai-extension-production.zip`

### For Development (Clean)
```bash
npm run build
# or
npm run build:clean
# or
node build.js
```

This creates: `dist/cognito-ai-extension-clean.zip`

## Build Modes

### Clean Mode (Default)
- No minification
- No obfuscation
- All console.log statements preserved
- Best for: Development and debugging

### Production Mode
- Code minified
- console.log removed (console.error/warn kept)
- Best for: Distribution to users

### Chrome Store Mode
- Code minified
- console.log preserved (for debugging)
- Optimized for Chrome Web Store submission
- manifest.json at root of zip
- Best for: Chrome Web Store uploads

## Package Scripts

```bash
npm run build              # Clean build
npm run build:clean        # Clean build (same as above)
npm run build:production   # Production build
npm run build:chrome-store # Chrome Store build
npm run package            # Chrome Store package (runs build:chrome-store)
```

## What Gets Built

All builds include:
- `manifest.json`
- `popup.html`, `popup.js`
- `background.js`
- `content.js`
- `database.js`
- `integrations.js`
- `styles.css`
- `html2canvas.min.js`
- `icons/` directory
- `generated-image-Photoroom.png`

## Chrome Store Submission

1. Run: `npm run package` or `npm run build:chrome-store`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload `dist/cognito-ai-extension-chrome-store.zip`
4. Fill in store listing details
5. Submit for review

## Troubleshooting

### "zip command not found"
- **macOS**: Already installed
- **Linux**: `sudo apt-get install zip`
- **Windows**: Use Git Bash or PowerShell `Compress-Archive`

### Build fails
- Make sure all source files exist in the root directory
- Check that you have write permissions to `build/` and `dist/` directories

### Chrome Store rejects the zip
- Ensure `manifest.json` is at the root (not in a subdirectory)
- Check that all required files are included
- Verify manifest.json is valid JSON

