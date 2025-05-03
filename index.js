// Import necessary modules
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

// Initialize Firebase Admin SDK with the service account credentials
const serviceAccount = require('./firebase/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET,
});

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Set up MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('isrgrootx1.pem'),
  },
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.stack);
    return;
  }
  console.log('Connected to MySQL as ID ' + connection.threadId);
});

app.get('/departments', (req, res) => {
  connection.query('SELECT * FROM departments', (err, results) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return res.status(500).send('Error fetching departments');
    }
    res.status(200).json(results);
  });
});

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

app.get('/tags', (req, res) => {
  connection.query('SELECT * FROM tags', (err, results) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).send('Error fetching tags');
    }
    res.status(200).json(results);
  });
});

app.get('/notes/:id/rating', (req, res) => {
  const noteId = req.params.id;
  const query = `
    SELECT AVG(rating) AS average_rating
    FROM reviews
    WHERE note_id = ? AND is_deleted = FALSE
  `;

  connection.query(query, [noteId], (err, results) => {
    if (err) {
      console.error('Error getting average rating:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const average = results[0].average_rating;
    res.json({
      note_id: noteId,
      average_rating: average !== null ? parseFloat(average.toFixed(2)) : null
    });
  });
});

// Route for filtering notes with department, course, and tags
app.get('/notes', (req, res) => {
  const { department_id, course_id, tag, sort_by } = req.query;
  
  let query = `
    SELECT notes.note_id, notes.title,
           ANY_VALUE(courses.name) AS course_name,  // Use ANY_VALUE() for non-aggregated fields
           GROUP_CONCAT(tags.name) AS tags,
           AVG(reviews.rating) AS avg_rating
    FROM notes
    LEFT JOIN courses ON notes.course_id = courses.course_id
    LEFT JOIN departments ON courses.department_id = departments.department_id
    LEFT JOIN note_tags ON notes.note_id = note_tags.note_id
    LEFT JOIN tags ON note_tags.tag_id = tags.tag_id
    LEFT JOIN reviews ON notes.note_id = reviews.note_id AND reviews.is_deleted = FALSE
    WHERE notes.is_deleted = FALSE
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
    query += ' AND tags.name = ?';
    params.push(tag);
  }

  query += ' GROUP BY notes.note_id';
  
  if (sort_by === 'date') {
    query += ' ORDER BY notes.created_at DESC';  // or uploaded_at, based on your schema
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

const PORT = process.env.PORT || 3000;

app.get('/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
