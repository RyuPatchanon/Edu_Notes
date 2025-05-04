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

// Multer setup to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Handle file upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  const { title, description, course_id, tag_id } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(__dirname, 'uploads', file.filename);

    // Upload file to Firebase Storage
    await admin.storage().bucket().upload(filePath, {
      destination: `notes/${fileName}`,
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Generate the Firebase file URL
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${admin.storage().bucket().name}/o/notes%2F${fileName}?alt=media`;

    // Insert note information into the database
    const query = `
      INSERT INTO notes (title, description, course_id, tag_id, file_url) 
      VALUES (?, ?, ?, ?, ?)
    `;
    connection.query(query, [title, description, course_id, tag_id, fileUrl], (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Failed to insert into database." });
      }

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      res.status(200).json({ message: "File uploaded and note saved.", noteId: results.insertId });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload file to Firebase." });
  }
});

// Get departments
app.get('/departments', (req, res) => {
  connection.query('SELECT * FROM departments', (err, results) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return res.status(500).send('Error fetching departments');
    }
    res.status(200).json(results);
  });
});

// Get courses based on department
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

// Get tags
app.get('/tags', (req, res) => {
  connection.query('SELECT * FROM tags', (err, results) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).send('Error fetching tags');
    }
    res.status(200).json(results);
  });
});

// Get notes with optional filters
app.get('/notes', (req, res) => {
  const { department_id, course_id, tag_id, sort_by } = req.query;
  
  let query = `
  SELECT 
      notes.note_id, 
      notes.title, 
      ANY_VALUE(courses.name) AS course_name, 
      GROUP_CONCAT(DISTINCT tags.name) AS tags,
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
  
  if (tag_id) {
    query += ' AND tags.tag_id = ?';
    params.push(tag_id);
  }

  query += ' GROUP BY notes.note_id';

  if (sort_by === 'date') {
    query += ' ORDER BY notes.created_at DESC';
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

// Get details of a specific note
app.get('/notes/:id', (req, res) => {
  const noteId = req.params.id;

  const query = `
    SELECT 
      notes.note_id, 
      notes.title,
      notes.description,
      notes.created_at,
      ANY_VALUE(courses.name) AS course_name, 
      GROUP_CONCAT(DISTINCT tags.name) AS tags,
      GROUP_CONCAT(DISTINCT files.file_url) AS file_urls,
      AVG(reviews.rating) AS avg_rating
    FROM notes
    LEFT JOIN courses ON notes.course_id = courses.course_id
    LEFT JOIN note_tags ON notes.note_id = note_tags.note_id
    LEFT JOIN tags ON note_tags.tag_id = tags.tag_id
    LEFT JOIN files ON notes.note_id = files.note_id
    LEFT JOIN reviews ON notes.note_id = reviews.note_id AND reviews.is_deleted = FALSE
    WHERE notes.note_id = ? AND notes.is_deleted = FALSE
    GROUP BY notes.note_id
  `;

  connection.query(query, [noteId], (err, results) => {
    if (err) {
      console.error('Error fetching note details:', err);
      return res.status(500).send('Error fetching note');
    }
    res.status(200).json(results[0]);
  });
});

// Get reviews for a note
app.get('/notes/:id/reviews', (req, res) => {
  const noteId = req.params.id;

  const query = `
    SELECT review_id, content, rating, created_at
    FROM reviews
    WHERE note_id = ? AND is_deleted = FALSE
    ORDER BY created_at DESC
  `;

  connection.query(query, [noteId], (err, results) => {
    if (err) {
      console.error('Error fetching reviews:', err);
      return res.status(500).send('Error fetching reviews');
    }
    res.status(200).json(results);
  });
});

// Post a review for a note
app.post('/notes/:id/reviews', (req, res) => {
  const noteId = req.params.id;
  const { content, rating } = req.body;

  if (!content || typeof rating !== 'number') {
    return res.status(400).send('Invalid review data');
  }

  const query = `
    INSERT INTO reviews (note_id, content, rating, created_at, is_deleted)
    VALUES (?, ?, ?, NOW(), FALSE)
  `;

  connection.query(query, [noteId, content, rating], (err, result) => {
    if (err) {
      console.error('Error submitting review:', err);
      return res.status(500).send('Error submitting review');
    }
    res.status(201).send('Review submitted');
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' });
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
