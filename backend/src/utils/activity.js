const Activity = require('../models/Activity');
const User = require('../models/User');

async function logActivity(userId, action, targetType, targetId, targetName, projectId = null, details = '') {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    await Activity.create({
      user: userId,
      userName: user.name,
      action,
      targetType,
      targetId,
      targetName,
      projectId,
      details
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

module.exports = logActivity;
