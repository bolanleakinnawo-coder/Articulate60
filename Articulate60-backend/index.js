const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./DB_CONFIG/db");
const userRoutes = require("./ROUTES/user");

const app = express();

const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);

connectDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
