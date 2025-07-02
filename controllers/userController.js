const db = require('../config/db'); // adjust path to your db config

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return parseFloat(distance.toFixed(2)); // return distance in km with 2 decimals
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}


exports.getUserList = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1; // default page 1
    const limit = parseInt(req.query.limit, 10) || 10; // default 10 users per page
    const offset = (page - 1) * limit;

    try {
        // Filters
        const { lat, lng, gender, age, sexuality, desire } = req.query;
        let whereClause = '';
        const params = [];

        // Build WHERE clause dynamically based on filters
        if (gender) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'gender = ?';
            params.push(gender);
        }
        if (age) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'age = ?';
            params.push(parseInt(age));
        }
        if (sexuality) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'sexuality = ?';
            params.push(sexuality);
        }
        if (desire) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'desire = ?';
            params.push(desire);
        }

        // Fetch total filtered users for pagination
        const [totalRows] = await db.execute(
            `SELECT COUNT(*) as count FROM users ${whereClause}`,
            params
        );
        const totalUsers = totalRows[0].count;
        const totalPages = Math.ceil(totalUsers / limit);

        // Fetch paginated users
        const [users] = await db.execute(
            `SELECT id, name, mobile, age, gender, sexuality, desire, lat, lng, createdDate, lastlogin, appId 
            FROM users 
            ${whereClause}
            ORDER BY createdDate DESC 
            LIMIT ${limit} OFFSET ${offset}`,
            params
        );
        const userList = users.map(user => {
            if (lat && lng && user.lat && user.lng) {
                user.distance = calculateDistance(
                    parseFloat(lat),
                    parseFloat(lng),
                    parseFloat(user.lat),
                    parseFloat(user.lng)
                );
            } else {
                user.distance = null;
            }
            return user;
        });

        res.json({
            success: true,
            message: 'Users fetched successfully',
            data: {
                users: userList,
                pagination: {
                    totalUsers: totalUsers,
                    totalPages: totalPages,
                    currentPage: page,
                    perPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.likeUser = async (req, res) => {
    const userId = req.user.id; // from authenticateToken middleware
    const { likedUserId } = req.body;

    if (!likedUserId) {
        return res.status(400).json({
            success: false,
            message: 'likedUserId is required'
        });
    }

    try {
        // Check if already liked
        const [existing] = await db.execute(
            'SELECT * FROM likes WHERE user_id = ? AND liked_user_id = ?',
            [userId, likedUserId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already liked this user'
            });
        }

        // Insert like
        await db.execute(
            'INSERT INTO likes (user_id, liked_user_id) VALUES (?, ?)',
            [userId, likedUserId]
        );

        // Check for mutual match
        const [mutual] = await db.execute(
            'SELECT * FROM likes WHERE user_id = ? AND liked_user_id = ?',
            [likedUserId, userId]
        );

        if (mutual.length > 0) {
            // Mutual match found

            // Check if match already exists to avoid duplicates
            const user1 = Math.min(userId, likedUserId);
            const user2 = Math.max(userId, likedUserId);

            const [existingMatch] = await db.execute(
                'SELECT * FROM matches WHERE user1_id = ? AND user2_id = ?',
                [user1, user2]
            );

            if (existingMatch.length === 0) {
                // Insert match record
                await db.execute(
                    'INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)',
                    [user1, user2]
                );
            }

            res.json({
                success: true,
                message: 'User liked successfully. It’s a match!',
                data: {
                    match: true,
                    matchedUserId: likedUserId
                }
            });

        } else {
            res.json({
                success: true,
                message: 'User liked successfully.',
                data: {
                    match: false
                }
            });
        }

    } catch (error) {
        console.error('Like user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.unlikeUser = async (req, res) => {
    const userId = req.user.id; // from authenticateToken middleware
    const { likedUserId } = req.body;

    if (!likedUserId) {
        return res.status(400).json({
            success: false,
            message: 'likedUserId is required'
        });
    }

    try {
        // Delete like
        const [result] = await db.execute(
            'DELETE FROM likes WHERE user_id = ? AND liked_user_id = ?',
            [userId, likedUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Like not found'
            });
        }

        res.json({
            success: true,
            message: 'User unliked successfully'
        });

    } catch (error) {
        console.error('Unlike user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.getLikedUsers = async (req, res) => {
    const userId = req.user.id; // from authenticateToken middleware

    try {
        // Fetch liked users
        const [likedUsers] = await db.execute(
            `SELECT u.id, u.name, u.mobile, u.age, u.gender, u.sexuality, u.desire, u.lat, u.lng, u.createdDate, u.lastlogin, u.appId
       FROM likes l
       JOIN users u ON l.liked_user_id = u.id
       WHERE l.user_id = ?`,
            [userId]
        );

        // // Add profilePicUrl
        // const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        // const users = likedUsers.map(user => {
        //     user.profilePicUrl = user.profilePic ? baseUrl + user.profilePic : null;
        //     delete user.profilePic;
        //     return user;
        // });

        res.json({
            success: true,
            message: 'Liked users fetched successfully',
            data: likedUsers
        });

    } catch (error) {
        console.error('Get liked users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.getMatchedUsers = async (req, res) => {
    const userId = req.user.id;

    try {
        const [matches] = await db.execute(
            `SELECT m.*, u1.name as user1_name, u2.name as user2_name
       FROM matches m
       JOIN users u1 ON m.user1_id = u1.id
       JOIN users u2 ON m.user2_id = u2.id
       WHERE m.user1_id = ? OR m.user2_id = ?`,
            [userId, userId]
        );

        res.json({
            success: true,
            message: 'Matches fetched successfully',
            data: matches
        });

    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.blockUser = async (req, res) => {
    const userId = req.user.id;
    const { matchUserId } = req.body;

    if (!matchUserId) {
        return res.status(400).json({
            success: false,
            message: 'matchUserId is required'
        });
    }

    try {
        const user1 = Math.min(userId, matchUserId);
        const user2 = Math.max(userId, matchUserId);

        // Fetch match record
        const [match] = await db.execute(
            'SELECT * FROM matches WHERE user1_id = ? AND user2_id = ?',
            [user1, user2]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        // Determine who is blocking
        let blockStatus;
        if (userId === user1) {
            blockStatus = 'blocked_by_user1';
        } else {
            blockStatus = 'blocked_by_user2';
        }

        // Update block status
        await db.execute(
            'UPDATE matches SET block_status = ? WHERE user1_id = ? AND user2_id = ?',
            [blockStatus, user1, user2]
        );

        res.json({
            success: true,
            message: 'User blocked successfully'
        });

    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.unblockUser = async (req, res) => {
    const userId = req.user.id;
    const { matchUserId } = req.body;

    if (!matchUserId) {
        return res.status(400).json({
            success: false,
            message: 'matchUserId is required'
        });
    }

    try {
        const user1 = Math.min(userId, matchUserId);
        const user2 = Math.max(userId, matchUserId);

        // Fetch match record
        const [match] = await db.execute(
            'SELECT * FROM matches WHERE user1_id = ? AND user2_id = ?',
            [user1, user2]
        );

        if (match.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        // Reset block status to none
        await db.execute(
            'UPDATE matches SET block_status = ? WHERE user1_id = ? AND user2_id = ?',
            ['none', user1, user2]
        );

        res.json({
            success: true,
            message: 'User unblocked successfully'
        });

    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

