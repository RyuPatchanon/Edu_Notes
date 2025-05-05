// Import necessary modules
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadFileToFirebase = require("./scripts/firebaseUpload");

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET,
});

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('isrgrootx1.pem'),
  },
});

// Multer setup
const upload = multer({ dest: 'uploads/' });

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { title, description, course_id, tag_id } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Firebase
    const fileUrl = await uploadFileToFirebase(file);

    // Insert note
    const [noteResult] = await pool.execute(
      `INSERT INTO notes (title, description, course_id, created_at, updated_at, is_deleted) 
       VALUES (?, ?, ?, NOW(), NOW(), FALSE)`,
      [title, description, course_id]
    );

    const noteId = noteResult.insertId;

    // Insert file
    await pool.execute(
      `INSERT INTO files (note_id, file_name, file_url, uploaded_at) 
       VALUES (?, ?, ?, NOW())`,
      [noteId, file.originalname, fileUrl]
    );

    // Insert note_tag if tag_id is provided
    if (tag_id) {
      await pool.execute(
        `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`,
        [noteId, tag_id]
      );
    }

    res.status(201).json({ message: 'Note uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Clean up the uploaded file
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.warn('Error cleaning up uploaded file:', cleanupErr.message);
    }
  }
});

// Get departments
app.get('/departments', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM departments');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).send('Error fetching departments');
  }
});

// Get courses based on department
app.get('/courses', async (req, res) => {
  const departmentId = req.query.department_id;
  try {
    const [results] = await pool.execute('SELECT * FROM courses WHERE department_id = ?', [departmentId]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).send('Error fetching courses');
  }
});

// Get tags
app.get('/tags', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM tags');
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).send('Error fetching tags');
  }
});

// Get notes with optional filters
app.get('/notes', async (req, res) => {
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
  
  try {
    const [results] = await pool.execute(query, params);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).send('Error fetching notes');
  }
});

// Get details of a specific note
app.get('/notes/:id', async (req, res) => {
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

  try {
    const [results] = await pool.execute(query, [noteId]);
    res.status(200).json(results[0]);
  } catch (err) {
    console.error('Error fetching note details:', err);
    res.status(500).send('Error fetching note');
  }
});

// Get reviews for a note
app.get('/notes/:id/reviews', async (req, res) => {
  const noteId = req.params.id;

  const query = `
    SELECT review_id, content, rating, created_at
    FROM reviews
    WHERE note_id = ? AND is_deleted = FALSE
    ORDER BY created_at DESC
  `;

  try {
    const [results] = await pool.execute(query, [noteId]);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).send('Error fetching reviews');
  }
});

// Post a review for a note
app.post('/notes/:id/reviews', async (req, res) => {
  const noteId = req.params.id;
  const { content, rating } = req.body;

  if (!content || typeof rating !== 'number') {
    return res.status(400).send('Invalid review data');
  }

  const query = `
    INSERT INTO reviews (note_id, content, rating, created_at, is_deleted)
    VALUES (?, ?, ?, NOW(), FALSE)
  `;

  try {
    await pool.execute(query, [noteId, content, rating]);
    res.status(201).send('Review submitted');
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).send('Error submitting review');
  }
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  const stats = {
    total_notes: 0,
    total_files: 0,
    files_per_course: [],
    files_per_department: [],
  };

  const queries = {
    totalNotes: 'SELECT COUNT(*) AS count FROM notes WHERE is_deleted = FALSE',
    totalFiles: 'SELECT COUNT(*) AS count FROM files',
    filesByCourse: `
      SELECT courses.name AS course_name, COUNT(files.file_id) AS file_count
      FROM files
      JOIN notes ON files.note_id = notes.note_id
      JOIN courses ON notes.course_id = courses.course_id
      WHERE notes.is_deleted = FALSE
      GROUP BY courses.course_id
    `,
    filesByDepartment: `
      SELECT departments.name AS department_name, COUNT(files.file_id) AS file_count
      FROM files
      JOIN notes ON files.note_id = notes.note_id
      JOIN courses ON notes.course_id = courses.course_id
      JOIN departments ON courses.department_id = departments.department_id
      WHERE notes.is_deleted = FALSE
      GROUP BY departments.department_id
    `
  };

  try {
    const [noteResult] = await pool.execute(queries.totalNotes);
    stats.total_notes = noteResult[0].count;

    const [fileResult] = await pool.execute(queries.totalFiles);
    stats.total_files = fileResult[0].count;

    const [courseResults] = await pool.execute(queries.filesByCourse);
    stats.files_per_course = courseResults;

    const [deptResults] = await pool.execute(queries.filesByDepartment);
    stats.files_per_department = deptResults;

    res.status(200).json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).send('Error fetching stats');
  }
});

// Deleted notes endpoint
app.get('/deleted-notes', async (req, res) => {
  const query = `
    SELECT notes.note_id, notes.title, trash.deleted_at
    FROM notes
    JOIN trash ON notes.note_id = trash.note_id
    WHERE notes.is_deleted = TRUE
    ORDER BY trash.deleted_at DESC
  `;

  try {
    const [results] = await pool.execute(query);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching deleted notes:', err);
    res.status(500).send('Error fetching deleted notes');
  }
});

// Deleted reviews endpoint
app.get('/deleted-reviews', async (req, res) => {
  const query = `
    SELECT reviews.review_id, reviews.content, reviews.rating, review_trash.deleted_at
    FROM reviews
    JOIN review_trash ON reviews.review_id = review_trash.review_id
    WHERE reviews.is_deleted = TRUE
    ORDER BY review_trash.deleted_at DESC
  `;

  try {
    const [results] = await pool.execute(query);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching deleted reviews:', err);
    res.status(500).send('Error fetching deleted reviews');
  }
});

// Restore note endpoint
app.post('/restore-note/:id', async (req, res) => {
  const noteId = req.params.id;

  const updateNote = 'UPDATE notes SET is_deleted = FALSE WHERE note_id = ?';
  const deleteTrash = 'DELETE FROM trash WHERE note_id = ?';

  try {
    await pool.execute(updateNote, [noteId]);
    await pool.execute(deleteTrash, [noteId]);
    res.status(200).send('Note restored');
  } catch (err) {
    console.error('Error restoring note:', err);
    res.status(500).send('Error restoring note');
  }
});

// Restore review endpoint
app.post('/restore-review/:id', async (req, res) => {
  const reviewId = req.params.id;

  const updateReview = 'UPDATE reviews SET is_deleted = FALSE WHERE review_id = ?';
  const deleteTrash = 'DELETE FROM review_trash WHERE review_id = ?';

  try {
    await pool.execute(updateReview, [reviewId]);
    await pool.execute(deleteTrash, [reviewId]);
    res.status(200).send('Review restored');
  } catch (err) {
    console.error('Error restoring review:', err);
    res.status(500).send('Error restoring review');
  }
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