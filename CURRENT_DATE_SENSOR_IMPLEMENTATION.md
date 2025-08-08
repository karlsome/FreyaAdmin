# Current Date Sensor Display Implementation

## Summary

Updated the factory overview sensor display to only show current date sensor data. If no current date data exists, displays a "Temperature History" button instead of showing previous date data.

## Key Changes Made

### 1. Updated `getSensorData()` Function
- **Location**: `js/factories.js`, lines ~40-120
- **Changes**:
  - Added `hasCurrentDateData` field to return object
  - Only queries sensor data for today's date (`Date: today`)
  - Returns `hasCurrentDateData: false` when no current date data exists
  - Returns `hasCurrentDateData: true` when current sensors are found

### 2. Added `hasHistoricalSensorData()` Function
- **Location**: `js/factories.js`, lines ~125-160
- **Purpose**: Check if factory has any sensor data in the last 30 days
- **Returns**: Boolean indicating if historical data exists
- **Used**: To determine whether to show history button or "no sensors" message

### 3. Added `showFactorySensorHistoryModal()` Function
- **Location**: `js/factories.js`, lines ~990-1090
- **Purpose**: Display historical sensor overview for entire factory
- **Features**:
  - Lists all sensors with data counts from last 30 days
  - Shows latest temperature reading for each sensor
  - Clickable sensors open individual sensor history
  - Aggregated query to get unique sensors and counts

### 4. Updated `renderFactoryCards()` Logic
- **Location**: `js/factories.js`, lines ~1440-1580
- **Changes**:
  - Now fetches `hasHistoricalSensorData()` along with sensor data
  - Three display states:
    1. **Current Data Available**: Shows sensor temperature/humidity display
    2. **No Current, Has Historical**: Shows "Temperature History" button
    3. **No Data At All**: Shows "No sensor data" message

### 5. Display Logic Flow

```
Factory Card Sensor Display:
├── Check sensorData.hasCurrentDateData
├── IF TRUE: Show current temperature & humidity with sensor details
├── IF FALSE:
    ├── Check hasHistoricalData
    ├── IF TRUE: Show "温度履歴" button (opens factory sensor history)
    └── IF FALSE: Show "センサーデータなし" message
```

### 6. Test Functions Added
- `testCurrentDateSensorLogic()`: Comprehensive test of the new logic
- `test_current_date_sensors.html`: Test page for validation

## User Experience Changes

### Before
- Factory cards showed sensor data from any date (including previous days)
- Could display outdated temperature readings as "current"
- No clear indication if data was from today or previous days

### After
- Factory cards only show TODAY'S sensor data
- If no today data: Shows "Temperature History" button instead
- Clear distinction between current and historical data
- History button provides access to all historical sensors

## Technical Implementation Details

### Date Filtering
```javascript
const today = new Date().toISOString().split("T")[0];
// Query: { 工場: factoryName, Date: today }
```

### Historical Data Check
```javascript
// Checks last 30 days for any sensor data
Date: {
    $gte: startDate.toISOString().split("T")[0],
    $lte: endDate.toISOString().split("T")[0]
}
```

### Factory Card Display States

1. **Current Data Available**:
   ```html
   <div class="physical-sensor-display">
       <div class="highest-temperature">${temp}°C</div>
       <div class="average-humidity">${humidity}%</div>
       <div class="sensor-count">${count}台</div>
   </div>
   ```

2. **History Button**:
   ```html
   <button onclick="showFactorySensorHistoryModal('${factory}')">
       <i class="ri-history-line"></i>
       <div>温度履歴</div>
       <div>本日のデータなし - 履歴を表示</div>
   </button>
   ```

3. **No Data**:
   ```html
   <div class="no-sensor-data">
       <i class="ri-sensor-line"></i>
       <div>センサーデータなし</div>
   </div>
   ```

## Testing

### Test Page: `test_current_date_sensors.html`
- Visual test of factory cards with different data states
- Button to test current date logic
- Button to test historical data check
- Console logging for debugging

### Test Functions Available:
- `window.testCurrentDateSensorLogic()`: Test all logic paths
- `window.testSensorData()`: Test raw sensor data fetching
- `window.testSensorHistory()`: Test individual sensor history

## Files Modified

1. **js/factories.js** - Core sensor functionality
2. **test_current_date_sensors.html** - New test page created

## Database Queries

### Current Date Query
```javascript
{
    dbName: "submittedDB",
    collectionName: "tempHumidityDB",
    query: { 
        工場: factoryName,
        Date: today  // YYYY-MM-DD format
    }
}
```

### Historical Check Query  
```javascript
{
    dbName: "submittedDB", 
    collectionName: "tempHumidityDB",
    query: {
        工場: factoryName,
        Date: { $gte: startDate, $lte: endDate }
    },
    limit: 1
}
```

### Factory History Aggregation
```javascript
{
    aggregation: [
        { $match: { 工場: factoryName, Date: { $gte: start, $lte: end } } },
        { $group: { _id: "$device", latestReading: { $last: "$$ROOT" }, count: { $sum: 1 } } }
    ]
}
```

## Performance Optimizations

1. **Caching**: Sensor data cached for 2 minutes
2. **Efficient Queries**: Only fetch current date data for cards
3. **Lazy Loading**: Historical check only when needed
4. **Aggregation**: Use MongoDB aggregation for factory history

## Browser Compatibility

- Tested with modern browsers supporting ES6+
- Uses Fetch API for HTTP requests  
- Compatible with Chrome, Firefox, Safari, Edge

This implementation ensures that users only see current, relevant sensor data on the factory overview, with easy access to historical data when needed.

## Sensor Status Handling

### Status Values from Your Sensor Code:
```javascript
if (sensorFailureDetected) {
    insertData["sensorStatus"] = "FAILURE";
} else {
    insertData["sensorStatus"] = "OK";
}
```

### UI Status Color Mapping:
- **"OK"** → Green badge (`text-green-600 bg-green-100`)
- **"FAILURE"** → Red badge (`text-red-600 bg-red-100`) 
- **"WARNING"** → Yellow badge (for future use)
- **"ERROR"** → Red badge (for future use)

**Note**: Sensors with "FAILURE" status will still be displayed in both factory overview and history, but with red coloring to indicate the failure state.
