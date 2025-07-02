// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoute');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// Define a route
app.get('/', (req, res) => {
    res.send('Node.js server is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
