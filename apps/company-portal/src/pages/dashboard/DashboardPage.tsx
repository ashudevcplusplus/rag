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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, EmptyState, Badge } from '@rag/ui';
import { projectsApi } from '@rag/api-client';
import { formatBytes, formatRelativeTime } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp
                  className={`w-4 h-4 ${
                    trend.isPositive ? 'text-green-500' : 'text-red-500'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.value}%
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { company, companyId } = useAuthStore();
  const { searchCount, recentActivities } = useAppStore();

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projects = projectsData?.projects || [];
  const totalFiles = projects.reduce((sum, p) => sum + (p.fileCount || 0), 0);
  const totalVectors = projects.reduce((sum, p) => sum + (p.vectorCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's an overview of your document system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Projects"
          value={projectsLoading ? '...' : projects.length}
          icon={<FolderOpen className="w-6 h-6" />}
          description="Active projects"
        />
        <StatCard
          title="Documents"
          value={projectsLoading ? '...' : totalFiles}
          icon={<FileText className="w-6 h-6" />}
          description="Total uploaded"
        />
        <StatCard
          title="Searches"
          value={searchCount}
          icon={<Search className="w-6 h-6" />}
          description="This session"
        />
        <StatCard
          title="Storage"
          value={formatBytes(company?.storageUsed || 0)}
          icon={<HardDrive className="w-6 h-6" />}
          description={`of ${formatBytes(company?.storageLimit || 0)}`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<FolderOpen className="w-8 h-8" />}
                title="No projects yet"
                description="Create your first project to start uploading documents"
                action={
                  <Button onClick={() => navigate('/projects')}>
                    Create Project
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: project.color
                            ? `${project.color}20`
                            : '#f3f4f6',
                          color: project.color || '#6b7280',
                        }}
                      >
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {project.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {project.fileCount || 0} files • {project.vectorCount || 0}{' '}
                          vectors
                        </p>
                      </div>
                    </div>
                    <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-8 h-8" />}
                title="No activity yet"
                description="Your recent actions will appear here"
              />
            ) : (
              <div className="space-y-4">
                {recentActivities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {activity.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/projects')}
            >
              <FolderOpen className="w-6 h-6" />
              <span>Create Project</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/upload')}
            >
              <FileText className="w-6 h-6" />
              <span>Upload Documents</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/search')}
            >
              <Search className="w-6 h-6" />
              <span>Search Documents</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
