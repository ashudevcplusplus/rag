import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Download,
  MoreVertical,
  Calendar,
  Database,
  HardDrive,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Modal,
  ModalFooter,
  EmptyState,
  StatusBadge,
  Badge,
} from '@rag/ui';
import { projectsApi, filesApi } from '@rag/api-client';
import { formatBytes, formatRelativeTime, formatDate } from '@rag/utils';
import type { FileMetadata } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();

  const [isDeleteFileModalOpen, setIsDeleteFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Fetch project details
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: () => projectsApi.get(companyId!, projectId!),
    enabled: !!companyId && !!projectId,
  });

  // Fetch project files
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['files', companyId, projectId],
    queryFn: () => filesApi.list(companyId!, projectId!),
    enabled: !!companyId && !!projectId,
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => filesApi.delete(companyId!, projectId!, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', companyId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] });
      setIsDeleteFileModalOpen(false);
      setSelectedFile(null);
      addActivity({ text: `Deleted file: ${selectedFile?.originalFilename}`, type: 'upload' });
      toast.success('File deleted successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to delete file';
      toast.error(errorMessage);
      console.error('Delete file error:', error);
    },
  });

  const project = projectData?.project;
  const files = filesData?.files || [];

  const handleDeleteFile = () => {
    if (selectedFile) {
      deleteFileMutation.mutate(selectedFile._id);
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Project not found"
            description="The project you're looking for doesn't exist or has been deleted"
            action={
              <Button onClick={() => navigate('/projects')}>
                Back to Projects
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/projects')}
          className="mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-gray-600 mt-1">
            {project.description || 'No description'}
          </p>
        </div>

        <Button
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={() => navigate(`/upload?projectId=${projectId}`)}
        >
          Upload Files
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{project.fileCount || 0}</p>
              <p className="text-sm text-gray-500">Files</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{project.vectorCount || 0}</p>
              <p className="text-sm text-gray-500">Vectors</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(project.totalSize || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Size</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatDate(project.createdAt)}
              </p>
              <p className="text-sm text-gray-500">Created</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Files</CardTitle>
          <Badge variant="default">{files.length} files</Badge>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No files yet"
              description="Upload your first document to this project"
              action={
                <Button onClick={() => navigate(`/upload?projectId=${projectId}`)}>
                  Upload Files
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {files.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {file.originalFilename}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span>{file.chunkCount} chunks</span>
                        <span>•</span>
                        <span>{formatRelativeTime(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={file.processingStatus} />

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === file._id ? null : file._id)
                        }
                        className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {activeMenu === file._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                // Download functionality would go here
                                setActiveMenu(null);
                                toast.success('Download started');
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFile(file);
                                setIsDeleteFileModalOpen(true);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete File Modal */}
      <Modal
        isOpen={isDeleteFileModalOpen}
        onClose={() => setIsDeleteFileModalOpen(false)}
        title="Delete File"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete{' '}
          <strong>{selectedFile?.originalFilename}</strong>? This will also remove
          all associated vectors.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteFileModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteFile}
            isLoading={deleteFileMutation.isPending}
          >
            Delete File
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
