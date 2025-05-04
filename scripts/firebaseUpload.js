const { getStorage } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

async function uploadFileToFirebase(file) {
  const storage = getStorage();
  const bucket = storage.bucket();
  const destination = `uploads/${Date.now()}-${file.originalname}`;

  await bucket.upload(file.path, {
    destination,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
      },
    },
  });

  // Clean up local temp file
  fs.unlink(file.path, (err) => {
    if (err) console.error("Error deleting temp file:", err);
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;
}

module.exports = uploadFileToFirebase;