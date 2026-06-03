import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { fetchDashboard, fetchUserActivity } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CheckCircle2, Circle, Clock, LayoutList, AlertCircle, Plus, Sparkles, TrendingUp, User, X, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../components/ui/DashboardCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, ChartTooltip, Legend);

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const theme = useStore((state) => state.theme);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard()
      .then((response) => setData(response.data))
      .catch(() => setError('Unable to load dashboard data'));

    fetchUserActivity()
      .then((res) => setActivities(res.data.activities || []))
      .catch((err) => console.error('Error fetching activities:', err));
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const completionPct = data?.summary?.total
    ? Math.round((data.summary.done / data.summary.total) * 100)
    : 0;

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const chartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#131c31' : '#ffffff',
        titleColor: theme === 'dark' ? '#ffffff' : '#0f172a',
        bodyColor: theme === 'dark' ? '#94a3b8' : '#475569',
        borderColor: theme === 'dark' ? '#1e2d4a' : '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { family: 'Inter', size: 11 } }
      },
      y: {
        grid: { color: theme === 'dark' ? 'rgba(30,45,74,0.3)' : 'rgba(226,232,240,0.5)', drawTicks: false },
        ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { family: 'Inter', size: 11 } },
        beginAtZero: true
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upper header action row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">{today}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors shadow-sm animate-fade-in"
          >
            <Plus size={14} /> Add Project
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/10 animate-fade-in"
          >
            <Sparkles size={14} /> New Task
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-900/50">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      {!data ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DashboardCard
            title="Total Tasks"
            value={data.summary.total}
            icon={LayoutList}
            borderColor="border-l-primary-500"
            iconBgColor="bg-primary-50 dark:bg-primary-950/40"
            iconTextColor="text-primary-600 dark:text-primary-400"
          />

          <DashboardCard
            title="To Do"
            value={data.summary.todo}
            icon={Circle}
            borderColor="border-l-surface-400"
            iconBgColor="bg-surface-100 dark:bg-surface-800"
            iconTextColor="text-surface-600 dark:text-surface-400"
          />

          <DashboardCard
            title="In Progress"
            value={data.summary.inProgress}
            icon={Clock}
            borderColor="border-l-amber-500"
            iconBgColor="bg-amber-50 dark:bg-amber-950/30"
            iconTextColor="text-amber-600 dark:text-amber-400"
          />

          <DashboardCard
            title="Completed"
            value={data.summary.done}
            icon={CheckCircle2}
            borderColor="border-l-green-500"
            iconBgColor="bg-green-50 dark:bg-green-950/30"
            iconTextColor="text-green-600 dark:text-green-400"
          />

          <DashboardCard
            title="Overdue"
            value={data.summary.overdue}
            icon={AlertCircle}
            borderColor={data.summary.overdue > 0 ? "border-l-red-500" : "border-l-surface-300"}
            iconBgColor={data.summary.overdue > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-surface-50 dark:bg-dark-hover"}
            iconTextColor={data.summary.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-surface-400"}
            titleColor={data.summary.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-surface-500 dark:text-surface-400"}
            valueColor={data.summary.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}
            className={data.summary.overdue > 0 ? "bg-red-50/10 dark:bg-red-950/5" : ""}
          />
        </div>
      )}

      {/* Progress & Completion Section */}
      {data?.summary?.total > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Overall Workspace Progress</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400">Task completion percentage across all assigned projects.</p>
              </div>
              <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400">{completionPct}%</span>
            </div>
            <ProgressBar value={completionPct} max={100} showPercent={false} color="primary" size="default" />
          </CardContent>
        </Card>
      )}

      {/* Charts / Analytics Section */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart: Users */}
          {data.tasksByUser && Object.keys(data.tasksByUser).length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-primary-500" />
                  Workload by User
                </CardTitle>
                <CardDescription>Visual metrics showing total task count allocations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <Bar
                    data={{
                      labels: Object.keys(data.tasksByUser),
                      datasets: [{ 
                        label: 'Tasks allocated', 
                        data: Object.values(data.tasksByUser).map((i) => i.total), 
                        backgroundColor: theme === 'dark' ? '#4f46e5' : '#6366f1',
                        borderRadius: 6,
                        maxBarThickness: 32,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart: History */}
          {data.tasksOverTime && data.tasksOverTime.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-primary-500" />
                  Tasks Created (Last 14 Days)
                </CardTitle>
                <CardDescription>Timeline distribution of created backlog tasks.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <Line
                    data={{
                      labels: data.tasksOverTime.map((d) => {
                        const date = new Date(d.date);
                        return `${date.getMonth()+1}/${date.getDate()}`;
                      }),
                      datasets: [{ 
                        label: 'Tasks created', 
                        data: data.tasksOverTime.map((d) => d.count), 
                        borderColor: '#6366f1', 
                        backgroundColor: 'rgba(99,102,241,0.08)', 
                        fill: true, 
                        tension: 0.35,
                        pointBackgroundColor: '#4f46e5',
                        pointBorderWidth: 1,
                        pointHoverRadius: 6,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bottom Grid: Recent Tasks Table & Workspace Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Backlog Table */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden h-[450px] flex flex-col">
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-dark-border/60">
              <CardTitle className="text-sm font-semibold">Recent Backlog Activities</CardTitle>
              <CardDescription>Latest task additions and state changes across workgroups.</CardDescription>
            </CardHeader>
            <div className="overflow-auto flex-1 custom-scrollbar">
              {data?.recentTasks?.length > 0 ? (
                <table className="w-full text-left text-xs text-surface-600 dark:text-surface-300">
                  <thead className="bg-surface-50 dark:bg-dark-hover/20 text-gray-900 dark:text-white border-b border-gray-100 dark:border-dark-border/60 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Task Title</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Project Group</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Workflow Status</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border/60">
                    {data.recentTasks.map((task) => (
                      <tr key={task.id} className={cn(
                        "hover:bg-surface-50/50 dark:hover:bg-dark-hover/30 transition-colors duration-150",
                        task.overdue ? "bg-red-500/5" : ""
                      )}>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{task.title}</td>
                        <td className="px-6 py-4 text-surface-500 truncate max-w-[120px]">{task.projectTitle}</td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            task.status === 'Done' ? 'success' : 
                            task.status === 'In Progress' ? 'warning' : 'default'
                          }>
                            {task.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={
                            task.priority === 'High' || task.priority === 'Urgent' ? 'destructive' :
                            task.priority === 'Medium' ? 'warning' : 'outline'
                          }>
                            {task.priority || 'Medium'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 truncate">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {task.overdue && <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">Overdue</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 h-full">
                  <LayoutList className="h-8 w-8 text-surface-300 mb-2" />
                  <p className="text-2xs text-surface-500 dark:text-surface-400">No recent tasks in project backlog.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Workspace Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="h-[450px] flex flex-col">
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-dark-border/60">
              <CardTitle className="text-sm font-semibold">Workspace Activity Feed</CardTitle>
              <CardDescription>Real-time audit log of team actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 h-full">
                  <Clock className="h-8 w-8 text-surface-300 mb-2" />
                  <p className="text-2xs text-surface-500 dark:text-surface-400">No recent workspace actions logged yet.</p>
                </div>
              ) : (
                activities.map((act) => {
                  let Icon = Edit3;
                  let iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400';
                  
                  if (act.action === 'created') {
                    Icon = Plus;
                    iconBg = 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400';
                  } else if (act.action === 'deleted') {
                    Icon = X;
                    iconBg = 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400';
                  } else if (act.action === 'joined') {
                    Icon = User;
                    iconBg = 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400';
                  } else if (act.action === 'removed') {
                    Icon = X;
                    iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400';
                  }

                  return (
                    <div key={act._id} className="flex gap-3 text-xs items-start">
                      <div className={cn("p-1.5 rounded-lg shrink-0", iconBg)}>
                        <Icon size={12} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-surface-700 dark:text-surface-300 leading-normal">
                          <span className="font-semibold text-gray-900 dark:text-white">{act.userName}</span>{' '}
                          {act.details || `${act.action} ${act.targetType.toLowerCase()} "${act.targetName}"`}
                        </p>
                        <p className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">
                          {getRelativeTime(act.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
