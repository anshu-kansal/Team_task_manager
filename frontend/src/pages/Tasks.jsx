import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchTasks, createTask, updateTask, deleteTask, fetchProjects, fetchUsers, reorderTasks, generateSubtasks, fetchSubtasks, createSubtask, deleteSubtask, updateSubtask, exportTaskIcs } from '../api';
import { fetchAttachments, uploadAttachment, deleteAttachment } from '../api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useToast } from '../components/Toast';

function PriorityBadge({ priority }) {
  const cls = priority === 'High' ? 'badge-high' : priority === 'Low' ? 'badge-low' : 'badge-medium';
  return <span className={`badge ${cls}`}>{priority}</span>;
}

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', assigneeEmail: '', dueDate: '', priority: 'Medium' });
  const toast = useToast();
  const editingRef = useRef(editingTaskId);

  useEffect(() => { editingRef.current = editingTaskId; }, [editingTaskId]);

  const resetForm = () => {
    setEditingTaskId(null);
    setIsEditing(false);
    setForm({ projectId: '', title: '', description: '', assigneeEmail: '', dueDate: '', priority: 'Medium' });
  };

  const load = () => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([tasksRes, projRes, usersRes]) => {
        setTasks(tasksRes.data.tasks);
        setProjects(projRes.data.projects);
        setUsers(usersRes.data.users || []);
      })
      .catch(() => toast('Unable to load tasks', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;
    const token = localStorage.getItem('ttm_token');
    const socket = io(socketUrl, { auth: { token }, autoConnect: true });

    socket.on('task:created', () => { load(); });
    socket.on('task:updated', (p) => {
      setTasks((prev) => prev.map((t) => (t.id === p.id ? { ...t, status: p.status, order: p.order } : t)));
    });
    socket.on('task:deleted', (p) => {
      setTasks((prev) => prev.filter((t) => t.id !== p.id));
    });
    socket.on('tasks:reordered', (p) => {
      const items = p.items || [];
      setTasks((prev) => prev.map((t) => {
        const it = items.find((i) => i.id === t.id);
        return it ? { ...t, status: it.status, order: it.order } : t;
      }));
    });

    socket.on('subtasks:created', () => {
      const tid = editingRef.current;
      if (tid) fetchSubtasks(tid).then((r) => setSubtasks(r.data.subtasks || [])).catch(() => {});
    });
    socket.on('subtask:created', () => {
      const tid = editingRef.current;
      if (tid) fetchSubtasks(tid).then((r) => setSubtasks(r.data.subtasks || [])).catch(() => {});
    });
    socket.on('subtask:updated', () => {
      const tid = editingRef.current;
      if (tid) fetchSubtasks(tid).then((r) => setSubtasks(r.data.subtasks || [])).catch(() => {});
    });
    socket.on('subtask:deleted', () => {
      const tid = editingRef.current;
      if (tid) fetchSubtasks(tid).then((r) => setSubtasks(r.data.subtasks || [])).catch(() => {});
    });

    socket.on('attachment:added', () => {
      const tid = editingRef.current;
      if (tid) fetchAttachments(tid).then((r) => setAttachments(r.data.attachments || [])).catch(() => {});
    });
    socket.on('attachment:deleted', () => {
      const tid = editingRef.current;
      if (tid) fetchAttachments(tid).then((r) => setAttachments(r.data.attachments || [])).catch(() => {});
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const handleEdit = (task) => {
    setEditingTaskId(task.id);
    setIsEditing(true);
    setForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      assigneeEmail: task.assigneeEmail,
      dueDate: task.dueDate || '',
      priority: task.priority || 'Medium'
    });
    // load subtasks for this task
    fetchSubtasks(task.id).then((res) => setSubtasks(res.data.subtasks || [])).catch(() => setSubtasks([]));
    fetchAttachments(task.id).then((res) => setAttachments(res.data.attachments || [])).catch(() => setAttachments([]));
    setShowModal(true);
  };

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast('Task deleted', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete task', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (isEditing && editingTaskId) {
        await updateTask(editingTaskId, {
          title: form.title,
          description: form.description,
          assigneeEmail: form.assigneeEmail,
          dueDate: form.dueDate || undefined,
          priority: form.priority
        });
        toast('Task updated successfully', 'success');
      } else {
        await createTask(form.projectId, {
          title: form.title,
          description: form.description,
          assigneeEmail: form.assigneeEmail,
          dueDate: form.dueDate || undefined,
          priority: form.priority
        });
        toast('Task created successfully', 'success');
      }
      resetForm();
      setShowModal(false);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save task', 'error');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskText.trim() || !editingTaskId) return;
    try {
      const res = await createSubtask(editingTaskId, { title: newSubtaskText.trim() });
      setSubtasks((s) => [...s, res.data.sub]);
      setNewSubtaskText('');
      toast('Subtask added', 'success');
    } catch (err) {
      toast('Failed to add subtask', 'error');
    }
  };

  const toggleSubtask = async (sub) => {
    try {
      const res = await updateSubtask(sub.id, { completed: !sub.completed });
      setSubtasks((s) => s.map((x) => x.id === sub.id ? res.data.sub : x));
    } catch (err) {
      toast('Failed to update subtask', 'error');
    }
  };

  const handleDeleteSubtask = async (id) => {
    try {
      await deleteSubtask(id);
      setSubtasks((s) => s.filter((x) => x.id !== id));
      toast('Subtask deleted', 'success');
    } catch (err) {
      toast('Failed to delete subtask', 'error');
    }
  };

  const handleUpload = async (file) => {
    if (!file || !editingTaskId) return;
    setUploading(true);
    try {
      const res = await uploadAttachment(editingTaskId, file);
      setAttachments((a) => [...a, res.data.attachment]);
      toast('Uploaded', 'success');
    } catch (err) {
      toast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (id) => {
    try {
      await deleteAttachment(id);
      setAttachments((a) => a.filter((x) => x.id !== id));
      toast('Attachment removed', 'success');
    } catch (err) {
      toast('Failed to remove', 'error');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
      toast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      toast('Failed to update status', 'error');
    }
  };

  // group and sort by order
  const todoTasks = tasks.filter((t) => t.status === 'Todo').sort((a, b) => (a.order || 0) - (b.order || 0));
  const progressTasks = tasks.filter((t) => t.status === 'In Progress').sort((a, b) => (a.order || 0) - (b.order || 0));
  const doneTasks = tasks.filter((t) => t.status === 'Done').sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderCard = (task) => (
    <div key={task.id} className={`kanban-card ${task.overdue ? 'overdue-card' : ''}`}>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-project">📁 {task.projectTitle}</div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
        <PriorityBadge priority={task.priority || 'Medium'} />
        {task.overdue && <span className="badge badge-overdue">Overdue</span>}
      </div>
      <div className="kanban-card-footer">
        <div className="kanban-card-meta">👤 {task.assigneeName}</div>
        <div className="kanban-card-meta">📅 {task.dueDate || 'No date'}</div>
      </div>
      <div className="card-actions-row">
        <div className="card-actions">
          <button className="btn-secondary btn-small" type="button" onClick={() => handleEdit(task)}>Edit</button>
          <button className="btn btn-small" type="button" onClick={async () => {
            try {
              await generateSubtasks(task.id);
              toast('Subtasks generated', 'success');
              load();
            } catch (err) {
              toast('Failed to generate subtasks', 'error');
            }
          }}>Generate</button>
          <button className="btn-danger btn-small" type="button" onClick={() => handleDelete(task.id)}>Delete</button>
        </div>
        <select
          className="status-select"
          value={task.status}
          onChange={(e) => handleStatusChange(task.id, e.target.value)}
        >
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </div>
  );

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    // if dropped in same place, nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // build column arrays
    const columns = {
      Todo: Array.from(todoTasks),
      'In Progress': Array.from(progressTasks),
      Done: Array.from(doneTasks)
    };

    // find the item being dragged
    const itemId = Number(draggableId);
    // remove from source
    const sourceCol = columns[source.droppableId];
    const [moved] = sourceCol.splice(source.index, 1);
    // insert into destination
    const destCol = columns[destination.droppableId];
    destCol.splice(destination.index, 0, { ...moved, status: destination.droppableId });

    // recompute order fields for both affected columns
    const itemsToPersist = [];
    ['Todo', 'In Progress', 'Done'].forEach((col) => {
      columns[col].forEach((t, idx) => {
        t.order = idx + 1;
        itemsToPersist.push({ id: t.id, status: t.status, order: t.order });
      });
    });

    // update local state optimistically
    const newTasks = tasks.map((t) => {
      const updated = itemsToPersist.find((i) => i.id === t.id);
      return updated ? { ...t, status: updated.status, order: updated.order } : t;
    });
    setTasks(newTasks);

    try {
      await reorderTasks(itemsToPersist);
      toast('Board updated', 'success');
    } catch (err) {
      toast('Failed to save board order', 'error');
      load();
    }
  };

  return (
    <div>
      <div className="section-title">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tasks
        </h1>
        <button onClick={() => { resetForm(); setShowModal(true); }}>+ New Task</button>
      </div>

      {loading ? (
        <div className="kanban-board">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              {[1, 2, 3].map((j) => <div key={j} className="skeleton skeleton-card" />)}
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No tasks yet. Create your first task to get started!</p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board">
            <Droppable droppableId="Todo">
              {(provided) => (
                <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                  <div className="kanban-header todo">
                    <h3>📝 Todo</h3>
                    <span className="kanban-count">{todoTasks.length}</span>
                  </div>
                  {todoTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                          {renderCard(task)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="In Progress">
              {(provided) => (
                <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                  <div className="kanban-header progress">
                    <h3>🔄 In Progress</h3>
                    <span className="kanban-count">{progressTasks.length}</span>
                  </div>
                  {progressTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                          {renderCard(task)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="Done">
              {(provided) => (
                <div className="kanban-column" ref={provided.innerRef} {...provided.droppableProps}>
                  <div className="kanban-header done">
                    <h3>✅ Done</h3>
                    <span className="kanban-count">{doneTasks.length}</span>
                  </div>
                  {doneTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                          {renderCard(task)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && (resetForm(), setShowModal(false))}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
              <button className="modal-close" onClick={() => { resetForm(); setShowModal(false); }}>&times;</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="modal-form-row">
                <div className="modal-form-field">
                  <label>Project</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    required
                    disabled={isEditing}
                  >
                    <option value="">Select a project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="modal-form-field">
                  <label>Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
                </div>
              </div>

              <div className="modal-form-full">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>

              <div className="modal-form-full">
                <label>Assignee Email</label>
                <input
                  list="assignee-suggestions"
                  type="email"
                  value={form.assigneeEmail}
                  onChange={(e) => setForm({ ...form, assigneeEmail: e.target.value })}
                  placeholder="member@email.com"
                  required
                />
                <datalist id="assignee-suggestions">
                  {users.map((user) => <option key={user.id} value={user.email}>{user.name}</option>)}
                </datalist>
              </div>

              <div className="modal-form-row">
                <div className="modal-form-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="modal-form-field">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>

              <div className="modal-form-full modal-form-actions">
                <button type="submit" style={{ width: '100%' }}>{isEditing ? 'Save Changes' : 'Create Task'}</button>
                {isEditing && (
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ width: '100%', marginTop: '0.75rem' }}
                    onClick={() => {
                      if (editingTaskId) handleDelete(editingTaskId);
                      resetForm();
                      setShowModal(false);
                    }}
                  >
                    Delete Task
                  </button>
                )}
              </div>
            </form>
            {isEditing && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Subtasks</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} placeholder="New subtask title" />
                  <button className="btn" type="button" onClick={handleAddSubtask}>Add</button>
                </div>
                <div>
                  {subtasks.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>No subtasks yet.</div> : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {subtasks.map((s) => (
                        <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                          <input type="checkbox" checked={!!s.completed} onChange={() => toggleSubtask(s)} />
                          <div style={{ flex: 1, textDecoration: s.completed ? 'line-through' : 'none', color: s.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{s.title}</div>
                          <button className="btn-secondary" type="button" onClick={() => handleDeleteSubtask(s.id)}>Delete</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {isEditing && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Attachments</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input type="file" onChange={(e) => handleUpload(e.target.files?.[0])} />
                  {uploading && <div style={{ color: 'var(--text-secondary)' }}>Uploading...</div>}
                </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <a href={exportTaskIcs(editingTaskId)} className="btn" style={{ display: 'inline-block' }}>Export .ics</a>
                  </div>
                <div>
                  {attachments.length === 0 ? <div style={{ color: 'var(--text-secondary)' }}>No attachments yet.</div> : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {attachments.map((att) => (
                        <li key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                          <a href={att.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)', flex: 1 }}>{att.originalName}</a>
                          <button className="btn-secondary" type="button" onClick={() => handleDeleteAttachment(att.id)}>Delete</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
