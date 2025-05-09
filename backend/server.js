require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/routes");
const https = require("https");
const { Server } = require("socket.io");
const path = require("path");
const { setSocketInstance } = require("./controllers/controllers");
const { verify } = require("jsonwebtoken");

const app = express();
const server = https.createServer(app);
const io = new Server(server);

// Attach Socket.IO instance
setSocketInstance(io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

// Static file serving for viewing in browser (not download)
app.use(
  "/Uploads/comments",
  express.static(path.join(__dirname, "Uploads/comments"))
);

app.use(
  "/profilePictures",
  express.static(path.join(__dirname, "Uploads/profilePictures"))
);

// Route for downloading attachments
app.get("/download/comment/:filename", (req, res) => {
  const filePath = path.join(
    __dirname,
    "Uploads/comments",
    req.params.filename
  );
  res.download(filePath, req.params.filename, (err) => {
    if (err) {
      console.error("Download error:", err);
      res.status(500).send("Could not download the file");
    }
  });
});

// Health
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Routes
app.use("/api/auth", authRoutes);

// Web Socket
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("authenticate", (token) => {
    verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return socket.disconnect();

      socket.join(decoded.userId.toString());
      console.log(`User ${decoded.userId} connected to their room`);
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
