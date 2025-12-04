// ============================================
// PRODUCTION GOALS API ROUTES
// Copy this to your server.js file
// ============================================

// Production Goals Collection: productionGoalsDB in submittedDB database
// Schema:
// {
//   _id: ObjectId,
//   factory: String,          // e.g., "SASAKI_COATING"
//   date: String,             // ISO date string "YYYY-MM-DD"
//   背番号: String,
//   品番: String,
//   品名: String,
//   targetQuantity: Number,   // Original goal quantity
//   remainingQuantity: Number, // Decreases as added to timeline
//   scheduledQuantity: Number, // Total scheduled so far
//   status: String,           // "pending", "in-progress", "completed"
//   createdAt: Date,
//   updatedAt: Date,
//   createdBy: String         // username
// }

// ==================== GET ALL GOALS ====================
app.get('/api/production-goals', async (req, res) => {
    try {
        const { factory, date, startDate, endDate } = req.query;
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        // Build query
        const query = {};
        if (factory) query.factory = factory;
        
        if (date) {
            query.date = date;
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }
        
        const goals = await collection.find(query).sort({ date: 1, 背番号: 1 }).toArray();
        
        res.json({ success: true, data: goals });
    } catch (error) {
        console.error('Error fetching production goals:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CREATE GOAL (Single) ====================
app.post('/api/production-goals', async (req, res) => {
    try {
        const { factory, date, 背番号, 品番, 品名, targetQuantity, createdBy } = req.body;
        
        if (!factory || !date || !targetQuantity || (!背番号 && !品番)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: factory, date, targetQuantity, and either 背番号 or 品番' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        const goal = {
            factory,
            date,
            背番号: 背番号 || '',
            品番: 品番 || '',
            品名: 品名 || '',
            targetQuantity: parseInt(targetQuantity),
            remainingQuantity: parseInt(targetQuantity),
            scheduledQuantity: 0,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: createdBy || 'system'
        };
        
        const result = await collection.insertOne(goal);
        
        res.json({ success: true, data: { ...goal, _id: result.insertedId } });
    } catch (error) {
        console.error('Error creating production goal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CREATE MULTIPLE GOALS (Batch) ====================
app.post('/api/production-goals/batch', async (req, res) => {
    try {
        const { goals, createdBy } = req.body;
        
        if (!goals || !Array.isArray(goals) || goals.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid goals array' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        // Process each goal
        const goalsToInsert = goals.map(g => ({
            factory: g.factory,
            date: g.date,
            背番号: g.背番号 || '',
            品番: g.品番 || '',
            品名: g.品名 || '',
            targetQuantity: parseInt(g.targetQuantity),
            remainingQuantity: parseInt(g.targetQuantity),
            scheduledQuantity: 0,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: createdBy || 'system'
        }));
        
        const result = await collection.insertMany(goalsToInsert);
        
        res.json({ 
            success: true, 
            insertedCount: result.insertedCount,
            data: goalsToInsert 
        });
    } catch (error) {
        console.error('Error creating multiple production goals:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPDATE GOAL ====================
app.put('/api/production-goals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        // Remove _id from updates if present
        delete updates._id;
        
        // Update timestamp
        updates.updatedAt = new Date();
        
        // Get current goal to calculate proper remaining quantity and status
        const currentGoal = await collection.findOne({ _id: new ObjectId(id) });
        if (!currentGoal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        // If targetQuantity is being updated, recalculate remainingQuantity
        if (updates.targetQuantity !== undefined) {
            const newTargetQuantity = parseInt(updates.targetQuantity);
            const currentScheduled = currentGoal.scheduledQuantity || 0;
            updates.remainingQuantity = newTargetQuantity - currentScheduled;
        }
        
        // Calculate final quantities for status determination
        const finalTargetQuantity = updates.targetQuantity || currentGoal.targetQuantity;
        const finalScheduledQuantity = updates.scheduledQuantity || currentGoal.scheduledQuantity || 0;
        const finalRemainingQuantity = updates.remainingQuantity !== undefined ? updates.remainingQuantity : (finalTargetQuantity - finalScheduledQuantity);
        
        // Update status based on final quantities
        if (finalRemainingQuantity <= 0) {
            updates.status = 'completed';
        } else if (finalScheduledQuantity > 0) {
            updates.status = 'in-progress';
        } else {
            updates.status = 'pending';
        }
        
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating production goal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPDATE GOAL QUANTITIES ====================
app.post('/api/production-goals/:id/schedule', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityToSchedule } = req.body;
        
        if (!quantityToSchedule || quantityToSchedule <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid quantity to schedule' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        // Get current goal
        const goal = await collection.findOne({ _id: new ObjectId(id) });
        
        if (!goal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        if (goal.remainingQuantity < quantityToSchedule) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quantity to schedule exceeds remaining quantity' 
            });
        }
        
        // Update quantities
        const newRemaining = goal.remainingQuantity - quantityToSchedule;
        const newScheduled = goal.scheduledQuantity + quantityToSchedule;
        const newStatus = newRemaining === 0 ? 'completed' : 'in-progress';
        
        await collection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    remainingQuantity: newRemaining,
                    scheduledQuantity: newScheduled,
                    status: newStatus,
                    updatedAt: new Date()
                } 
            }
        );
        
        res.json({ 
            success: true, 
            remainingQuantity: newRemaining,
            scheduledQuantity: newScheduled,
            status: newStatus
        });
    } catch (error) {
        console.error('Error scheduling quantity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DELETE GOAL ====================
app.delete('/api/production-goals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting production goal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CHECK FOR DUPLICATES ====================
app.post('/api/production-goals/check-duplicates', async (req, res) => {
    try {
        const { factory, date, items } = req.body; // items = array of {背番号 or 品番}
        
        if (!factory || !date || !items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionGoalsDB');
        
        const duplicates = [];
        
        for (const item of items) {
            const query = { factory, date };
            
            if (item.背番号) {
                query.背番号 = item.背番号;
            } else if (item.品番) {
                query.品番 = item.品番;
            }
            
            const existing = await collection.findOne(query);
            
            if (existing) {
                duplicates.push({
                    item,
                    existing
                });
            }
        }
        
        res.json({ 
            success: true, 
            hasDuplicates: duplicates.length > 0,
            duplicates 
        });
    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== LOOKUP MASTER DATA (for CSV auto-fill) ====================
app.post('/api/production-goals/lookup', async (req, res) => {
    try {
        const { searchType, searchValue, factory } = req.body; // searchType: '背番号' or '品番'
        
        if (!searchType || !searchValue) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing search parameters' 
            });
        }
        
        // Lookup from masterDB - always use Sasaki_Coating_MasterDB for all factories
        const db = client.db('Sasaki_Coating_MasterDB');
        const collection = db.collection('masterDB');
        
        const query = { [searchType]: searchValue };
        const product = await collection.findOne(query);
        
        if (!product) {
            return res.json({ 
                success: false, 
                error: 'Product not found in master database' 
            });
        }
        
        res.json({ 
            success: true, 
            data: {
                背番号: product.背番号,
                品番: product.品番,
                品名: product.品名,
                収容数: product.収容数,
                pcPerCycle: product.pcPerCycle || 1,
                '秒数(1pcs何秒)': product['秒数(1pcs何秒)'] || 22.5
            }
        });
    } catch (error) {
        console.error('Error looking up master data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPDATE PRODUCTION PLAN ====================
app.post('/api/production-plans/update', async (req, res) => {
    try {
        const { planId, factory, date, products, breaks, updatedBy } = req.body;
        
        if (!planId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Plan ID is required' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionPlansDB');
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (factory) updateData.factory = factory;
        if (date) updateData.date = date;
        if (products) updateData.products = products;
        if (breaks) updateData.breaks = breaks;
        if (updatedBy) updateData.updatedBy = updatedBy;
        
        const result = await collection.updateOne(
            { _id: new ObjectId(planId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Plan not found' 
            });
        }
        
        res.json({ 
            success: true, 
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });
    } catch (error) {
        console.error('Error updating production plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET PRODUCTION PLANS ====================
app.get('/api/production-plans', async (req, res) => {
    try {
        const { factory, date, startDate, endDate } = req.query;
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionPlansDB');
        
        const query = {};
        if (factory) query.factory = factory;
        
        if (date) {
            query.date = date;
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }
        
        const plans = await collection.find(query).sort({ date: 1 }).toArray();
        
        res.json({ success: true, data: plans });
    } catch (error) {
        console.error('Error fetching production plans:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CREATE PRODUCTION PLAN ====================
app.post('/api/production-plans', async (req, res) => {
    try {
        const { factory, date, products, breaks, createdBy } = req.body;
        
        if (!factory || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Factory and date are required' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionPlansDB');
        
        const plan = {
            factory,
            date,
            products: products || [],
            breaks: breaks || [],
            createdBy: createdBy || 'system',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await collection.insertOne(plan);
        
        res.json({ 
            success: true, 
            data: { ...plan, _id: result.insertedId } 
        });
    } catch (error) {
        console.error('Error creating production plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DELETE PRODUCTION PLAN ====================
app.delete('/api/production-plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const db = client.db('submittedDB');
        const collection = db.collection('productionPlansDB');
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Plan not found' 
            });
        }
        
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting production plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET PRESS HISTORY (for smart scheduling) ====================
app.post('/api/production-goals/press-history', async (req, res) => {
    try {
        const { factory, items } = req.body; // items = array of {背番号 or 品番}
        
        console.log('=== PRESS HISTORY API DEBUG START ===');
        console.log('Factory:', factory);
        console.log('Items:', items);
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid items array' 
            });
        }
        
        const db = client.db('submittedDB');
        const collection = db.collection('pressDB');
        
        // Get last 30 days in YYYY-MM-DD format (pressDB uses Date field as string)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        console.log('Date threshold (30 days ago):', dateThreshold);
        
        const trends = {};
        
        for (const item of items) {
            const query = {
                Date: { $gte: dateThreshold }  // Changed from createdAt to Date (string field)
            };
            
            if (factory) {
                query.工場 = factory;
            }
            
            if (item.背番号) {
                query.背番号 = item.背番号;
            } else if (item.品番) {
                query.品番 = item.品番;
            }
            
            console.log(`Query for ${item.背番号 || item.品番}:`, JSON.stringify(query));
            
            // Get all records and count by equipment
            const records = await collection.find(query).toArray();
            console.log(`  Found ${records.length} records`);
            
            if (records.length > 0) {
                console.log('  Sample record:', records[0]);
            }
            
            const equipmentCounts = {};
            records.forEach(record => {
                const equipment = record.設備;
                if (equipment) {
                    equipmentCounts[equipment] = (equipmentCounts[equipment] || 0) + 1;
                }
            });
            
            console.log('  Equipment distribution:', equipmentCounts);
            
            // Find most frequent equipment
            let maxCount = 0;
            let mostFrequentEquipment = null;
            
            for (const [equipment, count] of Object.entries(equipmentCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    mostFrequentEquipment = equipment;
                }
            }
            
            console.log(`  Most frequent: ${mostFrequentEquipment} (${maxCount} times)`);
            
            const identifier = item.背番号 || item.品番;
            trends[identifier] = {
                mostFrequentEquipment,
                frequency: maxCount,
                totalRecords: records.length,
                equipmentDistribution: equipmentCounts
            };
        }
        
        console.log('Final trends:', trends);
        console.log('=== PRESS HISTORY API DEBUG END ===');
        
        res.json({ success: true, trends });
    } catch (error) {
        console.error('Error fetching press history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
