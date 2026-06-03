const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Todo', 'In Progress', 'In Review', 'Done'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  order: { type: Number, default: 0 },
  dueDate: { type: Date },
  labels: [{ type: String }],
  legacyId: { type: Number }, // For migration
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
