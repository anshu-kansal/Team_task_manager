const jsonfile = require('jsonfile');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '..', 'dev.json');
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);
const defaultData = { users: [], projects: [], project_members: [], tasks: [], subtasks: [], attachments: [], seq: { users: 1, projects: 1, project_members: 1, tasks: 1, subtasks: 1, attachments: 1 } };

let dbData = defaultData;
try {
  dbData = jsonfile.readFileSync(dbPath);
} catch (err) {
  // File doesn't exist, use default
}

const db = {
  data: dbData,
  write: () => jsonfile.writeFileSync(dbPath, db.data, { spaces: 2 }),
  read: () => { db.data = jsonfile.readFileSync(dbPath); }
};

function initialize() {
  if (!db.data.users.some((user) => user.email === 'admin@teamtask.com')) {
    db.data.users.push({
      id: db.data.seq.users++,
      name: 'System Admin',
      email: 'admin@teamtask.com',
      password: bcrypt.hashSync('Admin@123', 10),
      role: 'admin',
      created_at: new Date().toISOString()
    });
    db.write();
  }
}

module.exports = { db, initialize };
