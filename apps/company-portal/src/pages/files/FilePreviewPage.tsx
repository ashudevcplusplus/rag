import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  Check,
  Loader2,
  HardDrive,
  Database,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  Button,
  StatusBadge,
  Badge,
} from '@rag/ui';
import { projectsApi, filesApi } from '@rag/api-client';
import { formatBytes, removeChunkOverlap } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { FilePreviewRenderer } from '../../components/FilePreviewRenderer';
import { getApiConfig } from '@rag/api-client';

export function FilePreviewPage() {
  const { projectId, fileId } = useParams<{ projectId: string; fileId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { companyId } = useAuthStore();
  
  const [copiedChunk, setCopiedChunk] = useState<number | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'chunks' | 'full' | 'preview'>('chunks');
  
  // Get highlight chunk from URL params
  const highlightChunk = searchParams.get('chunk') ? parseInt(searchParams.get('chunk')!) : null;
  
  // Fetch project for breadcrumb
  const { data: projectData } = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: () => projectsApi.get(companyId!, projectId!),
    enabled: !!companyId && !!projectId,
  });
  
  // Fetch file preview
  const { data: previewData, isLoading, error } = useQuery({
    queryKey: ['file-preview', companyId, projectId, fileId],
    queryFn: () => filesApi.getPreview(companyId!, projectId!, fileId!),
    enabled: !!companyId && !!projectId && !!fileId,
  });
  
  // Auto-expand highlighted chunk
  useEffect(() => {
    if (highlightChunk !== null) {
      setExpandedChunks(new Set([highlightChunk]));
      // Scroll to chunk after a short delay
      setTimeout(() => {
        const element = document.getElementById(`chunk-${highlightChunk}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightChunk]);
  
  const handleCopyChunk = async (chunk: string, index: number) => {
    try {
      await navigator.clipboard.writeText(chunk);
      setCopiedChunk(index);
      setTimeout(() => setCopiedChunk(null), 2000);
      toast.success('Chunk copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };
  
  const handleCopyAll = async () => {
    if (previewData?.content) {
      try {
        await navigator.clipboard.writeText(previewData.content);
        toast.success('All content copied to clipboard');
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };
  
  const handleDownload = async () => {
    if (previewData?.file) {
      try {
        await filesApi.download(
          companyId!,
          projectId!,
          fileId!,
          previewData.file.originalFilename
        );
        toast.success('Download started');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download file');
      }
    }
  };
  
  const toggleChunkExpand = (index: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChunks(newExpanded);
  };
  
  const project = projectData?.project;
  const chunks = previewData?.chunks ? removeChunkOverlap(previewData.chunks) : [];
  
  // Get file download URL for preview
  const getFilePreviewUrl = () => {
    if (!companyId || !projectId || !fileId) return '';
    const config = getApiConfig();
    const baseUrl = config.baseUrl || 'http://localhost:8000';
    return `${baseUrl}/v1/companies/${companyId}/projects/${projectId}/files/${fileId}/download`;
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-surface-600">Loading file preview...</p>
      </div>
    );
  }
  
  if (error || !previewData) {
    // Log error details for debugging
    if (error) {
      console.error('File preview error:', error);
      console.error('File preview context:', { companyId, projectId, fileId });
    }

    // Extract error message from ApiError structure
    let errorMessage = 'Unknown error';
    let statusCode: number | undefined;
    if (error) {
      if (typeof error === 'object' && error !== null) {
        // ApiError structure: { error: string, message?: string, statusCode: number }
        const apiError = error as { error?: string; message?: string; statusCode?: number };
        errorMessage = apiError.message || apiError.error || 'Unknown error';
        statusCode = apiError.statusCode;
        
        // Add status code context for debugging
        if (apiError.statusCode) {
          console.error(`File preview failed with status ${apiError.statusCode}:`, errorMessage);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
    }

    // Provide more specific error messages based on status code
    let userFriendlyMessage = 'The file preview could not be loaded. It may have been deleted or is still processing.';
    if (statusCode === 404) {
      userFriendlyMessage = 'File not found. It may have been deleted or the file ID is incorrect.';
    } else if (statusCode === 401 || statusCode === 403) {
      userFriendlyMessage = 'You do not have permission to view this file.';
    } else if (statusCode === 500) {
      userFriendlyMessage = 'Server error occurred while loading the file. Please try again later.';
    }

    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-surface-400 mb-4" />
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Failed to load file</h3>
            <p className="text-surface-600 mb-2">
              {userFriendlyMessage}
            </p>
            {errorMessage && errorMessage !== 'Unknown error' && (
              <p className="text-sm text-surface-500 mb-2">
                Error: {errorMessage}
              </p>
            )}
            {statusCode && (
              <p className="text-xs text-surface-400 mb-6">
                Status Code: {statusCode}
              </p>
            )}
            <div className="flex gap-2">
            <Button onClick={() => navigate(`/projects/${projectId}`)}>
              Back to Project
            </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Retry the query
                  window.location.reload();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mt-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-surface-500 mb-1">
            <button
              onClick={() => navigate('/projects')}
              className="hover:text-primary-600 transition-colors"
            >
              Projects
            </button>
            <span>/</span>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="hover:text-primary-600 transition-colors"
            >
              {project?.name || 'Project'}
            </button>
            <span>/</span>
            <span className="text-surface-700 truncate">
              {previewData.file.originalFilename}
            </span>
          </div>
          
          {/* Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-surface-900 truncate">
              {previewData.file.originalFilename}
            </h1>
            <StatusBadge status={previewData.file.processingStatus} />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Copy className="w-4 h-4" />}
            onClick={handleCopyAll}
            disabled={!previewData.content}
          >
            Copy All
          </Button>
          <Button
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </div>
      </div>
      
      {/* File Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {formatBytes(previewData.file.size)}
              </p>
              <p className="text-sm text-surface-500">File Size</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {previewData.file.chunkCount}
              </p>
              <p className="text-sm text-surface-500">Chunks</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {previewData.file.mimeType.split('/')[1]?.toUpperCase() || 'Unknown'}
              </p>
              <p className="text-sm text-surface-500">Type</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-900 truncate">
                {previewData.content ? 'Ready' : 'Processing'}
              </p>
              <p className="text-sm text-surface-500">Status</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Content */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Content</h3>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-surface-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chunks')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'chunks'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Chunks
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'full'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Full Text
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
        
        <CardContent className="p-4">
          {!previewData.content && viewMode !== 'preview' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-surface-700 font-medium">Content not available yet</p>
              <p className="text-sm text-surface-500 mt-1">
                {previewData.message || 'The file is still being processed. Please check back later.'}
              </p>
            </div>
          ) : viewMode === 'preview' ? (
            <div className="w-full">
              <FilePreviewRenderer
                fileUrl={getFilePreviewUrl()}
                mimeType={previewData.file.mimeType}
                filename={previewData.file.originalFilename}
              />
            </div>
          ) : viewMode === 'chunks' ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {chunks.map((chunk, index) => {
                const isExpanded = expandedChunks.has(index);
                const isHighlighted = highlightChunk === index + 1; // 1-indexed in URL
                const shouldTruncate = chunk.length > 500 && !isExpanded;
                
                return (
                  <div
                    key={index}
                    id={`chunk-${index + 1}`}
                    className={`group relative p-4 rounded-lg border transition-all ${
                      isHighlighted
                        ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200'
                        : 'bg-surface-50 border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={isHighlighted ? 'primary' : 'default'} 
                            className="text-xs"
                          >
                            Chunk {index + 1}
                          </Badge>
                          <span className="text-xs text-surface-400">
                            {chunk.length} characters
                          </span>
                        </div>
                        <p className="text-sm text-surface-700 whitespace-pre-wrap break-words">
                          {shouldTruncate ? `${chunk.slice(0, 500)}...` : chunk}
                        </p>
                        {chunk.length > 500 && (
                          <button
                            onClick={() => toggleChunkExpand(index)}
                            className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Show more ({chunk.length - 500} more characters)
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyChunk(chunk, index)}
                        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 hover:text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy chunk"
                      >
                        {copiedChunk === index ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <pre className="text-sm text-surface-700 whitespace-pre-wrap break-words font-sans leading-relaxed">
                {previewData.content}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

