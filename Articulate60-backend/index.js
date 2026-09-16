const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

const connectDB = require("./DB_CONFIG/db");
const userRoutes = require("./ROUTES/user");
const wordOfTheDayRoute = require("./ROUTES/wordOfTheDay");

const port = process.env.PORT || 3001;

// CORS must run before routes so browser preflight (OPTIONS) requests for
// authenticated uploads and streak requests receive the required headers.
app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);
app.use(wordOfTheDayRoute);
app.use("/api/practice", require("./ROUTES/practice"));
connectDB();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
