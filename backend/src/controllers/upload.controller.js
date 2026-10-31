const fs = require('fs');
const path = require('path');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');
const { CATEGORY_DIR } = require('../config/upload');
const { OWN_FILE, buildImageUrl, removeFile } = require('../utils/imageFiles');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /api/uploads/images  (multipart/form-data, field "image") - the only place a file is sent.
// Stores the file and returns its public URL; nothing is written to MySQL here. The client then sends
// that URL as a normal string in the `image` field of POST/PUT /api/categories.
exports.uploadImage = wrap(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Image file is required', ['Send multipart/form-data with the file in a field named "image"']);
  }
  req.imageCommitted = true; // keep the file (it is cleaned up only when the request fails)
  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: buildImageUrl(req, req.file.filename),
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// DELETE /api/uploads/images/:filename - discard an upload that was never attached to a category
// (e.g. the user cancelled the form). Files used by a category are refused.
exports.deleteUploadedImage = wrap(async (req, res) => {
  const { filename } = req.params;
  if (!OWN_FILE.test(filename)) throw new ApiError(400, 'Invalid image file name');
  const filePath = path.join(CATEGORY_DIR, filename);
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'Image not found');
  if ((await Category.countByImageFile(filename)) > 0) {
    throw new ApiError(409, 'Image is in use by a category. Remove it from the category instead.');
  }
  await removeFile(filePath);
  res.json({ success: true, message: 'Image deleted' });
});
