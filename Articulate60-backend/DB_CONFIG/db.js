const mongoose = require("mongoose");

// Connects to MongoDB. If the first connection fails, the server stops so
// Render restarts it (instead of running with no database and making every
// request hang). After that, mongoose reconnects by itself.
const Connect = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error("MONGO_URL is not set. The server cannot start without it.");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () =>
  console.error("Database disconnected; mongoose will keep retrying."),
);
mongoose.connection.on("reconnected", () => console.log("Database reconnected."));

module.exports = Connect;
