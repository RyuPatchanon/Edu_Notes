// This is the main entry point for the Express.js application.
// It sets up the server, connects to the database, and defines various API endpoints for handling notes, courses, tags, and reviews.

// Import necessary modules
const express = require('express'); // Express.js framework for building web applications.
const cors = require('cors'); // CORS (Cross-Origin Resource Sharing) middleware to enable requests from different origins.
const mysql = require('mysql2/promise'); // MySQL2 library with promise support for database interactions.
const admin = require('firebase-admin'); // Firebase Admin SDK for server-side Firebase services.
const dotenv = require('dotenv'); // Dotenv for loading environment variables from a .env file.
const multer = require('multer'); // Multer middleware for handling multipart/form-data, primarily used for file uploads.
const path = require('path'); // Node.js path module for working with file and directory paths.
const fs = require('fs'); // Node.js file system module for interacting with the file system.
const uploadFileToFirebase = require("./scripts/firebaseUpload"); // Custom module for uploading files to Firebase Storage.

// Load environment variables from .env file into process.env
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // Parses the Firebase service account key from environment variables.
admin.initializeApp({ // Initializes the Firebase Admin app with credentials and storage bucket configuration.
  credential: admin.credential.cert(serviceAccount), // Uses the parsed service account key for authentication.
  storageBucket: process.env.FIREBASE_BUCKET, // Sets the default Firebase Storage bucket from environment variables.
});

// Initialize Express application
const app = express(); // Creates an Express application instance.
app.use(cors()); // Enables CORS for all routes, allowing cross-origin requests.
app.use(express.json()); // Middleware to parse incoming requests with JSON payloads.

