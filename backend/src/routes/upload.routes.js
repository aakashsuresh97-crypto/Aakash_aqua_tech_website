const express = require('express');
const c = require('../controllers/upload.controller');
const { canWrite } = require('../middleware/auth');
const { parseImageUpload } = require('../middleware/upload');

const router = express.Router();

router.post('/images', ...canWrite, parseImageUpload, c.uploadImage);
router.delete('/images/:filename', ...canWrite, c.deleteUploadedImage);

module.exports = router;
