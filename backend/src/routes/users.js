const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const authenticate = require('../middleware/auth');
const logActivity = require('../utils/activity');

const router = express.Router();
router.use(authenticate);

// Configure multer storage for avatars
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, JPEG, PNG, or WEBP images are allowed'));
  }
});

// List users (admin only expected) - returns limited info
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('name email role profileImage');
    res.json({ users: users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, profileImage: u.profileImage })) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's full profile (safe fields)
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profileImage: user.profileImage,
        created_at: user.createdAt,
        onboardingCompleted: user.onboardingCompleted,
        purpose: user.purpose,
        profession: user.profession,
        domain: user.domain,
        teamSize: user.teamSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user's profile
router.patch('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, mobile, onboardingCompleted, purpose, profession, domain, teamSize, profileImage } = req.body;
    
    if (name !== undefined) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (profileImage !== undefined) user.profileImage = profileImage;
    
    if (onboardingCompleted !== undefined) user.onboardingCompleted = onboardingCompleted;
    if (purpose !== undefined) user.purpose = purpose;
    if (profession !== undefined) user.profession = profession;
    if (domain !== undefined) user.domain = domain;
    if (teamSize !== undefined) user.teamSize = teamSize;

    await user.save();

    res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profileImage: user.profileImage,
        created_at: user.createdAt,
        onboardingCompleted: user.onboardingCompleted,
        purpose: user.purpose,
        profession: user.profession,
        domain: user.domain,
        teamSize: user.teamSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile picture (avatar)
router.post('/me/avatar', (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file' });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.profileImage = `/uploads/${req.file.filename}`;
      await user.save();

      await logActivity(req.user.id, 'updated', 'User', user._id, user.name, null, 'Updated avatar image');

      res.json({
        message: 'Avatar uploaded successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          profileImage: user.profileImage,
          created_at: user.createdAt,
          onboardingCompleted: user.onboardingCompleted,
          purpose: user.purpose,
          profession: user.profession,
          domain: user.domain,
          teamSize: user.teamSize
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error during avatar upload' });
    }
  });
});

// Change password
router.post('/me/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    user.refreshTokens = []; // Clear other logins
    await user.save();

    await logActivity(req.user.id, 'updated', 'User', user._id, user.name, null, 'Changed account password');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch current user activities
router.get('/me/activity', async (req, res) => {
  try {
    const userProjects = await Project.find({ members: req.user.id }).select('_id');
    const projectIds = userProjects.map(p => p._id);

    const activities = await Activity.find({
      $or: [
        { user: req.user.id },
        { projectId: { $in: projectIds } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving activities' });
  }
});

module.exports = router;
