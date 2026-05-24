const express = require('express');
const { db } = require('../db');
const { taskSchema } = require('../utils/validate');
const authGuard = require('../middleware/auth');

const router = express.Router();
let io = null;
router.setIo = (socket) => { io = socket; };
router.use(authGuard);

const multer = require('multer');
const path = require('path');
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function isProjectMember(projectId, userId) {
  return db.data.project_members.some((member) => member.project_id === projectId && member.user_id === userId);
}

router.get('/', (req, res) => {
  const tasks = db.data.tasks
    .filter((task) => task.assignee_id === req.user.id || isProjectMember(task.project_id, req.user.id))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      order: task.order || 0,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.due_date,
      projectId: task.project_id,
      assigneeId: task.assignee_id,
      assigneeName: db.data.users.find((u) => u.id === task.assignee_id)?.name || 'Unknown',
      assigneeEmail: db.data.users.find((u) => u.id === task.assignee_id)?.email || 'Unknown',
      projectTitle: db.data.projects.find((p) => p.id === task.project_id)?.title || 'Unknown',
      overdue: task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'Done'
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ tasks });
});

router.get('/dashboard', (req, res) => {
  const tasks = db.data.tasks.filter((task) => isProjectMember(task.project_id, req.user.id));
  const summary = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'Todo').length,
    inProgress: tasks.filter((task) => task.status === 'In Progress').length,
    done: tasks.filter((task) => task.status === 'Done').length,
    overdue: tasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'Done').length
  };

  const tasksByUser = {};
  tasks.forEach((task) => {
    const user = db.data.users.find((u) => u.id === task.assignee_id);
    const name = user?.name || 'Unassigned';
    if (!tasksByUser[name]) tasksByUser[name] = { total: 0, done: 0 };
    tasksByUser[name].total++;
    if (task.status === 'Done') tasksByUser[name].done++;
  });

  const recentTasks = tasks
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 10)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.due_date,
      projectTitle: db.data.projects.find((p) => p.id === task.project_id)?.title || 'Unknown',
      assigneeName: db.data.users.find((u) => u.id === task.assignee_id)?.name || 'Unknown',
      overdue: task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'Done'
    }));

  // tasks over time (last 14 days) based on created_at
  const days = 14;
  const today = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const tasksOverTime = dates.map((dt) => ({ date: dt, count: db.data.tasks.filter((t) => (t.created_at || '').slice(0, 10) === dt && isProjectMember(t.project_id, req.user.id)).length }));

  res.json({ summary, tasksByUser, recentTasks, tasksOverTime });
});

router.get('/project/:projectId', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!isProjectMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tasks = db.data.tasks
    .filter((task) => task.project_id === projectId)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.due_date,
      assigneeName: db.data.users.find((u) => u.id === task.assignee_id)?.name || 'Unknown',
      assigneeEmail: db.data.users.find((u) => u.id === task.assignee_id)?.email || 'Unknown'
    }))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  res.json({ tasks });
});

