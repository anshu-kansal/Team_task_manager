import { useEffect, useState } from 'react';
import { createProject, fetchProjects, addProjectMember, removeProjectMember, fetchProject, fetchProjectTasks } from '../api';
import { useToast } from '../components/Toast';

const avatarColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function Projects({ user }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectTasks, setSelectedProjectTasks] = useState([]);
  const [form, setForm] = useState({ title: '', description: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const toast = useToast();

  const loadProjects = () => {
    setLoading(true);
    fetchProjects()
      .then((res) => setProjects(res.data.projects))
      .catch(() => toast('Unable to load projects', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await createProject(form);
      setForm({ title: '', description: '' });
      setShowModal(false);
      loadProjects();
      toast('Project created successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Create failed', 'error');
    }
  };

  const handleSelect = (projectId) => {
    setProjectLoading(true);
    Promise.all([fetchProject(projectId), fetchProjectTasks(projectId)])
      .then(([projRes, tasksRes]) => {
        setSelectedProject(projRes.data);
        setSelectedProjectTasks(tasksRes.data.tasks || []);
      })
      .catch(() => toast('Unable to load project details', 'error'))
      .finally(() => setProjectLoading(false));
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    if (!selectedProject) return;
    try {
      await addProjectMember(selectedProject.project.id, { email: memberEmail });
      setMemberEmail('');
      handleSelect(selectedProject.project.id);
      toast('Member added', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Unable to add member', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedProject) return;
    try {
      await removeProjectMember(selectedProject.project.id, userId);
      handleSelect(selectedProject.project.id);
      toast('Member removed', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Unable to remove member', 'error');
    }
  };

  return (
    <div>
      <div className="section-title">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Projects
        </h1>
        {user.role === 'admin' && <button onClick={() => setShowModal(true)}>+ New Project</button>}
      </div>

      <div className="projects-grid">
        <div className="project-list">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>My Projects</h2>
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-card" />)
          ) : projects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <p>No projects yet.</p>
              </div>
            </div>
          ) : (
            <ul>
              {projects.map((project) => {
                const pct = project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
                return (
                  <li
                    key={project.id}
                    className={`project-item ${selectedProject?.project?.id === project.id ? 'active' : ''}`}
                    onClick={() => handleSelect(project.id)}
                  >
                    <strong>{project.title}</strong>
                    <p>{project.description || 'No description'}</p>
                    <div className="project-meta">
                      <span>👥 {project.memberCount} members</span>
                      <span>📋 {project.taskCount} tasks</span>
                      <span>✅ {pct}% done</span>
                    </div>
                    {project.taskCount > 0 && (
                      <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="project-details">
          {selectedProject ? (
            <div className="card">
              <h2>{selectedProject.project.title}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{selectedProject.project.description}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Owner:</strong> {selectedProject.project.ownerName}
              </p>

              {selectedProject.project.taskCount > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <span>Progress</span>
                    <span>{Math.round((selectedProject.project.doneCount / selectedProject.project.taskCount) * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(selectedProject.project.doneCount / selectedProject.project.taskCount) * 100}%` }} />
                  </div>
                </div>
              )}

              <h3 style={{ marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Members ({selectedProject.members.length})</h3>
              <ul>
                {selectedProject.members.map((member) => (
                  <li key={member.id} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar" style={{ background: getAvatarColor(member.name) }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="member-name">{member.name}</div>
                        <div className="member-email">{member.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="member-role">{member.role}</span>
                      {user.role === 'admin' && member.id !== selectedProject.project.ownerId && (
                        <button className="btn-danger" onClick={() => handleRemoveMember(member.id)}>Remove</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {user.role === 'admin' && (
                <form onSubmit={handleAddMember} className="small-form">
                  <label>Add member by email</label>
                  <div className="inline-form">
                    <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@email.com" required />
                    <button type="submit">Invite</button>
                  </div>
                </form>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Project Tasks</h3>
                {projectLoading ? (
                  <div className="card">
                    <div className="skeleton skeleton-card" />
                  </div>
                ) : selectedProjectTasks.length === 0 ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-icon">🗂️</div>
                      <p>No tasks in this project yet.</p>
                    </div>
                  </div>
                ) : (
                  <div className="project-tasks-list">
                    {selectedProjectTasks.map((task) => (
                      <div key={task.id} className="task-row">
                        <div>
                          <strong>{task.title}</strong>
                          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>{task.description || 'No description'}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                          <span className="badge badge-small">{task.status}</span>
                          <span className="badge badge-small">{task.priority || 'Medium'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{task.dueDate || 'No due date'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assignee: {task.assigneeName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">👈</div>
                <p>Select a project to see details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <label>Title</label>
              <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project name" required />
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              <button type="submit" style={{ width: '100%' }}>Create Project</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
