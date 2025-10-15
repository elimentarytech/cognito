# html2canvas Setup Guide

## 🎯 Why This Is Needed

The AI chart analysis feature uses **html2canvas** to capture screenshots of charts. Due to Chrome extension Content Security Policy (CSP), we cannot load external scripts from CDN. Instead, we need to bundle html2canvas with the extension.

---

## 📥 Download html2canvas

### Option 1: Direct Download (Recommended)

1. Visit: https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
2. Right-click → "Save As..."
3. Save as: `html2canvas.min.js`

### Option 2: From GitHub Releases

1. Visit: https://github.com/niklasvh/html2canvas/releases
2. Download the latest `html2canvas.min.js`
3. Version 1.4.1 or later recommended

### Option 3: Using curl (Terminal)

```bash
cd /Users/preyal/stickr
curl -o html2canvas.min.js https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
```

### Option 4: Using wget (Terminal)

```bash
cd /Users/preyal/stickr
wget -O html2canvas.min.js https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
```

---

## 📂 File Placement

**Save the file as:**
```
/Users/preyal/stickr/html2canvas.min.js
```

**File structure should look like:**
```
/Users/preyal/stickr/
├── html2canvas.min.js  ← NEW FILE
├── content.js
├── database.js
├── integrations.js
├── manifest.json
├── styles.css
└── ...
```

---

## ✅ Verification

After downloading, verify the file:

### Check file exists:
```bash
ls -lh /Users/preyal/stickr/html2canvas.min.js
```

**Expected output:**
```
-rw-r--r--  1 preyal  staff   100K Oct 13 19:00 html2canvas.min.js
```

### Check file size:
File should be approximately **100-120 KB**

### Check file content:
```bash
head -c 100 /Users/preyal/stickr/html2canvas.min.js
```

**Should start with something like:**
```javascript
/*! html2canvas 1.4.1 | https://html2canvas.hertzen.com */
```

---

## 🔧 Already Configured

The following files have already been updated to use the bundled html2canvas:

✅ **manifest.json**
- Added `html2canvas.min.js` to content_scripts
- Will load before database.js, integrations.js, content.js

✅ **content.js**
- Updated to use bundled version (not CDN)
- Checks if html2canvas is available
- Shows error if not found

---

## 🚀 How to Use

After downloading html2canvas.min.js:

1. **Reload the extension**
   - Go to `chrome://extensions`
   - Click "Reload" on Stickr AI

2. **Test AI Chart Analysis**
   - Navigate to a Grafana dashboard
   - Add a bubble comment to a chart
   - Click **✨ AI Analyze** button
   - Should work without CSP errors!

---

## 🐛 Troubleshooting

### Error: "html2canvas library not loaded"

**Cause:** The html2canvas.min.js file is missing or not in the correct location.

**Solution:**
1. Verify file exists: `ls /Users/preyal/stickr/html2canvas.min.js`
2. Check file size is ~100KB
3. Reload extension in `chrome://extensions`

---

### Error: "CSP violation" still appearing

**Cause:** Old version of extension cached in browser.

**Solution:**
1. Go to `chrome://extensions`
2. Click "Remove" on Stickr AI
3. Reload the page
4. Re-add the extension (Load unpacked)

---

### Error: "html2canvas is not a function"

**Cause:** File is corrupted or incomplete.

**Solution:**
1. Delete the existing file
2. Re-download from the CDN link
3. Verify file size is correct (~100KB)
4. Reload extension

---

### Chart screenshot is blank or broken

**Cause:** Charts may have CORS restrictions or complex styling.

**Solution:**
1. This is a known html2canvas limitation
2. Try on different charts
3. Works best with:
   - Standard chart types (line, bar, pie)
   - Charts without external images
   - Charts in the same origin

---

## 📋 Quick Setup Checklist

Use this checklist for setup:

- [ ] Download html2canvas.min.js
- [ ] Save to `/Users/preyal/stickr/html2canvas.min.js`
- [ ] Verify file size (~100KB)
- [ ] Check file starts with `/*! html2canvas`
- [ ] Reload extension in Chrome
- [ ] Test AI chart analysis
- [ ] No CSP errors in console

---

## 🎁 What You Get

After setup, you can:

✅ **AI Chart Analysis** - Capture chart screenshots
✅ **Visual Analysis** - Send screenshots to GPT-4o/Claude Vision
✅ **Insights** - Get AI-powered insights on charts
✅ **No CSP Errors** - Bundled library works within extension

---

## 📊 File Details

**File:** html2canvas.min.js  
**Version:** 1.4.1 (or later)  
**Size:** ~100-120 KB  
**License:** MIT  
**Source:** https://github.com/niklasvh/html2canvas

---

## 🔒 Security Note

**Why bundle instead of CDN?**

Chrome extensions have strict Content Security Policy (CSP) that prevents loading external scripts. This is a security feature to protect users. Bundling html2canvas with the extension:

✅ Complies with CSP requirements  
✅ Works offline  
✅ No external dependencies at runtime  
✅ Faster loading (no network request)  

---

## 🆘 Still Having Issues?

1. **Check console logs** (F12 → Console)
   - Look for html2canvas related errors
   - Share error messages for troubleshooting

2. **Verify manifest.json**
   - Check `html2canvas.min.js` is listed in content_scripts
   - Should be: `"js": ["html2canvas.min.js", "database.js", ...]`

3. **Test without AI**
   - Other features should work without html2canvas
   - Only AI chart analysis requires it

4. **Temporarily disable AI**
   - Don't configure AI in Settings
   - AI buttons won't appear
   - Extension works normally otherwise

---

## 📚 Alternative: Disable AI Feature

If you don't need AI chart analysis:

1. Don't configure AI in Settings menu
2. AI buttons won't appear
3. Extension works fully without html2canvas
4. You can skip this entire setup!

---

## ✅ Summary

**Required for:** AI Chart Analysis feature only  
**File size:** ~100KB  
**Setup time:** 1-2 minutes  
**Difficulty:** Easy  

**Steps:**
1. Download html2canvas.min.js
2. Save to `/Users/preyal/stickr/`
3. Reload extension
4. Done! ✅

---

*For more information, see:*
- [`JIRA_AI_INTEGRATION_GUIDE.md`](./JIRA_AI_INTEGRATION_GUIDE.md) - AI features
- [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) - All features
- [`SETUP.md`](./SETUP.md) - General setup

