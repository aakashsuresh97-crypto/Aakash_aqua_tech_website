const path = require('path');
const Category = require('../models/category.model');
const { localPathFromUrl, removeFile } = require('./imageFiles');

/**
 * Deletes the uploaded file behind a stored image URL, but only when no category references it any more.
 * Call AFTER the database row was changed/removed. External URLs are never touched. Never throws.
 */
async function releaseImage(url) {
  const filePath = localPathFromUrl(url);
  if (!filePath) return;
  try {
    if ((await Category.countByImageFile(path.basename(filePath))) > 0) return; // still in use
  } catch (err) {
    console.error('Could not check image usage, keeping file:', err.message);
    return;
  }
  await removeFile(filePath);
}

module.exports = { releaseImage };
