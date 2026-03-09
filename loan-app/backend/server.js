const app = require("./app");
const connectDB = require("./config/db");
const keepAlive = require("./utils/keepAlive");

const PORT = process.env.PORT || 5000;

// Connect to Database then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start keep-alive ping
    keepAlive();
  });
});
