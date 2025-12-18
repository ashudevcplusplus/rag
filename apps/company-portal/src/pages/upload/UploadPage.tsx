import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  EmptyState,
  ProgressBar,
  Select,
} from '@rag/ui';
import {
  projectsApi,
  filesApi,
  jobsApi,
  FILE_UPLOAD_CONSTRAINTS,
  isAllowedFileType,
} from '@rag/api-client';
import { formatBytes } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

interface UploadingFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  jobId?: string;
  error?: string;
}

export function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();

  const [selectedProjectId, setSelectedProjectId] = useState(
    searchParams.get('projectId') || ''
  );
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projects = projectsData?.projects || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return filesApi.upload(companyId!, selectedProjectId, files);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['files', companyId, selectedProjectId] });

      // Update file statuses based on response
      // Handle both single file response (flat object) and multi-file response (results array)
      if (response.results) {
        // Multi-file upload response - match by index to handle duplicate filenames
        const results = response.results; // Capture for closure
        setUploadingFiles((prev) => {
          // Find uploading files to match with results
          const uploadingIndices = prev
            .map((f, idx) => (f.status === 'uploading' ? idx : -1))
            .filter((idx) => idx !== -1);

          return prev.map((f, idx) => {
            const resultIndex = uploadingIndices.indexOf(idx);
            if (resultIndex !== -1 && results[resultIndex]) {
              return {
                ...f,
                status: 'processing' as const,
                jobId: results[resultIndex].jobId,
                progress: 50,
              };
            }
            return f;
          });
        });
        addActivity({
          text: `Uploaded ${results.length} files`,
          type: 'upload',
        });
      } else if (response.jobId) {
        // Single file upload response - update the first uploading file
        setUploadingFiles((prev) =>
          prev.map((f, index) =>
            f.status === 'uploading' && index === prev.findIndex((pf) => pf.status === 'uploading')
              ? {
                  ...f,
                  status: 'processing' as const,
                  jobId: response.jobId,
                  progress: 50,
                }
              : f
          )
        );
        addActivity({
          text: 'Uploaded 1 file',
          type: 'upload',
        });
      }
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to upload files';
      toast.error(errorMessage);
      console.error('Upload error:', error);
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
    },
  });

  // Use ref to track uploading files for polling without causing re-renders
  const uploadingFilesRef = useRef<UploadingFile[]>([]);
  uploadingFilesRef.current = uploadingFiles;

  // Get list of job IDs that need polling (only changes when jobs are added/removed)
  const processingJobIds = uploadingFiles
    .filter((f) => f.status === 'processing' && f.jobId)
    .map((f) => f.jobId)
    .join(',');

  // Poll job status for processing files
  useEffect(() => {
    if (!processingJobIds) return;

    const pollInterval = setInterval(async () => {
      const currentFiles = uploadingFilesRef.current;
      const processingFiles = currentFiles.filter(
        (f) => f.status === 'processing' && f.jobId
      );

      for (const file of processingFiles) {
        if (!file.jobId) continue;

        try {
          const job = await jobsApi.get(file.jobId);
          const progress = job.progress || 50;

          if (job.state === 'completed') {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === file.id
                  ? { ...f, status: 'completed' as const, progress: 100 }
                  : f
              )
            );
          } else if (job.state === 'failed') {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === file.id
                  ? {
                      ...f,
                      status: 'error' as const,
                      error: job.error || 'Processing failed',
                    }
                  : f
              )
            );
          } else {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === file.id ? { ...f, progress: Math.min(progress, 95) } : f
              )
            );
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [processingJobIds]);

  const handleFiles = useCallback(
    (files: File[]) => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      const maxFiles = FILE_UPLOAD_CONSTRAINTS.maxFiles;

      // Check file count limit
      if (files.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed per upload. You selected ${files.length} files.`);
        return;
      }

      // Filter by file type
      const allowedTypeFiles = files.filter((file) => isAllowedFileType(file));
      const invalidTypeFiles = files.filter((file) => !isAllowedFileType(file));

      if (invalidTypeFiles.length > 0) {
        const names = invalidTypeFiles.slice(0, 3).map((f) => f.name).join(', ');
        const more = invalidTypeFiles.length > 3 ? ` and ${invalidTypeFiles.length - 3} more` : '';
        toast.error(
          `Unsupported file type(s): ${names}${more}. Only document files (PDF, TXT, DOCX, DOC, RTF, ODT, MD, CSV, XML, JSON, HTML) are allowed.`
        );
      }

      // Filter by size
      const validFiles = allowedTypeFiles.filter((file) => file.size <= maxSize);
      const oversizedFiles = allowedTypeFiles.filter((file) => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        toast.error(
          `${oversizedFiles.length} file(s) exceed the 50MB limit and were skipped`
        );
      }

      if (validFiles.length === 0) return;

      // Add files to upload queue
      const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: 'uploading' as const,
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Start upload
      uploadMutation.mutate(validFiles);
    },
    [uploadMutation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (!selectedProjectId) {
        toast.error('Please select a project first');
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [selectedProjectId, handleFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = ''; // Reset input
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.status !== 'completed' && f.status !== 'error')
    );
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadingFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-gray-600 mt-1">
          Upload files to your projects for AI-powered search
        </p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="animate-pulse h-10 bg-gray-100 rounded-lg" />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-8 h-8" />}
              title="No projects found"
              description="Create a project first to upload documents"
              action={
                <Button onClick={() => navigate('/projects')}>
                  Create Project
                </Button>
              }
            />
          ) : (
            <Select
              aria-label="Select project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.fileCount || 0} files)
                </option>
              ))}
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card>
        <CardContent className="p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (selectedProjectId) {
                document.getElementById('file-input')?.click();
              } else {
                toast.error('Please select a project first');
              }
            }}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200
              ${
                !selectedProjectId
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }
            `}
          >
            <input
              type="file"
              id="file-input"
              multiple
              accept=".pdf,.txt,.doc,.docx,.rtf,.odt,.md,.markdown,.csv,.xml,.json,.html,.htm,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              className="hidden"
              disabled={!selectedProjectId}
            />

            <div className="flex flex-col items-center gap-4">
              <div
                className={`p-4 rounded-full ${
                  selectedProjectId ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Upload
                  className={`w-8 h-8 ${
                    selectedProjectId ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
              </div>

              <div>
                <p className="text-lg font-medium text-gray-900">
                  {selectedProjectId
                    ? 'Drop files here or click to browse'
                    : 'Select a project to upload files'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Documents only: PDF, TXT, DOCX, DOC, RTF, ODT, MD, CSV, XML, JSON, HTML
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Max {FILE_UPLOAD_CONSTRAINTS.maxFiles} files per upload • 50MB per file
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upload Progress</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearCompleted}>
              Clear Completed
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadingFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(uploadFile.status)}
                        <span
                          className={`text-sm font-medium ${
                            uploadFile.status === 'completed'
                              ? 'text-green-600'
                              : uploadFile.status === 'error'
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {getStatusText(uploadFile.status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <ProgressBar
                          value={uploadFile.progress}
                          size="sm"
                          variant={
                            uploadFile.status === 'completed'
                              ? 'success'
                              : uploadFile.status === 'error'
                                ? 'danger'
                                : 'default'
                          }
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatBytes(uploadFile.file.size)}
                      </span>
                    </div>

                    {uploadFile.error && (
                      <p className="text-sm text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
