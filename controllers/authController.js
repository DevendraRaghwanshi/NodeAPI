const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

require('dotenv').config();


exports.login = async (req, res) => {
    const { mobile, password } = req.body;

    try {
        // Find user in MySQL
        const [rows] = await db.execute('SELECT * FROM users WHERE mobile = ?', [mobile]);

        if (rows.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'Mobile number not registerd'
            });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match:", isMatch);
        if (!isMatch) {
            return res.status(200).json({
                success: false,
                message: 'Invalid password'
            });
        }
        // Update lastlogin timestamp
        await db.execute('UPDATE users SET lastlogin = NOW() WHERE id = ?', [user.id]);

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, mobile: user.mobile },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        // Remove password from user object before sending
        delete user.password;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.register = async (req, res) => {
    const {
        name, mobile, password, age, gender,
        sexuality, desire, lat, lng, appId
    } = req.body;

    try {
        // Check if user already exists by mobile
        const [existingUser] = await db.execute('SELECT * FROM users WHERE mobile = ?', [mobile]);

        if (existingUser.length > 0) {
            return res.status(200).json({
                success: false,
                message: 'Mobile already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into DB
        const [result] = await db.execute(
            `INSERT INTO users 
      (name, mobile, password, age, gender, sexuality, desire, lat, lng, createdDate, lastlogin, appId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
            [name, mobile, hashedPassword, age, gender, sexuality, desire, lat, lng, appId]
        );

        res.json({
            success: true,
            message: 'User registered successfully',
            result
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = rows[0];
        delete user.password;

        res.json({
            success: true,
            message: 'Profile data fetched successfully',
            data: user
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.updateProfile = async (req, res) => {
    const {
        name,
        age,
        gender,
        sexuality,
        desire,
        lat,
        lng,
        appId
    } = req.body;

    try {
        // Update user data in DB
        const [result] = await db.execute(
            `UPDATE users SET
        name = ?,
        age = ?,
        gender = ?,
        sexuality = ?,
        desire = ?,
        lat = ?,
        lng = ?,
        appId = ?
      WHERE id = ?`,
            [name, age, gender, sexuality, desire, lat, lng, appId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Fetch updated user data
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const updatedUser = rows[0];
        delete updatedUser.password;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
