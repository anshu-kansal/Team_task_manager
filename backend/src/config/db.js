if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto');
}
const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/team-task-manager';
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error('All MongoDB connection attempts exhausted. Server will start but DB is unavailable.');
        return; // don't crash — let the health check endpoint still respond
      }
      // wait before retrying (exponential backoff: 1s, 2s, 4s, 8s, 16s)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
};

module.exports = connectDB;

