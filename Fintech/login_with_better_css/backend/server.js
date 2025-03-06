const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Enable CORS for frontend requests
app.use(cors({
    origin: "http://127.0.0.1:3000",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
}));

// Middleware for parsing JSON requests
app.use(express.json());

// Connect to MongoDB before starting the server
connectDB().then(() => {
    // Authentication routes
    app.use("/auth", authRoutes);

    // Root route to prevent "Cannot GET /"
    app.get("/", (req, res) => {
        res.send("Welcome to the Authentication API!");
    });

    // Start server only after DB connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}).catch(err => {
    console.error("❌ Failed to connect to DB, shutting down...");
    process.exit(1);
});
