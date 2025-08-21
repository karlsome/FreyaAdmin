/**
 * FIXED VERSION - Replace your /api/approval-factories route with this
 * 
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
