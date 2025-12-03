// ============================================
// QUICK START: Copy this section to your server.js
// ============================================

// STEP 1: Make sure you have these imports at the top of server.js
const { MongoClient, ObjectId } = require('mongodb');

// STEP 2: Make sure MongoDB client is initialized
// (You should already have this, just verify)
const mongoUri = process.env.MONGODB_URI || 'your-mongodb-connection-string';
const client = new MongoClient(mongoUri);

// STEP 3: Copy ALL the routes from production-goals-api-routes.js
// and paste them into your server.js file

// STEP 4: Test with these curl commands:

/*
# Test 1: Get all goals (should return empty array initially)
curl -X GET "http://localhost:3000/api/production-goals?factory=SASAKI_COATING&date=2025-12-04"

# Test 2: Create a test goal
curl -X POST "http://localhost:3000/api/production-goals" \
  -H "Content-Type: application/json" \
  -d '{
    "factory": "SASAKI_COATING",
    "date": "2025-12-04",
    "背番号": "1GL",
    "品番": "67161-X1B3B-B1",
    "品名": "Test Product",
    "targetQuantity": 120,
    "createdBy": "admin"
  }'

# Test 3: Lookup a product from masterDB
curl -X POST "http://localhost:3000/api/production-goals/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "searchType": "背番号",
    "searchValue": "1GL",
    "factory": "SASAKI_COATING"
  }'

# Test 4: Schedule some quantity (decreases remaining)
curl -X POST "http://localhost:3000/api/production-goals/GOAL_ID_HERE/schedule" \
  -H "Content-Type: application/json" \
  -d '{
    "quantityToSchedule": 50
  }'

# Test 5: Get press history for smart scheduling
curl -X POST "http://localhost:3000/api/production-goals/press-history" \
  -H "Content-Type: application/json" \
  -d '{
    "factory": "SASAKI_COATING",
    "items": [
      {"背番号": "1GL"},
      {"背番号": "1GD"}
    ]
  }'
*/

// STEP 5: Verify in MongoDB
/*
Open MongoDB Compass or mongo shell:

use submittedDB
db.productionGoalsDB.find().pretty()

You should see your test goal!
*/

// ============================================
// TROUBLESHOOTING
// ============================================

/*
Error: "Cannot find module 'mongodb'"
Solution: npm install mongodb

Error: "client is not defined"
Solution: Make sure MongoClient is imported and initialized

Error: "ObjectId is not a constructor"
Solution: Import ObjectId: const { MongoClient, ObjectId } = require('mongodb');

Error: "Cannot read property 'db' of undefined"
Solution: Make sure MongoDB client is connected before using routes

Error: "Collection not found"
Solution: Collection is created automatically on first insert

Error: 500 Internal Server Error
Solution: Check server.js console for detailed error message
*/

// ============================================
// INTEGRATION CHECKLIST
// ============================================

/*
✅ Step 1: Import ObjectId from mongodb
✅ Step 2: Verify MongoDB client connection
✅ Step 3: Copy all routes from production-goals-api-routes.js
✅ Step 4: Restart server: npm start or nodemon
✅ Step 5: Test with curl commands above
✅ Step 6: Test in UI (Production Planner page)
✅ Step 7: Verify data in MongoDB Compass
*/

// ============================================
// ENDPOINT SUMMARY
// ============================================

/*
GET     /api/production-goals                       Get all goals (with filters)
POST    /api/production-goals                       Create single goal
POST    /api/production-goals/batch                 Create multiple goals (CSV)
PUT     /api/production-goals/:id                   Update goal
POST    /api/production-goals/:id/schedule          Schedule quantity
DELETE  /api/production-goals/:id                   Delete goal
POST    /api/production-goals/check-duplicates      Check for duplicates
POST    /api/production-goals/lookup                Lookup product data
POST    /api/production-goals/press-history         Get equipment trends
*/

// ============================================
// SAMPLE DATA FOR TESTING
// ============================================

/*
// Create 3 test goals for today
const testGoals = [
  {
    factory: "SASAKI_COATING",
    date: new Date().toISOString().split('T')[0],
    背番号: "1GL",
    品番: "67161-X1B3B-B1",
    品名: "OMT FR RH P-LIKE LT.GRAY(Z1Z9)",
    targetQuantity: 120,
    remainingQuantity: 120,
    scheduledQuantity: 0,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin"
  },
  {
    factory: "SASAKI_COATING",
    date: new Date().toISOString().split('T')[0],
    背番号: "1GD",
    品番: "67161-X1B3B-B2",
    品名: "OMT FR RH P-LIKE DK.GRAY(Y1Z1)",
    targetQuantity: 150,
    remainingQuantity: 150,
    scheduledQuantity: 0,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin"
  },
  {
    factory: "SASAKI_COATING",
    date: new Date().toISOString().split('T')[0],
    背番号: "1TN",
    品番: "67161-X1B44-E0",
    品名: "OMT FR RH P-LIKE TENDER COFFEE(24Z1)",
    targetQuantity: 200,
    remainingQuantity: 200,
    scheduledQuantity: 0,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin"
  }
];

// Insert via MongoDB:
db.productionGoalsDB.insertMany(testGoals);

// Or use the API:
fetch('http://localhost:3000/api/production-goals/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    goals: testGoals,
    createdBy: 'admin'
  })
});
*/
