// Import necessary modules
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');  // Required to read the SSL certificate

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK with the service account credentials
const serviceAccount = require('./firebase/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET, // Your Firebase Storage bucket
});

// Initialize Express
const app = express();
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // To parse JSON in requests

// Set up MySQL connection with SSL
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'isrgrootx1.pem')),  // Use the current directory for the certificate
  },
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as ID ' + connection.threadId);
});

// Set up multer (middleware for handling file uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route for uploading files to Firebase
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    // Create a reference to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(Date.now() + path.extname(req.file.originalname));

    // Upload the file to Firebase
    const blobStream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error('Error uploading file:', err);
      return res.status(500).send('Error uploading file');
    });

    blobStream.on('finish', async () => {
      // Get the file URL after it's uploaded
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

      // Insert file metadata into MySQL database (optional)
      const query = 'INSERT INTO files (file_name, file_url) VALUES (?, ?)';
      connection.query(query, [req.file.originalname, publicUrl], (err, results) => {
        if (err) {
          console.error('Error inserting data into database:', err);
          return res.status(500).send('Error saving file info to database');
        }
        res.status(200).send({
          message: 'File uploaded successfully',
          fileUrl: publicUrl,
        });
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});