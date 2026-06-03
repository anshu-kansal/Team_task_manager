const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const Subtask = require('../models/Subtask');
const Attachment = require('../models/Attachment');
const Comment = require('../models/Comment');

const { taskSchema } = require('../utils/validate');
const authGuard = require('../middleware/auth');
const logActivity = require('../utils/activity');

const router = express.Router();
let io = null;
router.setIo = (socket) => { io = socket; };
router.use(authGuard);

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper to check if user is a member of the project
async function isProjectMember(projectId, userId) {
  try {
    const project = await Project.findOne({ _id: projectId, members: userId });
    return !!project;
  } catch (error) {
    return false;
  }
}

router.get('/', async (req, res) => {
  try {
    // Find projects where the user is a member
    const userProjects = await Project.find({ members: req.user.id }).select('_id');
    const projectIds = userProjects.map(p => p._id);

    // Get tasks assigned to user or in projects where user is a member
    const tasks = await Task.find({
      $or: [
        { assignee: req.user.id },
        { project: { $in: projectIds } }
      ]
    })
    .populate('assignee', 'name email')
    .populate('project', 'title')
    .sort('order')
    .lean();

    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      order: task.order || 0,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.dueDate,
      projectId: task.project ? task.project._id : null,
      projectTitle: task.project ? task.project.title : 'Unknown',
      assigneeId: task.assignee ? task.assignee._id : null,
      assigneeName: task.assignee ? task.assignee.name : 'Unassigned',
      assigneeEmail: task.assignee ? task.assignee.email : 'Unassigned',
      overdue: task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && task.status !== 'Done',
      labels: task.labels || []
    }));

    res.json({ tasks: formattedTasks });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const userProjects = await Project.find({ members: req.user.id }).select('_id title');
    const projectIds = userProjects.map(p => p._id);
    const projectTitleMap = userProjects.reduce((acc, p) => ({ ...acc, [p._id]: p.title }), {});

    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignee', 'name')
      .lean();

    const todayStr = new Date().toISOString().slice(0, 10);
    const summary = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'Todo').length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      done: tasks.filter((t) => t.status === 'Done').length,
      overdue: tasks.filter((t) => t.dueDate && t.dueDate.toISOString().slice(0, 10) < todayStr && t.status !== 'Done').length
    };

    const tasksByUser = {};
    tasks.forEach((t) => {
      const name = t.assignee ? t.assignee.name : 'Unassigned';
      if (!tasksByUser[name]) tasksByUser[name] = { total: 0, done: 0 };
      tasksByUser[name].total++;
      if (t.status === 'Done') tasksByUser[name].done++;
    });

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((t) => ({
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority || 'Medium',
        dueDate: t.dueDate,
        projectTitle: projectTitleMap[t.project] || 'Unknown',
        assigneeName: t.assignee ? t.assignee.name : 'Unassigned',
        overdue: t.dueDate && t.dueDate.toISOString().slice(0, 10) < todayStr && t.status !== 'Done'
      }));

    // Tasks over time logic (last 14 days based on created_at)
    const days = 14;
    const today = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const tasksOverTime = dates.map((dt) => ({ 
      date: dt, 
      count: tasks.filter((t) => t.createdAt.toISOString().slice(0, 10) === dt).length 
    }));

    res.json({ summary, tasksByUser, recentTasks, tasksOverTime });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!(await isProjectMember(projectId, req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignee', 'name email')
      .sort('order')
      .lean();

    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority || 'Medium',
      dueDate: task.dueDate,
      assigneeName: task.assignee ? task.assignee.name : 'Unassigned',
      assigneeEmail: task.assignee ? task.assignee.email : 'Unassigned',
      order: task.order,
      labels: task.labels || []
    }));

    res.json({ tasks: formattedTasks });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    if (!(await isProjectMember(projectId, req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error, value } = taskSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    let assigneeId = null;
    if (value.assigneeEmail) {
      const assignee = await User.findOne({ email: value.assigneeEmail });
      if (!assignee) return res.status(404).json({ error: 'Assignee not found' });
      assigneeId = assignee._id;
    }

    const sameStatus = await Task.find({ project: projectId, status: value.status || 'Todo' });
    const maxOrder = sameStatus.length ? Math.max(...sameStatus.map((t) => t.order || 0)) : 0;

    const task = await Task.create({
      project: projectId,
      title: value.title,
      description: value.description || '',
      assignee: assigneeId,
      status: value.status || 'Todo',
      order: maxOrder + 1,
      priority: value.priority || 'Medium',
      dueDate: value.dueDate || null,
      labels: value.labels || []
    });

    if (io) io.emit('task:created', {
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      order: task.order,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.project,
      assigneeId: task.assignee,
      labels: task.labels
    });

    await logActivity(req.user.id, 'created', 'Task', task._id, task.title, projectId, 'Created new task');

    res.status(201).json({ task: { id: task._id, ...task.toObject() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (!(await isProjectMember(task.project, req.user.id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldStatus = task.status;
    const oldPriority = task.priority;

    if (req.body.assigneeEmail) {
      const assignee = await User.findOne({ email: req.body.assigneeEmail });
      if (!assignee) return res.status(404).json({ error: 'Assignee not found' });
      task.assignee = assignee._id;
    }

    if (req.body.status && ['Todo', 'In Progress', 'In Review', 'Done'].includes(req.body.status)) {
      task.status = req.body.status;
    }
    
    if (req.body.priority && ['Low', 'Medium', 'High', 'Urgent'].includes(req.body.priority)) {
      task.priority = req.body.priority;
    }

    if (req.body.title) task.title = req.body.title;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
    if (req.body.labels !== undefined) task.labels = req.body.labels;
    
    await task.save();

    if (io) io.emit('task:updated', { id: task._id, status: task.status, order: task.order, labels: task.labels });

    let detailMsg = 'Updated task details';
    if (req.body.status && req.body.status !== oldStatus) {
      detailMsg = `Moved task status to "${req.body.status}"`;
    } else if (req.body.priority && req.body.priority !== oldPriority) {
      detailMsg = `Changed task priority to "${req.body.priority}"`;
    }
    await logActivity(req.user.id, 'updated', 'Task', task._id, task.title, task.project, detailMsg);
    res.json({ task: { id: task._id, ...task.toObject() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reorder', async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });

  try {
    // Bulk write is more efficient for this
    const bulkOps = [];
    
    for (const it of items) {
       // Only allow update if project member
       const task = await Task.findById(it.id);
       if (task && await isProjectMember(task.project, req.user.id)) {
           let updateDoc = {};
           if (it.status) updateDoc.status = it.status;
           if (typeof it.order !== 'undefined') updateDoc.order = Number(it.order);
           
           if (Object.keys(updateDoc).length > 0) {
               bulkOps.push({
                   updateOne: {
                       filter: { _id: it.id },
                       update: { $set: updateDoc }
                   }
               });
           }
       }
    }

    if (bulkOps.length > 0) {
      await Task.bulkWrite(bulkOps);
    }
    
    if (io) io.emit('tasks:reordered', { items });
    res.json({ message: 'Reorder saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:taskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('assignee', 'email');
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    res.json({
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority || 'Medium',
        dueDate: task.dueDate,
        assigneeEmail: task.assignee ? task.assignee.email : '',
        projectId: task.project,
        labels: task.labels || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    await logActivity(req.user.id, 'deleted', 'Task', task._id, task.title, task.project, 'Deleted task');

    await Task.findByIdAndDelete(taskId);
    // Cleanup subtasks and attachments
    await Subtask.deleteMany({ task: taskId });
    await Attachment.deleteMany({ task: taskId });

    if (io) io.emit('task:deleted', { id: taskId });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// SUBTASKS
router.get('/:taskId/subtasks', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const subtasks = await Subtask.find({ task: task._id }).sort('order');
    res.json({ subtasks: subtasks.map(s => ({ id: s._id, ...s.toObject() })) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:taskId/subtasks', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const title = (req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const count = await Subtask.countDocuments({ task: task._id });
    const sub = await Subtask.create({
      task: task._id,
      title,
      order: count + 1
    });

    if (io) io.emit('subtask:created', { taskId: task._id, sub });
    
    await logActivity(req.user.id, 'created', 'Task', task._id, task.title, task.project, `Created subtask: "${sub.title}"`);

    res.status(201).json({ sub: { id: sub._id, ...sub.toObject() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/subtasks/:subtaskId', async (req, res) => {
  try {
    const sub = await Subtask.findById(req.params.subtaskId).populate('task');
    if (!sub) return res.status(404).json({ error: 'Subtask not found' });
    if (!(await isProjectMember(sub.task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    if (typeof req.body.completed !== 'undefined') sub.completed = !!req.body.completed;
    if (typeof req.body.title !== 'undefined') sub.title = String(req.body.title).trim();
    
    await sub.save();
    
    if (io) io.emit('subtask:updated', { taskId: sub.task._id, subtask: sub });

    const detailMsg = sub.completed ? `Completed subtask: "${sub.title}"` : `Updated subtask: "${sub.title}"`;
    await logActivity(req.user.id, 'updated', 'Task', sub.task._id, sub.task.title, sub.task.project, detailMsg);

    res.json({ sub: { id: sub._id, ...sub.toObject() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/subtasks/:subtaskId', async (req, res) => {
  try {
    const sub = await Subtask.findById(req.params.subtaskId).populate('task');
    if (!sub) return res.status(404).json({ error: 'Subtask not found' });
    if (!(await isProjectMember(sub.task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    await Subtask.findByIdAndDelete(req.params.subtaskId);
    if (io) io.emit('subtask:deleted', { taskId: sub.task._id, subtaskId: sub._id });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// COMMENTS
router.get('/:taskId/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const comments = await Comment.find({ task: task._id })
      .populate('user', 'name email profileImage')
      .sort('createdAt');
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:taskId/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Comment content is required' });

    const comment = await Comment.create({
      content,
      task: task._id,
      user: req.user.id
    });

    const populatedComment = await Comment.findById(comment._id).populate('user', 'name email profileImage');

    if (io) io.emit('comment:created', { taskId: task._id, comment: populatedComment });

    await logActivity(req.user.id, 'created', 'Task', task._id, task.title, task.project, `Added a comment: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);

    res.status(201).json({ comment: populatedComment });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/comments/:commentId', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('task');
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own comments.' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);

    if (io) io.emit('comment:deleted', { taskId: comment.task._id, commentId: comment._id });

    await logActivity(req.user.id, 'deleted', 'Task', comment.task._id, comment.task.title, comment.task.project, 'Deleted a comment');

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ATTACHMENTS
router.get('/:taskId/attachments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const attachments = await Attachment.find({ task: task._id }).sort('createdAt');
    res.json({ attachments: attachments.map(a => ({ id: a._id, ...a.toObject() })) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:taskId/attachments', upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!(await isProjectMember(task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const url = `/uploads/${req.file.filename}`;
    const attachment = await Attachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url,
      task: task._id
    });

    const formattedAttachment = { id: attachment._id, ...attachment.toObject() };

    if (io) io.emit('attachment:created', { taskId: task._id, attachment: formattedAttachment });

    await logActivity(req.user.id, 'created', 'Task', task._id, task.title, task.project, `Uploaded attachment: "${attachment.originalName}"`);

    res.status(201).json({ attachment: formattedAttachment });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/attachments/:attachmentId', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.attachmentId).populate('task');
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    if (!(await isProjectMember(attachment.task.project, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const filePath = path.join(uploadDir, attachment.filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete physical file:', err);
    });

    await Attachment.findByIdAndDelete(req.params.attachmentId);

    if (io) io.emit('attachment:deleted', { taskId: attachment.task._id, attachmentId: attachment._id });

    await logActivity(req.user.id, 'deleted', 'Task', attachment.task._id, attachment.task.title, attachment.task.project, `Deleted attachment: "${attachment.originalName}"`);

    res.json({ message: 'Attachment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
