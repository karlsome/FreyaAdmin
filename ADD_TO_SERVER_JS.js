/* 
 * ADD THESE ROUTES TO YOUR SERVER.JS FILE (running on localhost:3000)
 * Copy this code and paste it right after your existing pagination routes
 * 
 * IMPORTANT: Your frontend is now configured to use BASE_URL = "http://localhost:3000/"
 * Make sure your server is running on port 3000 (not 5501)
 */

/**
 * Get approval statistics using MongoDB aggregation
 * POST /api/approval-stats
 */
app.post('/api/approval-stats', async (req, res) => {
  console.log("🟢 Received POST request to /api/approval-stats");
  
  const { 
    collectionName,
    userRole = 'member',
    factoryAccess = [],
    filters = {},
    dbName = "submittedDB"
  } = req.body;

  try {
    if (!collectionName) {
      return res.status(400).json({ 
        error: "collectionName is required",
        success: false
      });
    }

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    console.log(`📊 Computing approval stats for: ${collectionName}, Role: ${userRole}`);

    // Build base query based on user access and filters
    let baseQuery = { ...filters };

    // Apply factory access restrictions based on user role
    if (userRole !== 'admin' && userRole !== '部長' && factoryAccess.length > 0) {
      baseQuery.工場 = { $in: factoryAccess };
    }

    // Convert string _id to ObjectId if present
    if (baseQuery._id && typeof baseQuery._id === "string") {
      try {
        baseQuery._id = new ObjectId(baseQuery._id);
      } catch (err) {
        return res.status(400).json({ 
          error: "Invalid _id format provided in query.",
          success: false
        });
      }
    }

    // Get today's date for today's total calculation
    const today = new Date().toISOString().split('T')[0];

    // Create aggregation pipeline for statistics
    const statsAggregation = [
      { $match: baseQuery },
      {
        $facet: {
          // Overall status statistics
          statusStats: [
            {
              $group: {
                _id: {
                  $switch: {
                    branches: [
                      { 
                        case: { $or: [{ $not: ["$approvalStatus"] }, { $eq: ["$approvalStatus", "pending"] }] },
                        then: "pending"
                      },
                      { 
                        case: { $eq: ["$approvalStatus", "hancho_approved"] },
                        then: "hancho_approved"
                      },
                      { 
                        case: { $eq: ["$approvalStatus", "fully_approved"] },
                        then: "fully_approved"
                      },
                      { 
                        case: { 
                          $or: [
                            { $eq: ["$approvalStatus", "correction_needed"] },
                            { $eq: ["$approvalStatus", "correction_needed_from_kacho"] }
                          ]
                        },
                        then: "correction_needed"
                      },
                      { 
                        case: { $eq: ["$approvalStatus", "correction_needed_from_kacho"] },
                        then: "correction_needed_from_kacho"
                      }
                    ],
                    default: "unknown"
                  }
                },
                count: { $sum: 1 }
              }
            }
          ],
          // Today's submissions
          todayStats: [
            {
              $match: { Date: today }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 }
              }
            }
          ],
          // Total count
          totalCount: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const statsResult = await collection.aggregate(statsAggregation).toArray();
    const stats = statsResult[0];

    // Process status statistics
    const statusCounts = {
      pending: 0,
      hancho_approved: 0,
      fully_approved: 0,
      correction_needed: 0,
      correction_needed_from_kacho: 0
    };

    if (stats.statusStats && stats.statusStats.length > 0) {
      stats.statusStats.forEach(stat => {
        if (statusCounts.hasOwnProperty(stat._id)) {
          statusCounts[stat._id] = stat.count;
        }
      });
    }

    // Get today's total
    const todayTotal = stats.todayStats && stats.todayStats.length > 0 ? stats.todayStats[0].count : 0;
    
    // Get overall total
    const overallTotal = stats.totalCount && stats.totalCount.length > 0 ? stats.totalCount[0].count : 0;

    console.log(`✅ Approval Statistics computed: Total: ${overallTotal}, Today: ${todayTotal}`);
    console.log(`📊 Status breakdown:`, statusCounts);

    res.json({
      statistics: {
        pending: statusCounts.pending,
        hanchoApproved: statusCounts.hancho_approved,
        fullyApproved: statusCounts.fully_approved,
        correctionNeeded: statusCounts.correction_needed,
        correctionNeededFromKacho: statusCounts.correction_needed_from_kacho,
        todayTotal: todayTotal,
        overallTotal: overallTotal
      },
      query: baseQuery,
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error in approval statistics route:", error);
    res.status(500).json({ 
      error: "Error calculating approval statistics", 
      details: error.message,
      success: false
    });
  }
});

/**
 * Get factory list for current user and collection
 * POST /api/approval-factories
 */
app.post('/api/approval-factories', async (req, res) => {
  console.log("🟢 Received POST request to /api/approval-factories");
  
  const { 
    collectionName,
    userRole = 'member',
    factoryAccess = [],
    dbName = "submittedDB"
  } = req.body;

  try {
    if (!collectionName) {
      return res.status(400).json({ 
        error: "collectionName is required",
        success: false
      });
    }

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    console.log(`🏭 Getting factory list for: ${collectionName}, Role: ${userRole}`);

    // Build base query based on user access
    let baseQuery = {};

    // Apply factory access restrictions based on user role
    if (userRole !== 'admin' && userRole !== '部長' && factoryAccess.length > 0) {
      baseQuery.工場 = { $in: factoryAccess };
    }

    // Get distinct factories using aggregation (API Version 1 compatible)
    const factoryAggregation = [
      { $match: baseQuery },
      {
        $group: {
          _id: "$工場"
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: "" }
        }
      },
      { $sort: { _id: 1 } }
    ];
    
    const factoryResults = await collection.aggregate(factoryAggregation).toArray();
    const factories = factoryResults.map(result => result._id);
    const filteredFactories = factories.filter(factory => factory && factory.trim() !== '');

    console.log(`✅ Found ${filteredFactories.length} factories:`, filteredFactories);

    res.json({
      factories: filteredFactories.sort(),
      success: true
    });

  } catch (error) {
    console.error("❌ Error in approval factories route:", error);
    res.status(500).json({ 
      error: "Error fetching factory list", 
      details: error.message,
      success: false
    });
  }
});

console.log("📊 Approval statistics routes loaded successfully");

/*
 * COPY THE CODE ABOVE AND ADD IT TO YOUR SERVER.JS FILE (port 3000)
 * Place it right after your existing pagination routes
 * 
 * After adding these routes:
 * 1. Restart your server on port 3000
 * 2. The 405 errors will be resolved
 * 3. Your approval system will be fully optimized
 * 4. Performance will improve dramatically
 */
