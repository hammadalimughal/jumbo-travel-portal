const express = require('express');
const app = express();
require('./db');
const cors = require('cors');
const path = require('path')
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 6947;

// 1. CORS Setup
app.use(cors({
  origin: "http://localhost:5173", // allow Vite frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// 2. Body Parsing (Using built-in Express methods)
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

app.use(cookieParser());


// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  // If this still shows undefined, check the "Important Checklist" below
  console.log('Body:', req.body); 
  next();
});

app.use('/api', require('./controller/apiHandler'));


app.use((req,res) => {
  res.sendFile(path.resolve('./public/index.html'))
})

// app.listen(PORT, () => {
//   console.log(`App is live on http://localhost:${PORT}/`);
// });

module.exports = app;