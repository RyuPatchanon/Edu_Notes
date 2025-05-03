const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET,
});

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Set up secure MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('./isrgrootx1.pem'),
  },
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as ID ' + connection.threadId);
});

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');

    const bucket = admin.storage().bucket();
    const file = bucket.file(Date.now() + path.extname(req.file.originalname));

    const blobStream = file.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    blobStream.on('error', (err) => {
      console.error('Upload error:', err);
      return res.status(500).send('Error uploading file');
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      const query = 'INSERT INTO files (file_name, file_url) VALUES (?, ?)';
      connection.query(query, [req.file.originalname, publicUrl], (err) => {
        if (err) {
          console.error('DB error:', err);
          return res.status(500).send('Error saving file info');
        }
        res.status(200).send({ message: 'File uploaded successfully', fileUrl: publicUrl });
      });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Internal error:', error);
    res.status(500).send('Internal server error');
  }
});

// ✅ New Endpoint: GET /notes with optional filters
app.get('/notes', (req, res) => {
  const { department_id, course_id, tag, sort } = req.query;

  let sql = `
    SELECT 
      notes.note_id,
      notes.title,
      courses.course_name,
      departments.department_name,
      files.file_name,
      files.file_url,
      AVG(reviews.rating) AS average_rating,
      COUNT(reviews.review_id) AS review_count
    FROM notes
    JOIN files ON notes.note_id = files.note_id
    JOIN courses ON notes.course_id = courses.course_id
    JOIN departments ON courses.department_id = departments.department_id
    LEFT JOIN reviews ON notes.note_id = reviews.note_id
    LEFT JOIN note_tags ON notes.note_id = note_tags.note_id
    LEFT JOIN tags ON note_tags.tag_id = tags.tag_id
    WHERE notes.is_deleted = 0
  `;

  const params = [];

  if (department_id) {
    sql += ' AND departments.department_id = ?';
    params.push(department_id);
  }

  if (course_id) {
    sql += ' AND courses.course_id = ?';
    params.push(course_id);
  }

  if (tag) {
    sql += ' AND tags.tag_name = ?';
    params.push(tag);
  }

  sql += ' GROUP BY notes.note_id';

  if (sort === 'newest') {
    sql += ' ORDER BY notes.created_at DESC';
  } else if (sort === 'oldest') {
    sql += ' ORDER BY notes.created_at ASC';
  } else if (sort === 'top-rated') {
    sql += ' ORDER BY average_rating DESC';
  }

  connection.query(sql, params, (err, results) => {
    if (err) {
      console.error('Query error:', err);
      return res.status(500).send('Error retrieving notes');
    }
    res.status(200).json(results);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
