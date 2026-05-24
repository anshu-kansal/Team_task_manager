const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initialize } = require('./db');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const path = require('path');

dotenv.config();
initialize();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'Team Task Manager API is running' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

module.exports = app;
