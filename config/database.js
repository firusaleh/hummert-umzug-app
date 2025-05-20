// config/database.js
const mongoose = require('mongoose');

// Optimized database connection with performance options
const connectDB = async () => {
  try {
    const options = {
      // Set Mongoose options for better performance and reliability
      useNewUrlParser: true,                // Use new URL parser
      useUnifiedTopology: true,             // Use new Server Discovery and Monitoring engine
      autoIndex: process.env.NODE_ENV !== 'production', // Only auto-create indexes in development
      serverSelectionTimeoutMS: 5000,       // Timeout for server selection
      socketTimeoutMS: 45000,               // Timeout for socket operations
      family: 4,                            // Use IPv4, avoid issues with IPv6
      maxPoolSize: 10,                      // Maintain up to 10 socket connections
      minPoolSize: 2,                       // Maintain at least 2 socket connections
      connectTimeoutMS: 10000,              // Timeout for initial connection
      heartbeatFrequencyMS: 10000,          // Heartbeat for replica set monitoring
      maxIdleTimeMS: 30000,                 // Max idle time for pool connections
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`MongoDB verbunden: ${conn.connection.host}`);
    
    // Setup database indexes if in development environment
    if (process.env.NODE_ENV !== 'production') {
      const setupIndexes = require('../models/indexes');
      await setupIndexes();
    }
    
    // Set up global plugins and settings
    mongoose.plugin(require('../utils/mongoose-lean-virtuals'));
    
    // Monitor for errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    // Handle graceful reconnection
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    // Handle SIGINT (Ctrl+C) gracefully
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    console.error(`MongoDB Verbindungsfehler: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;