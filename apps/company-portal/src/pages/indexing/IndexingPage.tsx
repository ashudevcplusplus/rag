import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  FolderOpen,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  StatusBadge,
  Modal,
  ModalFooter,
} from '@rag/ui';
import { projectsApi, filesApi, type IndexingStats } from '@rag/api-client';
import { formatBytes, formatRelativeTime } from '@rag/utils';
import type { Project, ProcessingStatus } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

interface ProjectWithStats extends Project {
  indexingStats?: IndexingStats;
}

export function IndexingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isRetryAllModalOpen, setIsRetryAllModalOpen] = useState(false);
  const [projectToRetry, setProjectToRetry] = useState<ProjectWithStats | null>(null);

  // Fetch projects with stats
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', companyId, 'indexing'],
    queryFn: async () => {
      const result = await projectsApi.list(companyId!, { syncStats: true });
      // Fetch indexing stats for each project
      const projectsWithStats = await Promise.all(
        result.projects.map(async (project) => {
          try {
            const statsResult = await projectsApi.getIndexingStats(companyId!, project._id);
            return { ...project, indexingStats: statsResult.stats };
          } catch {
            return { ...project, indexingStats: undefined };
          }
        })
      );
      return { ...result, projects: projectsWithStats };
    },
    enabled: !!companyId,
    refetchInterval: 10000, // Refresh every 10 seconds to see status changes
  });

  // Fetch files for expanded project (use higher limit to show all files)
  const { data: filesData } = useQuery({
    queryKey: ['files', companyId, expandedProjectId, statusFilter],
    queryFn: async () => {
      if (!expandedProjectId) return { files: [] };
      const result = await filesApi.list(companyId!, expandedProjectId, { limit: 100 });
      return result;
    },
    enabled: !!companyId && !!expandedProjectId,
  });

  // Reindex single file mutation
  const reindexFileMutation = useMutation({
    mutationFn: ({ projectId, fileId }: { projectId: string; fileId: string }) =>
      projectsApi.reindexFile(companyId!, projectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId, 'indexing'] });
      queryClient.invalidateQueries({ queryKey: ['files', companyId] });
      toast.success('File queued for reindexing');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      toast.error(apiError?.error || apiError?.message || 'Failed to reindex file');
    },
  });

  // Bulk reindex failed files mutation
  const bulkReindexMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.bulkReindexFailed(companyId!, projectId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', companyId, 'indexing'] });
      queryClient.invalidateQueries({ queryKey: ['files', companyId] });
      setIsRetryAllModalOpen(false);
      setProjectToRetry(null);
      toast.success(`Queued ${data.queued} files for reindexing`);
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      toast.error(apiError?.error || apiError?.message || 'Failed to retry failed files');
    },
  });

  const projects = projectsData?.projects || [];

  // Filter projects based on status filter
  const filteredProjects = projects.filter((project) => {
    if (statusFilter === 'all') return true;
    const stats = project.indexingStats;
    if (!stats) return false;
    switch (statusFilter) {
      case 'pending':
        return stats.pending > 0;
      case 'processing':
        return stats.processing > 0;
      case 'completed':
        return stats.completed > 0;
      case 'failed':
        return stats.failed > 0;
      default:
        return true;
    }
  });

  // Calculate total stats across all projects
  const totalStats = projects.reduce(
    (acc, project) => {
      if (project.indexingStats) {
        acc.pending += project.indexingStats.pending;
        acc.processing += project.indexingStats.processing;
        acc.completed += project.indexingStats.completed;
        acc.failed += project.indexingStats.failed;
        acc.total += project.indexingStats.total;
      }
      return acc;
    },
    { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 }
  );

  // Filter files based on status
  const filteredFiles = (filesData?.files || []).filter((file) => {
    if (statusFilter === 'all') return true;
    const status = file.processingStatus?.toUpperCase();
    return status === statusFilter.toUpperCase();
  });

  const toggleProjectExpanded = (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
    } else {
      setExpandedProjectId(projectId);
    }
  };

  const handleRetryFile = (projectId: string, fileId: string) => {
    reindexFileMutation.mutate({ projectId, fileId });
  };

  const openRetryAllModal = (project: ProjectWithStats) => {
    setProjectToRetry(project);
    setIsRetryAllModalOpen(true);
  };

  const handleRetryAll = () => {
    if (projectToRetry) {
      bulkReindexMutation.mutate(projectToRetry._id);
    }
  };

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Indexing Status</h1>
        <p className="text-gray-600 mt-1">
          Monitor and manage file indexing across all projects
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalStats.total}</p>
              <p className="text-sm text-gray-500">Total Files</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{totalStats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalStats.processing}</p>
              <p className="text-sm text-gray-500">Processing</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalStats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{totalStats.failed}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {(['all', 'pending', 'processing', 'completed', 'failed'] as StatusFilter[]).map(
          (filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                statusFilter === filter
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter !== 'all' && (
                <span className="ml-2 text-xs">
                  ({filter === 'pending'
                    ? totalStats.pending
                    : filter === 'processing'
                      ? totalStats.processing
                      : filter === 'completed'
                        ? totalStats.completed
                        : totalStats.failed}
                  )
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-12 h-12" />}
              title="No projects found"
              description={
                statusFilter === 'all'
                  ? 'Create a project and upload files to get started'
                  : `No projects with ${statusFilter} files`
              }
              action={
                statusFilter !== 'all' ? (
                  <Button variant="outline" onClick={() => setStatusFilter('all')}>
                    Show All Projects
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/projects')}>Go to Projects</Button>
                )
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div key={project._id} className="border border-gray-200 rounded-lg">
                  {/* Project Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleProjectExpanded(project._id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedProjectId === project._id ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#3b82f6' }}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          {project.indexingStats?.total || 0} files
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {project.indexingStats?.pending ? (
                          <Badge variant="warning" className="text-xs">
                            {project.indexingStats.pending} pending
                          </Badge>
                        ) : null}
                        {project.indexingStats?.processing ? (
                          <Badge variant="info" className="text-xs">
                            {project.indexingStats.processing} processing
                          </Badge>
                        ) : null}
                        {project.indexingStats?.failed ? (
                          <Badge variant="danger" className="text-xs">
                            {project.indexingStats.failed} failed
                          </Badge>
                        ) : null}
                        {project.indexingStats?.completed &&
                        !project.indexingStats?.pending &&
                        !project.indexingStats?.processing &&
                        !project.indexingStats?.failed ? (
                          <Badge variant="success" className="text-xs">
                            All indexed
                          </Badge>
                        ) : null}
                      </div>

                      {/* Retry All Failed Button */}
                      {project.indexingStats && project.indexingStats.failed > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRetryAllModal(project);
                          }}
                          leftIcon={<RotateCcw className="w-4 h-4" />}
                        >
                          Retry All Failed
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Files List */}
                  {expandedProjectId === project._id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {filteredFiles.length > 0 ? (
                        <div className="space-y-2">
                          {filteredFiles.map((file) => {
                            const errorMsg = file.errorMessage || file.processingError;
                            const isStuckProcessing = file.processingStatus === 'PROCESSING';
                            const canRetry = 
                              file.processingStatus === 'FAILED' ||
                              file.processingStatus === 'COMPLETED' ||
                              file.processingStatus === 'PROCESSING'; // Allow retry for stuck jobs
                            
                            return (
                              <div
                                key={file._id}
                                className={`p-3 bg-white rounded-lg border ${
                                  file.processingStatus === 'FAILED' 
                                    ? 'border-red-200' 
                                    : file.processingStatus === 'PROCESSING'
                                      ? 'border-yellow-200'
                                      : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-gray-900 truncate">
                                        {file.originalFilename}
                                      </p>
                                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                        <span>{formatBytes(file.size)}</span>
                                        <span>•</span>
                                        <span>{formatRelativeTime(file.uploadedAt)}</span>
                                        <span>•</span>
                                        <StatusBadge status={file.processingStatus as ProcessingStatus} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {canRetry && (
                                      <Button
                                        variant={isStuckProcessing ? 'outline' : 'ghost'}
                                        size="sm"
                                        onClick={() => handleRetryFile(project._id, file._id)}
                                        isLoading={
                                          reindexFileMutation.isPending &&
                                          reindexFileMutation.variables?.fileId === file._id
                                        }
                                        leftIcon={<RefreshCw className="w-4 h-4" />}
                                      >
                                        {isStuckProcessing ? 'Force Retry' : 'Reindex'}
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Processing Warning */}
                                {isStuckProcessing && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <div className="flex items-start gap-2">
                                      <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                      <div className="text-sm text-yellow-700">
                                        <span className="font-medium">Stuck? </span>
                                        <span>If this file has been processing for a long time, click "Force Retry" to restart.</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Error Message */}
                                {file.processingStatus === 'FAILED' && errorMsg && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                      <div className="text-sm text-red-700">
                                        <span className="font-medium">Error: </span>
                                        <span>{errorMsg}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          {statusFilter !== 'all'
                            ? `No ${statusFilter} files in this project`
                            : 'No files in this project'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retry All Modal */}
      <Modal
        isOpen={isRetryAllModalOpen}
        onClose={() => {
          setIsRetryAllModalOpen(false);
          setProjectToRetry(null);
        }}
        title="Retry All Failed Files"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg text-yellow-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              This will queue all failed files in <strong>{projectToRetry?.name}</strong> for
              reindexing.
            </p>
          </div>
          <p className="text-gray-600">
            {projectToRetry?.indexingStats?.failed} file(s) will be reprocessed.
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsRetryAllModalOpen(false);
              setProjectToRetry(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRetryAll}
            isLoading={bulkReindexMutation.isPending}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Retry All
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
