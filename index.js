// Import necessary modules
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // add this at the top if not already there

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK with the service account credentials
const serviceAccount = require('./firebase/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET,
});

// Initialize Express
const app = express();
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // To parse JSON in requests

// Set up MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('isrgrootx1.pem'), // adjust if the file is elsewhere
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

// Route for getting all departments
app.get('/departments', (req, res) => {
  connection.query('SELECT * FROM departments', (err, results) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return res.status(500).send('Error fetching departments');
    }
    res.status(200).json(results);
  });
});

// Route for getting all courses in a department
app.get('/courses', (req, res) => {
  const departmentId = req.query.department_id;
  const query = 'SELECT * FROM courses WHERE department_id = ?';
  connection.query(query, [departmentId], (err, results) => {
    if (err) {
      console.error('Error fetching courses:', err);
      return res.status(500).send('Error fetching courses');
    }
    res.status(200).json(results);
  });
});

// Route for getting all tags
app.get('/tags', (req, res) => {
  connection.query('SELECT * FROM tags', (err, results) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).send('Error fetching tags');
    }
    res.status(200).json(results);
  });
});

// Route for filtering notes with department, course, and tags
app.get('/notes', (req, res) => {
  const { department_id, course_id, tag, sort_by } = req.query;
  
  let query = `
    SELECT notes.id, notes.title, courses.course_name, GROUP_CONCAT(tags.tag_name) AS tags, AVG(reviews.rating) AS avg_rating
    FROM notes
    LEFT JOIN courses ON notes.course_id = courses.id
    LEFT JOIN note_tags ON notes.id = note_tags.note_id
    LEFT JOIN tags ON note_tags.tag_id = tags.id
    LEFT JOIN reviews ON notes.id = reviews.note_id
    WHERE 1 = 1
  `;
  
  const params = [];
  
  if (department_id) {
    query += ' AND courses.department_id = ?';
    params.push(department_id);
  }
  
  if (course_id) {
    query += ' AND notes.course_id = ?';
    params.push(course_id);
  }
  
  if (tag) {
    query += ' AND tags.tag_name = ?';
    params.push(tag);
  }

  query += ' GROUP BY notes.id';
  
  if (sort_by === 'date') {
    query += ' ORDER BY notes.uploaded_at DESC';
  } else if (sort_by === 'rating') {
    query += ' ORDER BY avg_rating DESC';
  }
  
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching notes:', err);
      return res.status(500).send('Error fetching notes');
    }
    res.status(200).json(results);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

// Test route to confirm backend is working
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
