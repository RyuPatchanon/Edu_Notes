// firebaseUpload.js handles uploading files to Firebase Cloud Storage.
// It uses the Firebase Admin SDK for server-side operations,
// generates a unique download token for each file, and cleans up
// temporary files from the local server after successful upload.

// Imports necessary Firebase Admin SDK components for storage interaction.
const { getStorage } = require("firebase-admin/storage");
// Imports UUID library to generate unique identifiers, typically for download tokens.
const { v4: uuidv4 } = require("uuid");
// Imports Node.js built-in File System module for local file operations (e.g., deleting temp files).
const fs = require("fs");

// Asynchronously uploads a given file object to Firebase Storage.
// The 'file' parameter is expected to be an object, likely from a middleware like 'multer',
// containing properties like 'path' (local temporary path) and 'originalname'.
async function uploadFileToFirebase(file) {
  // Initializes Firebase Storage service from the Admin SDK.
  const storage = getStorage();
  // Gets a reference to the default Firebase Storage bucket.
  const bucket = storage.bucket();
  // Defines the destination path in Firebase Storage, making it unique by prepending the current timestamp
  // and using the original filename for easier identification.
  const destination = `uploads/${Date.now()}-${file.originalname}`;

  // Uploads the file from its local temporary path to the specified destination in the Firebase bucket.
  await bucket.upload(file.path, {
    destination, // The path in the bucket where the file will be stored.
    metadata: { // Sets metadata for the uploaded file.
      metadata: {
        // Generates a unique UUID v4 token. This token is essential for creating a public,
        // unguessable download URL for the file in Firebase Storage.
        firebaseStorageDownloadTokens: uuidv4(),
      },
    },
  });

  // Cleans up the temporary file stored locally on the server after it has been uploaded to Firebase.
  // This is important to free up server disk space.
  fs.unlink(file.path, (err) => {
    // Logs an error to the console if deleting the temporary file fails, but doesn't stop execution.
    if (err) console.error("Error deleting temp file:", err);
  });

  // Constructs and returns the public HTTPS URL for accessing the uploaded file.
  // This URL format is standard for Firebase Storage files when a download token is available.
  // encodeURIComponent is used on 'destination' to ensure the path is correctly URL-encoded.
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;
}

// Exports the uploadFileToFirebase function to make it available for use in other modules.
module.exports = uploadFileToFirebase;