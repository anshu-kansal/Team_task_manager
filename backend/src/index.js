const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// import the express app (app sets up routes and initializes DB)
const app = require('./app');
const taskRoutes = require('./routes/tasks');

// serve frontend static (when present)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// create HTTP server and attach socket.io
const port = process.env.PORT || 4001;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// optional socket auth: verify token and attach user payload to socket
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    socket.user = payload;
    next();
  } catch (err) {
    // allow connections even when auth fails; route emits are still global
    next();
  }
});

// expose io to routes that need to emit
if (taskRoutes && typeof taskRoutes.setIo === 'function') {
  taskRoutes.setIo(io);
}

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
