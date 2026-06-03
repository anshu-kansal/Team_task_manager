const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/validate');

const router = express.Router();

// Helper to generate access and refresh tokens
const generateTokens = async (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted
  };
  
  // accessToken: 15 minutes
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
  
  // refreshToken: 7 days
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  
  // Initialize refreshTokens if not present
  user.refreshTokens = user.refreshTokens || [];
  
  // Limit to maximum 5 refresh tokens to prevent bloat
  if (user.refreshTokens.length >= 5) {
    user.refreshTokens.shift();
  }
  user.refreshTokens.push(hashedRefreshToken);
  await user.save();
  
  return { accessToken, refreshToken: rawRefreshToken };
};

router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const existing = await User.findOne({ email });
  res.json({ exists: !!existing });
});

router.post('/signup', async (req, res) => {
  const { error, value } = signupSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { name, email, password, mobile, adminCode } = value;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const role = adminCode === process.env.ADMIN_CODE ? 'admin' : 'member';
  
  const user = await User.create({
    name,
    email,
    mobile,
    password: hashed,
    role
  });

  const { accessToken, refreshToken } = await generateTokens(user);
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted
    },
    token: accessToken,
    refreshToken
  });
});

router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email, password } = value;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { accessToken, refreshToken } = await generateTokens(user);
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted
    },
    token: accessToken,
    refreshToken
  });
});

router.post('/forgot-password', async (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { email } = value;
  const user = await User.findOne({ email });
  const genericMessage = 'If that email is registered, a password reset code has been generated.';

  if (!user) {
    return res.json({ message: genericMessage });
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + 3600000; // 1 hour
  
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = expires;
  await user.save();

  res.json({
    message: 'Password reset request created. Reset code generated.',
    resetToken
  });
});

router.post('/reset-password', async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { token, password } = value;
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
  }

  user.password = bcrypt.hashSync(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  // Revoke all refresh tokens on password change
  user.refreshTokens = [];
  await user.save();

  res.json({ message: 'Password updated successfully. All active sessions revoked.' });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await User.findOne({ refreshTokens: hashedToken });
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token: remove old one
    user.refreshTokens = user.refreshTokens.filter(t => t !== hashedToken);
    
    // Generate new set of tokens
    const tokens = await generateTokens(user);
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during refresh' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
