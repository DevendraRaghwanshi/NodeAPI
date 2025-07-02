const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/userList', authenticateToken, userController.getUserList);
//
router.post('/like', authenticateToken, userController.likeUser);
router.post('/unlike', authenticateToken, userController.unlikeUser);
router.post('/block', authenticateToken, userController.blockUser);
router.post('/unblock', authenticateToken, userController.unblockUser);
router.get('/likedUsers', authenticateToken, userController.getLikedUsers);
router.get('/matchedUsers', authenticateToken, userController.getMatchedUsers);

module.exports = router;