/**
 * Pagination API Routes for MongoDB Collections
 * Supports efficient pagination with sorting, filtering, and aggregation
 * 
 * Add these routes to your server.js file
 */

// Add this to your server.js after the existing /queries route

/**
 * Generic pagination route for any MongoDB collection
 * POST /api/paginate
 */
app.post('/api/paginate', async (req, res) => {
  console.log("🟢 Received POST request to /api/paginate");
  
  const { 
    dbName, 
    collectionName, 
    query = {}, 
    sort = {}, 
    page = 1, 
    limit = 15,        // Frontend can override this default
    maxLimit = 100,    // Frontend can set custom max limit
    aggregation = null,
    projection = null
  } = req.body;

  try {
    // Validate required parameters
    if (!dbName || !collectionName) {
      return res.status(400).json({ 
        error: "dbName and collectionName are required",
        success: false 
      });
    }

    // Convert page and limit to numbers with dynamic max limit
    const currentPage = parseInt(page, 10);
    const maxAllowedLimit = parseInt(maxLimit, 10) || 100; // Default max 100, but configurable
    const itemsPerPage = Math.min(parseInt(limit, 10), maxAllowedLimit);
    const skip = (currentPage - 1) * itemsPerPage;

    console.log(`📄 Pagination request: Page ${currentPage}, Limit ${itemsPerPage}/${maxAllowedLimit} for ${dbName}.${collectionName}`);

    // Convert string _id to ObjectId if present in query
    if (query._id && typeof query._id === "string") {
      try {
        query._id = new ObjectId(query._id);
      } catch (err) {
        return res.status(400).json({ 
          error: "Invalid _id format provided in query.",
          success: false
        });
      }
    }

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    let results = [];
    let totalCount = 0;

    if (aggregation && Array.isArray(aggregation)) {
      // Use aggregation pipeline for complex queries
      console.log("🔵 Running Aggregation Pipeline with pagination");
      
      // Create two pipelines: one for data, one for count
      const dataPipeline = [
        ...aggregation,
        { $sort: Object.keys(sort).length > 0 ? sort : { _id: -1 } },
        { $skip: skip },
        { $limit: itemsPerPage }
      ];

      const countPipeline = [
        ...aggregation,
        { $count: "total" }
      ];

      const [dataResult, countResult] = await Promise.all([
        collection.aggregate(dataPipeline).toArray(),
        collection.aggregate(countPipeline).toArray()
      ]);

      results = dataResult;
      totalCount = countResult.length > 0 ? countResult[0].total : 0;

    } else {
      // Use regular find with pagination
      console.log("🔵 Running Find Query with pagination");
      
      // Build the find query
      let findQuery = collection.find(query);
      
      // Apply projection if specified
      if (projection) {
        findQuery = findQuery.project(projection);
      }

      // Apply sort (default to newest first)
      const sortOptions = Object.keys(sort).length > 0 ? sort : { _id: -1 };
      findQuery = findQuery.sort(sortOptions);

      // Get both data and count in parallel for efficiency
      const [dataResult, countResult] = await Promise.all([
        findQuery.skip(skip).limit(itemsPerPage).toArray(),
        collection.countDocuments(query)
      ]);

      results = dataResult;
      totalCount = countResult;
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    console.log(`✅ Pagination Results: Page ${currentPage}/${totalPages}, ${results.length}/${totalCount} items`);

    res.json({
      data: results,
      pagination: {
        currentPage,
        totalPages,
        totalRecords: totalCount,
        itemsPerPage,
        hasNext,
        hasPrevious,
        startIndex: skip + 1,
        endIndex: Math.min(skip + itemsPerPage, totalCount)
      },
      success: true
    });

  } catch (error) {
    console.error("❌ Error in pagination route:", error);
    res.status(500).json({ 
      error: "Error executing paginated query", 
      details: error.message,
      success: false
    });
  }
});

/**
 * Specialized sensor history pagination
 * POST /api/sensor-history
 */
app.post('/api/sensor-history', async (req, res) => {
  console.log("🟢 Received POST request to /api/sensor-history");
  
  const { 
    deviceId, 
    page = 1, 
    limit = 15,        // Frontend controlled page size
    maxLimit = 50,     // Frontend can set max limit for sensors
    startDate = null,
    endDate = null,
    factoryName = null,
    dbName = "submittedDB",           // Allow custom database
    collectionName = "tempHumidityDB" // Allow custom collection
  } = req.body;

  try {
    if (!deviceId) {
      return res.status(400).json({ 
        error: "deviceId is required",
        success: false
      });
    }

    // Build date range query (default to last 30 days)
    const queryEndDate = endDate ? new Date(endDate) : new Date();
    const queryStartDate = startDate ? new Date(startDate) : new Date();
    if (!startDate) {
      queryStartDate.setDate(queryStartDate.getDate() - 30);
    }

    const query = {
      device: deviceId,
      Date: {
        $gte: queryStartDate.toISOString().split("T")[0],
        $lte: queryEndDate.toISOString().split("T")[0]
      }
    };

    // Add factory filter if specified
    if (factoryName) {
      query.工場 = factoryName;
    }

    // Sort by date and time (newest first)
    const sort = { Date: -1, Time: -1 };

    const currentPage = parseInt(page, 10);
    const maxAllowedLimit = parseInt(maxLimit, 10) || 50; // Configurable max for sensors
    const itemsPerPage = Math.min(parseInt(limit, 10), maxAllowedLimit);
    const skip = (currentPage - 1) * itemsPerPage;

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    console.log(`🌡️ Sensor pagination: Device ${deviceId}, Page ${currentPage}, Limit ${itemsPerPage}/${maxAllowedLimit}`);

    // Get both data and count in parallel
    const [dataResult, countResult] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(itemsPerPage).toArray(),
      collection.countDocuments(query)
    ]);

    // Transform sensor data for frontend
    const transformedData = dataResult.map(record => ({
      id: record._id,
      date: record.Date,
      time: record.Time,
      temperature: parseFloat((record.Temperature || '0').toString().replace('°C', '').trim()),
      humidity: parseFloat((record.Humidity || '0').toString().replace('%', '').trim()),
      status: record.sensorStatus || 'OK',
      factory: record.工場,
      device: record.device,
      timestamp: new Date(`${record.Date} ${record.Time}`)
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(countResult / itemsPerPage);

    console.log(`✅ Sensor History: Device ${deviceId}, Page ${currentPage}/${totalPages}, ${transformedData.length}/${countResult} records`);

    res.json({
      data: transformedData,
      pagination: {
        currentPage,
        totalPages,
        totalRecords: countResult,
        itemsPerPage,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
        startIndex: skip + 1,
        endIndex: Math.min(skip + itemsPerPage, countResult)
      },
      query: {
        deviceId,
        startDate: queryStartDate.toISOString().split("T")[0],
        endDate: queryEndDate.toISOString().split("T")[0],
        factoryName
      },
      success: true
    });

  } catch (error) {
    console.error("❌ Error in sensor history pagination:", error);
    res.status(500).json({ 
      error: "Error fetching sensor history", 
      details: error.message,
      success: false
    });
  }
});

/**
 * Specialized approval data pagination
 * POST /api/approval-paginate
 */
app.post('/api/approval-paginate', async (req, res) => {
  console.log("🟢 Received POST request to /api/approval-paginate");
  
  const { 
    collectionName,
    page = 1, 
    limit = 15,        // Frontend controlled page size
    maxLimit = 100,    // Frontend can set custom max limit
    filters = {},
    userRole = 'member',
    factoryAccess = [],
    dbName = "submittedDB" // Allow custom database
  } = req.body;

  try {
    if (!collectionName) {
      return res.status(400).json({ 
        error: "collectionName is required",
        success: false
      });
    }

    const currentPage = parseInt(page, 10);
    const maxAllowedLimit = parseInt(maxLimit, 10) || 100; // Configurable max limit
    const itemsPerPage = Math.min(parseInt(limit, 10), maxAllowedLimit);
    const skip = (currentPage - 1) * itemsPerPage;

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    console.log(`✅ Approval pagination: ${collectionName}, Page ${currentPage}, Limit ${itemsPerPage}/${maxAllowedLimit}`);

    // Build query based on filters and user access
    let query = { ...filters };

    // Apply factory access restrictions based on user role
    if (userRole !== 'admin' && userRole !== '部長' && factoryAccess.length > 0) {
      query.工場 = { $in: factoryAccess };
    }

    // Convert string _id to ObjectId if present
    if (query._id && typeof query._id === "string") {
      try {
        query._id = new ObjectId(query._id);
      } catch (err) {
        return res.status(400).json({ 
          error: "Invalid _id format provided in query.",
          success: false
        });
      }
    }

    // Sort by date (newest first) and approval status
    const sort = { Date: -1, _id: -1 };

    const [dataResult, countResult] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(itemsPerPage).toArray(),
      collection.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(countResult / itemsPerPage);

    console.log(`✅ Approval Pagination: ${collectionName}, Page ${currentPage}/${totalPages}, ${dataResult.length}/${countResult} records`);

    res.json({
      data: dataResult,
      pagination: {
        currentPage,
        totalPages,
        totalRecords: countResult,
        itemsPerPage,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
        startIndex: skip + 1,
        endIndex: Math.min(skip + itemsPerPage, countResult)
      },
      filters: query,
      success: true
    });

  } catch (error) {
    console.error("❌ Error in approval pagination:", error);
    res.status(500).json({ 
      error: "Error fetching approval data", 
      details: error.message,
      success: false
    });
  }
});

/**
 * Master DB pagination with search
 * POST /api/master-paginate
 */
app.post('/api/master-paginate', async (req, res) => {
  console.log("🟢 Received POST request to /api/master-paginate");
  
  const { 
    page = 1, 
    limit = 15,        // Frontend controlled page size
    maxLimit = 100,    // Frontend can set custom max limit
    search = '',
    factory = '',
    category = '',
    dbName = "submittedDB",    // Allow custom database
    collectionName = "masterDB" // Allow custom collection
  } = req.body;

  try {
    const currentPage = parseInt(page, 10);
    const maxAllowedLimit = parseInt(maxLimit, 10) || 100; // Configurable max limit
    const itemsPerPage = Math.min(parseInt(limit, 10), maxAllowedLimit);
    const skip = (currentPage - 1) * itemsPerPage;

    const database = client.db(dbName);
    const collection = database.collection(collectionName);

    console.log(`🗂️ Master DB pagination: ${collectionName}, Page ${currentPage}, Limit ${itemsPerPage}/${maxAllowedLimit}`);

    // Build search query
    let query = {};

    if (search) {
      query.$or = [
        { 品番: { $regex: search, $options: 'i' } },
        { 背番号: { $regex: search, $options: 'i' } },
        { 工場: { $regex: search, $options: 'i' } }
      ];
    }

    if (factory) {
      query.工場 = factory;
    }

    if (category) {
      query.カテゴリ = category;
    }

    // Sort by factory and 品番
    const sort = { 工場: 1, 品番: 1 };

    const [dataResult, countResult] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(itemsPerPage).toArray(),
      collection.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(countResult / itemsPerPage);

    console.log(`✅ Master DB Pagination: Page ${currentPage}/${totalPages}, ${dataResult.length}/${countResult} records`);

    res.json({
      data: dataResult,
      pagination: {
        currentPage,
        totalPages,
        totalRecords: countResult,
        itemsPerPage,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
        startIndex: skip + 1,
        endIndex: Math.min(skip + itemsPerPage, countResult)
      },
      query: {
        search,
        factory,
        category
      },
      success: true
    });

  } catch (error) {
    console.error("❌ Error in master DB pagination:", error);
    res.status(500).json({ 
      error: "Error fetching master DB data", 
      details: error.message,
      success: false
    });
  }
});

console.log("📄 Pagination routes loaded successfully");

/**
 * How to integrate into your server.js:
 * 
 * 1. Copy the route handlers above into your server.js file after the existing /queries route
 * 2. Make sure the MongoDB client and ObjectId are available in the scope
 * 3. The routes will be available at:
 *    - POST /api/paginate (generic pagination)
 *    - POST /api/sensor-history (sensor-specific)
 *    - POST /api/approval-paginate (approval-specific)
 *    - POST /api/master-paginate (master DB specific)
 */
