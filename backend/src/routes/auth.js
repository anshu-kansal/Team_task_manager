const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const { db } = require('../db');
const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/validate');

const router = express.Router();

router.post('/check-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const existing = db.data.users.some((user) => user.email === email);
  res.json({ exists: existing });
});

router.post('/signup', async (req, res) => {
  const { error, value } = signupSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { name, email, password, mobile, adminCode } = value;
  const existing = db.data.users.find((user) => user.email === email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const role = adminCode === process.env.ADMIN_CODE ? 'admin' : 'member';
  const id = db.data.seq.users++;
  const user = {
    id,
    name,
    email,
    mobile,
    password: hashed,
    role,
    created_at: new Date().toISOString()
  };
  db.data.users.push(user);
  db.write();

  const payload = { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ user: payload, token });
});

router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;
  const user = db.data.users.find((userEntry) => userEntry.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ user: payload, token });
});

router.post('/forgot-password', (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email } = value;
  const user = db.data.users.find((userEntry) => userEntry.email === email);
  const genericMessage = 'If that email is registered, a password reset code has been generated.';

  if (!user) {
    return res.json({ message: genericMessage });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + 3600000;
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = expires;
  db.write();

  res.json({
    message: 'Password reset request created. Use the code below to reset your password.',
    resetToken
  });
});

router.post('/reset-password', (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { token, password } = value;
  const user = db.data.users.find((userEntry) => userEntry.resetPasswordToken === token && userEntry.resetPasswordExpires > Date.now());

  if (!user) return res.status(400).json({ error: 'Invalid or expired reset code' });

  user.password = bcrypt.hashSync(password, 10);
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  db.write();

  res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});

router.get('/me', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
