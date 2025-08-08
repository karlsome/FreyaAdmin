# Physical Temperature Sensor Integration

## Overview
Added physical temperature sensor functionality to the factory overview page that reads sensor data from the `tempHumidityDB` collection in the `submittedDB` database.

## Database Structure
The sensor data follows this document structure:
```json
{
  "_id": {
    "$oid": "6895576d0a76bca8c9e69c9b"
  },
  "工場": "肥田瀬",
  "Date": "2025-08-08",
  "Time": "10:48:29",
  "Temperature": "26.23 °C",
  "Humidity": "49.79%",
  "device": "84:1F:E8:1A:D1:44",
  "sensorStatus": "OK"
}
```

## Features Implemented

### 1. Sensor Data Fetching
- **Function**: `getSensorData(factoryName)`
- **Location**: `js/factories.js`
- **Purpose**: Fetches the latest sensor readings for each device in a factory
- **Caching**: 2-minute cache to optimize performance
- **Data Processing**:
  - Groups sensors by device ID
  - Gets the latest reading for each sensor
  - Calculates highest temperature and average temperature
  - Handles multiple sensors per factory

### 2. Factory Cards Enhancement
- **Location**: `renderFactoryCards()` in `js/factories.js`
- **New Features**:
  - Shows both environmental data (weather-based) and physical sensor data
  - Displays highest temperature from physical sensors
  - Shows sensor count for each factory
  - Clickable sensor section that opens detailed modal
  - Distinguished labeling: "気温" (weather) vs "物理センサー" (physical sensors)

### 3. Detailed Sensor Modal
- **Function**: `showSensorModal(factoryName, sensorData)`
- **Features**:
  - Summary statistics (active sensors, highest temp, average temp)
  - Individual sensor cards with device ID, status, temperature, humidity
  - Last update timestamps
  - Status indicators (OK, Warning, Error)
  - Responsive design for mobile and desktop

### 4. Multiple Sensor Support
- **Smart Display Logic**:
  - Shows only the highest temperature in the factory card for space efficiency
  - Full details available in the modal
  - Handles factories with no sensors gracefully
  - Supports unlimited number of sensors per factory

### 5. Real-time Data Updates
- **Update Frequency**: Sensor data updates every 15 minutes
- **Cache Management**: 2-minute cache for sensor data, 10-minute cache for weather data
- **Refresh Button**: Manual refresh capability that clears cache and reloads data

## User Interface Design

### Factory Cards
Each factory card now shows:
1. **Production Data** (existing)
   - Total production
   - Total NG
   - Defect rate

2. **Environmental Data** (weather-based)
   - Temperature (labeled as "気温")
   - Humidity (labeled as "外気湿度") 
   - CO2 levels

3. **Physical Sensor Data** (new)
   - Highest temperature from all sensors
   - Average temperature from all sensors
   - Number of active sensors
   - Click for detailed view

### Sensor Modal
- **Summary Section**: Total sensors, highest temp, average temp
- **Individual Sensor Cards**: Each showing:
  - Device ID (MAC address)
  - Current temperature and humidity
  - Status (OK/Warning/Error with color coding)
  - Last update timestamp
- **Mobile Responsive**: Grid layout adapts to screen size

## Technical Implementation

### Files Modified
1. **js/factories.js**
   - Added `getSensorData()` function
   - Added `showSensorModal()` and related functions
   - Modified `renderFactoryCards()` to include sensor data
   - Updated `refreshEnvironmentalData()` to refresh sensor cache

2. **css/styles.css**
   - Added spinning animation for refresh button
   - Added sensor card styling
   - Added modal styling improvements

### API Integration
- Uses existing API endpoint: `${BASE_URL}queries`
- Database: `submittedDB`
- Collection: `tempHumidityDB`
- Query: Filters by factory name and today's date
- Sorting: Latest readings first

### Error Handling
- Graceful fallback when no sensor data is available
- API error handling with console logging
- Cache invalidation on errors
- User-friendly error messages

## Usage Instructions

1. **View Sensor Data**: Go to the factory overview page and look for the "物理センサー" section in each factory card
2. **Detailed View**: Click on the sensor section to open the detailed modal
3. **Refresh Data**: Use the refresh button to update sensor readings
4. **Status Monitoring**: Green (OK), Yellow (Warning), Red (Error) status indicators

## Data Flow

1. User visits factory overview page
2. System fetches production data and environmental data (existing)
3. System fetches sensor data from `tempHumidityDB` for each factory
4. Data is processed to group by device and calculate statistics
5. Factory cards display both environmental and sensor data
6. User can click sensor section to view detailed modal
7. Modal fetches fresh data if needed and displays all sensors

## Future Considerations

- **Scalability**: The current implementation can handle hundreds of sensors per factory
- **Historical Data**: Modal could be extended to show historical sensor trends
- **Alerts**: Could add temperature threshold alerts
- **Sensor Management**: Admin interface for managing sensor devices
- **Data Export**: Export sensor data to CSV/PDF

## Testing

Test files created:
- `test_sensor.html`: Manual testing interface
- `test_sensor_data.js`: Data processing logic validation

The implementation has been thoroughly tested with sample data matching the specified database structure.
