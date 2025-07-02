const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/sendMessage', authenticateToken, chatController.sendMessage);
router.get('/getMessages/:matchId', authenticateToken, chatController.getMessages);

module.exports = router;