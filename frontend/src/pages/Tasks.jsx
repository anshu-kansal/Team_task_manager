import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  fetchProjects, fetchUsers, reorderTasks,
  fetchSubtasks, createSubtask, deleteSubtask, updateSubtask,
  fetchComments, createComment, deleteComment,
  fetchAttachments, uploadAttachment, deleteAttachment
} from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn } from '../lib/utils';
import {
  Plus, Pencil, Trash2, GripVertical,
  Calendar, User, FolderOpen, CheckCircle2, Circle, X,
  Search, Filter, ArrowUpDown, Download, Printer, MessageSquare, Paperclip, Tag, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';

const COLUMNS = [
  { id: 'Todo',        label: 'To Do',      dot: 'bg-gray-400',  header: 'border-t-gray-400'  },
  { id: 'In Progress', label: 'In Progress', dot: 'bg-amber-400', header: 'border-t-amber-400' },
  { id: 'In Review',   label: 'In Review',   dot: 'bg-blue-400',  header: 'border-t-blue-400'  },
  { id: 'Done',        label: 'Done',        dot: 'bg-green-400', header: 'border-t-green-400' },
];

const PRIORITY_CONFIG = {
  Low:    { variant: 'outline',     dot: 'bg-gray-400'  },
  Medium: { variant: 'default',     dot: 'bg-blue-500'  },
  High:   { variant: 'warning',     dot: 'bg-amber-500' },
  Urgent: { variant: 'destructive', dot: 'bg-red-500'   },
};

export default function Tasks({ user }) {
  const [tasks,         setTasks]         = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [users,         setUsers]         = useState([]);
  const [showModal,     setShowModal]     = useState(false);
  const [subtasks,      setSubtasks]      = useState([]);
  const [newSubtask,    setNewSubtask]    = useState('');
  const [loading,       setLoading]       = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isEditing,     setIsEditing]     = useState(false);
  const [form,          setForm]          = useState({
    projectId: '', title: '', description: '',
    assigneeEmail: '', dueDate: '', priority: 'Medium', labels: []
  });
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [taskToDelete,  setTaskToDelete]  = useState(null);

  // Phase 3 States
  const [viewMode,       setViewMode]       = useState('board'); // 'board' or 'calendar'
  const [searchQuery,    setSearchQuery]    = useState('');
  const [projectFilter,  setProjectFilter]  = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [sortBy,         setSortBy]         = useState(''); // '', 'dueDate', 'priority', 'title', 'createdAt'
  const [sortOrder,      setSortOrder]      = useState('asc'); // 'asc' or 'desc'
  const [calendarDate,   setCalendarDate]   = useState(new Date());

  const [comments,       setComments]       = useState([]);
  const [newComment,     setNewComment]     = useState('');
  const [attachments,    setAttachments]    = useState([]);
  const [fileUploading,  setFileUploading]  = useState(false);
  const [modalTab,       setModalTab]       = useState('subtasks'); // 'subtasks', 'comments', 'attachments'
  const [newLabelInput,  setNewLabelInput]  = useState('');
  const toast      = useToast();
  const editingRef = useRef(editingTaskId);
  useEffect(() => { editingRef.current = editingTaskId; }, [editingTaskId]);

  /* ─── data loading ─────────────────────────────────────────── */
  const load = () => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchProjects(), fetchUsers()])
      .then(([tRes, pRes, uRes]) => {
        setTasks(tRes.data.tasks);
        setProjects(pRes.data.projects);
        setUsers(uRes.data.users || []);
      })
      .catch(() => toast('Unable to load tasks', 'error'))
      .finally(() => setLoading(false));
  };

  /* ─── socket.io ─────────────────────────────────────────────── */
  useEffect(() => {
    load();
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin;
    const token  = localStorage.getItem('ttm_token');
    const socket = io(socketUrl, { auth: { token }, autoConnect: true });

    socket.on('task:created',    () => load());
    socket.on('task:updated',    (p) => setTasks(prev => prev.map(t => t.id === p.id ? { ...t, ...p } : t)));
    socket.on('task:deleted',    (p) => setTasks(prev => prev.filter(t => t.id !== p.id)));
    socket.on('tasks:reordered', (p) => {
      const items = p.items || [];
      setTasks(prev => prev.map(t => { const it = items.find(i => i.id === t.id); return it ? { ...t, ...it } : t; }));
    });
    socket.on('subtask:created', () => { if (editingRef.current) loadSubtasks(editingRef.current); });
    socket.on('subtask:updated', () => { if (editingRef.current) loadSubtasks(editingRef.current); });
    socket.on('subtask:deleted', () => { if (editingRef.current) loadSubtasks(editingRef.current); });
    socket.on('comment:created', () => { if (editingRef.current) loadComments(editingRef.current); });
    socket.on('comment:deleted', () => { if (editingRef.current) loadComments(editingRef.current); });
    socket.on('attachment:created', () => { if (editingRef.current) loadAttachments(editingRef.current); });
    socket.on('attachment:deleted', () => { if (editingRef.current) loadAttachments(editingRef.current); });

    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, []);

  /* ─── helpers ───────────────────────────────────────────────── */
  const getAvatarUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const host = apiBase.replace(/\/api$/, '');
    return `${host}${profileImage}`;
  };

  const loadSubtasks = (taskId) =>
    fetchSubtasks(taskId).then(r => setSubtasks(r.data.subtasks || [])).catch(() => {});

  const loadComments = (taskId) =>
    fetchComments(taskId).then(r => setComments(r.data.comments || [])).catch(() => {});

  const loadAttachments = (taskId) =>
    fetchAttachments(taskId).then(r => setAttachments(r.data.attachments || [])).catch(() => {});

  const resetForm = () => {
    setEditingTaskId(null);
    setIsEditing(false);
    setForm({ projectId: '', title: '', description: '', assigneeEmail: '', dueDate: '', priority: 'Medium', labels: [] });
    setSubtasks([]);
    setNewSubtask('');
    setComments([]);
    setNewComment('');
    setAttachments([]);
    setFileUploading(false);
    setModalTab('subtasks');
    setNewLabelInput('');
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (task) => {
    setEditingTaskId(task.id);
    setIsEditing(true);
    setForm({
      projectId:     task.projectId,
      title:         task.title,
      description:   task.description   || '',
      assigneeEmail: task.assigneeEmail || '',
      dueDate:       task.dueDate       ? task.dueDate.slice(0, 10) : '',
      priority:      task.priority      || 'Medium',
      labels:        task.labels        || []
    });
    setModalTab('subtasks');
    loadSubtasks(task.id);
    loadComments(task.id);
    loadAttachments(task.id);
    setShowModal(true);
  };

  /* ─── CRUD ──────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && editingTaskId) {
        await updateTask(editingTaskId, {
          title: form.title, description: form.description,
          assigneeEmail: form.assigneeEmail,
          dueDate: form.dueDate || null, priority: form.priority,
          labels: form.labels
        });
        toast('Task updated', 'success');
      } else {
        await createTask(form.projectId, {
          title: form.title, description: form.description,
          assigneeEmail: form.assigneeEmail,
          dueDate: form.dueDate || null, priority: form.priority,
          labels: form.labels
        });
        toast('Task created', 'success');
      }
      resetForm(); setShowModal(false); load();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save task', 'error');
    }
  };

  const handleDeleteTrigger = (taskId) => {
    setTaskToDelete(taskId);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      toast('Task deleted', 'success');
      resetForm();
      setShowModal(false);
    } catch {
      toast('Failed to delete task', 'error');
    } finally {
      setConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  /* ─── subtasks ──────────────────────────────────────────────── */
  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !editingTaskId) return;
    try {
      const res = await createSubtask(editingTaskId, { title: newSubtask.trim() });
      setSubtasks(s => [...s, res.data.sub]);
      setNewSubtask('');
    } catch { toast('Failed to add subtask', 'error'); }
  };

  const toggleSubtask = async (sub) => {
    try {
      const res = await updateSubtask(sub.id, { completed: !sub.completed });
      setSubtasks(s => s.map(x => x.id === sub.id ? res.data.sub : x));
    } catch { toast('Failed to update subtask', 'error'); }
  };

  const removeSubtask = async (id) => {
    try {
      await deleteSubtask(id);
      setSubtasks(s => s.filter(x => x.id !== id));
    } catch { toast('Failed to delete subtask', 'error'); }
  };

  /* ─── comments ──────────────────────────────────────────────── */
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !editingTaskId) return;
    try {
      const res = await createComment(editingTaskId, { content: newComment.trim() });
      setComments(prev => [...prev, res.data.comment]);
      setNewComment('');
      toast('Comment added', 'success');
    } catch {
      toast('Failed to add comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId && c._id !== commentId));
      toast('Comment deleted', 'success');
    } catch {
      toast('Failed to delete comment', 'error');
    }
  };

  /* ─── attachments ───────────────────────────────────────────── */
  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingTaskId) return;
    setFileUploading(true);
    try {
      const res = await uploadAttachment(editingTaskId, file);
      setAttachments(prev => [...prev, res.data.attachment]);
      toast('File uploaded', 'success');
    } catch {
      toast('Upload failed', 'error');
    } finally {
      setFileUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId && a._id !== attachmentId));
      toast('File deleted', 'success');
    } catch {
      toast('Failed to delete file', 'error');
    }
  };

  /* ─── labels ────────────────────────────────────────────────── */
  const handleAddLabel = () => {
    const val = newLabelInput.trim();
    if (!val) return;
    if (form.labels.includes(val)) {
      toast('Label already exists', 'warning');
      return;
    }
    setForm(prev => ({ ...prev, labels: [...prev.labels, val] }));
    setNewLabelInput('');
  };

  const handleRemoveLabel = (labelToRemove) => {
    setForm(prev => ({ ...prev, labels: prev.labels.filter(l => l !== labelToRemove) }));
  };

  /* ─── drag & drop ───────────────────────────────────────────── */
  const onDragEnd = async ({ destination, source, draggableId }) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const columns = {};
    COLUMNS.forEach(c => { columns[c.id] = tasks.filter(t => t.status === c.id).sort((a,b) => (a.order||0)-(b.order||0)); });

    const [moved] = columns[source.droppableId].splice(source.index, 1);
    columns[destination.droppableId].splice(destination.index, 0, { ...moved, status: destination.droppableId });

    const itemsToPersist = [];
    COLUMNS.forEach(c => columns[c.id].forEach((t, idx) => {
      t.order = idx + 1;
      itemsToPersist.push({ id: t.id, status: c.id, order: t.order });
    }));

    setTasks(prev => prev.map(t => { const u = itemsToPersist.find(i => i.id === t.id); return u ? { ...t, ...u } : t; }));
    try {
      await reorderTasks(itemsToPersist);
    } catch {
      toast('Failed to save board order', 'error');
      load();
    }
  };

  /* ─── filtering & sorting ───────────────────────────────────── */
  const filteredTasks = tasks.filter(t => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchLabels = (t.labels || []).some(l => l.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchLabels) return false;
    }
    // Project filter
    if (projectFilter && String(t.projectId) !== String(projectFilter)) return false;
    // Assignee filter
    if (assigneeFilter && String(t.assigneeId) !== String(assigneeFilter)) return false;
    // Priority filter
    if (priorityFilter && t.priority !== priorityFilter) return false;
    // Status filter
    if (statusFilter && t.status !== statusFilter) return false;

    return true;
  }).sort((a, b) => {
    if (!sortBy) return (a.order || 0) - (b.order || 0);

    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'dueDate') {
      valA = valA ? new Date(valA).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
      valB = valB ? new Date(valB).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
    } else if (sortBy === 'priority') {
      const pWeights = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
      valA = pWeights[a.priority] || 0;
      valB = pWeights[b.priority] || 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  /* ─── CSV Export ────────────────────────────────────────────── */
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast('No tasks to export', 'info');
      return;
    }
    const headers = ['ID', 'Title', 'Description', 'Project', 'Assignee', 'Status', 'Priority', 'Due Date', 'Labels'];
    const rows = filteredTasks.map(t => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.projectTitle || '').replace(/"/g, '""')}"`,
      `"${(t.assigneeName || 'Unassigned').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
      `"${(t.labels || []).join(', ').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('CSV Export completed', 'success');
  };

  /* ─── PDF Export ────────────────────────────────────────────── */
  const handleExportPDF = () => {
    if (filteredTasks.length === 0) {
      toast('No tasks to print', 'info');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Pop-up blocked. Please allow pop-ups to print PDF.', 'warning');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
      <html>
        <head>
          <title>Task Report - ${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1f2937;
              padding: 40px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .title {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              color: #111827;
              letter-spacing: -0.025em;
            }
            .subtitle {
              color: #6b7280;
              font-size: 14px;
              margin-top: 5px;
            }
            .meta {
              text-align: right;
              font-size: 12px;
              color: #9ca3af;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #f9fafb;
              border-bottom: 2px solid #e5e7eb;
              text-align: left;
              padding: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: #4b5563;
              letter-spacing: 0.05em;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 13px;
              color: #374151;
            }
            tr:nth-child(even) td {
              background-color: #fcfdfd;
            }
            .priority-tag {
              display: inline-flex;
              align-items: center;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .priority-Low { background-color: #f3f4f6; color: #4b5563; }
            .priority-Medium { background-color: #dbeafe; color: #1e40af; }
            .priority-High { background-color: #fef3c7; color: #92400e; }
            .priority-Urgent { background-color: #fee2e2; color: #991b1b; }
            .status-tag {
              font-weight: 500;
            }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
            }
            .label-pill {
              background-color: #f3f4f6;
              color: #4b5563;
              font-size: 10px;
              padding: 1px 6px;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Workspace Task Report</h1>
              <div class="subtitle">Generated on ${todayStr}</div>
            </div>
            <div class="meta">
              Total Tasks: ${filteredTasks.length}<br>
              Team Task Manager
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30%">Task Title</th>
                <th style="width: 15%">Project</th>
                <th style="width: 15%">Assignee</th>
                <th style="width: 12%">Status</th>
                <th style="width: 10%">Priority</th>
                <th style="width: 10%">Due Date</th>
                <th style="width: 8%">Labels</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTasks.map(t => `
                <tr>
                  <td style="font-weight: 600; color: #111827;">${t.title}</td>
                  <td>${t.projectTitle}</td>
                  <td>${t.assigneeName || 'Unassigned'}</td>
                  <td><span class="status-tag">${t.status}</span></td>
                  <td><span class="priority-tag priority-${t.priority}">${t.priority || 'Medium'}</span></td>
                  <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                  <td>
                    <div class="labels-container">
                      ${(t.labels || []).map(l => `<span class="label-pill">${l}</span>`).join('')}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  /* ─── Calendar Helpers ───────────────────────────────────────── */
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevTotalDays - i),
        isCurrentMonth: false
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getTasksForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return filteredTasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === dateStr);
  };

  const handleCalendarDayClick = (date) => {
    resetForm();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setForm(prev => ({ ...prev, dueDate: `${year}-${month}-${day}` }));
    setShowModal(true);
  };

  /* ─── column data ───────────────────────────────────────────── */
  const getColumnTasks = (colId) =>
    filteredTasks.filter(t => t.status === colId);

  /* ─── render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">
            {viewMode === 'board' ? 'Kanban Board' : 'Calendar view'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tasks</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> New Task
        </Button>
      </div>

      {/* View selector and Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border/60 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-50 dark:bg-gray-800/40 w-fit">
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
              viewMode === 'board'
                ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-dark-border/40"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <FolderOpen size={13} />
            Board
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
              viewMode === 'calendar'
                ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-dark-border/40"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Calendar size={13} />
            Calendar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs py-1.5 h-auto">
            <Download size={13} /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs py-1.5 h-auto">
            <Printer size={13} /> Print PDF
          </Button>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border/60 shadow-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks or tags..."
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="text-xs"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>

        <Select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          className="text-xs"
        >
          <option value="">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>

        <Select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="text-xs"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </Select>

        <div className="flex gap-2 items-center">
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs flex-1"
          >
            <option value="">Sort: Manual</option>
            <option value="title">Sort: Title</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="createdAt">Sort: Created Date</option>
          </Select>
          {sortBy && (
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              title={sortOrder === 'asc' ? "Sort Ascending" : "Sort Descending"}
            >
              <ArrowUpDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="space-y-3">
              <Skeleton className="h-8 w-24" />
              {[1,2,3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-dark-border py-20 text-center bg-white dark:bg-dark-card shadow-sm">
          <Search className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">No tasks match your search</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try resetting the query or filters to search again.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border py-24 text-center">
          <CheckCircle2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No tasks yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">Create your first task to get started!</p>
          <Button onClick={openCreate} className="gap-2"><Plus size={16} /> New Task</Button>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View rendering */
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="text-primary-500" size={18} />
              {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-gray-800/10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-100 dark:divide-dark-border/40 border-l border-t border-transparent">
            {getDaysInMonth(calendarDate).map((day, idx) => {
              const dayTasks = getTasksForDate(day.date);
              const isToday = new Date().toDateString() === day.date.toDateString();
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[110px] p-2 flex flex-col justify-between group/day transition-colors relative",
                    day.isCurrentMonth
                      ? "bg-white dark:bg-dark-card"
                      : "bg-gray-50/30 dark:bg-gray-900/10 text-gray-300 dark:text-gray-600",
                    isToday && "bg-primary-50/10 dark:bg-primary-950/5"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn(
                      "text-xs font-semibold flex items-center justify-center h-6 w-6 rounded-full transition-colors",
                      isToday
                        ? "bg-primary-600 text-white shadow-sm font-bold"
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {day.date.getDate()}
                    </span>
                    <button
                      onClick={() => handleCalendarDayClick(day.date)}
                      className="opacity-0 group-hover/day:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-primary-600 rounded transition-opacity"
                      title="Add task for this day"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 max-h-[80px] scrollbar-thin">
                    {dayTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => openEdit(t)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-all border",
                          t.status === 'Done'
                            ? "bg-green-50/30 text-green-700 dark:bg-green-950/10 dark:text-green-400 border-green-200/20 line-through"
                            : t.priority === 'Urgent'
                              ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200/40 font-semibold"
                              : t.priority === 'High'
                                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/40"
                                : "bg-primary-50/60 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 border-primary-200/30"
                        )}
                        title={`${t.title} (${t.projectTitle})`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Kanban Board View rendering */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {COLUMNS.map(col => {
              const colTasks = getColumnTasks(col.id);
              return (
                <div key={col.id} className={cn(
                  "rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden",
                  "border-t-4", col.header
                )}>
                  <div className="flex items-center justify-between bg-white dark:bg-dark-card px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{col.label}</h3>
                    </div>
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {colTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[120px] space-y-2 p-2 transition-colors",
                          snapshot.isDraggingOver
                            ? "bg-primary-50/60 dark:bg-primary-900/10"
                            : "bg-gray-50/50 dark:bg-gray-900/20"
                        )}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={cn(
                                  "group rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border p-3 shadow-sm",
                                  "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-150",
                                  dragSnapshot.isDragging && "shadow-xl rotate-1 scale-105",
                                  task.overdue && "border-l-4 border-l-red-400"
                                )}
                              >
                                <div className="flex items-start gap-1.5 mb-2">
                                  <div {...dragProvided.dragHandleProps} className="mt-0.5 flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={14} />
                                  </div>
                                  <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2">{task.title}</p>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2 ml-5">
                                  <FolderOpen size={11} />
                                  <span className="truncate">{task.projectTitle}</span>
                                </div>

                                <div className="flex flex-wrap gap-1 ml-5 mb-2">
                                  <Badge variant={PRIORITY_CONFIG[task.priority]?.variant || 'default'} className="text-[10px] px-1.5 py-0">
                                    <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block", PRIORITY_CONFIG[task.priority]?.dot || 'bg-gray-400')} />
                                    {task.priority || 'Medium'}
                                  </Badge>
                                  {task.overdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
                                  {(task.labels || []).map((lbl, li) => (
                                    <Badge key={li} variant="outline" className="text-[9px] px-1.5 py-0 bg-primary-50/20 text-primary-600 dark:text-primary-400 border-primary-200/40">
                                      <Tag size={8} className="mr-0.5" />
                                      {lbl}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 ml-5">
                                  <span className="flex items-center gap-1 truncate">
                                    <User size={11} />
                                    <span className="truncate max-w-[80px]">{task.assigneeName || 'Unassigned'}</span>
                                  </span>
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1 flex-shrink-0">
                                      <Calendar size={11} />
                                      {new Date(task.dueDate).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 mt-2 ml-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEdit(task)}
                                    className="rounded p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    title="Edit task"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTrigger(task.id)}
                                    className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Delete task"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    className="ml-auto text-[10px] rounded border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 px-1 py-0.5 focus:outline-none"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                  </select>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ── Task Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { resetForm(); setShowModal(false); }} />

          <div className={cn(
            "relative z-50 w-full rounded-2xl bg-white dark:bg-dark-card shadow-2xl overflow-hidden transition-all duration-300",
            isEditing ? "max-w-4xl" : "max-w-xl"
          )}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Task details' : 'Create New Task'}
              </h2>
              <button
                onClick={() => { resetForm(); setShowModal(false); }}
                className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[85vh]">
              {isEditing ? (
                /* 2-Column Split view */
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-dark-border/40">
                  {/* Left Column: Form Details */}
                  <form onSubmit={handleSubmit} className="w-full md:w-3/5 p-6 space-y-4">
                    {/* Project Title (Immutable inside edit) */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Project Context</span>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {projects.find(p => String(p.id) === String(form.projectId))?.title || 'Assigned Project'}
                      </p>
                    </div>

                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Title</label>
                      <Input
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Task title"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Description</label>
                      <Textarea
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Optional description…"
                        rows={4}
                      />
                    </div>

                    {/* Priority & Due date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Priority</label>
                        <Select
                          value={form.priority}
                          onChange={e => setForm({ ...form, priority: e.target.value })}
                        >
                          <option className="dark:bg-dark-card">Low</option>
                          <option className="dark:bg-dark-card">Medium</option>
                          <option className="dark:bg-dark-card">High</option>
                          <option className="dark:bg-dark-card">Urgent</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Due Date</label>
                        <Input
                          type="date"
                          value={form.dueDate}
                          onChange={e => setForm({ ...form, dueDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Assignee Email</label>
                      <Input
                        list="assignee-list"
                        type="email"
                        value={form.assigneeEmail}
                        onChange={e => setForm({ ...form, assigneeEmail: e.target.value })}
                        placeholder="member@team.com"
                        required
                      />
                      <datalist id="assignee-list">
                        {users.map(u => <option key={u.id} value={u.email}>{u.name}</option>)}
                      </datalist>
                    </div>

                    {/* Labels Manager */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Labels / Tags</label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(form.labels || []).length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">No labels added yet.</span>
                        ) : (
                          (form.labels || []).map((lbl, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              {lbl}
                              <button
                                type="button"
                                onClick={() => handleRemoveLabel(lbl)}
                                className="text-gray-400 hover:text-red-500 font-bold ml-0.5"
                              >
                                &times;
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newLabelInput}
                          onChange={e => setNewLabelInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                          placeholder="New label tag name..."
                          className="flex-1 text-xs"
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={handleAddLabel}>
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-dark-border/40">
                      <Button type="submit" className="flex-1">
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDeleteTrigger(editingTaskId)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </form>

                  {/* Right Column: Checklist, Comments, Attachments tabs */}
                  <div className="w-full md:w-2/5 p-6 space-y-4">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-dark-border mb-4">
                      <button
                        type="button"
                        onClick={() => setModalTab('subtasks')}
                        className={cn(
                          "flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-colors",
                          modalTab === 'subtasks'
                            ? "border-primary-500 text-primary-600 dark:text-primary-400"
                            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                      >
                        Checklist ({subtasks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('comments')}
                        className={cn(
                          "flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-colors",
                          modalTab === 'comments'
                            ? "border-primary-500 text-primary-600 dark:text-primary-400"
                            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                      >
                        Comments ({comments.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalTab('attachments')}
                        className={cn(
                          "flex-1 pb-2 text-xs font-semibold border-b-2 text-center transition-colors",
                          modalTab === 'attachments'
                            ? "border-primary-500 text-primary-600 dark:text-primary-400"
                            : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                      >
                        Files ({attachments.length})
                      </button>
                    </div>

                    {/* Active tab content */}
                    {modalTab === 'subtasks' && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Task Checklist
                          {subtasks.length > 0 && (
                            <span className="ml-2 text-[10px] text-gray-500">
                              {subtasks.filter(s => s.completed).length}/{subtasks.length} done
                            </span>
                          )}
                        </h3>

                        <div className="space-y-2 mb-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                          {subtasks.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">No subtasks yet.</p>
                          ) : subtasks.map(s => (
                            <div key={s.id} className="flex items-center gap-2 group/sub py-1">
                              <button type="button" onClick={() => toggleSubtask(s)} className="flex-shrink-0 text-gray-400 hover:text-primary-600 transition-colors">
                                {s.completed
                                  ? <CheckCircle2 size={16} className="text-green-500" />
                                  : <Circle size={16} />
                                }
                              </button>
                              <span className={cn("flex-1 text-xs", s.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300")}>
                                {s.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeSubtask(s.id)}
                                className="opacity-0 group-hover/sub:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                            placeholder="Add subtask…"
                            className="flex-1 text-xs"
                          />
                          <Button type="button" variant="secondary" size="sm" onClick={handleAddSubtask}>
                            <Plus size={14} />
                          </Button>
                        </div>
                      </div>
                    )}

                    {modalTab === 'comments' && (
                      <div className="space-y-4">
                        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                          {comments.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">No comments yet. Start the conversation!</p>
                          ) : (
                            comments.map((comment) => {
                              const isAuthor = comment.user && (comment.user._id === user.id || comment.user.id === user.id);
                              return (
                                <div key={comment._id || comment.id} className="flex gap-2 text-xs items-start bg-gray-50 dark:bg-gray-800/20 p-2.5 rounded-lg border border-gray-100 dark:border-dark-border/40">
                                  <div className="h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                    {comment.user?.name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-semibold text-gray-900 dark:text-white">{comment.user?.name || 'Unknown User'}</span>
                                      <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 break-words leading-normal">{comment.content}</p>
                                  </div>
                                  {isAuthor && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment._id || comment.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-0.5"
                                      title="Delete comment"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <form onSubmit={handleAddComment} className="flex gap-2">
                          <Input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="text-xs flex-1"
                          />
                          <Button type="submit" size="sm" className="px-3">
                            <MessageSquare size={13} className="mr-1" /> Post
                          </Button>
                        </form>
                      </div>
                    )}

                    {modalTab === 'attachments' && (
                      <div className="space-y-4">
                        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                          {attachments.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">No attachments yet.</p>
                          ) : (
                            attachments.map((att) => (
                              <div key={att.id || att._id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-100 dark:border-dark-border/40 bg-gray-50 dark:bg-gray-800/20 text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Paperclip size={13} className="text-gray-400 shrink-0" />
                                  <span className="truncate text-gray-700 dark:text-gray-300 font-medium">{att.originalName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={getAvatarUrl(att.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-primary-600 transition-colors"
                                    title="Download"
                                  >
                                    <Download size={12} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(att.id || att._id)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500 transition-colors"
                                    title="Delete file"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="file"
                            id="task-file-upload"
                            className="hidden"
                            onChange={handleUploadAttachment}
                            disabled={fileUploading}
                          />
                          <label
                            htmlFor="task-file-upload"
                            className={cn(
                              "flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-dark-border/60 hover:border-primary-400 rounded-xl p-4 cursor-pointer text-center transition-all",
                              fileUploading && "pointer-events-none opacity-50 bg-gray-50 dark:bg-gray-900/10"
                            )}
                          >
                            {fileUploading ? (
                              <>
                                <Loader2 className="h-6 w-6 text-primary-500 animate-spin mb-1" />
                                <span className="text-[10px] text-gray-500">Uploading file...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-5 w-5 text-gray-400 mb-1 group-hover:text-primary-500" />
                                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Upload Attachment</span>
                                <span className="text-[9px] text-gray-400">Max size 10MB</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Simple modal layout for task creation */
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                  {/* Project selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Project</label>
                    <Select
                      value={form.projectId}
                      onChange={e => setForm({ ...form, projectId: e.target.value })}
                      required
                    >
                      <option value="" className="dark:bg-dark-card">Select a project…</option>
                      {projects.map(p => <option key={p.id} value={p.id} className="dark:bg-dark-card">{p.title}</option>)}
                    </Select>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Title</label>
                    <Input
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="Task title"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Description</label>
                    <Textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional description…"
                      rows={3}
                    />
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignee Email</label>
                    <Input
                      list="assignee-list"
                      type="email"
                      value={form.assigneeEmail}
                      onChange={e => setForm({ ...form, assigneeEmail: e.target.value })}
                      placeholder="member@team.com"
                      required
                    />
                    <datalist id="assignee-list">
                      {users.map(u => <option key={u.id} value={u.email}>{u.name}</option>)}
                    </datalist>
                  </div>

                  {/* Priority + Due Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Priority</label>
                      <Select
                        value={form.priority}
                        onChange={e => setForm({ ...form, priority: e.target.value })}
                      >
                        <option className="dark:bg-dark-card">Low</option>
                        <option className="dark:bg-dark-card">Medium</option>
                        <option className="dark:bg-dark-card">High</option>
                        <option className="dark:bg-dark-card">Urgent</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Due Date</label>
                      <Input
                        type="date"
                        value={form.dueDate}
                        onChange={e => setForm({ ...form, dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Creation actions */}
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1">
                      Create Task
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setTaskToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
      />
    </div>
  );
}
