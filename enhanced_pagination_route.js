/**
 * Enhanced Dynamic Pagination Route
 * Can replace all specialized routes with business logic plugins
 */

app.post('/api/paginate', async (req, res) => {
  console.log("🟢 Received POST request to /api/paginate");
  
  const { 
    dbName, 
    collectionName, 
    query = {}, 
    sort = {}, 
    page = 1, 
    limit = 15,
    maxLimit = 100,
    aggregation = null,
    projection = null,
    // NEW: Business logic plugins
    businessLogic = null,  // 'approval', 'sensor', 'master', etc.
    userRole = null,
    factoryAccess = [],
    deviceId = null,
    startDate = null,
    endDate = null
  } = req.body;

  try {
    // Validate required parameters
    if (!dbName || !collectionName) {
      return res.status(400).json({ 
        error: "dbName and collectionName are required",
        success: false 
      });
    }

    // Apply business logic plugins
    let processedQuery = { ...query };
    let processedSort = { ...sort };
    let dataTransformer = null;

    switch (businessLogic) {
      case 'approval':
        // Apply approval-specific logic
        if (userRole !== 'admin' && userRole !== '部長' && factoryAccess.length > 0) {
          processedQuery.工場 = { $in: factoryAccess };
        }
        if (Object.keys(processedSort).length === 0) {
          processedSort = { Date: -1, _id: -1 };
        }
        break;

      case 'sensor':
        // Apply sensor-specific logic
        if (deviceId) {
          processedQuery.device = deviceId;
        }
        if (startDate || endDate) {
          const queryEndDate = endDate ? new Date(endDate) : new Date();
          const queryStartDate = startDate ? new Date(startDate) : new Date();
          if (!startDate) {
            queryStartDate.setDate(queryStartDate.getDate() - 30);
          }
          processedQuery.Date = {
            $gte: queryStartDate.toISOString().split("T")[0],
            $lte: queryEndDate.toISOString().split("T")[0]
          };
        }
        if (Object.keys(processedSort).length === 0) {
          processedSort = { Date: -1, Time: -1 };
        }
        // Set data transformer for sensors
        dataTransformer = (records) => records.map(record => ({
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
        break;

      default:
        // Default behavior - no special logic
        if (Object.keys(processedSort).length === 0) {
          processedSort = { _id: -1 };
        }
    }

    // Convert page and limit to numbers with dynamic max limit
    const currentPage = parseInt(page, 10);
    const maxAllowedLimit = parseInt(maxLimit, 10) || 100;
    const itemsPerPage = Math.min(parseInt(limit, 10), maxAllowedLimit);
    const skip = (currentPage - 1) * itemsPerPage;

    console.log(`📄 Enhanced pagination: ${businessLogic || 'generic'} logic for ${dbName}.${collectionName}`);

    // Convert string _id to ObjectId if present in query
    if (processedQuery._id && typeof processedQuery._id === "string") {
      try {
        processedQuery._id = new ObjectId(processedQuery._id);
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
      
      const dataPipeline = [
        ...aggregation,
        { $sort: processedSort },
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
      
      let findQuery = collection.find(processedQuery);
      
      if (projection) {
        findQuery = findQuery.project(projection);
      }

      findQuery = findQuery.sort(processedSort);

      const [dataResult, countResult] = await Promise.all([
        findQuery.skip(skip).limit(itemsPerPage).toArray(),
        collection.countDocuments(processedQuery)
      ]);

      results = dataResult;
      totalCount = countResult;
    }

    // Apply data transformation if specified
    if (dataTransformer && typeof dataTransformer === 'function') {
      results = dataTransformer(results);
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    console.log(`✅ Enhanced Pagination Results: Page ${currentPage}/${totalPages}, ${results.length}/${totalCount} items`);

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
      businessLogic: businessLogic,
      processedQuery: processedQuery, // For debugging
      success: true
    });

  } catch (error) {
    console.error("❌ Error in enhanced pagination route:", error);
    res.status(500).json({ 
      error: "Error executing paginated query", 
      details: error.message,
      success: false
    });
  }
});

/**
 * Usage Examples:
 * 
 * // Generic usage (like before)
 * POST /api/paginate
 * {
 *   "dbName": "submittedDB",
 *   "collectionName": "masterDB",
 *   "query": {"工場": "第二工場"},
 *   "page": 1,
 *   "limit": 20
 * }
 * 
 * // Approval logic
 * POST /api/paginate
 * {
 *   "dbName": "submittedDB",
 *   "collectionName": "kensaDB",
 *   "query": {"Date": "2025-08-18"},
 *   "businessLogic": "approval",
 *   "userRole": "班長",
 *   "factoryAccess": ["第二工場"],
 *   "page": 1,
 *   "limit": 15
 * }
 * 
 * // Sensor logic
 * POST /api/paginate
 * {
 *   "dbName": "submittedDB",
 *   "collectionName": "tempHumidityDB",
 *   "businessLogic": "sensor",
 *   "deviceId": "84:1F:E8:1A:D1:44",
 *   "startDate": "2025-07-19",
 *   "endDate": "2025-08-18",
 *   "page": 1,
 *   "limit": 15
 * }
 */
