import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ttm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function checkEmail(email) {
  return api.post('/auth/check-email', { email });
}

export async function getMe() {
  return api.get('/auth/me');
}

export async function login(data) {
  return api.post('/auth/login', data);
}

export async function signup(data) {
  return api.post('/auth/signup', data);
}

export async function forgotPassword(data) {
  return api.post('/auth/forgot-password', data);
}

export async function resetPassword(data) {
  return api.post('/auth/reset-password', data);
}

export async function fetchProjects() {
  return api.get('/projects');
}

export async function createProject(data) {
  return api.post('/projects', data);
}

export async function addProjectMember(projectId, data) {
  return api.post(`/projects/${projectId}/members`, data);
}

export async function removeProjectMember(projectId, userId) {
  return api.delete(`/projects/${projectId}/members/${userId}`);
}

export async function fetchProject(projectId) {
  return api.get(`/projects/${projectId}`);
}

export async function fetchTasks() {
  return api.get('/tasks');
}

export async function fetchProjectTasks(projectId) {
  return api.get(`/tasks/project/${projectId}`);
}

export async function fetchUsers() {
  return api.get('/users');
}

export async function createTask(projectId, data) {
  return api.post(`/tasks/project/${projectId}`, data);
}

export async function updateTask(taskId, data) {
  return api.patch(`/tasks/${taskId}`, data);
}

export async function deleteTask(taskId) {
  return api.delete(`/tasks/${taskId}`);
}

export async function reorderTasks(items) {
  return api.post('/tasks/reorder', { items });
}

export async function fetchSubtasks(taskId) {
  return api.get(`/tasks/${taskId}/subtasks`);
}

export async function generateSubtasks(taskId, prompt) {
  return api.post(`/tasks/${taskId}/subtasks/generate`, { prompt });
}

export async function createSubtask(taskId, data) {
  return api.post(`/tasks/${taskId}/subtasks`, data);
}

export async function deleteSubtask(subtaskId) {
  return api.delete(`/tasks/subtasks/${subtaskId}`);
}

export async function updateSubtask(subtaskId, data) {
  return api.patch(`/tasks/subtasks/${subtaskId}`, data);
}

export async function fetchAttachments(taskId) {
  return api.get(`/tasks/${taskId}/attachments`);
}

export async function uploadAttachment(taskId, file) {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/tasks/${taskId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function deleteAttachment(attachmentId) {
  return api.delete(`/tasks/attachments/${attachmentId}`);
}

export function exportTaskIcs(taskId) {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/tasks/${taskId}/ics`;
}

export function exportProjectIcs(projectId) {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/tasks/project/${projectId}/ics`;
}

export async function fetchDashboard() {
  return api.get('/tasks/dashboard');
}

export default api;