// MySQL connection pool configuration
const pool = mysql.createPool({ // Creates a MySQL connection pool for efficient database connections.
  host: process.env.DB_HOST, // Database host from environment variables.
  user: process.env.DB_USER, // Database user from environment variables.
  password: process.env.DB_PASSWORD, // Database password from environment variables.
  database: process.env.DB_NAME, // Database name from environment variables.
  ssl: { // SSL configuration for secure database connection.
    ca: fs.readFileSync('isrgrootx1.pem'), // Reads the CA certificate file for SSL.
  },
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' }); // Configures Multer to save uploaded files to the 'uploads/' directory temporarily.

// API endpoint for uploading a new note with a file.
// It uses Multer middleware to handle a single file upload associated with the 'file' field in the form data.
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file; // The uploaded file object provided by Multer.
  const { title, description, course_id, tag_id } = req.body; // Extracts note metadata from the request body.

  if (!file) { // Checks if a file was actually uploaded.
    return res.status(400).json({ error: 'No file uploaded' }); // Returns a 400 error if no file is present.
  }

  // Defines filePath for potential cleanup, using the path provided by Multer.
  const filePath = file.path; 

  try {
    // Uploads the file to Firebase Storage using the custom utility function.
    const fileUrl = await uploadFileToFirebase(file);

    // Inserts the note metadata into the 'notes' table in the database.
    const [noteResult] = await pool.execute(
      `INSERT INTO notes (title, description, course_id, created_at, updated_at, is_deleted) 
       VALUES (?, ?, ?, NOW(), NOW(), FALSE)`, // SQL query to insert note details.
      [title, description, course_id] // Parameters for the SQL query.
    );

    const noteId = noteResult.insertId; // Retrieves the ID of the newly inserted note.

    // Inserts file metadata into the 'files' table, linking it to the note.
    await pool.execute(
      `INSERT INTO files (note_id, file_name, file_url, uploaded_at) 
       VALUES (?, ?, ?, NOW())`, // SQL query to insert file details.
      [noteId, file.originalname, fileUrl] // Parameters for the file insertion query.
    );

    // If a tag_id is provided, inserts the note-tag association into the 'note_tags' table.
    if (tag_id) {
      await pool.execute(
        `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, // SQL query for note-tag association.
        [noteId, tag_id] // Parameters for the association.
      );
    }

    res.status(201).json({ message: 'Note uploaded successfully' }); // Sends a success response.
  } catch (err) { // Catches any errors during the process.
    console.error('Upload error:', err.message); // Logs the error message.
    console.error(err.stack); // Logs the error stack trace for detailed debugging.
    res.status(500).json({ error: 'Internal server error' }); // Sends a generic server error response.
  } finally {
    // Cleans up the temporarily uploaded file from the local server's 'uploads/' directory.
    try {
      if (fs.existsSync(filePath)) { // Checks if the temporary file exists.
        fs.unlinkSync(filePath); // Deletes the temporary file synchronously.
      }
    } catch (cleanupErr) { // Catches errors during the cleanup process.
      console.warn('Error cleaning up uploaded file:', cleanupErr.message); // Logs a warning if cleanup fails.
    }
  }
});

// API endpoint to fetch all departments.
app.get('/departments', async (req, res) => {
  try {
    // Executes a SQL query to select all records from the 'departments' table.
    const [results] = await pool.execute('SELECT * FROM departments');
    res.status(200).json(results); // Sends the fetched departments as a JSON response.
  } catch (err) { // Catches database errors.
    console.error('Error fetching departments:', err); // Logs the error.
    res.status(500).send('Error fetching departments'); // Sends a server error response.
  }
});

// API endpoint to fetch courses based on a given department ID.
app.get('/courses', async (req, res) => {
  const departmentId = req.query.department_id; // Retrieves department_id from the query parameters.
  try {
    // Executes a SQL query to select courses filtered by department_id.
    const [results] = await pool.execute('SELECT * FROM courses WHERE department_id = ?', [departmentId]);
    res.status(200).json(results); // Sends the fetched courses as a JSON response.
  } catch (err) { // Catches database errors.
    console.error('Error fetching courses:', err); // Logs the error.
    res.status(500).send('Error fetching courses'); // Sends a server error response.
  }
});

// API endpoint to add a new course.
app.post('/courses', async (req, res) => {
  const { course_id, name, department_id } = req.body; // Extracts course details from the request body.

  const query = 'INSERT INTO courses (course_id, name, department_id) VALUES (?, ?, ?)'; // SQL query to insert a new course.
  try {
    await pool.execute(query, [course_id, name, department_id]); // Executes the insertion query.
    res.status(201).send('Course added'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error adding course:', err); // Logs the error.
    res.status(500).send('Error adding course'); // Sends a server error response.
  }
});

// API endpoint to fetch all tags.
app.get('/tags', async (req, res) => {
  try {
    // Executes a SQL query to select all records from the 'tags' table.
    const [results] = await pool.execute('SELECT * FROM tags');
    res.status(200).json(results); // Sends the fetched tags as a JSON response.
  } catch (err) { // Catches database errors.
    console.error('Error fetching tags:', err); // Logs the error.
    res.status(500).send('Error fetching tags'); // Sends a server error response.
  }
});

// API endpoint to add a new tag.
app.post('/tags', async (req, res) => {
  const { name } = req.body; // Extracts the tag name from the request body.
  if (!name) return res.status(400).send('Tag name is required'); // Validates that the tag name is provided.

  try {
    const insertQuery = 'INSERT INTO tags (name) VALUES (?)'; // SQL query to insert a new tag.
    await pool.execute(insertQuery, [name]); // Executes the insertion query.
    res.status(201).send('Tag added successfully'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error inserting tag:', err); // Logs the error.
    res.status(500).send('Failed to add tag'); // Sends a server error response.
  }
});


// API endpoint to fetch notes, with optional filtering and sorting.
app.get('/notes', async (req, res) => {
  const { department_id, course_id, tag_id, sort_by } = req.query; // Retrieves filter and sort parameters from the query string.

  // Base SQL query to select notes with associated course name, tags, and average rating.
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
  
  const params = []; // Array to hold parameters for the SQL query to prevent SQL injection.
  
  // Appends conditions to the query based on provided filters.
  if (department_id) {
    query += ' AND courses.department_id = ?'; // Adds department filter.
    params.push(department_id); // Adds department_id to parameters array.
  }
  
  if (course_id) {
    query += ' AND notes.course_id = ?'; // Adds course filter.
    params.push(course_id); // Adds course_id to parameters array.
  }
  
  if (tag_id) {
    query += ' AND tags.tag_id = ?'; // Adds tag filter.
    params.push(tag_id); // Adds tag_id to parameters array.
  }

  query += ' GROUP BY notes.note_id'; // Groups results by note_id to aggregate tags and average rating.

  // Appends sorting conditions to the query.
  if (sort_by === 'date') {
    query += ' ORDER BY notes.created_at DESC'; // Sorts by creation date in descending order.
  } else if (sort_by === 'rating') {
    query += ' ORDER BY avg_rating DESC'; // Sorts by average rating in descending order.
  }
  
  try {
    // Executes the constructed SQL query with parameters.
    const [results] = await pool.execute(query, params);
    res.status(200).json(results); // Sends the fetched notes as a JSON response.
  } catch (err) { // Catches database errors.
    console.error('Error fetching notes:', err); // Logs the error.
    res.status(500).send('Error fetching notes'); // Sends a server error response.
  }
});

// API endpoint to get details of a specific note by its ID.
app.get('/notes/:id', async (req, res) => {
  const noteId = req.params.id; // Retrieves the note ID from the URL parameters.

  // SQL query to select detailed information for a specific note.
  const query = `
    SELECT 
      notes.note_id, 
      notes.title,
      notes.description,
      notes.created_at,
      ANY_VALUE(courses.name) AS course_name, 
      GROUP_CONCAT(DISTINCT tags.name) AS tags,
      ANY_VALUE(files.file_url) AS file_url,
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
    // Executes the query with the note ID.
    const [results] = await pool.execute(query, [noteId]);
    res.status(200).json(results[0]); // Sends the first result (the specific note) as JSON.
  } catch (err) { // Catches database errors.
    console.error('Error fetching note details:', err); // Logs the error.
    res.status(500).send('Error fetching note'); // Sends a server error response.
  }
});

// API endpoint to get all non-deleted reviews for a specific note.
app.get('/notes/:id/reviews', async (req, res) => {
  const noteId = req.params.id; // Retrieves the note ID from URL parameters.

  // SQL query to select reviews for a note, ordered by creation date.
  const query = `
    SELECT review_id, content, rating, created_at
    FROM reviews
    WHERE note_id = ? AND is_deleted = FALSE
    ORDER BY created_at DESC
  `;

  try {
    // Executes the query with the note ID.
    const [results] = await pool.execute(query, [noteId]);
    res.status(200).json(results); // Sends the fetched reviews as JSON.
  } catch (err) { // Catches database errors.
    console.error('Error fetching reviews:', err); // Logs the error.
    res.status(500).send('Error fetching reviews'); // Sends a server error response.
  }
});

// API endpoint to post a new review for a specific note.
app.post('/notes/:id/reviews', async (req, res) => {
  const noteId = req.params.id; // Retrieves the note ID from URL parameters.
  const { content, rating } = req.body; // Extracts review content and rating from the request body.

  // Validates that review content and rating are provided and rating is a number.
  if (!content || typeof rating !== 'number') {
    return res.status(400).send('Invalid review data'); // Sends a 400 error for invalid data.
  }

  // SQL query to insert a new review.
  const query = `
    INSERT INTO reviews (note_id, content, rating, created_at, is_deleted)
    VALUES (?, ?, ?, NOW(), FALSE)
  `;

  try {
    // Executes the insertion query with note ID, content, and rating.
    await pool.execute(query, [noteId, content, rating]);
    res.status(201).send('Review submitted'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error submitting review:', err); // Logs the error.
    res.status(500).send('Error submitting review'); // Sends a server error response.
  }
});

// API endpoint to update a note's description.
app.put('/notes/:id/description', async (req, res) => {
  const { description } = req.body; // Extracts the new description from the request body.
  const noteId = req.params.id; // Retrieves the note ID from URL parameters.

  try {
    // Executes a SQL query to update the description of the specified note.
    await pool.execute('UPDATE notes SET description = ? WHERE note_id = ?', [description, noteId]);
    res.status(200).send('Description updated'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error updating description:', err); // Logs the error.
    res.status(500).send('Error updating description'); // Sends a server error response.
  }
});

// API endpoint to update a review's content and rating.
app.put('/reviews/:id', async (req, res) => {
  const { content, rating } = req.body; // Extracts new content and rating from the request body.
  const reviewId = req.params.id; // Retrieves the review ID from URL parameters.

  try {
    // Executes a SQL query to update the content and rating of the specified review.
    await pool.execute('UPDATE reviews SET content = ?, rating = ? WHERE review_id = ?', [content, rating, reviewId]);
    res.status(200).send('Review updated'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error updating review:', err); // Logs the error.
    res.status(500).send('Error updating review'); // Sends a server error response.
  }
});

// API endpoint to fetch various statistics for the developer dashboard.
app.get('/stats', async (req, res) => {
  // Initializes an object to hold the statistics.
  const stats = {
    total_notes: 0,
    total_files: 0,
    files_per_course: [],
    files_per_department: [],
  };

  // Defines SQL queries to fetch different statistics.
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
    // Executes queries and populates the stats object.
    const [noteResult] = await pool.execute(queries.totalNotes);
    stats.total_notes = noteResult[0].count;

    const [fileResult] = await pool.execute(queries.totalFiles);
    stats.total_files = fileResult[0].count;

    const [courseResults] = await pool.execute(queries.filesByCourse);
    stats.files_per_course = courseResults;

    const [deptResults] = await pool.execute(queries.filesByDepartment);
    stats.files_per_department = deptResults;

    res.status(200).json(stats); // Sends the compiled statistics as JSON.
  } catch (err) { // Catches database errors.
    console.error('Error fetching stats:', err); // Logs the error.
    res.status(500).send('Error fetching stats'); // Sends a server error response.
  }
});

// API endpoint to fetch notes that have been soft-deleted.
app.get('/deleted-notes', async (req, res) => {
  // SQL query to select deleted notes along with their deletion timestamp from the 'trash' table.
  const query = `
    SELECT notes.note_id, notes.title, trash.deleted_at
    FROM notes
    JOIN trash ON notes.note_id = trash.note_id
    WHERE notes.is_deleted = TRUE
    ORDER BY trash.deleted_at DESC
  `;

  try {
    // Executes the query.
    const [results] = await pool.execute(query);
    res.status(200).json(results); // Sends the list of deleted notes as JSON.
  } catch (err) { // Catches database errors.
    console.error('Error fetching deleted notes:', err); // Logs the error.
    res.status(500).send('Error fetching deleted notes'); // Sends a server error response.
  }
});

// API endpoint to fetch reviews that have been soft-deleted, including the title of the associated note.
app.get('/deleted-reviews', async (req, res) => {
  // SQL query to select deleted reviews, their deletion timestamp, and the title of the note they belong to.
  const query = `
    SELECT 
      r.review_id,
      r.content,
      r.rating,
      rt.deleted_at,
      n.title AS note_title
    FROM review_trash rt
    JOIN reviews r ON rt.review_id = r.review_id
    JOIN notes n ON r.note_id = n.note_id
    ORDER BY rt.deleted_at DESC
  `;

  try {
    // Executes the query.
    const [results] = await pool.execute(query);
    res.status(200).json(results); // Sends the list of deleted reviews as JSON.
  } catch (err) { // Catches database errors.
    console.error('Error fetching deleted reviews:', err); // Logs the error.
    res.status(500).send('Error fetching deleted reviews'); // Sends a server error response.
  }
});

// API endpoint to restore a soft-deleted note.
app.post('/restore-note/:id', async (req, res) => {
  const noteId = req.params.id; // Retrieves the note ID from URL parameters.

  // SQL query to mark the note as not deleted.
  const updateNote = 'UPDATE notes SET is_deleted = FALSE WHERE note_id = ?';
  // SQL query to remove the note's entry from the 'trash' table.
  const deleteTrash = 'DELETE FROM trash WHERE note_id = ?';

  try {
    await pool.execute(updateNote, [noteId]); // Marks the note as not deleted.
    await pool.execute(deleteTrash, [noteId]); // Removes from trash.
    res.status(200).send('Note restored'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error restoring note:', err); // Logs the error.
    res.status(500).send('Error restoring note'); // Sends a server error response.
  }
});

// API endpoint to restore a soft-deleted review.
app.post('/restore-review/:id', async (req, res) => {
  const reviewId = req.params.id; // Retrieves the review ID from URL parameters.

  // SQL query to mark the review as not deleted.
  const updateReview = 'UPDATE reviews SET is_deleted = FALSE WHERE review_id = ?';
  // SQL query to remove the review's entry from the 'review_trash' table.
  const deleteTrash = 'DELETE FROM review_trash WHERE review_id = ?';

  try {
    await pool.execute(updateReview, [reviewId]); // Marks the review as not deleted.
    await pool.execute(deleteTrash, [reviewId]); // Removes from review_trash.
    res.status(200).send('Review restored'); // Sends a success response.
  } catch (err) { // Catches database errors.
    console.error('Error restoring review:', err); // Logs the error.
    res.status(500).send('Error restoring review'); // Sends a server error response.
  }
});

// API endpoint to soft-delete a note.
// This involves marking the note as deleted and adding an entry to a 'trash' table.
app.delete('/notes/:id', async (req, res) => {
  const noteId = req.params.id; // Retrieves the note ID from URL parameters.

  const conn = await pool.getConnection(); // Gets a connection from the pool to perform a transaction.
  try {
    await conn.beginTransaction(); // Starts a database transaction.

    // Marks the note as deleted in the 'notes' table.
    await conn.execute(`
      UPDATE notes
      SET is_deleted = TRUE
      WHERE note_id = ?
    `, [noteId]);

    // Inserts a record into the 'trash' table to log the deletion.
    await conn.execute(`
      INSERT INTO trash (note_id, deleted_at)
      VALUES (?, NOW())
    `, [noteId]);

    await conn.commit(); // Commits the transaction if all operations succeed.
    res.status(200).send('Note deleted successfully.'); // Sends a success response.
  } catch (err) { // Catches errors during the transaction.
    await conn.rollback(); // Rolls back the transaction in case of an error.
    console.error('Error deleting note:', err); // Logs the error.
    res.status(500).send('Error deleting note.'); // Sends a server error response.
  } finally {
    conn.release(); // Releases the database connection back to the pool.
  }
});

// API endpoint to soft-delete a review.
// This involves marking the review as deleted and adding an entry to a 'review_trash' table.
app.delete('/reviews/:id', async (req, res) => {
  const reviewId = req.params.id; // Retrieves the review ID from URL parameters.

  const conn = await pool.getConnection(); // Gets a connection for a transaction.
  try {
    await conn.beginTransaction(); // Starts a transaction.

    // Marks the review as deleted in the 'reviews' table.
    await conn.execute(`
      UPDATE reviews
      SET is_deleted = TRUE
      WHERE review_id = ?
    `, [reviewId]);

    // Inserts a record into the 'review_trash' table to log the deletion.
    await conn.execute(`
      INSERT INTO review_trash (review_id, deleted_at)
      VALUES (?, NOW())
    `, [reviewId]);

    await conn.commit(); // Commits the transaction.
    res.status(200).send('Review deleted successfully.'); // Sends a success response.
  } catch (err) { // Catches errors during the transaction.
    await conn.rollback(); // Rolls back the transaction.
    console.error('Error deleting review:', err); // Logs the error.
    res.status(500).send('Error deleting review.'); // Sends a server error response.
  } finally {
    conn.release(); // Releases the connection.
  }
});


// Basic test endpoint to check if the API is running.
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' }); // Sends a simple JSON response.
});

// Start the Express server
const PORT = process.env.PORT || 3000; // Uses the port from environment variables or defaults to 3000.
app.listen(PORT, () => { // Starts the server and listens on the specified port.
  console.log(`Server running on port ${PORT}`); // Logs a message indicating the server is running.
});