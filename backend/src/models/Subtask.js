const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  completed: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  legacyId: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Subtask', subtaskSchema);
