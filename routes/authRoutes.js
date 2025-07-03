const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const uploadController = require('../controllers/uploadController');

router.get('/login', (req, res) => {
    res.send('Test route working');
});


router.post('/login2', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/getProfile', authenticateToken, authController.getProfile);
router.put('/updateProfile', authenticateToken, authController.updateProfile);

// Upload profile picture
router.post('/uploadImage', authenticateToken, uploadController.uploadProfileImage);
router.post('/upload-images', authenticateToken, uploadController.uploadUserImages);
router.get('/images', authenticateToken, uploadController.getUserImages);
router.delete('/images/:id', authenticateToken, uploadController.deleteUserImage);


module.exports = router;
