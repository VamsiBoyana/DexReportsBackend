const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected Successfully\n`);
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;


// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     const uri = process.env.MONGODB_URI; // 👈 make sure .env uses MONGODB_URI
//     if (!uri) throw new Error("MONGODB_URI is not set");

//     await mongoose.connect(uri); // ✅ no deprecated options
//     console.log(`✅ MongoDB Connected Successfully\n`);
//   } catch (error) {
//     console.error("❌ Database connection error:", error.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