router.post('/project/:projectId', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!isProjectMember(projectId, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = taskSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const assignee = db.data.users.find((user) => user.email === value.assigneeEmail);
  if (!assignee) return res.status(404).json({ error: 'Assignee not found' });

  const id = db.data.seq.tasks++;
  // compute order based on existing tasks in the same project and status
  const sameStatus = db.data.tasks.filter((t) => t.project_id === projectId && t.status === (value.status || 'Todo'));
  const maxOrder = sameStatus.length ? Math.max(...sameStatus.map((t) => t.order || 0)) : 0;
  const task = {
    id,
    project_id: projectId,
    title: value.title,
    description: value.description || '',
    assignee_id: assignee.id,
    status: value.status || 'Todo',
    order: maxOrder + 1,
    priority: value.priority || 'Medium',
    due_date: value.dueDate || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.data.tasks.push(task);
  db.write();

  if (io) io.emit('task:created', {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    order: task.order,
    priority: task.priority,
    dueDate: task.due_date,
    projectId: task.project_id,
    assigneeId: task.assignee_id
  });

  res.status(201).json({ task });
});

router.patch('/:taskId', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((item) => item.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!isProjectMember(task.project_id, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.body.assigneeEmail) {
    const assignee = db.data.users.find((user) => user.email === req.body.assigneeEmail);
    if (!assignee) return res.status(404).json({ error: 'Assignee not found' });
    task.assignee_id = assignee.id;
  }

  if (req.body.status) {
    if (!['Todo', 'In Progress', 'Done'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    task.status = req.body.status;
  }

  if (req.body.priority) {
    if (!['Low', 'Medium', 'High'].includes(req.body.priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    task.priority = req.body.priority;
  }

  if (req.body.title) task.title = req.body.title;
  if (req.body.description !== undefined) task.description = req.body.description;
  if (req.body.dueDate !== undefined) task.due_date = req.body.dueDate || null;
  task.updated_at = new Date().toISOString();

  db.write();
  if (io) io.emit('task:updated', { id: task.id, status: task.status, order: task.order });
  res.json({ task });
});

// Accepts an array [{ id, status, order }] to persist reorder across columns
router.post('/reorder', (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });

  items.forEach((it) => {
    const task = db.data.tasks.find((t) => t.id === Number(it.id));
    if (!task) return; // skip
    // only allow if user is project member
    if (!isProjectMember(task.project_id, req.user.id)) return;
    if (it.status) task.status = it.status;
    if (typeof it.order !== 'undefined') task.order = Number(it.order);
    task.updated_at = new Date().toISOString();
  });

  db.write();
  if (io) io.emit('tasks:reordered', { items });
  res.json({ message: 'Reorder saved' });
});

router.get('/:taskId', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((item) => item.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.due_date,
      assigneeEmail: db.data.users.find((u) => u.id === task.assignee_id)?.email || '',
      projectId: task.project_id
    }
  });
});

router.delete('/:taskId', (req, res) => {
  const taskId = Number(req.params.taskId);
  const taskIndex = db.data.tasks.findIndex((item) => item.id === taskId);
  if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });
  const task = db.data.tasks[taskIndex];
  if (!isProjectMember(task.project_id, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.data.tasks.splice(taskIndex, 1);
  db.write();
  if (io) io.emit('task:deleted', { id: taskId });
  res.json({ message: 'Task deleted' });
});

// Subtasks: list
router.get('/:taskId/subtasks', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const subtasks = db.data.subtasks
    .filter((s) => s.task_id === taskId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ subtasks });
});

// Attachments: list
router.get('/:taskId/attachments', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const attachments = db.data.attachments.filter((a) => a.task_id === taskId);
  res.json({ attachments });
});

// Upload attachment
router.post('/:taskId/attachments', upload.single('file'), (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = db.data.seq.attachments++;
  const url = `/uploads/${req.file.filename}`;
  const attachment = { id, task_id: taskId, filename: req.file.filename, originalName: req.file.originalname, url, created_at: new Date().toISOString() };
  db.data.attachments.push(attachment);
  db.write();
  if (io) io.emit('attachment:added', { taskId, attachment });
  res.status(201).json({ attachment });
});

// Delete attachment
router.delete('/attachments/:attachmentId', (req, res) => {
  const attachmentId = Number(req.params.attachmentId);
  const idx = db.data.attachments.findIndex((a) => a.id === attachmentId);
  if (idx === -1) return res.status(404).json({ error: 'Attachment not found' });
  const attach = db.data.attachments[idx];
  const task = db.data.tasks.find((t) => t.id === attach.task_id);
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  // remove file from disk if exists (best-effort)
  try { require('fs').unlinkSync(path.join(uploadDir, attach.filename)); } catch (e) {}
  db.data.attachments.splice(idx, 1);
  db.write();
  if (io) io.emit('attachment:deleted', { taskId: attach.task_id, attachmentId });
  res.json({ message: 'Deleted' });
});

