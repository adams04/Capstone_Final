const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (req.route.path === '/upload-profile-picture') {
            cb(null, path.join(__dirname, 'profilePictures'));
        } else {
            cb(null, path.join(__dirname, 'comments'));
        }
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Save with a unique name + original extension
    }
});

// Single file upload for profile picture or comment
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

module.exports = upload;
