import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { fetchDashboard } from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function CountUp({ value = 0, duration = 600 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const stepTime = Math.max(16, Math.floor(duration / end));
    const timer = setInterval(() => {
      start += Math.max(1, Math.ceil(end / (duration / 16)));
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <div className="stat-number">{display}</div>;
}

function StatusBadge({ status }) {
  const cls = status === 'Todo' ? 'badge-todo' : status === 'In Progress' ? 'badge-progress' : 'badge-done';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const cls = priority === 'High' ? 'badge-high' : priority === 'Low' ? 'badge-low' : 'badge-medium';
  return <span className={`badge ${cls}`}>{priority}</span>;
}

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard()
      .then((response) => setData(response.data))
      .catch(() => setError('Unable to load dashboard data'));
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const completionPct = data?.summary?.total
    ? Math.round((data.summary.done / data.summary.total) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="welcome-label">Welcome back</div>
          <h1>Welcome back, {user?.name} 👋</h1>
          <p>{today}</p>
        </div>
      </div>

      {error && <div className="message">{error}</div>}

      {!data ? (
        <div className="dashboard-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton skeleton-stat" />
          ))}
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-icon total">📋</div>
              <div className="stat-info">
                <strong>Total Tasks</strong>
                <CountUp value={data.summary.total || 0} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon todo">📝</div>
              <div className="stat-info">
                <strong>Todo</strong>
                <CountUp value={data.summary.todo || 0} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon progress">🔄</div>
              <div className="stat-info">
                <strong>In Progress</strong>
                <CountUp value={data.summary.inProgress || 0} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon done">✅</div>
              <div className="stat-info">
                <strong>Done</strong>
                <CountUp value={data.summary.done || 0} />
              </div>
            </div>
            <div className="stat-card overdue">
              <div className="stat-icon overdue">⚠️</div>
              <div className="stat-info">
                <strong>Overdue</strong>
                <CountUp value={data.summary.overdue || 0} />
              </div>
            </div>
          </div>

          {data.summary.total > 0 && (
            <div className="card progress-card">
              <div className="progress-header">
                <div>
                  <h2>Completion Progress</h2>
                  <p className="hint">Task completion based on current workflow status.</p>
                </div>
                <span className="progress-value">{completionPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          )}

          <div className="dashboard-cards">
            {data.tasksByUser && Object.keys(data.tasksByUser).length > 0 && (
              <div className="card chart-card">
                <h2>Tasks per User</h2>
                <div className="chart-wrapper">
                  <Bar
                    data={{
                      labels: Object.keys(data.tasksByUser),
                      datasets: [{ label: 'Total tasks', data: Object.values(data.tasksByUser).map((i) => i.total), backgroundColor: 'rgba(99,102,241,0.8)' }]
                    }}
                    options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            )}

            {data.tasksOverTime && data.tasksOverTime.length > 0 && (
              <div className="card chart-card">
                <h2>Tasks Created (last 14 days)</h2>
                <div className="chart-wrapper">
                  <Line
                    data={{
                      labels: data.tasksOverTime.map((d) => d.date),
                      datasets: [{ label: 'Tasks created', data: data.tasksOverTime.map((d) => d.count), borderColor: 'rgba(99,102,241,0.95)', backgroundColor: 'rgba(99,102,241,0.28)', fill: true, tension: 0.4 }]
                    }}
                    options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            )}
          </div>

          {data.recentTasks?.length > 0 && (
            <div className="card table-card">
              <div className="table-header">
                <h2>Recent Tasks</h2>
                <p className="hint">Latest task activity across your active projects.</p>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr>
                  </thead>
                  <tbody>
                    {data.recentTasks.map((task) => (
                      <tr key={task.id} className={task.overdue ? 'overdue-row' : ''}>
                        <td className="table-title">{task.title}</td>
                        <td>{task.projectTitle}</td>
                        <td><StatusBadge status={task.status} /></td>
                        <td><PriorityBadge priority={task.priority || 'Medium'} /></td>
                        <td>
                          {task.dueDate || '—'}
                          {task.overdue && <span className="badge badge-overdue table-badge">Overdue</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