// Export single task as iCalendar (.ics)
router.get('/:taskId/ics', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const uid = `task-${task.id}@teamtask.local`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let dtstart = '';
  if (task.due_date) {
    const d = new Date(task.due_date);
    dtstart = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Team Task Manager//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${task.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
  ];
  if (dtstart) lines.push(`DTSTART:${dtstart}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  const content = lines.join('\r\n');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="task-${task.id}.ics"`);
  res.send(content);
});

// Export project tasks as iCalendar (.ics) — includes tasks with due_date
router.get('/project/:projectId/ics', (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!isProjectMember(projectId, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  const tasks = db.data.tasks.filter((t) => t.project_id === projectId && t.due_date);

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Team Task Manager//EN', 'CALSCALE:GREGORIAN'];
  tasks.forEach((task) => {
    const uid = `task-${task.id}@teamtask.local`;
    const dtstart = new Date(task.due_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`SUMMARY:${task.title.replace(/\n/g, ' ')}`);
    lines.push(`DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const content = lines.join('\r\n');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}.ics"`);
  res.send(content);
});

// Generate subtasks from task description (simple heuristic)
router.post('/:taskId/subtasks/generate', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const text = req.body.prompt || task.description || task.title || '';
  // naive split: sentences or commas
  const parts = text.split(/\.|\n|;|,/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return res.status(400).json({ error: 'Nothing to generate from' });

  const created = [];
  const existingForTask = db.data.subtasks.filter((s) => s.task_id === taskId);
  const startOrder = existingForTask.length ? Math.max(...existingForTask.map((s) => s.order || 0)) : 0;
  parts.forEach((p, idx) => {
    const id = db.data.seq.subtasks++;
    const sub = {
      id,
      task_id: taskId,
      title: p.length > 80 ? p.slice(0, 77) + '...' : p,
      completed: false,
      order: startOrder + idx + 1,
      created_at: new Date().toISOString()
    };
    db.data.subtasks.push(sub);
    created.push(sub);
  });
  db.write();
  if (io) io.emit('subtasks:created', { taskId, items: created });
  res.json({ created });
});

// Create single subtask
router.post('/:taskId/subtasks', (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.data.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = db.data.seq.subtasks++;
  const order = (db.data.subtasks.filter((s) => s.task_id === taskId).length || 0) + 1;
  const sub = { id, task_id: taskId, title, completed: false, order, created_at: new Date().toISOString() };
  db.data.subtasks.push(sub);
  db.write();
  if (io) io.emit('subtask:created', { taskId, sub });
  res.status(201).json({ sub });
});

router.delete('/subtasks/:subtaskId', (req, res) => {
  const subtaskId = Number(req.params.subtaskId);
  const idx = db.data.subtasks.findIndex((s) => s.id === subtaskId);
  if (idx === -1) return res.status(404).json({ error: 'Subtask not found' });
  const sub = db.data.subtasks[idx];
  const task = db.data.tasks.find((t) => t.id === sub.task_id);
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  db.data.subtasks.splice(idx, 1);
  db.write();
  if (io) io.emit('subtask:deleted', { taskId: sub.task_id, subtaskId });
  res.json({ message: 'Deleted' });
});

// Update subtask (title / completed)
router.patch('/subtasks/:subtaskId', (req, res) => {
  const subtaskId = Number(req.params.subtaskId);
  const sub = db.data.subtasks.find((s) => s.id === subtaskId);
  if (!sub) return res.status(404).json({ error: 'Subtask not found' });
  const task = db.data.tasks.find((t) => t.id === sub.task_id);
  if (!isProjectMember(task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });

  if (typeof req.body.completed !== 'undefined') sub.completed = !!req.body.completed;
  if (typeof req.body.title !== 'undefined') sub.title = String(req.body.title).trim();
  sub.updated_at = new Date().toISOString();
  db.write();
  if (io) io.emit('subtask:updated', { taskId: sub.task_id, subtask: sub });
  res.json({ sub });
});

module.exports = router;
