const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true }, // e.g. 'created', 'updated', 'completed', 'deleted', 'joined', 'removed'
  targetType: { type: String, enum: ['Task', 'Project', 'User'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetName: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  details: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
