const express = require('express');
const { db } = require('../db');
const { projectSchema, memberSchema } = require('../utils/validate');
const authGuard = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

const router = express.Router();
router.use(authGuard);

router.get('/', (req, res) => {
  const projects = db.data.projects
    .filter((project) => db.data.project_members.some((member) => member.project_id === project.id && member.user_id === req.user.id))
    .map((project) => {
      const memberCount = db.data.project_members.filter((m) => m.project_id === project.id).length;
      const projectTasks = db.data.tasks.filter((t) => t.project_id === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
      return {
        id: project.id,
        title: project.title,
        description: project.description,
        ownerId: project.owner_id,
        ownerName: db.data.users.find((u) => u.id === project.owner_id)?.name || 'Unknown',
        createdAt: project.created_at,
        memberCount,
        taskCount: projectTasks.length,
        doneCount: doneTasks
      };
    });
  res.json({ projects });
});

router.post('/', requireAdmin, (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const id = db.data.seq.projects++;
  const project = { id, title: value.title, description: value.description || '', owner_id: req.user.id, created_at: new Date().toISOString() };
  db.data.projects.push(project);
  db.data.project_members.push({ id: db.data.seq.project_members++, project_id: id, user_id: req.user.id, joined_at: new Date().toISOString() });
  db.write();

  res.status(201).json({ project: { id: project.id, title: project.title, description: project.description, ownerId: project.owner_id } });
});

router.post('/:projectId/members', requireAdmin, (req, res) => {
  const { error, value } = memberSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const projectId = Number(req.params.projectId);
  const project = db.data.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = db.data.users.find((u) => u.email === value.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const alreadyMember = db.data.project_members.some((member) => member.project_id === projectId && member.user_id === user.id);
  if (!alreadyMember) {
    db.data.project_members.push({ id: db.data.seq.project_members++, project_id: projectId, user_id: user.id, joined_at: new Date().toISOString() });
    db.write();
  }

  res.json({ message: 'Member added', userId: user.id, projectId });
});

router.delete('/:projectId/members/:userId', requireAdmin, (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = Number(req.params.userId);
  const project = db.data.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (project.owner_id === userId) {
    return res.status(400).json({ error: 'Cannot remove the project owner' });
  }

  const idx = db.data.project_members.findIndex((m) => m.project_id === projectId && m.user_id === userId);
  if (idx === -1) return res.status(404).json({ error: 'Member not found in project' });

  db.data.project_members.splice(idx, 1);
  db.write();
  res.json({ message: 'Member removed' });
});

router.get('/:projectId', (req, res) => {
  const projectId = Number(req.params.projectId);
  const membership = db.data.project_members.some((member) => member.project_id === projectId && member.user_id === req.user.id);
  if (!membership) return res.status(404).json({ error: 'Project not found or access denied' });

  const project = db.data.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

  const members = db.data.project_members
    .filter((member) => member.project_id === projectId)
    .map((member) => db.data.users.find((u) => u.id === member.user_id))
    .filter(Boolean)
    .map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }));

  const projectTasks = db.data.tasks.filter((t) => t.project_id === projectId);
  const taskCount = projectTasks.length;
  const doneCount = projectTasks.filter((t) => t.status === 'Done').length;

  res.json({
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      ownerId: project.owner_id,
      ownerName: db.data.users.find((u) => u.id === project.owner_id)?.name || 'Unknown',
      taskCount,
      doneCount
    },
    members
  });
});

module.exports = router;
