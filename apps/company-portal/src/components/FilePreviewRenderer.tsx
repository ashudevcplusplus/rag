import { useState, useEffect } from 'react';
import { Loader2, FileText, FileCode, File } from 'lucide-react';
import { getApiConfig } from '@rag/api-client';

interface FilePreviewRendererProps {
  fileUrl: string;
  mimeType: string;
  filename: string;
}

export function FilePreviewRenderer({ fileUrl, mimeType, filename }: FilePreviewRendererProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Fetch file as blob with authentication
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);
        const config = getApiConfig();
        const headers: Record<string, string> = {};
        
        if (config.token) {
          headers['Authorization'] = `Bearer ${config.token}`;
        } else if (config.apiKey) {
          headers['x-api-key'] = config.apiKey;
        }

        const response = await fetch(fileUrl, { 
          headers,
          signal: abortController.signal 
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Only update state if component is still mounted and request wasn't aborted
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load file preview');
          setLoading(false);
        }
      }
    };

    fetchFile();

    // Cleanup: abort fetch and mark as unmounted
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [fileUrl]);

  // Cleanup blob URL when component unmounts or blobUrl changes
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to render file preview');
  };

  // Determine file category
  const fileCategory = mimeType.split('/')[0];

  // Check error first to avoid showing infinite loading spinner on failure
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-surface-50 rounded-lg border border-surface-200">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-surface-400 mx-auto mb-2" />
          <p className="text-surface-600">{error}</p>
          <p className="text-sm text-surface-500 mt-2">
            Please try downloading the file instead.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !blobUrl) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-surface-50 rounded-lg border border-surface-200">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-sm text-surface-600">Loading file...</p>
        </div>
      </div>
    );
  }

  // PDF Preview
  if (mimeType === 'application/pdf') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-surface-50 rounded-lg overflow-hidden border border-surface-200">
        <iframe
          src={blobUrl}
          className="w-full h-full min-h-[600px] border-0"
          title={filename}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Image Preview
  if (fileCategory === 'image') {
    return (
      <div className="relative w-full bg-surface-50 rounded-lg overflow-hidden border border-surface-200">
        <img
          src={blobUrl}
          alt={filename}
          className="w-full h-auto max-h-[80vh] object-contain mx-auto"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // HTML Preview
  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-white rounded-lg overflow-hidden border border-surface-200">
        <iframe
          src={blobUrl}
          className="w-full h-full min-h-[600px] border-0"
          title={filename}
          sandbox="allow-same-origin allow-scripts"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Text-based files (plain text, markdown, code, etc.)
  if (fileCategory === 'text' || mimeType.includes('json') || mimeType.includes('xml')) {
    return (
      <div className="w-full bg-surface-50 rounded-lg overflow-hidden border border-surface-200">
        <div className="p-4 bg-surface-100 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-surface-500" />
            <span className="text-sm font-medium text-surface-700">
              {mimeType.includes('markdown') ? 'Markdown' : 
               mimeType.includes('json') ? 'JSON' :
               mimeType.includes('xml') ? 'XML' :
               'Text'} Preview
            </span>
          </div>
        </div>
        <div className="p-4">
          <iframe
            src={blobUrl}
            className="w-full h-[600px] border-0 bg-white"
            title={filename}
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    );
  }

  // Unsupported file type
  return (
    <div className="w-full bg-surface-50 rounded-lg border border-surface-200 p-12">
      <div className="text-center">
        <File className="w-16 h-16 text-surface-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-surface-900 mb-2">
          Preview not available
        </h3>
        <p className="text-surface-600 mb-4">
          This file type ({mimeType}) cannot be previewed in the browser.
        </p>
        <p className="text-sm text-surface-500">
          Please download the file to view it.
        </p>
      </div>
    </div>
  );
}

