/**
 * Manufacturing Lot Search API Route
 * This route searches across multiple coll        // Build base query for factory filter
        const baseQuery = {
            工場: factory
        };

        // Add date range filter for most collections (optional for manufacturing lot search)
        const dateQuery = {};
        if (from && to) {
            dateQuery.Date = {
                $gte: from,
                $lte: to
            };
        }manufacturing lot data
 * Copy this route to your server.js file
 */

/**
 * Search manufacturing lot across multiple collections
 * POST /api/search-manufacturing-lot
 */
app.post('/api/search-manufacturing-lot', async (req, res) => {
    console.log("🟢 Received POST request to /api/search-manufacturing-lot");
    
    const { 
        factory, 
        from, 
        to, 
        manufacturingLot, 
        partNumbers = [], 
        serialNumbers = [],
        page = 1,
        limit = 50,
        maxLimit = 200
    } = req.body;

    try {
        // Validate required fields - only manufacturing lot is required
        if (!manufacturingLot || manufacturingLot.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: "Manufacturing lot must be at least 3 characters long" 
            });
        }

        const database = client.db("submittedDB");
        
        // Pagination settings
        const currentPage = parseInt(page, 10) || 1;
        const maxAllowedLimit = parseInt(maxLimit, 10) || 200;
        const itemsPerPage = Math.min(parseInt(limit, 10) || 50, maxAllowedLimit);
        const skip = (currentPage - 1) * itemsPerPage;

        console.log(`🔍 Searching manufacturing lot: "${manufacturingLot}" across ALL factories and dates`);

        // Define collections and their search fields
        const collectionsConfig = [
            {
                name: "pressDB",
                processName: "Press",
                lotField: "材料ロット",
                commentField: "Comment"
            },
            {
                name: "kensaDB", 
                processName: "Kensa",
                lotField: "製造ロット",
                commentField: "Comment"
            },
            {
                name: "SRSDB",
                processName: "SRS", 
                lotField: "製造ロット",
                commentField: "Comment"
            },
            {
                name: "slitDB",
                processName: "Slit",
                lotField: "製造ロット", 
                commentField: "Comment"
            },
            {
                name: "materialRequestDB",
                processName: "PSA",
                lotField: "PrintLog.lotNumbers", // Special handling needed
                commentField: null // No comment field for this collection
            }
        ];

        // Build base query - no factory or date restrictions for manufacturing lot search
        const baseQuery = {};

        // Add part number filter if provided
        if (partNumbers && partNumbers.length > 0) {
            baseQuery["品番"] = { $in: partNumbers };
        }

        // Add serial number filter if provided  
        if (serialNumbers && serialNumbers.length > 0) {
            baseQuery["背番号"] = { $in: serialNumbers };
        }

        // Create regex patterns that handle hyphen variations
        // If user inputs "250915-1", also search for "2509151" 
        // If user inputs "2509151", also search for "250915-1"
        function createHyphenVariationRegexes(searchTerm) {
            const patterns = [searchTerm]; // Always include original
            
            if (searchTerm.includes('-')) {
                // Remove all hyphens for alternate pattern
                patterns.push(searchTerm.replace(/-/g, ''));
            } else {
                // Try to intelligently add hyphens
                // Pattern: YYMMDD-N (6 digits followed by number)
                const match = searchTerm.match(/^(\d{6})(\d+)$/);
                if (match) {
                    patterns.push(`${match[1]}-${match[2]}`);
                }
            }
            
            // Create regex that matches any of the patterns
            const regexPattern = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            return new RegExp(regexPattern, 'i');
        }

        const results = {};
        const lotRegex = createHyphenVariationRegexes(manufacturingLot);
        
        console.log(`🔍 Created regex pattern for "${manufacturingLot}":`, lotRegex.source);

        // Search each collection
        for (const config of collectionsConfig) {
            try {
                const collection = database.collection(config.name);
                let query = { ...baseQuery };
                
                if (config.name === "materialRequestDB") {
                    // Special handling for materialRequestDB - search all factories and dates
                    query = {
                        "PrintLog.lotNumbers": { $regex: lotRegex }
                    };
                    
                    // Part numbers for materialRequestDB
                    if (partNumbers && partNumbers.length > 0) {
                        query["品番"] = { $in: partNumbers };
                    }
                    
                    // No serial numbers for materialRequestDB as it uses different structure
                } else {
                    // Regular collections - no factory or date restrictions
                    query = { ...baseQuery };
                    
                    // Build OR query for lot field and comment field
                    const orConditions = [
                        { [config.lotField]: { $regex: lotRegex } }
                    ];
                    
                    if (config.commentField) {
                        orConditions.push({ [config.commentField]: { $regex: lotRegex } });
                    }
                    
                    query.$or = orConditions;
                }

                console.log(`🔍 Searching ${config.name} with query:`, JSON.stringify(query, null, 2));

                // Execute query with pagination
                const [data, totalCount] = await Promise.all([
                    collection.find(query)
                             .sort({ Date: -1, Time_start: -1 })
                             .skip(skip)
                             .limit(itemsPerPage)
                             .toArray(),
                    collection.countDocuments(query)
                ]);

                if (data && data.length > 0) {
                    results[config.processName] = data;
                    console.log(`✅ Found ${data.length}/${totalCount} records in ${config.name}`);
                } else {
                    console.log(`📭 No results found in ${config.name}`);
                }

            } catch (error) {
                console.error(`❌ Error searching ${config.name}:`, error.message);
                // Continue with other collections even if one fails
            }
        }

        // Calculate total results across all collections
        const totalResults = Object.values(results).reduce((sum, processData) => sum + processData.length, 0);

        console.log(`✅ Manufacturing lot search completed. Found ${totalResults} total results across ${Object.keys(results).length} processes.`);

        res.json({
            success: true,
            results: results,
            searchTerm: manufacturingLot,
            searchScope: "All factories and dates",
            totalResults: totalResults,
            processesFound: Object.keys(results),
            pagination: {
                currentPage,
                itemsPerPage,
                totalResults
            }
        });

    } catch (error) {
        console.error("❌ Error in manufacturing lot search:", error);
        res.status(500).json({ 
            success: false,
            error: "Error searching manufacturing lot", 
            details: error.message 
        });
    }
});

console.log("📦 Manufacturing lot search route loaded successfully");