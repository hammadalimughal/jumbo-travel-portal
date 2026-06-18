const express = require('express');
const app = express();
require('./db');
const cors = require('cors');
const path = require('path')
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const PORT = process.env.PORT || 6947;

// 1. CORS Setup
app.use(cors({
  origin: "http://localhost:5173", // allow Vite frontend
  methods: ["GET", "POST", "PUT", "DELETE","PUT", "PATCH"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this to your frontend URL for better security
  }
});

// 2. Body Parsing (Using built-in Express methods)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());


// Debug middleware
app.use((req, res, next) => {
  // console.log(`${req.method} ${req.path}`);
  // If this still shows undefined, check the "Important Checklist" below
  // console.log('Body:', req.body); 
  next();
});

app.get('/jumbo-travel-portal/test', (req, res) => {
  res.send("Working")
})

app.use('/api', require('./controller/apiHandler'));


app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

module.exports = app;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('quotation-updated', (updatedData) => {
    // Broadcast to everyone EXCEPT the sender
    socket.broadcast.emit('receive-quotation-update', updatedData);
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});

// Only listen if not running on Vercel
if (!process.env.VERCEL) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}