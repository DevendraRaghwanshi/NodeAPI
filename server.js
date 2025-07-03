// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

const cors = require('cors');
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// Define a route
app.get('/', (req, res) => {
    res.send('Node.js server is running!');
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found', path: req.originalUrl, method: req.method });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
