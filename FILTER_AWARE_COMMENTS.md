# Filter-Aware Bubble Comments for Grafana

## Overview

Stickr AI now supports **filter-aware bubble comments** for Grafana dashboards! Bubble comments are automatically associated with the time range filters active when they were created, and only display when the same filters are applied.

This ensures that comments are contextually relevant to the data being viewed, preventing confusion when switching between different time ranges.

---

## How It Works

### 1. **Automatic Filter Detection**

When you create a bubble comment on a Grafana dashboard:
- The extension automatically captures the current **time range filters** from the URL parameters (`from`, `to`, `timezone`)
- This filter state is stored with the comment metadata
- The filter badge is displayed in the sidebar to show which time range the comment belongs to

### 2. **Filter-Based Display**

Bubbles are displayed based on filter matching:
- **Bubble comments**: Only show when current filters match the filters they were created with
- **Page notes**: Always visible (not filter-aware) 
- When filters change, bubbles automatically hide/show based on matching

### 3. **Real-Time Filter Detection**

The extension monitors filter changes through multiple methods:
- **URL parameter changes** (when you use Grafana's time picker)
- **DOM observations** (watching for UI updates)
- **Periodic checks** (every 3 seconds as a fallback)
- **Click detection** on time picker elements

---

## User Experience

### Creating Comments

1. **Navigate to Grafana dashboard**
2. **Set your desired time range** (e.g., "Last 7 days")
3. **Click "Add Bubble Comment"** in the Stickr sidebar
4. **Click on a chart** to place your comment
5. **Enter your comment** and save

✅ **The comment is now associated with "Last 7 days"**

### Viewing Comments

- **Matching filters**: Comments appear as bubble pins on charts
- **Non-matching filters**: Comments are hidden from view (but still exist!)
- **Sidebar**: All comments are visible with a filter badge showing their time range

### Filter Changes

When you change the time range in Grafana:
1. Extension detects the change (usually within 1-3 seconds)
2. Bubbles are filtered based on new time range
3. Toast notification shows: "📅 Time range changed: now-7d to now"
4. Only comments matching the new range are displayed

---

## Visual Indicators

### Filter Badge (in Sidebar)

Bubble comments with filter metadata display a purple badge:

```
📅 now-7d
```

This shows the `from` parameter of the time range. Hover over it to see the full range:
```
Time range: now-7d to now
```

### Toast Notifications

When filters change, you'll see a blue toast notification:
```
📅 Time range changed: now-7d to now
```

---

## Technical Details

### Filter State Structure

Each bubble comment stores:

```javascript
{
  id: "comment-id",
  type: "bubble",
  text: "Your comment",
  chartHash: "chart-identifier",
  filterState: {
    from: "now-7d",      // Start of time range
    to: "now",            // End of time range
    timezone: "browser"   // Timezone setting
  },
  // ... other metadata
}
```

### Matching Logic

Comments are shown if:
- `comment.filterState.from === currentFilterState.from`
- `comment.filterState.to === currentFilterState.to`
- `comment.filterState.timezone === currentFilterState.timezone`

If **all three match**, the bubble is displayed.

### URL Parameters

Grafana uses these URL parameters for time ranges:
- `?from=now-7d` - Start time (e.g., "7 days ago")
- `&to=now` - End time (e.g., "now")
- `&timezone=browser` - Timezone (browser local time)

Example full URL:
```
https://play.grafana.org/d/000000003/dashboard?from=now-1h&to=now&timezone=browser
```

---

## Behavior by Comment Type

| Comment Type | Filter Awareness | Visibility Rule |
|--------------|------------------|-----------------|
| **Bubble Comments (Grafana)** | ✅ Yes | Only shown when filters match |
| **Page Notes** | ❌ No | Always visible |
| **Bubble Comments (Power BI)** | ❌ No | Always visible (no filter support yet) |

---

## Use Cases

### 1. **Incident Investigation**

**Scenario**: Investigating a spike in errors yesterday

1. Set time range to "Yesterday"
2. Add bubble comments on anomalous charts
3. Comments only show when viewing "Yesterday" data
4. Switch to "Last 7 days" → comments disappear
5. Switch back to "Yesterday" → comments reappear

### 2. **Performance Analysis**

**Scenario**: Comparing different time periods

1. Set time range to "Last 24 hours"
2. Add comments on performance metrics
3. Create different comments for "Last 7 days"
4. Each set of comments only appears with its respective time range

### 3. **Team Collaboration**

**Scenario**: Multiple team members analyzing different periods

1. Developer A analyzes "Last hour" and adds comments
2. Developer B analyzes "Last month" and adds comments
3. Each developer sees only comments relevant to their time range
4. Sidebar shows all comments with filter badges for reference

---

## FAQ

### Q: What if I created a comment before this feature was added?

**A**: Old comments without `filterState` metadata will:
- Still appear in the sidebar
- Show on charts when filters are `null` (no active filters)
- Not display a filter badge

### Q: Can I see all comments regardless of filters?

**A**: Yes! The sidebar shows **all comments** for the current page, regardless of filter state. Each comment displays a filter badge showing which time range it belongs to.

### Q: What if filters change via Grafana variables (not time range)?

**A**: Currently, only time range filters (`from`, `to`, `timezone`) are tracked. Dashboard variables are not yet supported but may be added in the future.

### Q: Do filter changes trigger a page reload?

**A**: No! The extension detects filter changes in real-time and re-renders bubbles without any page reload.

### Q: Can I edit a comment's filter state?

**A**: Not currently. The filter state is set when the comment is created and is immutable. You can delete and recreate the comment with new filters if needed.

---

## Platform Support

| Platform | Filter Awareness | Status |
|----------|------------------|--------|
| **Grafana** | ✅ Time Range Filters | Fully Supported |
| **Power BI** | ❌ Not yet | Planned for future |

---

## Troubleshooting

### Issue: Bubbles not disappearing when I change filters

**Solutions**:
1. Wait 3-5 seconds (filter change detection is debounced)
2. Check console logs for "📅 Filter change detected!" message
3. Verify URL parameters changed in browser address bar
4. Try clicking the time picker button again

### Issue: Filter badge not showing in sidebar

**Possible causes**:
1. Comment was created without active filters
2. Platform is not Grafana
3. Comment is a page note (not a bubble comment)

### Issue: Toast notification not appearing

**Check**:
1. Filter actually changed (not just reopened time picker)
2. Toast might be hidden behind other UI elements
3. Console logs will still show filter change detection

---

## Console Logs

For debugging, watch for these console messages:

```javascript
// On initialization
📅 Initial filter state: { from: "now-7d", to: "now", timezone: "browser" }

// On filter change
📅 Filter change detected!
   Old: { from: "now-7d", to: "now", timezone: "browser" }
   New: { from: "now-1h", to: "now", timezone: "browser" }

// When saving a comment
💾 Saving bubble comment with filter state: { from: "now-1h", to: "now", timezone: "browser" }

// When hiding comments
🚫 Hiding comment (filter mismatch): {
  comment: "This metric is too high...",
  commentFilter: { from: "now-7d", to: "now" },
  currentFilter: { from: "now-1h", to: "now" }
}

// When rendering bubbles
🎯 Rendering 5 bubble comments for page: grafana-dashboard-xyz
```

---

## Future Enhancements

Potential improvements for future versions:

1. **Dashboard Variables** - Track and filter by Grafana template variables
2. **Custom Filters** - Support for custom query parameters
3. **Filter Override** - UI toggle to "Show all comments" regardless of filters
4. **Power BI Support** - Extend filter awareness to Power BI dashboards
5. **Filter Presets** - Save common filter combinations
6. **Bulk Operations** - Apply filter state to multiple comments at once

---

## Summary

✅ **Bubble comments** on Grafana are now time range aware  
✅ **Automatic detection** of filter changes  
✅ **Visual indicators** (badges & toasts) for filter context  
✅ **Page notes** remain always visible (not filter-aware)  
✅ **Seamless experience** - no page reloads required  

This feature ensures your comments are always contextually relevant to the data you're viewing! 🎉

---

*For more information, see:*
- [`JIRA_AI_INTEGRATION_GUIDE.md`](./JIRA_AI_INTEGRATION_GUIDE.md)
- [`DATABASE_GUIDE.md`](./DATABASE_GUIDE.md)
- [`SETUP.md`](./SETUP.md)

