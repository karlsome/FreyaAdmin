# Manufacturing Lot Search Implementation

## Overview
Added a new search functionality to the Factory Overview page that allows users to search for manufacturing lots across multiple collections simultaneously.

## Frontend Changes (factories.js)

### UI Changes
- Added new input field "製造ロット" after the Serial Number field
- Input has minimum 3 character requirement with helpful placeholder text
- Includes descriptive text explaining what fields will be searched

### Functionality Added
1. **New Search Function**: `loadProductionByManufacturingLot()`
   - Calls new API endpoint `/api/search-manufacturing-lot`
   - Handles API responses and error cases
   
2. **Results Display Function**: `renderManufacturingLotResults()`
   - Groups results by process type (Kensa, Press, SRS, Slit, PSA)
   - Special handling for PSA process (materialRequestDB) with different table columns
   - Clickable rows for detailed view (except PSA process)
   - Color-coded process sections

3. **Real-time Search with Debouncing**
   - 500ms debounce delay for better performance
   - Searches automatically when user types ≥3 characters
   - Clears results when input is empty
   - Enter key triggers manual search via Apply Filters button

4. **Enhanced Apply Filters Logic**
   - Detects if manufacturing lot search is active
   - Chooses between regular production search and manufacturing lot search

### Global Variables Added
- `window.currentFactoryName` - Stores current factory for search context
- `manufacturingLotSearchTimeout` - For debouncing search requests

## Backend API Route (manufacturing_lot_search_route.js)

### Endpoint: POST `/api/search-manufacturing-lot`

### Search Configuration
The route searches across 5 collections with different field mappings:

1. **pressDB** → searches in `材料ロット` and `Comment` fields
2. **kensaDB** → searches in `製造ロット` and `Comment` fields  
3. **SRSDB** → searches in `製造ロット` and `Comment` fields
4. **slitDB** → searches in `製造ロット` and `Comment` fields
5. **materialRequestDB** → searches in `PrintLog.lotNumbers` field (PSA Process)

### Features
- **Regex Search**: Uses case-insensitive regex matching for approximate searches
- **Multi-filter Support**: Supports factory, date range, part numbers, and serial numbers
- **Pagination**: Built-in pagination with configurable limits
- **Error Resilience**: Continues searching other collections even if one fails
- **Special Handling**: Different query logic for materialRequestDB due to different structure

### Request Parameters
```json
{
  "factory": "第二工場",
  "from": "2025-09-01", 
  "to": "2025-09-17",
  "manufacturingLot": "241227",
  "partNumbers": ["GN200-A0400"],
  "serialNumbers": ["H47"],
  "page": 1,
  "limit": 50
}
```

### Response Format
```json
{
  "success": true,
  "results": {
    "Kensa": [...],
    "Press": [...], 
    "SRS": [...],
    "Slit": [...],
    "PSA": [...]
  },
  "searchTerm": "241227",
  "factory": "第二工場",
  "totalResults": 25,
  "processesFound": ["Kensa", "Press", "PSA"]
}
```

## Usage Instructions

### For Users
1. Navigate to Factory Overview page
2. Enter manufacturing lot number in the new "製造ロット" field (minimum 3 characters)
3. Optionally set date range and other filters
4. Click "Apply Filters" or wait for auto-search (500ms delay)
5. View results grouped by process type

### For Developers
1. Copy the contents of `manufacturing_lot_search_route.js` to your server.js file
2. The route is ready to use with no additional dependencies
3. Ensure MongoDB client is properly configured in your server

## Technical Notes
- Uses MongoDB regex queries for flexible matching (e.g., "241227" matches "241227-13")
- Implements pagination to handle large result sets
- Handles different data structures between regular production collections and materialRequestDB
- Includes comprehensive error handling and logging
- Real-time search improves user experience with immediate feedback

## Files Modified
- `js/factories.js` - Frontend implementation
- `manufacturing_lot_search_route.js` - Backend API route (new file)

## Database Collections Searched
- `submittedDB.pressDB`
- `submittedDB.kensaDB` 
- `submittedDB.SRSDB`
- `submittedDB.slitDB`
- `submittedDB.materialRequestDB`