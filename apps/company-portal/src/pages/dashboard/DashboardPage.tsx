import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  FileText,
  Search,
  HardDrive,
  TrendingUp,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  BarChart3,
  Plus,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, EmptyState, Badge } from '@rag/ui';
import { projectsApi, companyApi } from '@rag/api-client';
import { formatBytes, formatRelativeTime } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  gradient?: string;
  delay?: number;
}

function StatCard({ title, value, icon, description, trend, gradient = 'from-primary-500 to-primary-600', delay = 0 }: StatCardProps) {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-white border border-surface-100 shadow-soft hover:shadow-card-hover transition-all duration-300 group animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm text-surface-500 font-medium uppercase tracking-wide">{title}</p>
            <p className="text-4xl font-bold text-surface-900 font-display">{value}</p>
            {description && (
              <p className="text-sm text-surface-500">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold ${
                  trend.isPositive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  <TrendingUp
                    className={`w-3 h-3 ${!trend.isPositive ? 'rotate-180' : ''}`}
                  />
                  {trend.value}%
                </div>
                <span className="text-xs text-surface-400">vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { company, companyId, user } = useAuthStore();
  const { searchCount, recentActivities } = useAppStore();

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  // Fetch fresh company stats (for storage info)
  const { data: statsData } = useQuery({
    queryKey: ['company-stats', companyId],
    queryFn: () => companyApi.getStats(companyId!),
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const projects = projectsData?.projects || [];
  const totalFiles = projects.reduce((sum, p) => sum + (p.fileCount || 0), 0);
  
  // Use fresh stats if available, fallback to stored company data
  const storageUsed = statsData?.storageUsed ?? company?.storageUsed ?? 0;
  const storageLimit = statsData?.storageLimit ?? company?.storageLimit ?? 0;
  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 sm:p-10 text-white">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm">
              <Sparkles className="w-4 h-4 text-accent-300" />
              <span>Enterprise AI Platform</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold font-display">
              {getGreeting()}, {user?.firstName || 'there'}! 
            </h1>
            <p className="text-primary-100 text-lg max-w-xl">
              Here's an overview of your document intelligence system. Ready to explore your knowledge base?
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => navigate('/chat')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white shadow-none"
            >
              <MessageSquare className="w-4 h-4" />
              Start Chat
            </Button>
            <Button 
              onClick={() => navigate('/upload')}
              className="bg-white text-primary-700 hover:bg-white/90 shadow-lg shadow-primary-900/20"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Projects"
          value={projectsLoading ? '...' : projects.length}
          icon={<FolderOpen className="w-6 h-6" />}
          description="Active workspaces"
          gradient="from-primary-500 to-primary-600"
          delay={0}
        />
        <StatCard
          title="Documents"
          value={projectsLoading ? '...' : totalFiles}
          icon={<FileText className="w-6 h-6" />}
          description="Total indexed"
          gradient="from-emerald-500 to-emerald-600"
          delay={0.1}
        />
        <StatCard
          title="Searches"
          value={searchCount}
          icon={<Search className="w-6 h-6" />}
          description="This session"
          gradient="from-amber-500 to-orange-500"
          delay={0.2}
        />
        <StatCard
          title="Storage"
          value={formatBytes(storageUsed)}
          icon={<HardDrive className="w-6 h-6" />}
          description={`${storagePercent}% of ${formatBytes(storageLimit)}`}
          gradient="from-violet-500 to-purple-600"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <Card className="h-full border-0 shadow-soft hover:shadow-card transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-100">
                  <FolderOpen className="w-5 h-5 text-primary-600" />
                </div>
                <CardTitle className="text-lg font-display">Recent Projects</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {projectsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 skeleton rounded-xl" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen className="w-10 h-10" />}
                  title="No projects yet"
                  description="Create your first project to start uploading and searching documents"
                  action={
                    <Button 
                      onClick={() => navigate('/projects')}
                      className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25"
                    >
                      <Plus className="w-4 h-4" />
                      Create Project
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project, index) => (
                    <div
                      key={project._id}
                      onClick={() => navigate(`/projects/${project._id}`)}
                      className="group flex items-center justify-between p-4 rounded-xl border border-surface-100 bg-surface-50/50 hover:bg-white hover:border-primary-200 hover:shadow-md cursor-pointer transition-all duration-200"
                      style={{ animationDelay: `${0.3 + index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                          style={{
                            backgroundColor: project.color
                              ? `${project.color}15`
                              : '#f3e8ff',
                            color: project.color || '#9333ea',
                          }}
                        >
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors">
                            {project.name}
                          </h4>
                          <p className="text-sm text-surface-500 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {project.fileCount || 0} files
                            </span>
                            <span className="w-1 h-1 rounded-full bg-surface-300" />
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-3.5 h-3.5" />
                              {project.vectorCount || 0} vectors
                            </span>
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={project.status === 'ACTIVE' ? 'success' : 'default'}
                        className="capitalize"
                      >
                        {project.status.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <Card className="h-full border-0 shadow-soft hover:shadow-card transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <CardTitle className="text-lg font-display">Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {recentActivities.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-10 h-10" />}
                  title="No activity yet"
                  description="Your recent actions will appear here"
                />
              ) : (
                <div className="space-y-4">
                  {recentActivities.slice(0, 8).map((activity, index) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-3 group"
                      style={{ animationDelay: `${0.4 + index * 0.05}s` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 mt-2 group-hover:scale-125 transition-transform" />
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm text-surface-700 leading-relaxed"
                          title={activity.text}
                        >
                          {activity.text}
                        </p>
                        <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardHeader className="border-b border-surface-100 bg-surface-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
              >
                <div className="p-4 rounded-2xl bg-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                  <FolderOpen className="w-7 h-7 text-primary-600" />
                </div>
                <span className="font-semibold text-primary-700">Create Project</span>
              </button>
              
              <button
                onClick={() => navigate('/upload')}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
              >
                <div className="p-4 rounded-2xl bg-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                  <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="font-semibold text-emerald-700">Upload Documents</span>
              </button>
              
              <button
                onClick={() => navigate('/chat')}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/50 border border-amber-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
              >
                <div className="p-4 rounded-2xl bg-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                  <MessageSquare className="w-7 h-7 text-amber-600" />
                </div>
                <span className="font-semibold text-amber-700">Chat with AI</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
