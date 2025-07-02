const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // uploads folder in project root
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Images only (jpeg, jpg, png)');
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB limit
    fileFilter: fileFilter
}).single('profileImage'); // field name in form-data

exports.uploadProfileImage = (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(200).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            return res.status(200).json({
                success: false,
                message: err
            });
        }

        if (!req.file) {
            return res.status(200).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                filename: req.file.filename,
                path: req.file.path
            }
        });
    });
};

const uploadMultiple = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per file
    fileFilter: fileFilter
}).array('images', 5); // max 5 images per request

exports.uploadUserImages = (req, res) => {
    uploadMultiple(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        try {
            const insertValues = req.files.map(file => [req.user.id, file.filename]);

            // Insert all images into DB
            await db.query(
                'INSERT INTO user_images (userId, filename) VALUES ?',
                [insertValues]
            );

            const fileData = req.files.map(file => ({
                filename: file.filename,
                path: file.path
            }));

            res.json({
                success: true,
                message: 'Images uploaded successfully',
                data: fileData
            });

        } catch (dbError) {
            console.error('DB insert error:', dbError);
            res.status(500).json({
                success: false,
                message: 'Server error while saving images'
            });
        }
    });
};

exports.getUserImages = async (req, res) => {
    try {
        const [images] = await db.execute(
            'SELECT id, filename, createdDate FROM user_images WHERE userId = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            message: 'User images fetched successfully',
            data: images
        });

    } catch (error) {
        console.error('Get user images error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.deleteUserImage = async (req, res) => {
    const imageId = req.params.id;

    try {
        // Check if image exists and belongs to user
        const [rows] = await db.execute(
            'SELECT * FROM user_images WHERE id = ? AND userId = ?',
            [imageId, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Image not found or access denied'
            });
        }

        const image = rows[0];

        // Delete from DB
        await db.execute('DELETE FROM user_images WHERE id = ?', [imageId]);

        // Delete file from uploads folder
        const filePath = path.join(__dirname, '../uploads/', image.filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('File deletion error:', err);
                // Continue even if file is missing
            }
        });

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

