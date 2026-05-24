const express = require('express');
const { db } = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const users = db.data.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  res.json({ users });
});

module.exports = router;
