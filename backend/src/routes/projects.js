const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { projectSchema, memberSchema } = require('../utils/validate');
const authGuard = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const logActivity = require('../utils/activity');

const router = express.Router();
router.use(authGuard);

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ members: req.user.id })
      .populate('owner', 'name')
      .lean();

    const result = await Promise.all(projects.map(async (project) => {
      const taskCount = await Task.countDocuments({ project: project._id });
      const doneCount = await Task.countDocuments({ project: project._id, status: 'Done' });

      return {
        id: project._id,
        title: project.title,
        description: project.description,
        ownerId: project.owner._id,
        ownerName: project.owner.name,
        createdAt: project.createdAt,
        memberCount: project.members.length,
        taskCount,
        doneCount
      };
    }));

    res.json({ projects: result });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const project = await Project.create({
      title: value.title,
      description: value.description || '',
      owner: req.user.id,
      members: [req.user.id]
    });

    await logActivity(req.user.id, 'created', 'Project', project._id, project.title, project._id, 'Created new project workspace');

    res.status(201).json({ project: { id: project._id, title: project.title, description: project.description, ownerId: project.owner } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:projectId/members', async (req, res) => {
  const { error, value } = memberSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Allow project owner or admin to add members
    if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the project owner or an admin can manage members' });
    }

    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!project.members.includes(user._id)) {
      project.members.push(user._id);
      await project.save();
      
      await logActivity(
        req.user.id,
        'joined',
        'User',
        user._id,
        user.name,
        project._id,
        `Added to workspace ${project.title}`
      );
    }

    res.json({ message: 'Member added', userId: user._id, projectId: project._id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:projectId/members/:userId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Allow project owner or admin to remove members
    if (project.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the project owner or an admin can manage members' });
    }

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();

    await logActivity(
      req.user.id,
      'removed',
      'User',
      user._id,
      user.name,
      project._id,
      `Removed from workspace ${project.title}`
    );

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, members: req.user.id })
      .populate('owner', 'name')
      .populate('members', 'name email role profileImage');
      
    if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

    const taskCount = await Task.countDocuments({ project: project._id });
    const doneCount = await Task.countDocuments({ project: project._id, status: 'Done' });

    res.json({
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        ownerId: project.owner._id,
        ownerName: project.owner.name,
        taskCount,
        doneCount
      },
      members: project.members.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, profileImage: u.profileImage }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
