const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { CATEGORY_DIR, MAX_IMAGE_BYTES, MAX_IMAGE_MB, ALLOWED_TYPES } = require('../config/upload');
const { removeFile, matchesSignature } = require('../utils/imageFiles');

fs.mkdirSync(CATEGORY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CATEGORY_DIR),
  // Never trust the client filename: random name + extension derived from the validated mime type.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
});

const uploader = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new ApiError(400, 'Invalid image type', ['Only JPG, PNG, WEBP and GIF images are allowed']));
    }
    cb(null, true);
  },
});

/**
 * Accepts an optional single image in the multipart field "image".
 * Plain JSON requests pass straight through, so existing clients keep working.
 */
function parseImageUpload(req, res, next) {
  if (!req.is('multipart/form-data')) return next();

  // If the request ends without the controller having committed the file (validation error,
  // duplicate name, DB failure, client abort...), delete the orphaned upload.
  res.on('close', () => {
    if (req.file && !req.imageCommitted) removeFile(req.file.path);
  });

  uploader.single('image')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(413, 'Image is too large', [`Maximum image size is ${MAX_IMAGE_MB} MB`]));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, 'Unexpected file field', ['Send the image in a field named "image" (one file only)']));
        }
        return next(new ApiError(400, `Upload failed: ${err.message}`));
      }
      return next(err);
    }
    if (!req.file) return next();

    try {
      if (req.file.size === 0 || !(await matchesSignature(req.file.path, req.file.mimetype))) {
        return next(new ApiError(400, 'Invalid image file', ['The file is empty, corrupted or is not a real JPG, PNG, WEBP or GIF image']));
      }
      next();
    } catch (e) {
      next(e);
    }
  });
}

module.exports = { parseImageUpload };
