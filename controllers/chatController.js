const db = require('../config/db');

exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const { matchId, message } = req.body;

    if (!matchId || !message) {
        return res.status(400).json({
            success: false,
            message: 'matchId and message are required'
        });
    }

    try {
        // Check if match exists and is not blocked
        const [match] = await db.execute(
            'SELECT * FROM matches WHERE id = ?',
            [matchId]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        const m = match[0];

        // Check if blocked
        if (m.block_status !== 'none') {
            return res.status(403).json({
                success: false,
                message: 'Cannot send message. User is blocked.'
            });
        }

        // Determine receiver
        let receiverId;
        if (senderId === m.user1_id) {
            receiverId = m.user2_id;
        } else if (senderId === m.user2_id) {
            receiverId = m.user1_id;
        } else {
            return res.status(403).json({
                success: false,
                message: 'You are not part of this match.'
            });
        }

        // Insert message
        await db.execute(
            'INSERT INTO messages (match_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
            [matchId, senderId, receiverId, message]
        );

        res.json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.getMessages = async (req, res) => {
    const userId = req.user.id;
    const matchId = req.params.matchId;

    try {
        // Check if match exists and user is part of it
        const [match] = await db.execute(
            'SELECT * FROM matches WHERE id = ?',
            [matchId]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        const m = match[0];
        if (userId !== m.user1_id && userId !== m.user2_id) {
            return res.status(403).json({
                success: false,
                message: 'You are not part of this match.'
            });
        }

        // Fetch messages for the match
        const [messages] = await db.execute(
            'SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC',
            [matchId]
        );

        res.json({
            success: true,
            message: 'Messages fetched successfully',
            data: messages
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
