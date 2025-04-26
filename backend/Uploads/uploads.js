const multer = require('multer');
const path = require('path');

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/comments/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with unique name + original extension
    }
});

const upload = multer({ storage });

module.exports = upload;
