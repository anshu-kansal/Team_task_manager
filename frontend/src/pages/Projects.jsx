import { useEffect, useState } from 'react';
import { createProject, fetchProjects, addProjectMember, removeProjectMember, fetchProject, fetchProjectTasks } from '../api';
import { useToast } from '../components/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { Plus, Users, FolderOpen, Mail, UserMinus, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

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
      toast('Member added successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Unable to add member', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedProject) return;
    try {
      await removeProjectMember(selectedProject.project.id, userId);
      handleSelect(selectedProject.project.id);
      toast('Member removed successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Unable to remove member', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title / Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Workspaces</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Projects</h1>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} /> New Project
        </Button>
      </div>

      {/* Main Grid: Left projects list, right project detail view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Projects Listing */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400">My workspaces</h2>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {projects.length} Total
            </Badge>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects configured"
              description="Your account is not linked to any active project workspace groups."
              action={() => setShowModal(true)}
              actionLabel="Create Project"
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const pct = project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
                const isSelected = selectedProject?.project?.id === project.id;

                return (
                  <Card 
                    key={project.id}
                    className={cn(
                      "cursor-pointer hover:shadow-card-hover group border-l-2 transition-all duration-200",
                      isSelected 
                        ? "border-l-primary-500 bg-primary-50/10 dark:bg-primary-950/10 shadow-card border-gray-300 dark:border-dark-border" 
                        : "border-l-transparent hover:border-l-surface-300"
                    )}
                    onClick={() => handleSelect(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mt-0.5">
                            {project.description || 'No description provided.'}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-surface-400 mt-0.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      {/* Project stats footer */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border/40 text-[10px] text-surface-500 dark:text-surface-400 font-medium">
                        <span className="flex items-center gap-1"><Users size={12} /> {project.memberCount} members</span>
                        <span className="flex items-center gap-1"><FileText size={12} /> {project.taskCount} tasks</span>
                        <span className="ml-auto font-semibold text-primary-600 dark:text-primary-400">{pct}% Complete</span>
                      </div>

                      {project.taskCount > 0 && (
                        <ProgressBar value={pct} max={100} showPercent={false} size="sm" className="mt-2" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Project Detail Panels */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <div className="space-y-6 animate-fade-in">
              {/* Project Title card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedProject.project.title}</h2>
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-xl">{selectedProject.project.description || 'No workspace description details.'}</p>
                      <p className="text-xs text-surface-400 mt-3">
                        Workspace Admin / Owner: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedProject.project.ownerName}</span>
                      </p>
                    </div>

                    {selectedProject.project.taskCount > 0 && (
                      <div className="w-full md:w-48 bg-surface-50 dark:bg-dark-hover/40 p-3 rounded-xl border border-gray-100 dark:border-dark-border/60">
                        <ProgressBar 
                          value={selectedProject.project.doneCount} 
                          max={selectedProject.project.taskCount} 
                          label="Workspace Progress" 
                          size="sm" 
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Grid: Workspace Members & Tasks inside the workspace */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Members list Card */}
                <Card>
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-dark-border/60">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Users size={16} className="text-primary-500" />
                      Members List ({selectedProject.members.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* User Invite Form (Admin or Project Owner) */}
                    {(user.role === 'admin' || selectedProject?.project?.ownerId === user.id) && (
                      <form onSubmit={handleAddMember} className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-surface-400" />
                          <Input 
                            type="email"
                            value={memberEmail} 
                            onChange={(e) => setMemberEmail(e.target.value)} 
                            placeholder="Invite user by email..." 
                            required 
                            className="pl-9"
                          />
                        </div>
                        <Button type="submit" size="sm">Invite</Button>
                      </form>
                    )}

                    <ul className="divide-y divide-gray-100 dark:divide-dark-border/40 max-h-80 overflow-y-auto pr-1">
                      {selectedProject.members.map((member) => (
                        <li key={member.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar 
                              fallback={member.name.charAt(0).toUpperCase()} 
                              className="h-8 w-8 text-xs ring-1 ring-gray-100 dark:ring-dark-border/60"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                              <p className="text-[10px] text-surface-400 truncate">{member.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="text-[9px] px-1.5 py-0 capitalize">
                              {member.role}
                            </Badge>
                            {(user.role === 'admin' || selectedProject?.project?.ownerId === user.id) && member.id !== selectedProject.project.ownerId && (
                              <button 
                                className="rounded p-1 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                onClick={() => handleRemoveMember(member.id)}
                                title="Remove member"
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Task list Card */}
                <Card>
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-dark-border/60">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <FolderOpen size={16} className="text-primary-500" />
                      Workspace Backlog
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {projectLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : selectedProjectTasks.length === 0 ? (
                      <EmptyState 
                        icon={FolderOpen}
                        title="No tasks scheduled"
                        description="There are currently no tasks in this workspace. Head to Kanban view to add tasks."
                      />
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {selectedProjectTasks.map((task) => (
                          <div 
                            key={task.id} 
                            className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-gray-100 dark:border-dark-border/40 hover:bg-surface-50 dark:hover:bg-dark-hover/30 transition-colors duration-150"
                          >
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{task.title}</h4>
                              <p className="text-[10px] text-surface-400 truncate mt-0.5">Assignee: {task.assigneeName}</p>
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge variant={
                                task.status === 'Done' ? 'success' : 
                                task.status === 'In Progress' ? 'warning' : 'default'
                              } className="text-[9px] px-1.5 py-0">
                                {task.status}
                              </Badge>
                              <Badge variant={
                                task.priority === 'High' || task.priority === 'Urgent' ? 'destructive' :
                                task.priority === 'Medium' ? 'warning' : 'outline'
                              } className="text-[9px] px-1.5 py-0">
                                {task.priority || 'Medium'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={FolderOpen}
                  title="Workspace Details"
                  description="Select a project workspace from the list on the left to see statistics, team members, and detailed status."
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: New Project creation */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          title="Create New Project"
          size="md"
        >
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Project Workspace Title</label>
              <Input 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                placeholder="Enter project workspace title..." 
                required 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400">Workspace Description</label>
              <Input 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Enter description, purpose or group guidelines..." 
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" size="sm">Create Workspace</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
