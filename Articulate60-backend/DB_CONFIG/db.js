const mongoose = require("mongoose");

const uri = process.env.MONGO_URL;

const Connect = async () => {
  try {
    await mongoose.connect(uri);
    console.log("Database connected successfully");
  } catch (error) {
    console.log(error);
  }
};

module.exports = Connect;
