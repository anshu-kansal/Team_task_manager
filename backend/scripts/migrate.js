require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');

const devJsonPath = path.join(__dirname, '..', 'dev.json');

const migrateData = async () => {
  await connectDB();

  if (!fs.existsSync(devJsonPath)) {
    console.error('dev.json not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(devJsonPath, 'utf8'));

  try {
    // Clear existing collections
    await User.deleteMany();
    await Project.deleteMany();
    await Task.deleteMany();

    console.log('Cleared existing MongoDB data.');

    // 1. Migrate Users
    const userMap = new Map(); // legacyId -> new ObjectId
    for (const u of data.users) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        mobile: u.mobile,
        legacyId: u.id,
        createdAt: u.created_at
      });
      userMap.set(u.id, user._id);
    }
    console.log(`Migrated ${data.users.length} users.`);

    // 2. Migrate Projects
    const projectMap = new Map(); // legacyId -> new ObjectId
    for (const p of data.projects) {
      const ownerId = userMap.get(p.owner_id);
      
      // Find members from project_members
      const membersLegacy = data.project_members.filter(pm => pm.project_id === p.id);
      const membersIds = membersLegacy.map(pm => userMap.get(pm.user_id)).filter(id => id);
      
      // Include owner in members if not present
      if (!membersIds.includes(ownerId)) {
        membersIds.push(ownerId);
      }

      const proj = await Project.create({
        title: p.title,
        description: p.description,
        owner: ownerId,
        members: membersIds,
        legacyId: p.id,
        createdAt: p.created_at
      });
      projectMap.set(p.id, proj._id);
    }
    console.log(`Migrated ${data.projects.length} projects.`);

    // 3. Migrate Tasks
    for (const t of data.tasks) {
      const projId = projectMap.get(t.project_id);
      const assigneeId = userMap.get(t.assignee_id);

      await Task.create({
        title: t.title,
        description: t.description,
        project: projId,
        assignee: assigneeId,
        status: t.status,
        priority: t.priority,
        order: t.order,
        dueDate: t.due_date,
        legacyId: t.id,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      });
    }
    console.log(`Migrated ${data.tasks.length} tasks.`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
