const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  mobile: { type: String },
  profileImage: { type: String },
  // Onboarding Data
  onboardingCompleted: { type: Boolean, default: false },
  purpose: { type: String },
  profession: { type: String },
  domain: { type: String },
  teamSize: { type: String },
  // Old ID reference for migration
  legacyId: { type: Number },
  // Auth Enhancement Data
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  refreshTokens: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
