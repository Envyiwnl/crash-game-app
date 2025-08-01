const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected on: ${conn.connection.host}`);
  } catch (error) {
    console.error("Mongo DB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
