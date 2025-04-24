require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/routes');
const https = require('https');
const { Server } = require('socket.io');

const app = express();
const server = https.createServer(app);
const io = new Server(server);
const { setSocketInstance } = require('./controllers/controllers');
const {verify} = require("jsonwebtoken");
setSocketInstance(io);


// Database connection
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);


// Web Socket
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Add authentication middleware for sockets
  socket.on('authenticate', (token) => {
    verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return socket.disconnect();

      // Join room with user ID
      socket.join(decoded.userId.toString());
      console.log(`User ${decoded.userId} connected to their room`);
    });
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});



// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});