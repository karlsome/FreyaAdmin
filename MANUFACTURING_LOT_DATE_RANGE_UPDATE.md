# Manufacturing Lot Search - Date Range Update

## Changes Made

### Updated Behavior
- **Manufacturing lot search (製造ロット) now searches across ALL documents, ignoring date range filters**
- Part number and serial number filters still respect the date range when used together
- Date range is completely optional for manufacturing lot searches

## Frontend Changes (factories.js)

### 1. Apply Filter Logic
- Updated to pass empty date strings when dates are not provided
- Manufacturing lot search no longer requires date validation

### 2. Real-time Search (Debounced Input)  
- Removed date requirement check (`if (from && to && factory)` → `if (factory)`)
- Now triggers search with only factory name required
- Date fields passed as empty strings if not provided

### 3. UI Updates
- Updated input field description: "材料ロット、製造ロット、コメント欄を検索します（日付範囲は任意）"  
- Added informational message in results: "Searching across all documents (date range filter not applied for manufacturing lot search)"

## Backend Changes (manufacturing_lot_search_route.js)

### 1. Validation Updates
- Removed date requirement validation 
- Now only requires `factory` and `manufacturingLot` (≥3 characters)
- `from` and `to` dates are completely optional

### 2. Query Logic Updates
- **Regular Collections** (pressDB, kensaDB, SRSDB, slitDB):
  - Date filtering only applied if both `from` and `to` are provided
  - If no dates provided, searches ALL documents in the collection
  
- **materialRequestDB** (PSA Process):
  - Date filtering optional using `作業日` field
  - Converts date format only when dates are provided

### 3. Search Behavior
- **With dates**: Searches within date range + manufacturing lot
- **Without dates**: Searches ALL documents for manufacturing lot matches
- Part numbers and serial numbers still apply when provided

## Code Examples

### Frontend Usage
```javascript
// Manufacturing lot search (no date requirement)
if (manufacturingLot && manufacturingLot.length >= 3) {
    loadProductionByManufacturingLot(factory, from || "", to || "", manufacturingLot, partNumbers, serialNumbers);
}
```

### Backend Query Building
```javascript
// Optional date filtering
const dateQuery = {};
if (from && to) {
    dateQuery.Date = {
        $gte: from,
        $lte: to
    };
}

// Applied to regular collections
query = { ...query, ...dateQuery };
```

## User Experience
1. User can now search for manufacturing lots without setting any date range
2. If dates are provided, they act as additional filters
3. Clear visual indication that date range is optional
4. Real-time search works immediately without date validation

## Backward Compatibility
- Existing functionality for part number and serial number searches unchanged
- Date range still required for regular production searches (non-manufacturing lot)
- All other filters work exactly as before

This update makes the manufacturing lot search much more flexible and user-friendly, allowing users to find manufacturing lots across their entire database without being constrained by date ranges.