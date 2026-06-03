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

// Response interceptor to handle token refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and not already retried
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/login') && 
      !originalRequest.url.includes('/auth/signup') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('ttm_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('ttm_token');
        localStorage.removeItem('ttm_refresh_token');
        localStorage.removeItem('ttm_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${apiBaseUrl}/auth/refresh`, { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken, user } = response.data;
        
        localStorage.setItem('ttm_token', newAccessToken);
        localStorage.setItem('ttm_refresh_token', newRefreshToken);
        localStorage.setItem('ttm_user', JSON.stringify(user));
        
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('ttm_token');
        localStorage.removeItem('ttm_refresh_token');
        localStorage.removeItem('ttm_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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

export async function fetchComments(taskId) {
  return api.get(`/tasks/${taskId}/comments`);
}

export async function createComment(taskId, data) {
  return api.post(`/tasks/${taskId}/comments`, data);
}

export async function deleteComment(commentId) {
  return api.delete(`/tasks/comments/${commentId}`);
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

export async function getProfile() {
  return api.get('/users/me');
}

export async function updateProfile(data) {
  return api.patch('/users/me', data);
}

export async function changePassword(data) {
  return api.post('/users/me/change-password', data);
}

export async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append('avatar', file);
  return api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export async function fetchUserActivity() {
  return api.get('/users/me/activity');
}

export default api;
