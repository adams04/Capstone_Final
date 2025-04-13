require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Capstone");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;