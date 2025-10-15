# Testing Guide: Filter-Aware Bubble Comments

## 🧪 Complete Testing Workflow

Follow these steps to verify the filter-aware bubble comments feature is working correctly.

---

## Prerequisites

1. ✅ Chrome browser installed
2. ✅ Extension loaded in `chrome://extensions`
3. ✅ Access to a Grafana dashboard (e.g., https://play.grafana.org)

---

## Test 1: Basic Filter Detection

### Steps:
1. Open Chrome DevTools (F12)
2. Navigate to Console tab
3. Go to: `https://play.grafana.org/d/000000003/graphite3a-sample-website-dashboard`
4. Look for console log: `📅 Initial filter state: {...}`

### Expected Result:
```javascript
📅 Initial filter state: {
  from: "now-1h",
  to: "now",
  timezone: "browser"
}
```

### ✅ Pass Criteria:
- Console shows filter state
- `from`, `to`, `timezone` values are present
- No errors in console

---

## Test 2: Create Filter-Aware Comment

### Steps:
1. On the Grafana dashboard, note the current time range (e.g., "Last 1 hour")
2. Click "📍 Add Bubble Comment" in Stickr sidebar
3. Click on any chart
4. Enter comment: "Test comment for Last 1 hour"
5. Click "Save Comment"
6. Check console for: `💾 Saving bubble comment with filter state: {...}`

### Expected Result:
- Bubble appears on chart
- Console shows filter state being saved
- Sidebar shows comment with purple `📅` badge

### ✅ Pass Criteria:
- Bubble pin (📍) visible on chart
- Sidebar shows comment
- Filter badge displays current time range (e.g., "📅 now-1h")
- Hover over badge shows full range tooltip

---

## Test 3: Filter Change Detection

### Steps:
1. In Grafana, click the time range picker (top-right)
2. Change to a different range (e.g., "Last 6 hours")
3. Wait 3-5 seconds

### Expected Result:
- Blue toast notification appears: "📅 Time range changed: now-6h to now"
- Console shows:
  ```
  📅 Filter change detected!
     Old: { from: "now-1h", to: "now", timezone: "browser" }
     New: { from: "now-6h", to: "now", timezone: "browser" }
  ```

### ✅ Pass Criteria:
- Toast notification visible (blue background)
- Console logs show old and new filter states
- No errors

---

## Test 4: Bubble Filtering

### Steps:
1. After changing time range (from Test 3)
2. Check if the bubble from Test 2 is still visible on chart

### Expected Result:
- Bubble should **disappear** from chart (filter mismatch)
- Comment should still be **visible in sidebar**
- Console may show: `🚫 Hiding comment (filter mismatch): {...}`

### ✅ Pass Criteria:
- Bubble not visible on chart
- Comment visible in sidebar with original filter badge ("📅 now-1h")
- No errors

---

## Test 5: Create Second Comment (Different Filter)

### Steps:
1. With current time range (e.g., "Last 6 hours")
2. Click "📍 Add Bubble Comment"
3. Click on a different chart
4. Enter comment: "Test comment for Last 6 hours"
5. Save

### Expected Result:
- New bubble appears on the second chart
- Sidebar shows 2 comments:
  - First: "📅 now-1h" (hidden on chart)
  - Second: "📅 now-6h" (visible on chart)

### ✅ Pass Criteria:
- Only new bubble visible on chart
- Both comments in sidebar
- Different filter badges for each comment

---

## Test 6: Switch Back to Original Filter

### Steps:
1. Click time range picker
2. Change back to "Last 1 hour"
3. Wait 3-5 seconds

### Expected Result:
- Toast notification: "📅 Time range changed: now-1h to now"
- First bubble reappears on first chart
- Second bubble disappears from second chart
- Console shows filter change

### ✅ Pass Criteria:
- First bubble visible again
- Second bubble hidden
- Both comments still in sidebar
- Correct filter badges shown

---

## Test 7: Sidebar Filter Badge

### Steps:
1. In sidebar, find a bubble comment with filter badge
2. Hover over the purple "📅 now-1h" badge

### Expected Result:
- Tooltip appears showing full time range
- Example: "Time range: now-1h to now"

### ✅ Pass Criteria:
- Tooltip visible on hover
- Shows complete filter information
- Badge is purple colored

---

## Test 8: Page Notes (Not Filter-Aware)

### Steps:
1. In sidebar, type a page note in the bottom text field
2. Select type: "Note"
3. Click ➕ or press Enter
4. Change Grafana time range

### Expected Result:
- Page note does NOT show filter badge
- Page note does NOT disappear when filters change
- Always visible regardless of time range

### ✅ Pass Criteria:
- No filter badge on page notes
- Page notes always visible
- Only bubble comments are filter-aware

---

## Test 9: Multiple Filter Changes

### Steps:
1. Change time range 3-4 times rapidly:
   - "Last 1 hour"
   - "Last 6 hours"
   - "Last 12 hours"
   - "Last 24 hours"
2. Observe console logs and toast notifications

### Expected Result:
- Toast notification for each change
- Console logs each detection
- Bubbles update accordingly
- No errors or crashes

### ✅ Pass Criteria:
- Extension remains stable
- All filter changes detected
- Bubbles show/hide correctly
- No performance issues

---

## Test 10: Filter Persistence

### Steps:
1. Create a bubble comment with "Last 1 hour"
2. Reload the page (F5)
3. Verify filter state is still detected
4. Change to "Last 1 hour" if needed

### Expected Result:
- Bubble appears when correct filter is active
- Filter badge persists in sidebar
- Comment data includes filterState

### ✅ Pass Criteria:
- Filter state saved with comment
- Survives page reload
- Still functions correctly

---

## Test 11: Console Logging Verification

### Steps:
1. Clear console (click 🚫 icon)
2. Create a bubble comment
3. Change time range
4. Review all console logs

### Expected Logs:
```javascript
// On page load
📅 Initial filter state: { from: "now-1h", to: "now", timezone: "browser" }
🎯 Detected Grafana platform (URL)
📍 Stickr initialized

// On comment creation
💾 Saving bubble comment with filter state: { from: "now-1h", ... }
✅ Comment saved successfully!

// On filter change
📅 Filter change detected!
   Old: { from: "now-1h", to: "now", timezone: "browser" }
   New: { from: "now-6h", to: "now", timezone: "browser" }
🎯 Rendering X bubble comments for page: ...

// When filtering
🚫 Hiding comment (filter mismatch): {
  comment: "Test comment...",
  commentFilter: { from: "now-1h", ... },
  currentFilter: { from: "now-6h", ... }
}
```

### ✅ Pass Criteria:
- All expected log messages appear
- Emoji indicators present
- No error messages
- Informative debug info

---

## Test 12: Edge Cases

### Test 12a: No Active Filters
1. Go to a Grafana page without time range parameters
2. Create a bubble comment
3. Check if `filterState` is `null`

**Expected**: Comment saved without filter state, always visible

### Test 12b: Old Comments (Pre-Feature)
1. If you have old comments without `filterState`
2. Verify they still appear
3. Check they don't show filter badge

**Expected**: Backward compatibility maintained

### Test 12c: Rapid Filter Changes
1. Click time picker
2. Rapidly change filters 10+ times
3. Check for memory leaks or crashes

**Expected**: Stable, no errors, no slowdown

---

## Performance Benchmarks

### Acceptable Metrics:
- **Filter detection delay**: < 3 seconds
- **Bubble rendering**: < 500ms
- **Toast notification**: Instant
- **Memory usage**: Stable (no leaks)
- **CPU usage**: < 5% during operation

### How to Check:
1. Open Chrome Task Manager (Shift+Esc)
2. Find "Extension: Stickr AI"
3. Monitor CPU and Memory during testing
4. Should remain low and stable

---

## Troubleshooting Failed Tests

### Issue: Filter state not detected
**Solution**:
- Check URL has `from`, `to` parameters
- Verify platform is detected as Grafana
- Check console for error messages

### Issue: Bubbles not disappearing
**Solution**:
- Wait full 3 seconds for periodic check
- Verify filter actually changed in URL
- Check console for filter change log

### Issue: Toast not appearing
**Solution**:
- Check browser notifications not blocked
- Verify toast not behind other elements
- Look for console logs (still works without toast)

### Issue: Filter badge missing
**Solution**:
- Verify comment is a bubble (not page note)
- Check platform is Grafana
- Ensure comment has `filterState` property

---

## Cleanup After Testing

After completing all tests:

1. **Clear test comments**:
   - Use "🗑️ Clear All Notes" in sidebar
   - Or delete individually

2. **Reset browser**:
   - Clear console logs
   - Close DevTools

3. **Verify clean state**:
   - No bubbles on charts
   - Empty sidebar
   - No errors in console

---

## Test Report Template

```
FILTER-AWARE COMMENTS - TEST REPORT
Date: [DATE]
Tester: [NAME]
Browser: Chrome [VERSION]
Extension: Stickr AI v1.0

Test Results:
[ ] Test 1: Basic Filter Detection
[ ] Test 2: Create Filter-Aware Comment
[ ] Test 3: Filter Change Detection
[ ] Test 4: Bubble Filtering
[ ] Test 5: Create Second Comment
[ ] Test 6: Switch Back to Original Filter
[ ] Test 7: Sidebar Filter Badge
[ ] Test 8: Page Notes (Not Filter-Aware)
[ ] Test 9: Multiple Filter Changes
[ ] Test 10: Filter Persistence
[ ] Test 11: Console Logging Verification
[ ] Test 12: Edge Cases

Issues Found:
[LIST ANY ISSUES]

Performance:
- Filter detection: [X] seconds
- Bubble rendering: [X] ms
- Memory usage: [X] MB
- CPU usage: [X] %

Overall Result: PASS / FAIL
Notes: [ANY ADDITIONAL NOTES]
```

---

## Success Criteria

### ✅ All Tests Pass If:

1. Filter state detected on page load
2. Comments save with filter metadata
3. Filter changes detected automatically
4. Bubbles show/hide based on filters
5. Filter badges display correctly
6. Page notes unaffected
7. Backward compatible
8. No performance issues
9. No errors in console
10. Toast notifications appear

### 🎉 Feature is Working!

If all tests pass, the filter-aware bubble comments feature is fully functional and ready for production use!

---

## Additional Testing URLs

### Grafana Play Instances:
- https://play.grafana.org/d/000000003/graphite3a-sample-website-dashboard
- https://play.grafana.org/d/000000012/grafana-play-home
- https://play.grafana.org/d/000000074/alerting

### Try Different Time Ranges:
- Last 5 minutes
- Last 15 minutes
- Last 30 minutes
- Last 1 hour ✓ (default for many dashboards)
- Last 3 hours
- Last 6 hours
- Last 12 hours
- Last 24 hours
- Last 2 days
- Last 7 days
- Last 30 days

---

*Happy Testing! 🎉*

