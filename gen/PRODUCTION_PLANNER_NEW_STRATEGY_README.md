# Production Planner - New Goal-Based Strategy Implementation

## Overview
The production planner has been completely refactored to use a **goal-based workflow** where admins set production quantity goals first, then schedule them to equipment timelines.

---

## ✅ What's Been Implemented

### 1. **Database & API**
- **Collection**: `productionGoalsDB` in `submittedDB`
- **Schema**:
  ```javascript
  {
    _id: ObjectId,
    factory: String,
    date: String,              // "YYYY-MM-DD"
    背番号: String,
    品番: String,
    品名: String,
    targetQuantity: Number,    // Original goal
    remainingQuantity: Number, // Decreases when scheduled
    scheduledQuantity: Number, // Total scheduled
    status: String,            // "pending", "in-progress", "completed"
    createdAt: Date,
    updatedAt: Date,
    createdBy: String
  }
  ```

- **API Routes** (in `/gen/production-goals-api-routes.js`):
  - `GET /api/production-goals` - Get goals (with filters)
  - `POST /api/production-goals` - Create single goal
  - `POST /api/production-goals/batch` - Create multiple goals
  - `PUT /api/production-goals/:id` - Update goal
  - `POST /api/production-goals/:id/schedule` - Schedule quantity (decreases remaining)
  - `DELETE /api/production-goals/:id` - Delete goal
  - `POST /api/production-goals/check-duplicates` - Check for duplicates
  - `POST /api/production-goals/lookup` - Lookup product from masterDB
  - `POST /api/production-goals/press-history` - Get equipment trends

### 2. **UI Changes**

#### Left Panel (formerly Products, now Goals)
- **3 Action Buttons**:
  1. 📤 **Upload CSV** - Import goals from CSV
  2. ➕ **Manual Input** - Add goals one by one
  3. ✨ **Smart Scheduling** - Auto-assign based on pressDB trends

- **Goal Display**:
  - Shows goals grouped by date
  - Progress bar showing scheduled/total
  - Color-coded:
    - ✅ **Green** = Completed (remainingQuantity = 0)
    - 🔵 **Blue** = In Progress (partially scheduled)
    - ⚪ **White** = Pending
  - Shows: `120/150 pcs` (remaining/target)

### 3. **CSV Upload Feature**
- **Supported Formats**:
  - `背番号,収容数,日付`
  - `品番,収容数,日付`
- **Encoding**: Shift_JIS (like NODA)
- **Auto-fill**: Looks up missing data from masterDB
- **Duplicate Detection**: 
  - Prompts user: "Overwrite" or "Add to existing"
- **Review Modal**: Shows all goals before importing

### 4. **Manual Goal Input**
- **Modal Interface**:
  - Search products by 背番号, 品番, or 品名
  - Select product
  - Enter target quantity
  - Select date
- **Duplicate Handling**: Same as CSV upload

### 5. **Timeline Scheduling**
- **Click Timeline Slot**:
  - Opens multi-column picker
  - **Shows only goals** (not all products)
  - Only displays goals with `remainingQuantity > 0`
  - For the **selected date**

- **After Adding to Timeline**:
  - Goal's `remainingQuantity` decreases
  - Goal's `scheduledQuantity` increases
  - Progress bar updates
  - Goal turns green when complete

### 6. **Smart Auto-Scheduling** ✨
- **Trend Analysis**:
  - Queries pressDB for last 30 days
  - Counts which equipment most frequently produces each product
  - Calculates confidence score

- **Auto-Assignment**:
  - Assigns goals to equipment based on historical trends
  - Shows confidence percentage
  - Schedules sequentially, respecting breaks
  - One-click apply

- **Confirmation Modal**:
  - Shows assignments by equipment
  - Lists products with confidence scores
  - User can review before applying

### 7. **Default Break Times**
- **Always present** in timeline:
  - 🍴 12:00 PM - 12:45 PM (Lunch Break)
  - ☕ 3:00 PM - 3:15 PM (Short Break)
