// Add this route to your server.js file

app.post('/uploadMasterImage', async (req, res) => {
  console.log("🟢 Received POST request to /uploadMasterImage");
  
  const { base64, label, recordId, username, collectionName } = req.body;

  // Validation
  if (!base64 || !recordId || !username || !collectionName) {
    return res.status(400).json({ 
      error: 'Missing required fields: base64, recordId, username, collectionName' 
    });
  }

  try {
    await client.connect();
    
    const database = client.db("Sasaki_Coating_MasterDB");
    const collection = database.collection(collectionName);

    // Convert recordId to ObjectId if it's a string
    let objectId;
    try {
      objectId = typeof recordId === 'string' ? new ObjectId(recordId) : recordId;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid recordId format' });
    }

    // Here you would typically upload the image to a cloud storage service
    // For now, I'll show you a placeholder that stores the base64 directly
    // In production, you should upload to AWS S3, Google Cloud Storage, or Firebase Storage
    
    // Placeholder: Create a mock image URL (replace with actual cloud storage upload)
    const timestamp = Date.now();
    const fileName = `${collectionName}_${recordId}_${timestamp}.jpg`;
    
    // TODO: Replace this with actual cloud storage upload
    // Example for AWS S3:
    // const uploadResult = await s3.upload({
    //   Bucket: 'your-bucket-name',
    //   Key: fileName,
    //   Body: Buffer.from(base64, 'base64'),
    //   ContentType: 'image/jpeg'
    // }).promise();
    // const imageURL = uploadResult.Location;
    
    // For now, we'll create a data URL (this should be replaced with actual cloud storage)
    const imageURL = `data:image/jpeg;base64,${base64}`;
    
    // Update the record with the image URL
    const updateResult = await collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          imageURL: imageURL,
          imageLabel: label || 'main',
          imageUpdatedBy: username,
          imageUpdatedAt: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        error: 'Record not found in the specified collection' 
      });
    }

    if (updateResult.modifiedCount === 0) {
      return res.status(200).json({ 
        message: 'Record found but no changes made',
        imageURL: imageURL 
      });
    }

    console.log(`✅ Image uploaded successfully for record ${recordId} in collection ${collectionName}`);
    
    res.json({
      success: true,
      imageURL: imageURL,
      message: 'Image uploaded and record updated successfully',
      recordId: recordId,
      collectionName: collectionName
    });

  } catch (error) {
    console.error("❌ Error in /uploadMasterImage route:", error);
    res.status(500).json({ 
      error: 'Internal server error during image upload',
      details: error.message 
    });
  }
});

// Optional: Route to delete/remove image from a record
app.post('/removeMasterImage', async (req, res) => {
  console.log("🟢 Received POST request to /removeMasterImage");
  
  const { recordId, username, collectionName } = req.body;

  if (!recordId || !username || !collectionName) {
    return res.status(400).json({ 
      error: 'Missing required fields: recordId, username, collectionName' 
    });
  }

  try {
    await client.connect();
    
    const database = client.db("Sasaki_Coating_MasterDB");
    const collection = database.collection(collectionName);

    let objectId;
    try {
      objectId = typeof recordId === 'string' ? new ObjectId(recordId) : recordId;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid recordId format' });
    }

    const updateResult = await collection.updateOne(
      { _id: objectId },
      { 
        $unset: { 
          imageURL: "",
          imageLabel: "",
          imageUpdatedBy: "",
          imageUpdatedAt: ""
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`✅ Image removed successfully from record ${recordId} in collection ${collectionName}`);
    
    res.json({
      success: true,
      message: 'Image removed successfully',
      recordId: recordId,
      collectionName: collectionName
    });

  } catch (error) {
    console.error("❌ Error in /removeMasterImage route:", error);
    res.status(500).json({ 
      error: 'Internal server error during image removal',
      details: error.message 
    });
  }
});
