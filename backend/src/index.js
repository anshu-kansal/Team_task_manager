const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// import the express app
const app = require('./app');
const taskRoutes = require('./routes/tasks');

// create HTTP server and attach socket.io
const port = process.env.PORT || 4001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// optional socket auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) return next();

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    );

    socket.user = payload;

    next();
  } catch (err) {
    next();
  }
});

// expose io to routes
if (taskRoutes && typeof taskRoutes.setIo === 'function') {
  taskRoutes.setIo(io);
}

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