- **Removable**: Hover and click × button
- **Smart Scheduling**: Automatically skips breaks

### 8. **Quantity Tracking**
- Real-time updates when scheduling
- Server-side validation
- Prevents over-scheduling (can't exceed remaining)
- Automatic status updates:
  - `pending` → `in-progress` → `completed`

---

## 🔧 What You Need to Do

### 1. **Add API Routes to server.js**
Copy the entire contents of `/gen/production-goals-api-routes.js` and paste into your `server.js` file.

**Important**: Make sure you have:
- `const { ObjectId } = require('mongodb');` at the top
- MongoDB client properly initialized

### 2. **Test the Flow**

#### Step 1: Set Goals
1. Open Production Planner
2. Select factory and date
3. Click **"Manual Input"** or **"Upload CSV"**
4. Add some goals

#### Step 2: Manual Scheduling
1. Click on a timeline slot
2. Select goals from the multi-column picker
3. Set quantities
4. Add to timeline
5. ✅ Watch goal quantities decrease!

#### Step 3: Smart Scheduling
1. Click **"Smart Scheduling"** button
2. Review auto-assignments
3. Click "Apply Smart Schedule"
4. ✅ All goals scheduled automatically!

### 3. **CSV File Format Example**

**Option 1: Using 背番号**
```csv
日付,背番号,収容数
2025-12-04,1GL,120
2025-12-04,1GD,150
2025-12-05,1TN,200
```

**Option 2: Using 品番**
```csv
日付,品番,収容数
2025-12-04,67161-X1B3B-B1,120
2025-12-04,67161-X1B3B-B2,150
```

---

## 🎨 Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| CSV Upload | ✅ | Import goals with duplicate detection |
| Manual Input | ✅ | Add goals one by one with search |
| Goal Display | ✅ | Progress bars, color-coded status |
| Timeline Scheduling | ✅ | Click slots to schedule goals |
| Quantity Tracking | ✅ | Real-time decrease of remaining |
| Smart Scheduling | ✅ | AI-based auto-assignment |
| Break Management | ✅ | Default breaks, auto-skip |
| Duplicate Handling | ✅ | Overwrite or Add options |
| Multi-date Support | ✅ | Set goals for different dates |
| Translations | ✅ | Full English/Japanese support |

---

## 📊 Workflow Comparison

### Old Workflow:
1. Select products from list
2. Add to timeline directly

### New Workflow:
1. **Set Goals** (CSV or Manual)
2. **View Goals** in left panel
3. **Schedule Goals** (Manual or Smart)
4. **Track Progress** (quantities decrease)
5. **Complete** (goals turn green)

---

## 🐛 Known Limitations

1. **Smart Scheduling** only works if pressDB has historical data
2. **CSV Upload** requires exact column names (Japanese)
3. **Date Format** must be YYYY-MM-DD
4. **Encoding** must be Shift_JIS for Japanese characters

---

## 🚀 Next Steps (Optional Enhancements)

1. **Export Goals** to Excel/PDF
2. **Goal Templates** - Save common production plans
3. **Bulk Edit** - Update multiple goals at once
4. **Notifications** - Alert when goals are completed
5. **Analytics** - Track goal completion rates
6. **Conflict Detection** - Warn about equipment overload

---

## 📝 Notes

- All goal CRUD operations go through API
- Goals persist in database (not temporary)
- Multiple users can set goals for same date
- Smart scheduling uses 30-day historical window
- Goals are factory-specific
- Dates are stored as ISO strings (YYYY-MM-DD)

---

## 🎯 Testing Checklist

- [ ] Add goals via CSV upload
- [ ] Add goals via manual input
- [ ] Check duplicate detection (overwrite/add)
- [ ] Schedule goals manually via timeline
- [ ] Test Smart Scheduling
- [ ] Verify quantities decrease correctly
- [ ] Check goal turns green when complete
- [ ] Test with multiple dates
- [ ] Delete goals
- [ ] Check default breaks in timeline

---

**Implementation Date**: December 3, 2025
**Status**: ✅ Complete and Ready for Testing
